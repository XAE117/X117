import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNow, getRelativeLabel, isScreeningPast } from '../utils/timeUtils.js'
import './JazzByVenue.css'

function HotBadge({ show }) {
  if (!show.hot) return null
  return <span className="jazz-hot-badge" title="LA modern jazz scene">🔥</span>
}

const TIER_LABELS = {
  dedicated: 'Club',
  regular: 'Stage',
  concert_hall: 'Hall',
  indie_scene: 'Underground',
}

function ShowRow({ show, now }) {
  const d = new Date(show.date + 'T00:00:00')
  const dateLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const relative = getRelativeLabel(show.date, show.time, now)
  const past = isScreeningPast(show.date, show.time, now)
  const navigate = useNavigate()
  const itemRef = useRef(null)

  const handleClick = (e) => {
    if (e.target.closest('a')) return
    if (itemRef.current) {
      itemRef.current.classList.remove('glow-pulse')
      void itemRef.current.offsetWidth
      itemRef.current.classList.add('glow-pulse')
    }
    setTimeout(() => navigate(`/jazz/show/${show.id}`), 300)
  }

  return (
    <li
      ref={itemRef}
      className={`jbv-show-row ${past ? 'is-past' : ''} ${show.hot ? 'is-hot' : ''}`}
      onClick={handleClick}
    >
      <span className="jbv-show-date">{dateLabel}</span>
      <span className="jbv-show-artist">
        {show.artist}
        <HotBadge show={show} />
      </span>
      {show.price && <span className="jbv-show-price">{show.price}</span>}
      <span className="jbv-show-time">{show.time || 'TBA'}</span>
      {relative && (
        <span className={`jbv-show-relative ${relative.isNow ? 'is-now' : ''}`}>{relative.label}</span>
      )}
    </li>
  )
}

function VenueCard({ venue, now }) {
  const [expanded, setExpanded] = useState(false)

  const upcomingShows = venue.shows.filter(s => !isScreeningPast(s.date, s.time, now))
  const pastShows = venue.shows.filter(s => isScreeningPast(s.date, s.time, now))
  const hotCount = venue.shows.filter(s => s.hot).length

  return (
    <div className={`jbv-card ${expanded ? 'expanded' : ''}`}>
      <button className="jbv-card-header" onClick={() => setExpanded(v => !v)}>
        <div className="jbv-card-accent" style={{ background: venue.color }} />
        <div className="jbv-card-info">
          <h3 className="jbv-card-name">{venue.name}</h3>
          <div className="jbv-card-meta">
            <span className="jbv-card-hood">{venue.neighborhood}</span>
            {venue.region === 'OC' && <span className="jazz-oc-badge">OC</span>}
            <span className={`jazz-tier-badge tier-${venue.tier}`}>{TIER_LABELS[venue.tier]}</span>
            {hotCount > 0 && <span className="jbv-hot-count">🔥 {hotCount}</span>}
          </div>
        </div>
        <div className="jbv-card-right">
          <span className="jbv-card-count">{upcomingShows.length} show{upcomingShows.length !== 1 ? 's' : ''}</span>
          <span className={`jbv-card-arrow ${expanded ? 'open' : ''}`}>&#9662;</span>
        </div>
      </button>

      {expanded && (
        <div className="jbv-card-body">
          {pastShows.length > 0 && (
            <div className="jbv-past-label">{pastShows.length} past</div>
          )}
          {upcomingShows.length === 0 ? (
            <p className="jbv-empty">No upcoming shows</p>
          ) : (
            <ul className="jbv-show-list">
              {upcomingShows.map(show => (
                <ShowRow key={show.id} show={show} now={now} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function JazzByVenue({ data }) {
  const now = useNow()

  if (!data) return null

  // Sort: dedicated first, then by number of shows descending
  const tierOrder = { dedicated: 0, regular: 1, indie_scene: 2, concert_hall: 3 }
  const sortFn = (a, b) => {
    const ta = tierOrder[a.tier] ?? 99
    const tb = tierOrder[b.tier] ?? 99
    if (ta !== tb) return ta - tb
    return b.shows.length - a.shows.length
  }

  const laVenues = data.venues.filter(v => v.region !== 'OC').sort(sortFn)
  const ocVenues = data.venues.filter(v => v.region === 'OC').sort(sortFn)

  return (
    <div className="jbv-page">
      <h2 className="jbv-title">By Venue</h2>
      <div className="jbv-grid">
        {laVenues.map(venue => (
          <VenueCard key={venue.id} venue={venue} now={now} />
        ))}
      </div>
      {ocVenues.length > 0 && (
        <>
          <div className="jbv-oc-divider">
            <span className="jbv-oc-label">Orange County</span>
          </div>
          <div className="jbv-grid">
            {ocVenues.map(venue => (
              <VenueCard key={venue.id} venue={venue} now={now} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default JazzByVenue
