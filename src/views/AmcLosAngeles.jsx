import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ByDay from './ByDay.jsx'
import { filterAmcLosAngelesData } from '../utils/amcCinema.js'
import './AmcLosAngeles.css'

export default function AmcLosAngeles({ data, searchQuery = '' }) {
  const [selectedTheaterId, setSelectedTheaterId] = useState('all')
  const amcData = useMemo(() => filterAmcLosAngelesData(data), [data])
  const visibleData = useMemo(
    () => filterAmcLosAngelesData(data, selectedTheaterId),
    [data, selectedTheaterId],
  )
  const theaters = amcData?.theaters || []
  const totalShowtimes = theaters.reduce(
    (total, theater) => total + (theater.screenings?.length || 0),
    0,
  )

  const toolbar = (
    <section className="amc-browser" aria-label="AMC Los Angeles theater filter">
      <div className="amc-browser-summary">
        <span><strong>{totalShowtimes}</strong> current showtimes</span>
        <span><strong>{theaters.length}</strong> LA-area theaters</span>
      </div>
      <div className="amc-theater-filter" role="group" aria-label="Choose an AMC theater">
        <button
          type="button"
          className={selectedTheaterId === 'all' ? 'active' : ''}
          aria-pressed={selectedTheaterId === 'all'}
          onClick={() => setSelectedTheaterId('all')}
        >
          All AMC
        </button>
        {theaters.map(theater => (
          <button
            type="button"
            key={theater.id}
            className={selectedTheaterId === theater.id ? 'active' : ''}
            aria-pressed={selectedTheaterId === theater.id}
            onClick={() => setSelectedTheaterId(theater.id)}
          >
            <span>{theater.shortName || theater.name}</span>
            <span className="amc-theater-count">{theater.screenings.length}</span>
          </button>
        ))}
      </div>
    </section>
  )

  return (
    <ByDay
      data={visibleData}
      searchQuery={searchQuery}
      eyebrow="AMC LOS ANGELES"
      title="AMC Los Angeles"
      description="Current schedules from the five AMC cinemas tracked across Los Angeles."
      headerAction={<Link to="/browse" className="browse-tonight-link">All cinemas →</Link>}
      toolbar={toolbar}
      emptyMessage="No AMC screenings are currently available for this selection."
      showScreenshotLinks={false}
      className="amc-day-view"
    />
  )
}
