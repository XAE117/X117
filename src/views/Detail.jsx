import { useParams, Link } from 'react-router-dom'
import { useNow, getRelativeLabel } from '../utils/timeUtils.js'
import './Detail.css'

function generateICS(screening, theater) {
  const formatDateTime = (dateStr, timeStr) => {
    const [year, month, day] = dateStr.split('-')
    let [time, period] = (timeStr || '7:00 PM').trim().split(/\s+/)
    let [hours, minutes] = time.split(':').map(Number)
    period = (period || 'PM').toUpperCase()
    if (period === 'PM' && hours !== 12) hours += 12
    if (period === 'AM' && hours === 12) hours = 0
    return `${year}${month}${day}T${String(hours).padStart(2,'0')}${String(minutes).padStart(2,'0')}00`
  }

  const addHours = (dtStr, h) => {
    const year = parseInt(dtStr.slice(0,4))
    const month = parseInt(dtStr.slice(4,6)) - 1
    const day = parseInt(dtStr.slice(6,8))
    const hour = parseInt(dtStr.slice(9,11))
    const min = parseInt(dtStr.slice(11,13))
    const d = new Date(year, month, day, hour, min)
    d.setMinutes(d.getMinutes() + h * 60)
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
  }

  // Use the first time if multiple times are listed (e.g. "7:00 pm / 8:30 pm")
  const firstTime = (screening.time || '7:00 PM').split('/')[0].trim()
  const start = formatDateTime(screening.date, firstTime)
  const end = addHours(start, 2.5)

  const escapeICS = (str) => (str || '').replace(/[\\;,]/g, (m) => '\\' + m).replace(/\n/g, '\\n')

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SIXPM//EN',
    'BEGIN:VEVENT',
    `DTSTART;TZID=America/Los_Angeles:${start}`,
    `DTEND;TZID=America/Los_Angeles:${end}`,
    `SUMMARY:${escapeICS(screening.title)}`,
    `LOCATION:${escapeICS(theater.name)}\\, ${escapeICS(theater.neighborhood)}`,
    `DESCRIPTION:${screening.notes ? escapeICS(screening.notes) + '\\n' : ''}${screening.link || ''}`,
    screening.link ? `URL:${screening.link}` : '',
    `UID:${screening.id}@sixpm`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean).join('\r\n')

  const blob = new Blob([lines], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${screening.title.replace(/[^a-zA-Z0-9]/g, '-')}.ics`
  a.click()
  URL.revokeObjectURL(url)
}

function CinephileMetrics({ film }) {
  if (!film) return null
  const hasMetrics = film.afi100 || film.rottenTomatoes || film.sightAndSound || film.letterboxd
  if (!hasMetrics) return null

  return (
    <div className="detail-cinephile-metrics">
      <span className="detail-label">Cinephile Metrics</span>
      <div className="detail-metrics-grid">
        {film.letterboxd && (
          <div className="detail-metric-card lb">
            <span className="detail-metric-value">{film.letterboxd.toFixed(1)}</span>
            <span className="detail-metric-source">Letterboxd /5</span>
          </div>
        )}
        {film.rottenTomatoes && (
          <div className="detail-metric-card rt">
            <span className="detail-metric-value">{film.rottenTomatoes}%</span>
            <span className="detail-metric-source">Rotten Tomatoes</span>
          </div>
        )}
        {film.sightAndSound && (
          <div className="detail-metric-card ss">
            <span className="detail-metric-value">#{film.sightAndSound}</span>
            <span className="detail-metric-source">Sight & Sound 2022</span>
          </div>
        )}
        {film.afi100 && (
          <div className="detail-metric-card afi">
            <span className="detail-metric-value">#{film.afi100}</span>
            <span className="detail-metric-source">AFI Top 100</span>
          </div>
        )}
        {film.rating > 0 && (
          <div className="detail-metric-card tmdb">
            <span className="detail-metric-value">{film.rating.toFixed(1)}</span>
            <span className="detail-metric-source">TMDB /10</span>
          </div>
        )}
      </div>
    </div>
  )
}

function CriticReviews({ film, title }) {
  if (!film?.reviews?.length) return null

  const searchUrl = (critic, publication) => {
    const q = encodeURIComponent(`${critic} ${publication} "${title}" review`)
    return `https://www.google.com/search?q=${q}`
  }

  return (
    <div className="detail-reviews-section">
      <span className="detail-label">Why to Watch</span>
      <div className="detail-reviews-list">
        {film.reviews.map((review, i) => (
          <blockquote key={i} className="detail-review">
            <p className="detail-review-quote">&ldquo;{review.quote}&rdquo;</p>
            <cite className="detail-review-cite">
              <span className="detail-review-critic">{review.critic}</span>
              <a
                href={searchUrl(review.critic, review.publication)}
                target="_blank"
                rel="noopener noreferrer"
                className="detail-review-publication detail-review-link"
              >
                {review.publication} &rsaquo;
              </a>
            </cite>
          </blockquote>
        ))}
      </div>
    </div>
  )
}

const PODCAST_URLS = {
  'The Rewatchables': 'https://open.spotify.com/search/',
  'Unspooled': 'https://open.spotify.com/search/',
  'Blank Check': 'https://open.spotify.com/search/',
  'Filmspotting': 'https://open.spotify.com/search/',
  'You Must Remember This': 'https://open.spotify.com/search/',
}

function PodcastLinks({ film }) {
  if (!film?.podcasts?.length) return null

  const podcastUrl = (pod) => {
    const base = PODCAST_URLS[pod.name] || 'https://open.spotify.com/search/'
    const q = encodeURIComponent(`${pod.name} ${pod.episode || ''}`.trim())
    return `${base}${q}`
  }

  return (
    <div className="detail-podcasts-section">
      <span className="detail-label">Listen</span>
      <ul className="detail-podcasts-list">
        {film.podcasts.map((pod, i) => (
          <li key={i} className="detail-podcast-item">
            <a
              href={podcastUrl(pod)}
              target="_blank"
              rel="noopener noreferrer"
              className="detail-podcast-link"
            >
              <svg className="detail-podcast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
              <div className="detail-podcast-info">
                <span className="detail-podcast-name">{pod.name}</span>
                {pod.episode && <span className="detail-podcast-episode">{pod.episode}</span>}
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Detail({ data }) {
  const { screeningId } = useParams()
  const now = useNow()

  // Find the screening and its theater
  let screening = null
  let theater = null

  if (data) {
    for (const t of data.theaters) {
      const found = t.screenings.find(s => s.id === screeningId)
      if (found) {
        screening = found
        theater = t
        break
      }
    }
  }

  if (!screening || !theater) {
    return (
      <div className="detail-not-found">
        <h2>Screening Not Found</h2>
        <p>This screening may no longer be available.</p>
        <Link to="/" className="back-btn">
          &larr; Go Back
        </Link>
      </div>
    )
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Look up TMDB film data if available
  const slugify = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const filmKey = slugify(screening.title)
  const film = data.films?.[filmKey] || null
  const relative = getRelativeLabel(screening.date, screening.time, now)

  const shareScreening = async () => {
    const d = new Date(screening.date + 'T00:00:00')
    const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    const text = `${screening.title} @ ${theater.name} — ${dateStr}, ${screening.time}${screening.format && screening.format !== 'digital' ? ` (${screening.format})` : ''}`
    const url = window.location.href

    if (navigator.share) {
      try {
        await navigator.share({ title: screening.title, text, url })
      } catch {}
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`)
    }
  }

  return (
    <div className="detail-page">
      <div className="detail-card">
        <div className="detail-corner tl" />
        <div className="detail-corner tr" />
        <div className="detail-corner bl" />
        <div className="detail-corner br" />

        <div className="detail-accent-bar" style={{ background: theater.color }} />

        <div className="detail-content-layout">
          <div className="detail-content-main">
            <h1 className="detail-title">{screening.title}</h1>

            {film && (
              <div className="detail-film-meta">
                {film.director && <span className="detail-director">Directed by {film.director}</span>}
                {film.year && <span className="detail-year">{film.year}</span>}
                {film.letterboxd && (
                  <span className="detail-lb-badge">★ {film.letterboxd.toFixed(1)}</span>
                )}
                {film.rottenTomatoes && (
                  <span className="detail-rt-badge">{film.rottenTomatoes}% RT</span>
                )}
                {film.sightAndSound && (
                  <span className="detail-ss-badge">S&S #{film.sightAndSound}</span>
                )}
                {film.afi100 && (
                  <span className="detail-afi-badge">#{film.afi100} AFI</span>
                )}
              </div>
            )}

            <div className="detail-meta">
              <a
                href={theater.url}
                target="_blank"
                rel="noopener noreferrer"
                className="detail-theater-name"
                style={{ color: theater.color }}
              >
                {theater.name}
              </a>
              <span className="detail-neighborhood">{theater.neighborhood}</span>
            </div>

            <div className="detail-info-grid">
              <div className="detail-info-item">
                <span className="detail-label">Date</span>
                <span className="detail-value">{formatDate(screening.date)}</span>
              </div>
              <div className="detail-info-item">
                <span className="detail-label">Time</span>
                <span className="detail-value">{screening.time}</span>
                {relative && (
                  <span className={`detail-relative ${relative.isNow ? 'is-now' : ''}`}>{relative.label}</span>
                )}
              </div>
              {screening.format && (
                <div className="detail-info-item">
                  <span className="detail-label">Format</span>
                  <span className="detail-format-badge">{screening.format}</span>
                </div>
              )}
              {film?.runtime && (
                <div className="detail-info-item">
                  <span className="detail-label">Runtime</span>
                  <span className="detail-value">{film.runtime} min</span>
                </div>
              )}
            </div>

            {screening.notes && (
              <div className="detail-notes">
                <span className="detail-label">Notes</span>
                <p className="detail-notes-text">{screening.notes}</p>
              </div>
            )}

            {film?.overview && (
              <div className="detail-synopsis">
                <p className="detail-synopsis-text">{film.overview}</p>
              </div>
            )}

            <CinephileMetrics film={film} />
            <CriticReviews film={film} title={screening.title} />
            <PodcastLinks film={film} />
          </div>

          {/* Poster + action pill — always shown, placeholder if no poster */}
          <div className="detail-sidebar">
            <div className="detail-poster-box">
              <div className="detail-poster-placeholder" />
              {film?.posterPath && (
                <img
                  src={`https://image.tmdb.org/t/p/w342${film.posterPath}`}
                  alt={`${screening.title} poster`}
                  className="detail-poster-img"
                  loading="lazy"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
              )}
            </div>

            <div className="detail-action-pill">
              {screening.link && (
                <a
                  href={screening.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="detail-pill-btn detail-pill-btn--ticket"
                  title="Get Tickets"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15,3 21,3 21,9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  <span>TIX</span>
                </a>
              )}
              <button
                className="detail-pill-btn"
                onClick={() => generateICS(screening, theater)}
                title="Add to Calendar"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>CAL</span>
              </button>
              <a
                href={`https://letterboxd.com/film/${filmKey}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="detail-pill-btn"
                title="View on Letterboxd"
              >
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <circle cx="8" cy="12" r="5" fill="#00E054" opacity="0.9" />
                  <circle cx="16" cy="12" r="5" fill="#40BCF4" opacity="0.9" />
                  <circle cx="12" cy="12" r="5" fill="#FF8000" opacity="0.9" />
                </svg>
                <span>LB</span>
              </a>
              <button
                className="detail-pill-btn"
                onClick={shareScreening}
                title="Share"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16,6 12,2 8,6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                <span>SHR</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <Link to="/" className="back-btn">
        &larr; back
      </Link>
    </div>
  )
}

export default Detail
