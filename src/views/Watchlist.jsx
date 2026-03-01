import { useState, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getCurrentUser, getOtherUser, getWatchlistIds, toggleWatchlist } from '../utils/watchlist.js'
import { useNow, getRelativeLabel, isScreeningPast, getFilmData } from '../utils/timeUtils.js'
import './Watchlist.css'

function UserPicker({ onPick }) {
  return (
    <div className="user-picker-overlay">
      <div className="user-picker">
        <h2>Who are you?</h2>
        <div className="user-picker-buttons">
          <button className="user-picker-btn" onClick={() => onPick('James')}>James</button>
          <button className="user-picker-btn" onClick={() => onPick('Liza')}>Liza</button>
        </div>
      </div>
    </div>
  )
}

function WatchlistItem({ screening, theater, isBoth, onRemove, films, now }) {
  const navigate = useNavigate()
  const itemRef = useRef(null)

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const meta = (() => {
    if (!films) return null
    const slug = screening.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const f = films[slug]
    if (!f) return null
    const parts = [f.director, f.year].filter(Boolean)
    return parts.length > 0 ? parts.join(' · ') : null
  })()

  const relative = getRelativeLabel(screening.date, screening.time, now)
  const film = getFilmData(screening.title, films)

  const handleClick = (e) => {
    if (e.target.closest('.watchlist-remove') || e.target.closest('a')) return
    if (itemRef.current) {
      itemRef.current.classList.remove('glow-pulse')
      void itemRef.current.offsetWidth
      itemRef.current.classList.add('glow-pulse')
    }
    setTimeout(() => navigate(`/screening/${screening.id}`), 300)
  }

  return (
    <li ref={itemRef} className={`watchlist-item ${isBoth ? 'watchlist-both' : ''}`} onClick={handleClick}>
      {isBoth && <span className="watchlist-both-badge">{'\u2665\u2665'}</span>}
      <span className="watchlist-date">{formatDate(screening.date)}</span>
      <span className="watchlist-theater" style={{ color: theater.color }}>
        {theater.shortName}
      </span>
      <span className="watchlist-title">{screening.title}</span>
      {meta && <span className="watchlist-film-meta">{meta}</span>}
      {film?.rottenTomatoes && <span className="watchlist-metric-badge rt">{film.rottenTomatoes}% RT</span>}
      <span className="watchlist-time-col">
        {screening.time && <span className="watchlist-time">{screening.time}</span>}
        {relative && (
          <span className={`watchlist-relative ${relative.isNow ? 'is-now' : ''}`}>{relative.label}</span>
        )}
      </span>
      <button className="watchlist-remove" onClick={() => onRemove(screening.id)} title="Remove">
        &times;
      </button>
    </li>
  )
}

function WatchlistSection({ title, items, isBoth, onRemove, films, now, className }) {
  const [showPast, setShowPast] = useState(false)

  const past = []
  const upcoming = []
  items.forEach(({ screening, theater }) => {
    if (isScreeningPast(screening.date, screening.time, now)) {
      past.push({ screening, theater })
    } else {
      upcoming.push({ screening, theater })
    }
  })

  if (items.length === 0) return null

  return (
    <section className="watchlist-section">
      <h3 className={`watchlist-section-header ${className || ''}`}>{title}</h3>
      {past.length > 0 && (
        <div className="watchlist-past-section">
          <button className={`past-toggle ${showPast ? 'open' : ''}`} onClick={() => setShowPast(v => !v)}>
            {past.length} past screening{past.length !== 1 ? 's' : ''}
            <span className="past-toggle-arrow">&#9662;</span>
          </button>
          {showPast && (
            <ul className="watchlist-list past-screenings-list">
              {past.map(({ screening, theater }) => (
                <WatchlistItem
                  key={screening.id}
                  screening={screening}
                  theater={theater}
                  isBoth={isBoth}
                  onRemove={onRemove}
                  films={films}
                  now={now}
                />
              ))}
            </ul>
          )}
        </div>
      )}
      {upcoming.length > 0 && (
        <ul className="watchlist-list">
          {upcoming.map(({ screening, theater }) => (
            <WatchlistItem
              key={screening.id}
              screening={screening}
              theater={theater}
              isBoth={isBoth}
              onRemove={onRemove}
              films={films}
              now={now}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function Watchlist({ data }) {
  const [user, setUser] = useState(() => getCurrentUser())
  const [, setTick] = useState(0)
  const forceUpdate = useCallback(() => setTick(t => t + 1), [])
  const now = useNow()

  if (!user) {
    return (
      <UserPicker onPick={(name) => {
        localStorage.setItem('palace-user', name)
        setUser(name)
      }} />
    )
  }

  if (!data) return null

  const otherUser = getOtherUser()
  const myIds = getWatchlistIds(user)
  const otherIds = otherUser ? getWatchlistIds(otherUser) : []
  const bothIds = myIds.filter(id => otherIds.includes(id))
  const myOnlyIds = myIds.filter(id => !otherIds.includes(id))
  const otherOnlyIds = otherIds.filter(id => !myIds.includes(id))

  // Build screening lookup
  const screeningMap = {}
  const theaterMap = {}
  data.theaters.forEach(t => {
    t.screenings.forEach(s => {
      screeningMap[s.id] = s
      theaterMap[s.id] = t
    })
  })

  const resolve = (ids) => ids
    .map(id => ({ screening: screeningMap[id], theater: theaterMap[id] }))
    .filter(x => x.screening && x.theater)
    .sort((a, b) => a.screening.date.localeCompare(b.screening.date))

  const handleRemove = (screeningId) => {
    toggleWatchlist(screeningId)
    forceUpdate()
  }

  const bothItems = resolve(bothIds)
  const myItems = resolve(myOnlyIds)
  const otherItems = resolve(otherOnlyIds)

  const isEmpty = bothItems.length === 0 && myItems.length === 0 && otherItems.length === 0

  return (
    <div className="watchlist-page">
      <div className="watchlist-header-row">
        <h2 className="watchlist-header">Watchlist</h2>
        <button className="watchlist-switch-user" onClick={() => {
          const other = otherUser
          if (other) {
            localStorage.setItem('palace-user', other)
            setUser(other)
          }
        }}>
          Viewing as {user}
        </button>
      </div>

      {isEmpty && (
        <div className="watchlist-empty">
          <p>No screenings saved yet</p>
          <p className="watchlist-empty-hint">Tap the {'\u2661'} on any screening to add it here</p>
        </div>
      )}

      <WatchlistSection
        title="Both want to see"
        items={bothItems}
        isBoth={true}
        onRemove={handleRemove}
        films={data.films}
        now={now}
        className="watchlist-section-both"
      />

      <WatchlistSection
        title={`${user} wants to see`}
        items={myItems}
        isBoth={false}
        onRemove={handleRemove}
        films={data.films}
        now={now}
      />

      <WatchlistSection
        title={`${otherUser} wants to see`}
        items={otherItems}
        isBoth={false}
        onRemove={() => {}}
        films={data.films}
        now={now}
      />
    </div>
  )
}

export default Watchlist
