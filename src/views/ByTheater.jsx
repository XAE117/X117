import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import WatchlistButton from '../components/WatchlistButton.jsx'
import './ByTheater.css'

function FormatBadge({ format }) {
  if (!format || format === 'digital') return null
  return <span className="format-badge">{format}</span>
}

function ByTheater({ data }) {
  const [expandedId, setExpandedId] = useState(null)
  const [, setTick] = useState(0)
  const forceUpdate = useCallback(() => setTick(t => t + 1), [])

  const toggle = (id) => {
    setExpandedId(prev => prev === id ? null : id)
  }

  const groupByMonth = (screenings) => {
    const groups = {}
    screenings
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .forEach(s => {
        const d = new Date(s.date + 'T00:00:00')
        const key = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        if (!groups[key]) groups[key] = []
        groups[key].push(s)
      })
    return groups
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  if (!data || data.theaters.length === 0) {
    return <div className="empty-state">No screenings found.</div>
  }

  return (
    <div className="theater-grid">
      {data.theaters.map(theater => {
        const isExpanded = expandedId === theater.id
        const monthGroups = groupByMonth(theater.screenings)

        return (
          <div
            key={theater.id}
            className={`theater-card ${isExpanded ? 'expanded' : ''}`}
          >
            {/* Corner ornaments */}
            <div className="corner-ornament top-left" />
            <div className="corner-ornament top-right" />
            <div className="corner-ornament bottom-left" />
            <div className="corner-ornament bottom-right" />

            <div
              className="theater-card-header"
              onClick={() => toggle(theater.id)}
              style={{ borderLeftColor: theater.color }}
            >
              <div className="theater-info">
                <h2 className="theater-name">{theater.name}</h2>
                <span className="theater-neighborhood">{theater.neighborhood}</span>
              </div>
              <div className="theater-meta">
                <span className="screening-count">{theater.screenings.length} screenings</span>
                <span className={`expand-arrow ${isExpanded ? 'open' : ''}`}>&#9662;</span>
              </div>
            </div>

            {isExpanded && (
              <div className="theater-screenings">
                {Object.entries(monthGroups).map(([month, screenings]) => (
                  <div key={month} className="month-group">
                    <h3 className="month-header">{month}</h3>
                    <ul className="screening-list">
                      {screenings.map(s => (
                        <li key={s.id} className="screening-item" style={{ borderLeftColor: theater.color }}>
                          <WatchlistButton screeningId={s.id} onToggle={forceUpdate} />
                          <span className="screening-date-badge">{formatDate(s.date)}</span>
                          <Link to={`/screening/${s.id}`} className="screening-title-link">
                            {s.title}
                          </Link>
                          <FormatBadge format={s.format} />
                          {s.link && (
                            <a
                              href={s.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="external-link"
                              title="View on theater site"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                <polyline points="15,3 21,3 21,9" />
                                <line x1="10" y1="14" x2="21" y2="3" />
                              </svg>
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default ByTheater
