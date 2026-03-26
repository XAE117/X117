import { useParams, Link } from 'react-router-dom'
import './NowPlayingDetail.css'

function NowPlayingDetail({ nowPlayingData }) {
  const { filmSlug } = useParams()

  if (!nowPlayingData) {
    return (
      <div className="npd-not-found">
        <h2>No Data Available</h2>
        <Link to="/now-playing" className="npd-back">&larr; back</Link>
      </div>
    )
  }

  // Find film across theaters
  let film = null
  const theaterShowtimes = []
  const tmdb = nowPlayingData.films?.[filmSlug] || {}

  for (const theater of nowPlayingData.theaters) {
    const match = theater.films.find(f => f.slug === filmSlug)
    if (match) {
      if (!film) film = match
      theaterShowtimes.push({ theater, showtimes: match.showtimes })
    }
  }

  if (!film) {
    return (
      <div className="npd-not-found">
        <h2>Film Not Found</h2>
        <p>This film may no longer be showing.</p>
        <Link to="/now-playing" className="npd-back">&larr; back</Link>
      </div>
    )
  }

  const posterUrl = tmdb.posterPath
    ? `https://image.tmdb.org/t/p/w500${tmdb.posterPath}`
    : null

  const synopsis = tmdb.overview || film.amcSynopsis
  const runtime = tmdb.runtime || film.runtime
  const rating = film.mpaaRating || tmdb.certification

  return (
    <div className="npd-page">
      <div className="npd-card">
        <div className="detail-corner tl" />
        <div className="detail-corner tr" />
        <div className="detail-corner bl" />
        <div className="detail-corner br" />

        <div className="npd-accent-bar" />

        <div className={`npd-layout ${posterUrl ? 'has-poster' : ''}`}>
          <div className="npd-main">
            <h1 className="npd-title">{film.title}</h1>

            <div className="npd-meta-row">
              {tmdb.director && <span className="npd-director">Directed by {tmdb.director}</span>}
              {tmdb.year && <span className="npd-year">{tmdb.year}</span>}
              {rating && <span className="npd-rating">{rating}</span>}
              {runtime && <span className="npd-runtime">{runtime} min</span>}
            </div>

            {tmdb.genres?.length > 0 && (
              <div className="npd-genres">
                {tmdb.genres.map(g => (
                  <span key={g} className="npd-genre-tag">{g}</span>
                ))}
              </div>
            )}

            {synopsis && (
              <div className="npd-synopsis">
                <p>{synopsis}</p>
              </div>
            )}

            {tmdb.cast?.length > 0 && (
              <div className="npd-cast-section">
                <span className="npd-label">Cast</span>
                <p className="npd-cast-names">{tmdb.cast.join(', ')}</p>
              </div>
            )}

            {/* Scores */}
            <div className="npd-scores">
              {tmdb.rating > 0 && (
                <div className="npd-score-card tmdb">
                  <span className="npd-score-value">{tmdb.rating.toFixed(1)}</span>
                  <span className="npd-score-source">TMDB /10</span>
                </div>
              )}
            </div>

            {/* Showtimes */}
            <div className="npd-showtimes-section">
              <span className="npd-label">Showtimes</span>
              {theaterShowtimes.map(({ theater, showtimes }) => (
                <div key={theater.id} className="npd-theater-block">
                  <div className="npd-theater-header">
                    <span className="npd-theater-name" style={{ color: theater.color }}>
                      {theater.name}
                    </span>
                    <span className="npd-neighborhood">{theater.neighborhood}</span>
                    {theater.nearbyJazzVenues?.length > 0 && (
                      <span className="npd-jazz-nearby" title={theater.nearbyJazzVenues.map(v => v.name).join(', ')}>
                        🎺 {theater.nearbyJazzVenues.length} jazz venue{theater.nearbyJazzVenues.length > 1 ? 's' : ''} nearby
                      </span>
                    )}
                  </div>
                  <div className="npd-showtime-dates">
                    {groupByDate(showtimes).map(({ date, label, times }) => (
                      <div key={date} className="npd-date-row">
                        <span className="npd-date-label">{label}</span>
                        <div className="npd-time-pills">
                          {times.map((st, i) => (
                            <span key={i} className={`npd-time-pill ${st.format !== 'Digital' ? 'premium' : ''} ${st.isSoldOut ? 'sold-out' : ''}`}>
                              {st.time}
                              {st.format !== 'Digital' && <span className="npd-format-label">{st.format}</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="npd-actions">
              {tmdb.trailerUrl && (
                <a href={tmdb.trailerUrl} target="_blank" rel="noopener noreferrer" className="npd-btn trailer">
                  ▶ Watch Trailer
                </a>
              )}
              {film.ticketPageUrl && (
                <a href={film.ticketPageUrl} target="_blank" rel="noopener noreferrer" className="npd-btn tickets">
                  Get Tickets
                </a>
              )}
            </div>
          </div>

          {posterUrl && (
            <div className="npd-poster">
              <img
                src={posterUrl}
                alt={`${film.title} poster`}
                loading="lazy"
                onError={(e) => { e.target.style.display = 'none' }}
              />
            </div>
          )}
        </div>
      </div>

      <Link to="/now-playing" className="npd-back">&larr; back</Link>
    </div>
  )
}

function groupByDate(showtimes) {
  const groups = {}
  for (const st of showtimes) {
    if (!groups[st.date]) groups[st.date] = []
    groups[st.date].push(st)
  }
  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, times]) => {
      const d = new Date(date + 'T00:00:00')
      const label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
      return { date, label, times }
    })
}

export default NowPlayingDetail
