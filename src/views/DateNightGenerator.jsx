import { useState, useCallback, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import DiceLoader from '../components/DiceLoader.jsx'
import { generatePlans, getNextDays, getVenueMapsUrl, formatCostRange } from '../utils/generatePlan.js'
import './DateNightGenerator.css'

const VIBES = [
  { key: 'all', label: 'All Vibes' },
  { key: 'casual', label: 'Casual' },
  { key: 'romantic', label: 'Romantic' },
  { key: 'adventure', label: 'Adventure' },
  { key: 'budget', label: 'Budget' },
]

function DateNightGenerator({ cinemaData, jazzData, foodData }) {
  const [phase, setPhase] = useState('loading') // 'loading' | 'results'
  const [plans, setPlans] = useState(null)
  const [previousPlans, setPreviousPlans] = useState(null)
  const [selectedDate, setSelectedDate] = useState(() => getNextDays(1)[0])
  const [vibe, setVibe] = useState('all')
  const [dateOpen, setDateOpen] = useState(false)
  const [locked, setLocked] = useState({ planA: {}, planB: {} })
  const [rerolling, setRerolling] = useState(false)
  const [swipeIndex, setSwipeIndex] = useState(0)
  const dateRef = useRef(null)
  const days = getNextDays(7)

  const generate = useCallback(() => {
    const result = generatePlans({
      foodData,
      cinemaData,
      jazzData,
      date: selectedDate.iso,
      vibe,
      locked,
      previous: previousPlans,
    })
    setPreviousPlans(result)
    setPlans(result)
  }, [foodData, cinemaData, jazzData, selectedDate, vibe, locked, previousPlans])

  const handleLoaded = useCallback(() => {
    generate()
    setPhase('results')
  }, [generate])

  const handleReroll = useCallback(() => {
    setRerolling(true)
    setTimeout(() => {
      generate()
      setRerolling(false)
    }, 600)
  }, [generate])

  const handleDateSelect = useCallback((day) => {
    setSelectedDate(day)
    setDateOpen(false)
    setLocked({ planA: {}, planB: {} })
    setPreviousPlans(null)
    setPhase('loading')
  }, [])

  const handleVibeChange = useCallback((v) => {
    setVibe(v)
    setPreviousPlans(null)
    // Regenerate immediately if already showing results
    setPhase('loading')
  }, [])

  const toggleLock = useCallback((plan, element) => {
    setLocked(prev => {
      const planKey = plan === 'A' ? 'planA' : 'planB'
      const current = prev[planKey][element]
      return {
        ...prev,
        [planKey]: {
          ...prev[planKey],
          [element]: current ? null : plans?.[planKey]?.[element],
        },
      }
    })
  }, [plans])

  // Close date dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dateRef.current && !dateRef.current.contains(e.target)) {
        setDateOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Touch swipe for mobile
  const touchStart = useRef(null)
  const handleTouchStart = (e) => { touchStart.current = e.touches[0].clientX }
  const handleTouchEnd = (e) => {
    if (touchStart.current === null) return
    const diff = touchStart.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 60) {
      setSwipeIndex(prev => diff > 0 ? Math.min(prev + 1, 1) : Math.max(prev - 1, 0))
    }
    touchStart.current = null
  }

  if (phase === 'loading') {
    return <DiceLoader onComplete={handleLoaded} minDuration={1800} />
  }

  const { planA, planB } = plans || {}

  return (
    <div className={`date-night ${rerolling ? 'rerolling' : ''}`}>
      {/* Header */}
      <div className="dn-header">
        <h1 className="dn-title">TONIGHT'S LINEUP</h1>
        <p className="dn-subtitle">{selectedDate.label}</p>
      </div>

      {/* Vibe Pills */}
      <div className="dn-vibes">
        {VIBES.map(v => (
          <button
            key={v.key}
            className={`dn-vibe-pill ${vibe === v.key ? 'active' : ''}`}
            onClick={() => handleVibeChange(v.key)}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Swipe indicator (mobile) */}
      <div className="dn-swipe-dots">
        <span className={`dn-dot ${swipeIndex === 0 ? 'active' : ''}`} />
        <span className={`dn-dot ${swipeIndex === 1 ? 'active' : ''}`} />
      </div>

      {/* Plans */}
      <div
        className="dn-plans"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ '--swipe-index': swipeIndex }}
      >
        <PlanCard
          plan={planA}
          type="movie"
          label="DINNER & A MOVIE"
          emoji="🎬"
          accentClass="plan-a"
          locked={locked.planA}
          onToggleLock={(el) => toggleLock('A', el)}
          selectedDate={selectedDate}
        />
        <PlanCard
          plan={planB}
          type="jazz"
          label="DINNER & JAZZ"
          emoji="🎷"
          accentClass="plan-b"
          locked={locked.planB}
          onToggleLock={(el) => toggleLock('B', el)}
          selectedDate={selectedDate}
        />
      </div>

      {/* Action Bar */}
      <div className="dn-actions">
        <button className="dn-reroll-btn" onClick={handleReroll} disabled={rerolling}>
          <span className={`dn-reroll-dice ${rerolling ? 'spinning' : ''}`}>🎲</span>
          Roll Again
        </button>
        <div className="dn-date-selector" ref={dateRef}>
          <button className="dn-date-btn" onClick={() => setDateOpen(!dateOpen)}>
            📅 {selectedDate.label}
          </button>
          {dateOpen && (
            <div className="dn-date-dropdown">
              {days.map(day => (
                <button
                  key={day.iso}
                  className={`dn-date-option ${day.iso === selectedDate.iso ? 'active' : ''}`}
                  onClick={() => handleDateSelect(day)}
                >
                  {day.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Plan Card ──

function PlanCard({ plan, type, label, emoji, accentClass, locked, onToggleLock, selectedDate }) {
  if (!plan?.restaurant && !plan?.activity) {
    return (
      <div className={`dn-plan-card ${accentClass}`}>
        <div className="dn-plan-header">
          <span className="dn-plan-label">{label}</span>
          <span className="dn-plan-emoji">{emoji}</span>
        </div>
        <EmptyState type={type} selectedDate={selectedDate} />
      </div>
    )
  }

  const costRange = plan.costEstimate ? formatCostRange(plan.costEstimate) : null

  return (
    <div className={`dn-plan-card ${accentClass}`}>
      <div className="dn-plan-header">
        <span className="dn-plan-label">{label}</span>
        <span className="dn-plan-emoji">{emoji}</span>
      </div>

      {plan.restaurant && (
        <ActivityCard
          type="eat"
          data={plan.restaurant}
          isLocked={!!locked.restaurant}
          onToggleLock={() => onToggleLock('restaurant')}
        />
      )}

      {plan.restaurant && plan.activity && plan.timeline && (
        <TimelineConnector timeline={plan.timeline} />
      )}

      {plan.activity && (
        <ActivityCard
          type={type === 'movie' ? 'watch' : 'listen'}
          data={plan.activity}
          isLocked={!!locked.activity}
          onToggleLock={() => onToggleLock('activity')}
        />
      )}

      <div className="dn-plan-footer">
        {plan.timeline && (
          <span className="dn-evening-time">
            {plan.timeline.eveningStart} – {plan.timeline.eveningEnd}
          </span>
        )}
        {costRange && <span className="dn-cost">Est. {costRange}</span>}
        <ShareButton plan={plan} type={type} label={label} />
      </div>
    </div>
  )
}

// ── Activity Card ──

function ActivityCard({ type, data, isLocked, onToggleLock }) {
  const labels = { eat: 'EAT', watch: 'WATCH', listen: 'LISTEN' }
  const icons = { eat: '🍽', watch: '🎬', listen: '🎷' }

  return (
    <div className={`dn-activity-card dn-activity-${type}`}>
      <div className="dn-activity-header">
        <span className="dn-activity-label">{labels[type]}</span>
        <button
          className={`dn-lock-btn ${isLocked ? 'locked' : ''}`}
          onClick={onToggleLock}
          aria-label={isLocked ? 'Unlock selection' : 'Lock selection'}
        >
          {isLocked ? '🔒' : '🔓'}
        </button>
      </div>

      {type === 'eat' && <RestaurantContent data={data} />}
      {type === 'watch' && <MovieContent data={data} />}
      {type === 'listen' && <JazzContent data={data} />}
    </div>
  )
}

function RestaurantContent({ data }) {
  const tierLabel = data.tier ? data.tier.charAt(0).toUpperCase() + data.tier.slice(1) : ''
  const priceDisplay = data.price || data.priceRange || ''

  return (
    <div className="dn-activity-body">
      <div className="dn-activity-name">{data.name}</div>
      <div className="dn-activity-meta">
        {[data.neighborhood, data.cuisine, tierLabel].filter(Boolean).join(' · ')}
        {priceDisplay && <span className="dn-price"> · {priceDisplay}</span>}
      </div>
      {data.description && (
        <div className="dn-activity-desc">"{data.description.slice(0, 100)}{data.description.length > 100 ? '...' : ''}"</div>
      )}
      {data.hours && <div className="dn-activity-detail">⏰ {data.hours}</div>}
      {!data.hours && <div className="dn-activity-detail dn-muted">Check hours before heading out</div>}
      {data.distanceMiles && (
        <div className="dn-activity-detail">📍 {data.distanceMiles.toFixed(1)} mi from venue</div>
      )}
      <a
        href={data.googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="dn-maps-link"
      >
        📍 Maps ↗
      </a>
    </div>
  )
}

function MovieContent({ data }) {
  const mapsUrl = getVenueMapsUrl(data.theaterName, data.theaterNeighborhood)

  return (
    <div className="dn-activity-body">
      <div className="dn-activity-name">{data.title}</div>
      <div className="dn-activity-meta">
        {data.theaterShortName}
        {data.format && <span> · {data.format}</span>}
      </div>
      <div className="dn-activity-detail">🕗 {data.time}</div>
      {data.theaterNeighborhood && (
        <div className="dn-activity-detail">📍 {data.theaterNeighborhood}</div>
      )}
      <div className="dn-activity-links">
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="dn-maps-link">📍 Maps ↗</a>
        {data.link && <a href={data.link} target="_blank" rel="noopener noreferrer" className="dn-maps-link">🎟 Tickets ↗</a>}
      </div>
    </div>
  )
}

function JazzContent({ data }) {
  const mapsUrl = getVenueMapsUrl(data.venueName, data.venueNeighborhood)

  return (
    <div className="dn-activity-body">
      <div className="dn-activity-name">
        {data.artist}
        {data.hot && <span className="jazz-hot-badge" style={{ marginLeft: '0.4rem' }}>🔥</span>}
      </div>
      <div className="dn-activity-meta">{data.venueShortName}</div>
      <div className="dn-activity-detail">🕘 {data.time}</div>
      {data.venueNeighborhood && (
        <div className="dn-activity-detail">📍 {data.venueNeighborhood}</div>
      )}
      {data.notes && <div className="dn-activity-detail">{data.notes}</div>}
      <div className="dn-activity-links">
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="dn-maps-link">📍 Maps ↗</a>
        {data.link && <a href={data.link} target="_blank" rel="noopener noreferrer" className="dn-maps-link">🎟 Info ↗</a>}
      </div>
    </div>
  )
}

// ── Timeline Connector ──

function TimelineConnector({ timeline }) {
  return (
    <div className="dn-timeline">
      <div className="dn-timeline-row">
        <span className="dn-timeline-time">{timeline.dinnerTime}</span>
        <span className="dn-timeline-dot" />
        <span className="dn-timeline-label">Dinner</span>
      </div>
      <div className="dn-timeline-line" />
      <div className="dn-timeline-row dn-timeline-travel">
        <span className="dn-timeline-time" />
        <span className="dn-timeline-dot small" />
        <span className="dn-timeline-label">{timeline.travelNote}</span>
      </div>
      <div className="dn-timeline-line" />
      <div className="dn-timeline-row">
        <span className="dn-timeline-time">{timeline.activityTime}</span>
        <span className="dn-timeline-dot" />
        <span className="dn-timeline-label">Showtime</span>
      </div>
    </div>
  )
}

// ── Share Button ──

function ShareButton({ plan, type, label }) {
  const [copied, setCopied] = useState(false)

  const handleShare = () => {
    const lines = [`Tonight's Plan 🎲\n`]
    if (plan.restaurant) {
      lines.push(`🍽 ${plan.restaurant.name}${plan.restaurant.neighborhood ? ` (${plan.restaurant.neighborhood})` : ''}`)
      if (plan.timeline) lines.push(`   ${plan.timeline.dinnerTime}`)
    }
    if (plan.activity) {
      if (type === 'movie') {
        lines.push(`\n🎬 ${plan.activity.title} at ${plan.activity.theaterShortName}`)
        lines.push(`   ${plan.activity.time}`)
      } else {
        lines.push(`\n🎷 ${plan.activity.artist} at ${plan.activity.venueShortName}`)
        lines.push(`   ${plan.activity.time}`)
      }
    }
    lines.push(`\nVia Liza's Palace ✨`)

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button className="dn-share-btn" onClick={handleShare}>
      {copied ? '✓ Copied' : '📋 Copy'}
    </button>
  )
}

// ── Empty State ──

function EmptyState({ type, selectedDate }) {
  const dayName = selectedDate.isTonight ? 'tonight' : selectedDate.shortDate

  if (type === 'movie') {
    return (
      <div className="dn-empty">
        <p>No showtimes in the sweet spot for {dayName}.</p>
        <p>Try a different night, or <Link to="/tonight" className="dn-empty-link">check Now Playing</Link> for the full schedule.</p>
      </div>
    )
  }

  return (
    <div className="dn-empty">
      <p>The jazz clubs are quiet on {dayName}.</p>
      <p>Weekends are your best bet. <Link to="/jazz" className="dn-empty-link">Browse Jazz</Link> for the full calendar.</p>
    </div>
  )
}

export default DateNightGenerator
