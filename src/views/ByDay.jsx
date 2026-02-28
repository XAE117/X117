import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import WatchlistButton from '../components/WatchlistButton.jsx'
import './ByDay.css'

function FormatBadge({ format }) {
  if (!format || format === 'digital') return null
  return <span className="day-format-badge">{format}</span>
}

function filmMeta(title, films) {
  if (!films) return null
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const f = films[slug]
  if (!f) return null
  const parts = [f.director, f.year].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : null
}

function ByDay({ data }) {
  const [, setTick] = useState(0)
  const forceUpdate = useCallback(() => setTick(t => t + 1), [])

  if (!data || data.theaters.length === 0) {
    return <div className="empty-state">No screenings found.</div>
  }

  // Collect all screenings with theater info
  const allScreenings = []
  data.theaters.forEach(theater => {
    theater.screenings.forEach(s => {
      allScreenings.push({
        ...s,
        theaterName: theater.shortName,
        theaterColor: theater.color,
        theaterId: theater.id,
      })
    })
  })

  // Sort by date then time
  allScreenings.sort((a, b) => {
    const dateComp = a.date.localeCompare(b.date)
    if (dateComp !== 0) return dateComp
    return (a.time || '').localeCompare(b.time || '')
  })

  // Group by date only (flat day-by-day)
  const days = {}
  allScreenings.forEach(s => {
    if (!days[s.date]) {
      const d = new Date(s.date + 'T00:00:00')
      days[s.date] = {
        label: d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
        weekday: d.getDay(),
        screenings: [],
      }
    }
    days[s.date].screenings.push(s)
  })

  const dayEntries = Object.entries(days).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="day-view">
      {dayEntries.map(([dateKey, day]) => (
        <div key={dateKey} className={`day-block ${day.weekday === 0 || day.weekday === 6 ? 'weekend' : ''}`}>
          <h2 className="day-block-header">
            {day.label}
            <Link to={`/day/${dateKey}`} className="day-screenshot-btn" title="Screenshot view">
              <span className="day-screenshot-label">SCREENSHOT</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <rect x="2" y="3" width="20" height="18" rx="2" />
                <circle cx="12" cy="13" r="4" />
                <path d="M8 3V1" /><path d="M16 3V1" />
              </svg>
              <span className="day-screenshot-arrow">›</span>
            </Link>
          </h2>
          <ul className="day-block-list">
            {day.screenings.map(s => (
              <li key={s.id} className="day-block-item">
                <WatchlistButton screeningId={s.id} onToggle={forceUpdate} />
                <span className="day-item-theater" style={{ color: s.theaterColor }}>
                  {s.theaterName}
                </span>
                <span className="day-item-title-row">
                  <Link to={`/screening/${s.id}`} className="day-film-link">
                    {s.title}
                  </Link>
                  {filmMeta(s.title, data.films) && (
                    <span className="day-film-meta">{filmMeta(s.title, data.films)}</span>
                  )}
                  <FormatBadge format={s.format} />
                </span>
                <span className="day-time">{s.time || ''}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export default ByDay
