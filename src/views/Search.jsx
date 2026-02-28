import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import WatchlistButton from '../components/WatchlistButton.jsx'
import './Search.css'

function FormatBadge({ format }) {
  if (!format || format === 'digital') return null
  return <span className="search-format-badge">{format}</span>
}

function filmMeta(title, films) {
  if (!films) return null
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const f = films[slug]
  if (!f) return null
  const parts = [f.director, f.year].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : null
}

function Search({ data }) {
  const [query, setQuery] = useState('')
  const [, setTick] = useState(0)
  const forceUpdate = useCallback(() => setTick(t => t + 1), [])

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
        const slug = s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        const film = data.films?.[slug]
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
          {results.map(s => (
            <li key={s.id} className="search-result-item">
              <WatchlistButton screeningId={s.id} onToggle={forceUpdate} />
              <span className="search-result-date">{formatDate(s.date)}</span>
              <span
                className="search-result-theater"
                style={{ color: s.theaterColor }}
              >
                {s.theaterName}
              </span>
              <Link to={`/screening/${s.id}`} className="search-result-title">
                {s.title}
              </Link>
              {filmMeta(s.title, data.films) && (
                <span className="search-film-meta">{filmMeta(s.title, data.films)}</span>
              )}
              <FormatBadge format={s.format} />
              {s.time && (
                <span className="search-result-time">{s.time}</span>
              )}
            </li>
          ))}
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
