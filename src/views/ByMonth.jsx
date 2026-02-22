import { Link } from 'react-router-dom'
import './ByMonth.css'

function FavButton({ screeningId, favorites, onToggle }) {
  const isFav = favorites.includes(screeningId)
  return (
    <button
      className={`fav-btn ${isFav ? 'is-fav' : ''}`}
      onClick={(e) => { e.stopPropagation(); onToggle(screeningId) }}
      title={isFav ? 'Remove from saved' : 'Save screening'}
    >
      {isFav ? '\u2605' : '\u2606'}
    </button>
  )
}

function ByMonth({ data, favorites = [], onToggleFavorite }) {
  if (!data || data.theaters.length === 0) {
    return <div className="empty-state">No screenings found.</div>
  }

  // Collect all screenings with theater info
  const allScreenings = []
  data.theaters.forEach(theater => {
    theater.screenings.forEach(s => {
      allScreenings.push({
        ...s,
        theaterName: theater.shortName,
        theaterColor: theater.color,
        theaterId: theater.id,
      })
    })
  })

  // Sort by date then time
  allScreenings.sort((a, b) => {
    const dateComp = a.date.localeCompare(b.date)
    if (dateComp !== 0) return dateComp
    return (a.time || '').localeCompare(b.time || '')
  })

  // Group by month
  const months = {}
  allScreenings.forEach(s => {
    const d = new Date(s.date + 'T00:00:00')
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const monthLabel = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    if (!months[monthKey]) months[monthKey] = { label: monthLabel, days: {} }

    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    if (!months[monthKey].days[s.date]) {
      months[monthKey].days[s.date] = { label: dayLabel, screenings: [] }
    }
    months[monthKey].days[s.date].screenings.push(s)
  })

  const monthEntries = Object.entries(months).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="month-view">
      <div className="month-columns">
        {monthEntries.map(([key, month]) => (
          <div key={key} className="month-column">
            <h2 className="month-column-header">{month.label}</h2>
            <div className="month-days">
              {Object.entries(month.days)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([dateKey, day]) => (
                  <div key={dateKey} className="day-row">
                    <h3 className="day-header">{day.label}</h3>
                    <ul className="day-screenings">
                      {day.screenings.map(s => (
                        <li key={s.id} className="day-screening-item">
                          <FavButton
                            screeningId={s.id}
                            favorites={favorites}
                            onToggle={onToggleFavorite}
                          />
                          <span
                            className="theater-tag"
                            style={{ color: s.theaterColor }}
                          >
                            {s.theaterName}
                          </span>
                          <Link to={`/screening/${s.id}`} className="day-film-link">
                            {s.title}
                          </Link>
                          {s.time && (
                            <span className="day-time">{s.time}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ByMonth
