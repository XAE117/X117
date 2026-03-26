import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import './NowPlaying.css'

function FilmCard({ film, theaters, tmdbData, dateNightOnly }) {
  const [expanded, setExpanded] = useState(false)
  const tmdb = tmdbData?.[film.slug] || {}
  const posterUrl = tmdb.posterPath
    ? `https://image.tmdb.org/t/p/w342${tmdb.posterPath}`
    : null

  // Collect all showtimes across theaters for this film
  const theaterShowtimes = theaters
    .map(t => {
      const match = t.films.find(f => f.slug === film.slug)
      if (!match) return null
      if (dateNightOnly && (!t.nearbyJazzVenues || t.nearbyJazzVenues.length === 0)) return null
      return { theater: t, showtimes: match.showtimes }
    })
    .filter(Boolean)

  if (theaterShowtimes.length === 0) return null

  const runtime = tmdb.runtime || film.runtime
  const rating = film.mpaaRating || tmdb.certification
  const synopsis = tmdb.overview || film.amcSynopsis

  return (
    <div className="np-card" onClick={() => setExpanded(!expanded)}>
      <div className="np-card-corner tl" />
      <div className="np-card-corner tr" />
      <div className="np-card-corner bl" />
      <div className="np-card-corner br" />

      <div className="np-card-inner">
        {posterUrl && (
          <div className="np-card-poster">
            <img
              src={posterUrl}
              alt={`${film.title} poster`}
              loading="lazy"
              onError={(e) => { e.target.style.display = 'none' }}
            />
          </div>
        )}
        <div className="np-card-content">
          <div className="np-card-header">
            <h3 className="np-card-title">
              <Link to={`/now-playing/${film.slug}`}>{film.title}</Link>
            </h3>
            <div className="np-card-meta">
              {rating && <span className="np-rating-badge">{rating}</span>}
              {runtime && <span className="np-runtime">{runtime} min</span>}
              {film.genre && <span className="np-genre">{film.genre}</span>}
            </div>
          </div>

          {tmdb.director && (
            <span className="np-director">dir. {tmdb.director}</span>
          )}

          <div className="np-scores">
            {tmdb.rating > 0 && (
              <span className="np-score tmdb">TMDB {tmdb.rating.toFixed(1)}</span>
            )}
            {tmdb.genres?.length > 0 && (
              <span className="np-genre-tags">{tmdb.genres.slice(0, 3).join(' / ')}</span>
            )}
          </div>

          {expanded && synopsis && (
            <p className="np-synopsis">{synopsis}</p>
          )}

          {expanded && tmdb.cast?.length > 0 && (
            <div className="np-cast">
              <span className="np-cast-label">Cast</span>
              <span className="np-cast-names">{tmdb.cast.join(', ')}</span>
            </div>
          )}

          {/* Showtimes by theater */}
          <div className={`np-showtimes ${expanded ? 'expanded' : ''}`}>
            {theaterShowtimes.map(({ theater, showtimes }) => (
              <div key={theater.id} className="np-theater-row">
                <span className="np-theater-name" style={{ color: theater.color }}>
                  {theater.shortName}
                </span>
                {theater.nearbyJazzVenues?.length > 0 && (
                  <span className="np-date-night-badge" title={`Near: ${theater.nearbyJazzVenues.map(v => v.name).join(', ')}`}>
                    🎺
                  </span>
                )}
                <div className="np-times">
                  {groupShowtimesByDate(showtimes).map(({ date, times }) => (
                    <div key={date} className="np-date-group">
                      {expanded && <span className="np-date-label">{formatShortDate(date)}</span>}
                      <div className="np-time-pills">
                        {times.map((st, i) => (
                          <span key={i} className={`np-time-pill ${st.format !== 'Digital' ? 'premium' : ''} ${st.isSoldOut ? 'sold-out' : ''}`}>
                            {st.time}
                            {st.format !== 'Digital' && <span className="np-format-tag">{st.format}</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="np-card-actions">
            {tmdb.trailerUrl && (
              <a href={tmdb.trailerUrl} target="_blank" rel="noopener noreferrer" className="np-trailer-link">
                ▶ Trailer
              </a>
            )}
            <Link to={`/now-playing/${film.slug}`} className="np-detail-link">
              Details ›
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function groupShowtimesByDate(showtimes) {
  const groups = {}
  for (const st of showtimes) {
    if (!groups[st.date]) groups[st.date] = []
    groups[st.date].push(st)
  }
  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, times]) => ({ date, times }))
}

function formatShortDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function NowPlaying({ nowPlayingData }) {
  const [dateNightOnly, setDateNightOnly] = useState(false)

  const uniqueFilms = useMemo(() => {
    if (!nowPlayingData?.theaters) return []
    const filmMap = {}
    for (const theater of nowPlayingData.theaters) {
      for (const film of theater.films) {
        if (!filmMap[film.slug]) {
          filmMap[film.slug] = film
        }
      }
    }
    return Object.values(filmMap).sort((a, b) => {
      // Sort by number of showtimes (popularity proxy)
      const aCount = a.showtimes?.length || 0
      const bCount = b.showtimes?.length || 0
      return bCount - aCount
    })
  }, [nowPlayingData])

  if (!nowPlayingData || !nowPlayingData.theaters?.length) {
    return (
      <div className="np-empty">
        <h2>No Now Playing Data</h2>
        <p>Run <code>npm run scrape:now-playing</code> to fetch current showtimes.</p>
      </div>
    )
  }

  const hasDateNightVenues = nowPlayingData.theaters.some(t => t.nearbyJazzVenues?.length > 0)

  return (
    <div className="np-view">
      <div className="np-header">
        <h1 className="np-title">Now Playing</h1>
        <span className="np-subtitle">AMC Theatres · Los Angeles</span>
      </div>

      {hasDateNightVenues && (
        <button
          className={`np-date-night-toggle ${dateNightOnly ? 'active' : ''}`}
          onClick={() => setDateNightOnly(!dateNightOnly)}
        >
          <span className="np-dn-emoji">🎺🎬</span>
          <span className="np-dn-label">Date Night</span>
          <span className="np-dn-hint">Near jazz venues</span>
        </button>
      )}

      <div className="np-grid">
        {uniqueFilms.map(film => (
          <FilmCard
            key={film.slug}
            film={film}
            theaters={nowPlayingData.theaters}
            tmdbData={nowPlayingData.films}
            dateNightOnly={dateNightOnly}
          />
        ))}
      </div>

      {nowPlayingData.meta && (
        <div className="np-footer-meta">
          {nowPlayingData.meta.theaterCount} theaters · {nowPlayingData.meta.filmCount} films
          {!nowPlayingData.meta.tmdbEnriched && <span className="np-enrich-hint"> · TMDB enrichment pending</span>}
        </div>
      )}
    </div>
  )
}

export default NowPlaying
