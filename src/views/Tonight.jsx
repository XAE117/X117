import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import DataFreshness from '../components/DataFreshness.jsx'
import FilmShowtimeGroup from '../components/cinema/FilmShowtimeGroup.jsx'
import { groupScreeningsByFilm, isEveningScreening } from '../utils/cinemaGrouping.js'
import { compareDatedEvents, isScreeningPast, useNow } from '../utils/timeUtils.js'
import './Tonight.css'

const INITIAL_VISIBLE_FILMS = 10

function localDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export default function Tonight({ data }) {
  const now = useNow()
  const [, setTick] = useState(0)
  const [showPast, setShowPast] = useState(false)
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_FILMS)
  const forceUpdate = useCallback(() => setTick(tick => tick + 1), [])
  const today = localDateKey(now)

  const allScreenings = useMemo(() => {
    if (!data?.theaters) return []
    return data.theaters.flatMap(theater =>
      theater.screenings.map(screening => ({
        ...screening,
        theaterId: theater.id,
        theaterName: theater.shortName || theater.name,
        theaterColor: theater.color,
      }))
    )
  }, [data])

  const eveningScreenings = useMemo(() =>
    allScreenings
      .filter(screening => screening.date === today && isEveningScreening(screening))
      .sort(compareDatedEvents)
  , [allScreenings, today])

  if (!data) return null

  const past = eveningScreenings.filter(screening => isScreeningPast(screening.date, screening.time, now))
  const upcoming = eveningScreenings.filter(screening => !isScreeningPast(screening.date, screening.time, now))
  const pastGroups = groupScreeningsByFilm(past)
  const upcomingGroups = groupScreeningsByFilm(upcoming)
  const visibleGroups = upcomingGroups.slice(0, visibleCount)
  const dayLabel = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="tonight-page">
      <header className="tonight-editorial-header">
        <div>
          <p className="tonight-kicker">AFTER 5 PM</p>
          <h1>Tonight’s films</h1>
          <p>{dayLabel} · {upcoming.length} upcoming screening{upcoming.length === 1 ? '' : 's'}</p>
        </div>
        <Link to="/browse">All dates →</Link>
      </header>

      <DataFreshness sources={[{ label: 'Film', updated: data.lastUpdated }]} />

      {pastGroups.length > 0 && (
        <div className="tonight-past-section">
          <button type="button" className={`past-toggle ${showPast ? 'open' : ''}`} onClick={() => setShowPast(value => !value)} aria-expanded={showPast}>
            {past.length} finished evening screening{past.length === 1 ? '' : 's'}
            <span className="past-toggle-arrow">▾</span>
          </button>
          {showPast && (
            <div className="tonight-film-grid past-screenings-list">
              {pastGroups.map(group => (
                <FilmShowtimeGroup
                  key={group.key}
                  group={group}
                  data={data}
                  now={now}
                  allScreenings={allScreenings}
                  onWatchlistToggle={forceUpdate}
                  compact
                />
              ))}
            </div>
          )}
        </div>
      )}

      {visibleGroups.length > 0 ? (
        <div className="tonight-film-grid">
          {visibleGroups.map(group => (
            <FilmShowtimeGroup
              key={group.key}
              group={group}
              data={data}
              now={now}
              allScreenings={allScreenings}
              onWatchlistToggle={forceUpdate}
            />
          ))}
        </div>
      ) : (
        <div className="tonight-empty">
          <p>No upcoming evening screenings are listed.</p>
          <Link to="/browse" className="tonight-empty-link">Browse future dates →</Link>
        </div>
      )}

      {visibleCount < upcomingGroups.length && (
        <button
          type="button"
          className="progressive-list-more"
          onClick={() => setVisibleCount(count => count + INITIAL_VISIBLE_FILMS)}
        >
          Show {Math.min(INITIAL_VISIBLE_FILMS, upcomingGroups.length - visibleCount)} more films
        </button>
      )}
    </div>
  )
}
