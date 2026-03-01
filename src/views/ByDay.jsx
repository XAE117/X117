import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import WatchlistButton from '../components/WatchlistButton.jsx'
import { useNow, getRelativeLabel, isScreeningPast, filmMeta, getFilmData } from '../utils/timeUtils.js'
import './ByDay.css'

function FormatBadge({ format }) {
  if (!format || format === 'digital') return null
  return <span className="day-format-badge">{format}</span>
}

function MetricsBadges({ film }) {
  if (!film) return null
  const badges = []
  if (film.letterboxd) badges.push(<span key="lb" className="day-metric-badge lb">★ {film.letterboxd.toFixed(1)}</span>)
  if (film.afi100) badges.push(<span key="afi" className="day-metric-badge afi">#{film.afi100} AFI</span>)
  if (film.rottenTomatoes) badges.push(<span key="rt" className="day-metric-badge rt">{film.rottenTomatoes}% RT</span>)
  if (film.sightAndSound) badges.push(<span key="ss" className="day-metric-badge ss">S&S #{film.sightAndSound}</span>)
  if (badges.length === 0) return null
  return <>{badges}</>
}

function ScreeningRow({ s, now, data, forceUpdate }) {
  const relative = getRelativeLabel(s.date, s.time, now)
  const film = getFilmData(s.title, data.films)
  return (
    <li className={`day-block-item ${relative?.isNow ? 'day-now-showing' : ''}`}>
      <WatchlistButton screeningId={s.id} onToggle={forceUpdate} />
      <div className="day-row-title">
        <span className="day-title-truncate">
          <Link to={`/screening/${s.id}`} className="day-film-link">
            {s.title}
          </Link>
          {filmMeta(s.title, data.films) && (
            <span className="day-film-meta">{filmMeta(s.title, data.films)}</span>
          )}
        </span>
        <span className="day-item-theater" style={{ color: s.theaterColor }}>
          {s.theaterName}
        </span>
      </div>
      <div className="day-row-time">
        <span className="day-time">{s.time || ''}</span>
      </div>
      <div className="day-row-badges">
        <span className="day-badges-left">
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

function ByDay({ data }) {
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
        <DayBlock key={dateKey} dateKey={dateKey} day={day} data={data} now={now} forceUpdate={forceUpdate} />
      ))}
    </div>
  )
}

export default ByDay
