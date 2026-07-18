import { Link } from 'react-router-dom'
import WatchlistButton from '../WatchlistButton.jsx'
import UrgencyBadge from '../UrgencyBadge.jsx'
import { filmMeta, getFilmData, getRelativeLabel } from '../../utils/timeUtils.js'
import { getUrgencyType } from '../../utils/urgencyUtils.js'
import './FilmShowtimeGroup.css'

function formatLabel(format) {
  if (!format || format === 'digital') return null
  return format
}

export default function FilmShowtimeGroup({
  group,
  data,
  now,
  allScreenings,
  onWatchlistToggle,
  compact = false,
}) {
  const first = group.screenings[0]
  const film = getFilmData(group.title, data?.films)

  return (
    <article className={`film-group-card ${compact ? 'film-group-card-compact' : ''}`}>
      <div className={`film-group-poster ${film?.posterPath ? '' : 'film-group-poster-empty'}`} aria-hidden="true">
        {film?.posterPath && (
          <img
            src={`https://image.tmdb.org/t/p/w154${film.posterPath}`}
            alt=""
            loading="lazy"
          />
        )}
      </div>
      <div className="film-group-content">
        <header className="film-group-header">
          <div>
            <h3>{group.title}</h3>
            {filmMeta(group.title, data?.films) && <p>{filmMeta(group.title, data.films)}</p>}
          </div>
          <span className="film-group-count">{group.screenings.length} time{group.screenings.length === 1 ? '' : 's'}</span>
        </header>

        <div className="film-group-showtimes">
          {group.screenings.map(screening => {
            const relative = getRelativeLabel(screening.date, screening.time, now)
            const urgency = getUrgencyType(screening, allScreenings)
            return (
              <div key={screening.id} className="film-showtime-row">
                <WatchlistButton screeningId={screening.id} onToggle={onWatchlistToggle} />
                <Link to={`/screening/${screening.id}`} className="film-showtime-primary">
                  <span className="film-showtime-time">{screening.time || 'TBA'}</span>
                  <span className="film-showtime-theater" style={{ color: screening.theaterColor }}>
                    {screening.theaterName}
                  </span>
                  {formatLabel(screening.format) && (
                    <span className="film-showtime-format">{formatLabel(screening.format)}</span>
                  )}
                  {relative && <span className={`film-showtime-relative ${relative.isNow ? 'is-now' : ''}`}>{relative.label}</span>}
                  <UrgencyBadge type={urgency} />
                </Link>
                {screening.link && (
                  <a
                    href={screening.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="film-showtime-ticket"
                    aria-label={`Tickets for ${group.title} at ${screening.time}`}
                  >
                    Tickets ↗
                  </a>
                )}
              </div>
            )
          })}
        </div>
      </div>
      {first?.format && first.format !== 'digital' && (
        <span className="film-group-feature-format">{first.format}</span>
      )}
    </article>
  )
}
