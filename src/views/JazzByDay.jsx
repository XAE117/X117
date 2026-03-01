import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNow, getRelativeLabel, isScreeningPast } from '../utils/timeUtils.js'
import './JazzByDay.css'

function HotBadge({ show }) {
  if (!show.hot) return null
  return <span className="jazz-hot-badge" title="LA modern jazz scene">🔥</span>
}

function OCBadge({ venue }) {
  if (venue.region !== 'OC') return null
  return <span className="jazz-oc-badge">OC</span>
}

function ShowRow({ show, venue, now }) {
  const relative = getRelativeLabel(show.date, show.time, now)
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
      className={`jbd-show-row ${show.hot ? 'is-hot' : ''} ${venue.tier === 'indie_scene' ? 'is-underground' : ''}`}
      onClick={handleClick}
    >
      <span className="jbd-show-venue" style={{ color: venue.color }}>
        {venue.shortName}
        {venue.region === 'OC' && <OCBadge venue={venue} />}
      </span>
      <span className="jbd-show-artist">
        {show.artist}
        <HotBadge show={show} />
      </span>
      {show.price && <span className="jbd-show-price">{show.price}</span>}
      <span className="jbd-show-time">{show.time || 'TBA'}</span>
      {relative && (
        <span className={`jbd-show-relative ${relative.isNow ? 'is-now' : ''}`}>{relative.label}</span>
      )}
    </li>
  )
}

function JazzByDay({ data }) {
  const now = useNow()

  const dayGroups = useMemo(() => {
    if (!data) return []

    const showsByDate = {}
    data.venues.forEach(venue => {
      venue.shows.forEach(show => {
        if (!showsByDate[show.date]) showsByDate[show.date] = []
        showsByDate[show.date].push({ ...show, venue })
      })
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return Object.keys(showsByDate)
      .filter(date => new Date(date + 'T00:00:00') >= today)
      .sort()
      .map(date => {
        const d = new Date(date + 'T00:00:00')
        const label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
        const weekday = d.getDay()
        const shows = showsByDate[date].sort((a, b) => (a.time || '').localeCompare(b.time || ''))
        const hotCount = shows.filter(s => s.hot).length

        return { date, label, weekday, shows, hotCount }
      })
  }, [data])

  if (!data) return null

  return (
    <div className="jbd-page">
      <h2 className="jbd-title">By Day</h2>
      <div className="jbd-days">
        {dayGroups.length === 0 ? (
          <p className="jbd-empty">No upcoming shows</p>
        ) : (
          dayGroups.map(day => (
            <DayBlock key={day.date} day={day} now={now} />
          ))
        )}
      </div>
    </div>
  )
}

function DayBlock({ day, now }) {
  const [showPast, setShowPast] = useState(false)

  const past = []
  const upcoming = []
  day.shows.forEach(s => {
    if (isScreeningPast(s.date, s.time, now)) {
      past.push(s)
    } else {
      upcoming.push(s)
    }
  })

  return (
    <div className={`jbd-day-block ${day.weekday === 0 || day.weekday === 6 ? 'weekend' : ''}`}>
      <h3 className="jbd-day-header">
        {day.label}
        {day.hotCount > 0 && <span className="jbd-hot-count">🔥 {day.hotCount}</span>}
      </h3>

      {past.length > 0 && (
        <div className="jbd-past-section">
          <button className={`past-toggle jazz-past-toggle ${showPast ? 'open' : ''}`} onClick={() => setShowPast(v => !v)}>
            {past.length} past show{past.length !== 1 ? 's' : ''}
            <span className="past-toggle-arrow">&#9662;</span>
          </button>
          {showPast && (
            <ul className="jbd-show-list past-shows-list">
              {past.map(s => <ShowRow key={s.id} show={s} venue={s.venue} now={now} />)}
            </ul>
          )}
        </div>
      )}

      {upcoming.length > 0 && (
        <ul className="jbd-show-list">
          {upcoming.map(s => <ShowRow key={s.id} show={s} venue={s.venue} now={now} />)}
        </ul>
      )}
    </div>
  )
}

export default JazzByDay
