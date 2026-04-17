import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useNow, parseTime, filmMeta } from '../utils/timeUtils.js'
import { getUrgencyType } from '../utils/urgencyUtils.js'
import UrgencyBadge from '../components/UrgencyBadge.jsx'
import './Tonight.css'

function FormatBadge({ format }) {
  if (!format || format === 'digital') return null
  return <span className="tonight-format-badge">{format}</span>
}

function getRelativeTime(screeningMinutes, nowMinutes) {
  const diff = screeningMinutes - nowMinutes
  if (diff > 0) {
    const hours = Math.floor(diff / 60)
    const mins = diff % 60
    if (hours > 0) return `in ${hours}h ${mins}m`
    return `in ${mins}m`
  }
  const elapsed = -diff
  if (elapsed <= 150) return 'Now showing'
  const hours = Math.floor(elapsed / 60)
  const mins = elapsed % 60
  if (hours > 0) return `Started ${hours}h ${mins}m ago`
  return `Started ${mins}m ago`
}

function getUrgencyClass(parsedMinutes, nowMinutes) {
  if (parsedMinutes == null) return ''
  const diff = parsedMinutes - nowMinutes
  if (diff <= 0) return '' // already started, handled by now-showing
  if (diff <= 30) return 'urgency-imminent'
  if (diff <= 120) return 'urgency-soon'
  return ''
}

function ScreeningItem({ s, isNow, relative, data, nowMinutes, allScreenings }) {
  const navigate = useNavigate()
  const itemRef = useRef(null)
  const urgency = getUrgencyClass(s.parsedMinutes, nowMinutes)
  const urgencyType = getUrgencyType(s, allScreenings)

  const handleClick = (e) => {
    if (e.target.closest('a')) return
    if (itemRef.current) {
      itemRef.current.classList.remove('glow-pulse')
      void itemRef.current.offsetWidth
      itemRef.current.classList.add('glow-pulse')
    }
    setTimeout(() => navigate(`/screening/${s.id}`), 300)
  }

  return (
    <li ref={itemRef} className={`tonight-item ${isNow ? 'now-showing' : ''} ${urgency}`} onClick={handleClick}>
      <div className="tonight-time-col">
        <span className="tonight-time">{s.time || 'TBA'}</span>
        {relative && <span className={`tonight-relative ${isNow ? 'is-now' : ''}`}>{relative}</span>}
        <UrgencyBadge type={urgencyType} />
      </div>
      <div className="tonight-info-col">
        <span className="tonight-title-link">{s.title}</span>
        {filmMeta(s.title, data.films) && (
          <span className="tonight-film-meta">{filmMeta(s.title, data.films)}</span>
        )}
        <div className="tonight-sub">
          <span className="tonight-theater" style={{ color: s.theaterColor }}>
            {s.theaterName}
          </span>
          <FormatBadge format={s.format} />
        </div>
      </div>
      {s.link && (
        <a
          href={s.link}
          target="_blank"
          rel="noopener noreferrer"
          className="tonight-ticket-link"
          title="Get Tickets"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15,3 21,3 21,9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      )}
    </li>
  )
}

function Tonight({ data }) {
  const now = useNow()
  const [showPast, setShowPast] = useState(false)

  const todayStr = useMemo(() => {
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }, [now])

  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  // Build flat array of ALL screenings (needed for urgency badges)
  const allScreenings = useMemo(() => {
    if (!data) return []
    const all = []
    data.theaters.forEach(theater => {
      theater.screenings.forEach(s => {
        all.push({ ...s, theaterId: theater.id })
      })
    })
    return all
  }, [data])

  const tonightScreenings = useMemo(() => {
    if (!data) return []
    const screenings = []
    data.theaters.forEach(theater => {
      theater.screenings.forEach(s => {
        if (s.date === todayStr) {
          screenings.push({
            ...s,
            theaterName: theater.shortName,
            theaterFullName: theater.name,
            theaterColor: theater.color,
            theaterId: theater.id,
            parsedMinutes: parseTime(s.time),
          })
        }
      })
    })
    screenings.sort((a, b) => (a.parsedMinutes ?? 9999) - (b.parsedMinutes ?? 9999))
    return screenings
  }, [data, todayStr])

  if (!data) return null

  const dayLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  if (tonightScreenings.length === 0) {
    return (
      <div className="tonight-page">
        <h2 className="tonight-header">Tonight</h2>
        <p className="tonight-date-label">{dayLabel}</p>
        <div className="tonight-empty">
          <p>No screenings tonight — check back tomorrow</p>
          <Link to="/by-day" className="tonight-empty-link">Browse upcoming screenings &rarr;</Link>
        </div>
      </div>
    )
  }

  const hasNowShowing = tonightScreenings.some(s => {
    if (s.parsedMinutes == null) return false
    const elapsed = nowMinutes - s.parsedMinutes
    return elapsed >= 0 && elapsed <= 150
  })

  // Separate past vs upcoming screenings
  const past = []
  const upcoming = []
  tonightScreenings.forEach(s => {
    if (s.parsedMinutes != null) {
      const elapsed = nowMinutes - s.parsedMinutes
      if (elapsed > 150) {
        past.push(s)
        return
      }
    }
    upcoming.push(s)
  })

  return (
    <div className="tonight-page">
      <div className="tonight-header-row">
        <h2 className="tonight-header">
          Tonight
          {hasNowShowing && <span className="tonight-live-dot" />}
        </h2>
        <span className="tonight-count">{tonightScreenings.length} screening{tonightScreenings.length !== 1 ? 's' : ''}</span>
      </div>
      <p className="tonight-date-label">{dayLabel}</p>

      {past.length > 0 && (
        <div className="tonight-past-section">
          <button className={`past-toggle ${showPast ? 'open' : ''}`} onClick={() => setShowPast(v => !v)}>
            {past.length} past screening{past.length !== 1 ? 's' : ''}
            <span className="past-toggle-arrow">&#9662;</span>
          </button>
          {showPast && (
            <ul className="tonight-list past-screenings-list">
              {past.map(s => {
                const isNow = false
                const relative = s.parsedMinutes != null ? getRelativeTime(s.parsedMinutes, nowMinutes) : null
                return <ScreeningItem key={s.id} s={s} isNow={isNow} relative={relative} data={data} nowMinutes={nowMinutes} allScreenings={allScreenings} />
              })}
            </ul>
          )}
        </div>
      )}

      <ul className="tonight-list">
        {upcoming.map(s => {
          const isNow = s.parsedMinutes != null && (nowMinutes - s.parsedMinutes) >= 0 && (nowMinutes - s.parsedMinutes) <= 150
          const relative = s.parsedMinutes != null ? getRelativeTime(s.parsedMinutes, nowMinutes) : null
          return <ScreeningItem key={s.id} s={s} isNow={isNow} relative={relative} data={data} nowMinutes={nowMinutes} allScreenings={allScreenings} />
        })}
      </ul>
    </div>
  )
}

export default Tonight
