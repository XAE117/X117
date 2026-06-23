import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import WatchlistButton from '../WatchlistButton.jsx'
import UrgencyBadge from '../UrgencyBadge.jsx'
import { getRelativeLabel, filmMeta, getFilmData } from '../../utils/timeUtils.js'
import { getUrgencyType } from '../../utils/urgencyUtils.js'

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

export default function TheaterScreeningRow({ screening, theater, now, data, forceUpdate, formatDate, allScreenings }) {
  const relative = getRelativeLabel(screening.date, screening.time, now)
  const film = getFilmData(screening.title, data.films)
  const urgencyType = getUrgencyType({ ...screening, theaterId: theater.id }, allScreenings)
  const navigate = useNavigate()
  const itemRef = useRef(null)

  const handleClick = (e) => {
    if (e.target.closest('.watchlist-btn') || e.target.closest('a')) return
    if (itemRef.current) {
      itemRef.current.classList.remove('glow-pulse')
      void itemRef.current.offsetWidth
      itemRef.current.classList.add('glow-pulse')
    }
    setTimeout(() => navigate(`/screening/${screening.id}`), 300)
  }

  return (
    <li ref={itemRef} className={`screening-item ${relative?.isNow ? 'screening-now' : ''}`} style={{ borderLeftColor: theater.color }} onClick={handleClick}>
      <WatchlistButton screeningId={screening.id} onToggle={forceUpdate} />
      <span className="screening-date-badge">{formatDate(screening.date)}</span>
      <span className="screening-title-link">{screening.title}</span>
      {filmMeta(screening.title, data.films) && (
        <span className="screening-film-meta">{filmMeta(screening.title, data.films)}</span>
      )}
      <NewReleaseBadge film={film} />
      <MetricsBadges film={film} />
      <FormatBadge format={screening.format} />
      {(screening.time || relative || urgencyType) && (
        <span className="screening-time-col">
          {screening.time && <span className="screening-time">{screening.time}</span>}
          {relative && (
            <span className={`screening-relative ${relative.isNow ? 'is-now' : ''}`}>{relative.label}</span>
          )}
          <UrgencyBadge type={urgencyType} />
        </span>
      )}
      {screening.link && (
        <a
          href={screening.link}
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
