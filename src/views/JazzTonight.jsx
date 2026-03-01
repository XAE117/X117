import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useNow, parseTime } from '../utils/timeUtils.js'
import './JazzTonight.css'

function HotBadge({ show }) {
  if (!show.hot) return null
  return <span className="jazz-hot-badge" title="LA modern jazz scene">🔥</span>
}

function TierBadge({ tier }) {
  const labels = {
    dedicated: 'Club',
    regular: 'Stage',
    concert_hall: 'Hall',
    indie_scene: 'Underground',
  }
  return <span className={`jazz-tier-badge tier-${tier}`}>{labels[tier] || tier}</span>
}

function OCBadge({ venue }) {
  if (venue.region !== 'OC') return null
  return <span className="jazz-oc-badge">OC</span>
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
  if (elapsed <= 180) return 'Now playing'
  return null
}

function getTimeSlot(minutes) {
  if (minutes == null) return 'late'
  if (minutes < 19 * 60) return 'early'   // Before 7pm
  if (minutes < 22 * 60) return 'late'    // 7pm–10pm
  return 'latenight'                       // 10pm+
}

const SLOT_LABELS = {
  early: 'Early Show',
  late: 'Evening',
  latenight: 'Late Night',
}

function ShowItem({ show, venue, isNow, relative }) {
  const navigate = useNavigate()
  const itemRef = useRef(null)

  const handleClick = (e) => {
    if (e.target.closest('a')) return
    if (itemRef.current) {
      itemRef.current.classList.remove('glow-pulse')
      void itemRef.current.offsetWidth
      itemRef.current.classList.add('glow-pulse')
    }
    setTimeout(() => navigate(`/jazz/show/${show.id}`), 300)
  }

  return (
    <li
      ref={itemRef}
      className={`jazz-tonight-item ${isNow ? 'now-playing' : ''} ${show.hot ? 'is-hot' : ''} ${venue.tier === 'indie_scene' ? 'is-underground' : ''}`}
      onClick={handleClick}
    >
      <div className="jazz-tonight-time-col">
        <span className="jazz-tonight-time">{show.time || 'TBA'}</span>
        {relative && <span className={`jazz-tonight-relative ${isNow ? 'is-now' : ''}`}>{relative}</span>}
      </div>
      <div className="jazz-tonight-info-col">
        <span className="jazz-tonight-artist-link">
          {show.artist}
          <HotBadge show={show} />
        </span>
        <div className="jazz-tonight-sub">
          <span className="jazz-tonight-venue" style={{ color: venue.color }}>
            {venue.shortName}
          </span>
          <OCBadge venue={venue} />
          <TierBadge tier={venue.tier} />
          {show.price && <span className="jazz-tonight-price">{show.price}</span>}
          {show.notes && <span className="jazz-tonight-notes">{show.notes}</span>}
        </div>
      </div>
      {show.link && (
        <a
          href={show.link}
          target="_blank"
          rel="noopener noreferrer"
          className="jazz-tonight-ticket-link"
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

function JazzTonight({ data }) {
  const now = useNow()
  const [showPast, setShowPast] = useState(false)

  const todayStr = useMemo(() => {
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }, [now])

  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  const tonightShows = useMemo(() => {
    if (!data) return []
    const shows = []
    data.venues.forEach(venue => {
      venue.shows.forEach(show => {
        if (show.date === todayStr) {
          shows.push({
            ...show,
            venue,
            parsedMinutes: parseTime(show.time),
          })
        }
      })
    })
    shows.sort((a, b) => (a.parsedMinutes ?? 9999) - (b.parsedMinutes ?? 9999))
    return shows
  }, [data, todayStr])

  if (!data) return null

  const dayLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  if (tonightShows.length === 0) {
    return (
      <div className="jazz-tonight-page">
        <h2 className="jazz-tonight-header">Tonight</h2>
        <p className="jazz-tonight-date">{dayLabel}</p>
        <div className="jazz-tonight-empty">
          <p>No shows tonight — check back tomorrow</p>
          <Link to="/jazz" className="jazz-tonight-empty-link">Browse upcoming shows &rarr;</Link>
        </div>
      </div>
    )
  }

  const hasNowPlaying = tonightShows.some(s => {
    if (s.parsedMinutes == null) return false
    const elapsed = nowMinutes - s.parsedMinutes
    return elapsed >= 0 && elapsed <= 180
  })

  const past = []
  const upcoming = []
  tonightShows.forEach(s => {
    if (s.parsedMinutes != null) {
      const elapsed = nowMinutes - s.parsedMinutes
      if (elapsed > 180) {
        past.push(s)
        return
      }
    }
    upcoming.push(s)
  })

  // Group upcoming shows by time slot
  const slotGroups = {}
  upcoming.forEach(s => {
    const slot = getTimeSlot(s.parsedMinutes)
    if (!slotGroups[slot]) slotGroups[slot] = []
    slotGroups[slot].push(s)
  })

  const slotOrder = ['early', 'late', 'latenight']
  const activeSlots = slotOrder.filter(s => slotGroups[s]?.length > 0)

  return (
    <div className="jazz-tonight-page">
      <div className="jazz-tonight-header-row">
        <h2 className="jazz-tonight-header">
          Tonight
          {hasNowPlaying && <span className="jazz-tonight-live-dot" />}
        </h2>
        <span className="jazz-tonight-count">{tonightShows.length} show{tonightShows.length !== 1 ? 's' : ''}</span>
      </div>
      <p className="jazz-tonight-date">{dayLabel}</p>

      {past.length > 0 && (
        <div className="jazz-tonight-past-section">
          <button className={`past-toggle jazz-past-toggle ${showPast ? 'open' : ''}`} onClick={() => setShowPast(v => !v)}>
            {past.length} past show{past.length !== 1 ? 's' : ''}
            <span className="past-toggle-arrow">&#9662;</span>
          </button>
          {showPast && (
            <ul className="jazz-tonight-list past-shows-list">
              {past.map(s => (
                <ShowItem key={s.id} show={s} venue={s.venue} isNow={false} relative={null} />
              ))}
            </ul>
          )}
        </div>
      )}

      {activeSlots.map(slot => (
        <div key={slot} className="jazz-tonight-slot">
          {activeSlots.length > 1 && (
            <h3 className="jazz-tonight-slot-label">{SLOT_LABELS[slot]}</h3>
          )}
          <ul className="jazz-tonight-list">
            {slotGroups[slot].map(s => {
              const isNow = s.parsedMinutes != null && (nowMinutes - s.parsedMinutes) >= 0 && (nowMinutes - s.parsedMinutes) <= 180
              const relative = s.parsedMinutes != null ? getRelativeTime(s.parsedMinutes, nowMinutes) : null
              return <ShowItem key={s.id} show={s} venue={s.venue} isNow={isNow} relative={relative} />
            })}
          </ul>
        </div>
      ))}

      <p className="jazz-tonight-footnote">
        Underground shows update frequently. Follow <a href="https://www.instagram.com/minaretrecords/" target="_blank" rel="noopener noreferrer">@minaretrecords</a> for the latest.
      </p>
    </div>
  )
}

export default JazzTonight
