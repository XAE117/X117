import { useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import WatchlistButton from '../components/WatchlistButton.jsx'
import UrgencyBadge from '../components/UrgencyBadge.jsx'
import { useNow, getRelativeLabel, isScreeningPast, filmMeta, getFilmData } from '../utils/timeUtils.js'
import { getUrgencyType } from '../utils/urgencyUtils.js'
import './ByTheater.css'

function FormatBadge({ format }) {
  if (!format || format === 'digital') return null
  return <span className="format-badge">{format}</span>
}

function NewReleaseBadge({ film }) {
  if (!film || !film.year) return null
  if (film.year >= 2024) {
    return <span className="screening-metric-badge new-release">NEW</span>
  }
  return null
}

function MetricsBadges({ film }) {
  if (!film) return null
  const badges = []
  if (film.letterboxd) badges.push(<span key="lb" className="screening-metric-badge lb">★ {film.letterboxd.toFixed(1)}</span>)
  if (film.rottenTomatoes) badges.push(<span key="rt" className="screening-metric-badge rt">{film.rottenTomatoes}% RT</span>)
  if (film.sightAndSound) badges.push(<span key="ss" className="screening-metric-badge ss">S&S #{film.sightAndSound}</span>)
  if (film.afi100) badges.push(<span key="afi" className="screening-metric-badge afi">#{film.afi100} AFI</span>)
  if (badges.length === 0) return null
  return <>{badges}</>
}

function ScreeningRow({ s, theater, now, data, forceUpdate, formatDate, allScreenings }) {
  const relative = getRelativeLabel(s.date, s.time, now)
  const film = getFilmData(s.title, data.films)
  const urgencyType = getUrgencyType({ ...s, theaterId: theater.id }, allScreenings)
  return (
    <li className={`screening-item ${relative?.isNow ? 'screening-now' : ''}`} style={{ borderLeftColor: theater.color }}>
      <WatchlistButton screeningId={s.id} onToggle={forceUpdate} />
      <span className="screening-date-badge">{formatDate(s.date)}</span>
      <Link className="screening-title-link" to={`/screening/${s.id}`}>{s.title}</Link>
      {filmMeta(s.title, data.films) && (
        <span className="screening-film-meta">{filmMeta(s.title, data.films)}</span>
      )}
      <NewReleaseBadge film={film} />
      <MetricsBadges film={film} />
      <FormatBadge format={s.format} />
      {(s.time || relative || urgencyType) && (
        <span className="screening-time-col">
          {s.time && <span className="screening-time">{s.time}</span>}
          {relative && (
            <span className={`screening-relative ${relative.isNow ? 'is-now' : ''}`}>{relative.label}</span>
          )}
          <UrgencyBadge type={urgencyType} />
        </span>
      )}
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
  )
}

function MonthGroup({ month, screenings, theater, now, data, forceUpdate, formatDate, allScreenings }) {
  const [showPast, setShowPast] = useState(false)

  const past = []
  const upcoming = []
  screenings.forEach(s => {
    if (isScreeningPast(s.date, s.time, now)) {
      past.push(s)
    } else {
      upcoming.push(s)
    }
  })

  return (
    <div className="month-group">
      <h3 className="month-header">{month}</h3>
      {past.length > 0 && (
        <div className="theater-past-section">
          <button className={`past-toggle ${showPast ? 'open' : ''}`} onClick={() => setShowPast(v => !v)}>
            {past.length} past screening{past.length !== 1 ? 's' : ''}
            <span className="past-toggle-arrow">&#9662;</span>
          </button>
          {showPast && (
            <ul className="screening-list past-screenings-list">
              {past.map(s => (
                <ScreeningRow key={s.id} s={s} theater={theater} now={now} data={data} forceUpdate={forceUpdate} formatDate={formatDate} allScreenings={allScreenings} />
              ))}
            </ul>
          )}
        </div>
      )}
      {upcoming.length > 0 && (
        <ul className="screening-list">
          {upcoming.map(s => (
            <ScreeningRow key={s.id} s={s} theater={theater} now={now} data={data} forceUpdate={forceUpdate} formatDate={formatDate} allScreenings={allScreenings} />
          ))}
        </ul>
      )}
    </div>
  )
}

function ByTheater({ data }) {
  const [expandedId, setExpandedId] = useState(null)
  const [, setTick] = useState(0)
  const forceUpdate = useCallback(() => setTick(t => t + 1), [])
  const now = useNow()

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

  // Build flat array of all screenings with theaterId for urgency computation
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

  if (!data || data.theaters.length === 0) {
    return <div className="empty-state">No screenings found.</div>
  }

  return (
    <div className="theater-grid">
      {data.theaters.filter(theater => theater.screenings.length > 0).map(theater => {
        const isExpanded = expandedId === theater.id
        const monthGroups = groupByMonth(theater.screenings)

        return (
          <div
            key={theater.id}
            id={theater.id}
            className={`theater-card ${isExpanded ? 'expanded' : ''}`}
          >
            <button
              type="button"
              className="theater-card-header"
              onClick={() => toggle(theater.id)}
              style={{ borderLeftColor: theater.color }}
              aria-expanded={isExpanded}
              aria-controls={`theater-screenings-${theater.id}`}
            >
              <div className="theater-info">
                <h2 className="theater-name">{theater.name}</h2>
                <span className="theater-neighborhood">{theater.neighborhood}</span>
              </div>
              <div className="theater-meta">
                <span className="screening-count">{theater.screenings.length} screenings</span>
                <span className={`expand-arrow ${isExpanded ? 'open' : ''}`}>&#9662;</span>
              </div>
            </button>

            {isExpanded && (
              <div id={`theater-screenings-${theater.id}`} className="theater-screenings">
                {Object.entries(monthGroups).map(([month, screenings]) => (
                  <MonthGroup
                    key={month}
                    month={month}
                    screenings={screenings}
                    theater={theater}
                    now={now}
                    data={data}
                    forceUpdate={forceUpdate}
                    formatDate={formatDate}
                    allScreenings={allScreenings}
                  />
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
