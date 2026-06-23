import { useState } from 'react'
import { isScreeningPast } from '../../utils/timeUtils.js'
import TheaterScreeningRow from './TheaterScreeningRow.jsx'

export default function TheaterMonthGroup({ month, screenings, theater, now, data, forceUpdate, formatDate, allScreenings }) {
  const [showPast, setShowPast] = useState(false)

  const past = []
  const upcoming = []
  screenings.forEach(screening => {
    if (isScreeningPast(screening.date, screening.time, now)) {
      past.push(screening)
    } else {
      upcoming.push(screening)
    }
  })

  return (
    <div className="month-group">
      <h3 className="month-header">{month}</h3>
      {past.length > 0 && (
        <div className="theater-past-section">
          <button className={`past-toggle ${showPast ? 'open' : ''}`} onClick={() => setShowPast(v => !v)}>
            {past.length} past screening{past.length !== 1 ? 's' : ''}
            <span className="past-toggle-arrow">&#9662;</span>
          </button>
          {showPast && (
            <ul className="screening-list past-screenings-list">
              {past.map(screening => (
                <TheaterScreeningRow key={screening.id} screening={screening} theater={theater} now={now} data={data} forceUpdate={forceUpdate} formatDate={formatDate} allScreenings={allScreenings} />
              ))}
            </ul>
          )}
        </div>
      )}
      {upcoming.length > 0 && (
        <ul className="screening-list">
          {upcoming.map(screening => (
            <TheaterScreeningRow key={screening.id} screening={screening} theater={theater} now={now} data={data} forceUpdate={forceUpdate} formatDate={formatDate} allScreenings={allScreenings} />
          ))}
        </ul>
      )}
    </div>
  )
}
