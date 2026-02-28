import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import './Tonight.css'

function FormatBadge({ format }) {
  if (!format || format === 'digital') return null
  return <span className="tonight-format-badge">{format}</span>
}

function parseTime(timeStr) {
  if (!timeStr) return null
  // Take first time if multiple (e.g. "7:00 pm / 8:30 pm")
  const first = timeStr.split('/')[0].trim()
  const match = first.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i)
  if (!match) return null
  let [, h, m, period] = match
  h = parseInt(h, 10)
  m = parseInt(m, 10)
  if (period) {
    period = period.toLowerCase()
    if (period === 'pm' && h !== 12) h += 12
    if (period === 'am' && h === 12) h = 0
  }
  return h * 60 + m
}

function getRelativeTime(screeningMinutes, nowMinutes) {
  const diff = screeningMinutes - nowMinutes
  if (diff > 0) {
    const hours = Math.floor(diff / 60)
    const mins = diff % 60
    if (hours > 0) return `In ${hours}h ${mins}m`
    return `In ${mins}m`
  }
  const elapsed = -diff
  if (elapsed <= 150) return 'Now showing'
  const hours = Math.floor(elapsed / 60)
  const mins = elapsed % 60
  if (hours > 0) return `Started ${hours}h ${mins}m ago`
  return `Started ${mins}m ago`
}

function Tonight({ data }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  const todayStr = useMemo(() => {
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }, [now])

  const nowMinutes = now.getHours() * 60 + now.getMinutes()

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

      <ul className="tonight-list">
        {tonightScreenings.map(s => {
          const isNow = s.parsedMinutes != null && (nowMinutes - s.parsedMinutes) >= 0 && (nowMinutes - s.parsedMinutes) <= 150
          const relative = s.parsedMinutes != null ? getRelativeTime(s.parsedMinutes, nowMinutes) : null

          return (
            <li key={s.id} className={`tonight-item ${isNow ? 'now-showing' : ''}`}>
              <div className="tonight-time-col">
                <span className="tonight-time">{s.time || 'TBA'}</span>
                {relative && <span className={`tonight-relative ${isNow ? 'is-now' : ''}`}>{relative}</span>}
              </div>
              <div className="tonight-info-col">
                <Link to={`/screening/${s.id}`} className="tonight-title-link">
                  {s.title}
                </Link>
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
        })}
      </ul>
    </div>
  )
}

export default Tonight
