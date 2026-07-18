import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import DataFreshness from '../components/DataFreshness.jsx'
import DecoDivider from '../components/DecoDivider.jsx'
import FilmShowtimeGroup from '../components/cinema/FilmShowtimeGroup.jsx'
import { groupScreeningsByFilm } from '../utils/cinemaGrouping.js'
import { compareDatedEvents, isScreeningPast, useNow } from '../utils/timeUtils.js'
import './ByDay.css'

const INITIAL_FILMS_PER_DAY = 10

function DayBlock({ dateKey, day, data, now, forceUpdate, allScreenings }) {
  const [showPast, setShowPast] = useState(false)
  const [visibleCount, setVisibleCount] = useState(INITIAL_FILMS_PER_DAY)
  const past = day.screenings.filter(screening => isScreeningPast(screening.date, screening.time, now))
  const upcoming = day.screenings.filter(screening => !isScreeningPast(screening.date, screening.time, now))
  const upcomingGroups = groupScreeningsByFilm(upcoming)
  const pastGroups = groupScreeningsByFilm(past)
  const visibleGroups = upcomingGroups.slice(0, visibleCount)

  return (
    <section className={`day-block ${day.weekday === 0 || day.weekday === 6 ? 'weekend' : ''}`}>
      <div className="day-block-heading-row">
        <h2 className="day-block-header">{day.label}</h2>
        <Link to={`/day/${dateKey}`} className="day-screenshot-btn" title="Screenshot view">
          <span className="day-screenshot-label">SCREENSHOT</span>
          <span className="day-screenshot-icon">📸</span>
        </Link>
      </div>

      {pastGroups.length > 0 && (
        <div className="day-past-section">
          <button className={`past-toggle ${showPast ? 'open' : ''}`} onClick={() => setShowPast(value => !value)}>
            {past.length} past screening{past.length === 1 ? '' : 's'}
            <span className="past-toggle-arrow">▾</span>
          </button>
          {showPast && (
            <div className="film-group-list past-screenings-list">
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

      <div className="film-group-list">
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

      {visibleCount < upcomingGroups.length && (
        <button
          className="progressive-list-more"
          onClick={() => setVisibleCount(count => count + INITIAL_FILMS_PER_DAY)}
        >
          Show {Math.min(INITIAL_FILMS_PER_DAY, upcomingGroups.length - visibleCount)} more films
        </button>
      )}

      {upcomingGroups.length === 0 && pastGroups.length > 0 && !showPast && (
        <p className="day-all-past-hint">All screenings have passed.</p>
      )}
    </section>
  )
}

export default function ByDay({ data, searchQuery = '' }) {
  const [, setTick] = useState(0)
  const forceUpdate = useCallback(() => setTick(tick => tick + 1), [])
  const now = useNow()

  if (!data?.theaters?.length) {
    return <div className="empty-state">No screenings found.</div>
  }

  const allScreenings = data.theaters.flatMap(theater =>
    theater.screenings.map(screening => ({
      ...screening,
      theaterName: theater.shortName || theater.name,
      theaterColor: theater.color,
      theaterId: theater.id,
      theaterUrl: theater.url,
    }))
  ).sort(compareDatedEvents)

  const query = searchQuery.trim().toLowerCase()
  const filteredScreenings = query
    ? allScreenings.filter(screening => screening.title.toLowerCase().includes(query))
    : allScreenings

  const days = new Map()
  for (const screening of filteredScreenings) {
    if (!days.has(screening.date)) {
      const date = new Date(`${screening.date}T00:00:00`)
      days.set(screening.date, {
        label: date.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        }),
        weekday: date.getDay(),
        screenings: [],
      })
    }
    days.get(screening.date).screenings.push(screening)
  }

  const dayEntries = [...days.entries()].sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="day-view">
      <header className="browse-header">
        <div>
          <p className="browse-eyebrow">FILM DIRECTORY</p>
          <h1>Browse screenings</h1>
          <p>Grouped by film, with every venue and showtime kept one tap away.</p>
        </div>
        <Link to="/tonight" className="browse-tonight-link">Evening only →</Link>
      </header>

      <DataFreshness sources={[{ label: 'Film', updated: data.lastUpdated }]} />

      {query && (
        <div className="day-search-count">
          {filteredScreenings.length} screening{filteredScreenings.length === 1 ? '' : 's'} matching “{searchQuery.trim()}”
        </div>
      )}

      {dayEntries.map(([dateKey, day], index) => (
        <div key={dateKey}>
          {index > 0 && <DecoDivider variant={index % 2 === 0 ? 'sunburst' : 'fan'} />}
          <DayBlock
            dateKey={dateKey}
            day={day}
            data={data}
            now={now}
            forceUpdate={forceUpdate}
            allScreenings={allScreenings}
          />
        </div>
      ))}

      {dayEntries.length === 0 && (
        <p className="day-all-past-hint">No screenings match your search.</p>
      )}
    </div>
  )
}
