import { useState, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import WatchlistButton from '../components/WatchlistButton.jsx'
import { useNow, getRelativeLabel, filmMeta, getFilmData } from '../utils/timeUtils.js'
import './Search.css'

function FormatBadge({ format }) {
  if (!format || format === 'digital') return null
  return <span className="search-format-badge">{format}</span>
}

function MetricsBadges({ film }) {
  if (!film) return null
  const badges = []
  if (film.afi100) badges.push(<span key="afi" className="search-metric-badge afi">#{film.afi100} AFI</span>)
  if (film.rottenTomatoes) badges.push(<span key="rt" className="search-metric-badge rt">{film.rottenTomatoes}% RT</span>)
  if (film.sightAndSound) badges.push(<span key="ss" className="search-metric-badge ss">S&S #{film.sightAndSound}</span>)
  if (badges.length === 0) return null
  return <>{badges}</>
}

function SearchResultItem({ s, relative, film, data, forceUpdate, formatDate }) {
  const navigate = useNavigate()
  const itemRef = useRef(null)

  const handleClick = (e) => {
    if (e.target.closest('.watchlist-btn') || e.target.closest('a')) return
    if (itemRef.current) {
      itemRef.current.classList.remove('glow-pulse')
      void itemRef.current.offsetWidth
      itemRef.current.classList.add('glow-pulse')
    }
    navigate(`/screening/${s.id}`)
  }

  return (
    <li ref={itemRef} className="search-result-item" onClick={handleClick}>
      <WatchlistButton screeningId={s.id} onToggle={forceUpdate} />
      <span className="search-result-date">{formatDate(s.date)}</span>
      <span className="search-result-theater" style={{ color: s.theaterColor }}>
        {s.theaterName}
      </span>
      <span className="search-result-title">{s.title}</span>
      {filmMeta(s.title, data.films) && (
        <span className="search-film-meta">{filmMeta(s.title, data.films)}</span>
      )}
      <MetricsBadges film={film} />
      <FormatBadge format={s.format} />
      <span className="search-time-col">
        {s.time && <span className="search-result-time">{s.time}</span>}
        {relative && (
          <span className={`search-relative ${relative.isNow ? 'is-now' : ''}`}>{relative.label}</span>
        )}
      </span>
    </li>
  )
}

function Search({ data }) {
  const [query, setQuery] = useState('')
  const [, setTick] = useState(0)
  const forceUpdate = useCallback(() => setTick(t => t + 1), [])
  const now = useNow()

  if (!data) return null

  const q = query.trim().toLowerCase()

  // Collect and filter screenings
  let results = []
  if (q) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    data.theaters.forEach(theater => {
      theater.screenings.forEach(s => {
        const d = new Date(s.date + 'T00:00:00')
        if (d < today) return
        const titleMatch = s.title.toLowerCase().includes(q)
        // Also search by director name from TMDB data
        const film = getFilmData(s.title, data.films)
        const directorMatch = film?.director?.toLowerCase().includes(q)
        if (titleMatch || directorMatch) {
          results.push({
            ...s,
            theaterName: theater.shortName,
            theaterColor: theater.color,
          })
        }
      })
    })

    results.sort((a, b) => {
      const dateComp = a.date.localeCompare(b.date)
      if (dateComp !== 0) return dateComp
      return (a.time || '').localeCompare(b.time || '')
    })
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <div className="search-page">
      <div className="search-page-bar">
        <svg className="search-page-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          className="search-page-input"
          placeholder="Search films..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
        {query && (
          <button className="search-page-clear" onClick={() => setQuery('')}>
            &times;
          </button>
        )}
      </div>

      {q && (
        <p className="search-result-count">
          {results.length} {results.length === 1 ? 'screening' : 'screenings'} found
        </p>
      )}

      {results.length > 0 && (
        <ul className="search-results">
          {results.map(s => {
            const relative = getRelativeLabel(s.date, s.time, now)
            const film = getFilmData(s.title, data.films)
            return (
              <SearchResultItem key={s.id} s={s} relative={relative} film={film} data={data} forceUpdate={forceUpdate} formatDate={formatDate} />
            )
          })}
        </ul>
      )}

      {q && results.length === 0 && (
        <div className="search-empty">
          <p>No upcoming screenings match "{query}"</p>
        </div>
      )}
    </div>
  )
}

export default Search
