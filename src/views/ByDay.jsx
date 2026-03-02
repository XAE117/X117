import { useState, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import WatchlistButton from '../components/WatchlistButton.jsx'
import { useNow, getRelativeLabel, isScreeningPast, filmMeta, getFilmData, parseTime } from '../utils/timeUtils.js'
import './ByDay.css'

function FormatBadge({ format }) {
  if (!format || format === 'digital') return null
  return <span className="day-format-badge">{format}</span>
}

function MetricsBadges({ film }) {
  if (!film) return null
  const badges = []
  if (film.letterboxd) badges.push(<span key="lb" className="day-metric-badge lb">★ {film.letterboxd.toFixed(1)}</span>)
  if (film.rottenTomatoes) badges.push(<span key="rt" className="day-metric-badge rt">{film.rottenTomatoes}% RT</span>)
  if (film.sightAndSound) badges.push(<span key="ss" className="day-metric-badge ss">S&S #{film.sightAndSound}</span>)
  if (film.afi100) badges.push(<span key="afi" className="day-metric-badge afi">#{film.afi100} AFI</span>)
  if (badges.length === 0) return null
  return <>{badges}</>
}

function ScreeningRow({ s, now, data, forceUpdate }) {
  const relative = getRelativeLabel(s.date, s.time, now)
  const film = getFilmData(s.title, data.films)
  const navigate = useNavigate()
  const itemRef = useRef(null)

  const handleClick = (e) => {
    // Don't navigate if clicking interactive elements
    if (e.target.closest('.watchlist-btn') || e.target.closest('a')) return
    if (itemRef.current) {
      itemRef.current.classList.remove('glow-pulse')
      void itemRef.current.offsetWidth
      itemRef.current.classList.add('glow-pulse')
    }
    setTimeout(() => navigate(`/screening/${s.id}`), 300)
  }

  return (
    <li
      ref={itemRef}
      className={`day-block-item ${relative?.isNow ? 'day-now-showing' : ''}`}
      onClick={handleClick}
    >
      <div className="day-row-title">
        <span className="day-title-truncate">
          <span className="day-film-link">{s.title}</span>
          {filmMeta(s.title, data.films) && (
            <span className="day-film-meta">{filmMeta(s.title, data.films)}</span>
          )}
        </span>
        <a
          href={s.theaterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="day-item-theater"
          style={{ color: s.theaterColor }}
        >
          {s.theaterName}
        </a>
      </div>
      <div className="day-row-time">
        <span className="day-time">{s.time || ''}</span>
        {s.link && (
          <a
            href={s.link}
            target="_blank"
            rel="noopener noreferrer"
            className="day-ticket-link"
            title="Get Tickets"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15,3 21,3 21,9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        )}
      </div>
      <div className="day-row-badges">
        <span className="day-badges-left">
          <WatchlistButton screeningId={s.id} onToggle={forceUpdate} />
          <MetricsBadges film={film} />
          <FormatBadge format={s.format} />
        </span>
        {relative && (
          <span className={`day-relative ${relative.isNow ? 'is-now' : ''}`}>{relative.label}</span>
        )}
      </div>
    </li>
  )
}

function DayBlock({ dateKey, day, data, now, forceUpdate }) {
  const [showPast, setShowPast] = useState(false)

  const past = []
  const upcoming = []
  day.screenings.forEach(s => {
    if (isScreeningPast(s.date, s.time, now)) {
      past.push(s)
    } else {
      upcoming.push(s)
    }
  })

  return (
    <div className={`day-block ${day.weekday === 0 || day.weekday === 6 ? 'weekend' : ''}`}>
      <h2 className="day-block-header">
        {day.label}
        <Link to={`/day/${dateKey}`} className="day-screenshot-btn" title="Screenshot view">
          <span className="day-screenshot-label">SCREENSHOT</span>
          <span className="day-screenshot-icon">📸</span>
        </Link>
      </h2>
      {past.length > 0 && (
        <div className="day-past-section">
          <button className={`past-toggle ${showPast ? 'open' : ''}`} onClick={() => setShowPast(v => !v)}>
            {past.length} past screening{past.length !== 1 ? 's' : ''}
            <span className="past-toggle-arrow">&#9662;</span>
          </button>
          {showPast && (
            <ul className="day-block-list past-screenings-list">
              {past.map(s => <ScreeningRow key={s.id} s={s} now={now} data={data} forceUpdate={forceUpdate} />)}
            </ul>
          )}
        </div>
      )}
      {upcoming.length > 0 && (
        <ul className="day-block-list">
          {upcoming.map(s => <ScreeningRow key={s.id} s={s} now={now} data={data} forceUpdate={forceUpdate} />)}
        </ul>
      )}
      {upcoming.length === 0 && past.length > 0 && !showPast && (
        <p className="day-all-past-hint">All screenings have passed</p>
      )}
    </div>
  )
}

function ByDay({ data, searchQuery = '' }) {
  const [, setTick] = useState(0)
  const forceUpdate = useCallback(() => setTick(t => t + 1), [])
  const now = useNow()

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
        theaterUrl: theater.url,
      })
    })
  })

  // Sort by date then time (numeric parse for correct chronological order)
  allScreenings.sort((a, b) => {
    const dateComp = a.date.localeCompare(b.date)
    if (dateComp !== 0) return dateComp
    const aMin = parseTime(a.time) ?? 9999
    const bMin = parseTime(b.time) ?? 9999
    return aMin - bMin
  })

  // Apply search filter
  const query = searchQuery.trim().toLowerCase()
  const filteredScreenings = query
    ? allScreenings.filter(s => s.title.toLowerCase().includes(query))
    : allScreenings

  // Group by date only (flat day-by-day)
  const days = {}
  filteredScreenings.forEach(s => {
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

  const matchCount = query ? filteredScreenings.length : 0

  return (
    <div className="day-view">
      {query && (
        <div className="day-search-count">
          {matchCount} screening{matchCount !== 1 ? 's' : ''}{matchCount > 0 ? ` matching \u201c${searchQuery.trim()}\u201d` : ' found'}
        </div>
      )}
      {dayEntries.map(([dateKey, day]) => (
        <DayBlock
          key={dateKey}
          dateKey={dateKey}
          day={day}
          data={data}
          now={now}
          forceUpdate={forceUpdate}

        />
      ))}
      {query && dayEntries.length === 0 && (
        <p className="day-all-past-hint">No screenings match your search</p>
      )}
    </div>
  )
}

export default ByDay
