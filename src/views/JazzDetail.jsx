import { useParams, useNavigate } from 'react-router-dom'
import { useNow, getRelativeLabel } from '../utils/timeUtils.js'
import './JazzDetail.css'

const TIER_LABELS = {
  dedicated: 'Club',
  regular: 'Stage',
  concert_hall: 'Hall',
  indie_scene: 'Underground',
}

function JazzDetail({ data }) {
  const { showId } = useParams()
  const navigate = useNavigate()
  const now = useNow()

  if (!data) return null

  // Find the show across all venues
  let show = null
  let venue = null
  for (const v of data.venues) {
    const found = v.shows.find(s => s.id === showId)
    if (found) {
      show = found
      venue = v
      break
    }
  }

  if (!show || !venue) {
    return (
      <div className="jazz-detail-page">
        <div className="jazz-detail-not-found">
          <h2>Show not found</h2>
          <p>This show may no longer be listed.</p>
          <button className="jazz-detail-back" onClick={() => navigate(-1)}>
            &larr; Go Back
          </button>
        </div>
      </div>
    )
  }

  const d = new Date(show.date + 'T00:00:00')
  const dateLabel = d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const relative = getRelativeLabel(show.date, show.time, now)

  return (
    <div className="jazz-detail-page">
      <button className="jazz-detail-back" onClick={() => navigate(-1)}>
        &larr; Back
      </button>

      <div className="jazz-detail-card">
        <div className="jazz-detail-accent" style={{ background: venue.color }} />

        <div className="jazz-detail-content">
          <h1 className="jazz-detail-artist">
            {show.artist}
            {show.hot && <span className="jazz-hot-badge-lg">🔥</span>}
          </h1>

          {show.hot && (
            <p className="jazz-detail-hot-note">Part of LA's modern jazz scene</p>
          )}

          <div className="jazz-detail-meta">
            <a
              href={venue.url}
              target="_blank"
              rel="noopener noreferrer"
              className="jazz-detail-venue-name"
              style={{ color: venue.color }}
            >
              {venue.name}
            </a>
            <span className="jazz-detail-hood">{venue.neighborhood}</span>
            <span className={`jazz-tier-badge tier-${venue.tier}`}>{TIER_LABELS[venue.tier]}</span>
          </div>

          <div className="jazz-detail-info-grid">
            <div className="jazz-detail-info-item">
              <span className="jazz-detail-label">Date</span>
              <span className="jazz-detail-value">{dateLabel}</span>
            </div>
            <div className="jazz-detail-info-item">
              <span className="jazz-detail-label">Time</span>
              <span className="jazz-detail-value">{show.time || 'TBA'}</span>
              {relative && (
                <span className={`jazz-detail-relative ${relative.isNow ? 'is-now' : ''}`}>{relative.label}</span>
              )}
            </div>
          </div>

          {show.notes && (
            <div className="jazz-detail-notes">
              <span className="jazz-detail-label">Notes</span>
              <p className="jazz-detail-notes-text">{show.notes}</p>
            </div>
          )}

          {show.promoter && (
            <div className="jazz-detail-promoter">
              Presented by <strong>{show.promoter}</strong>
            </div>
          )}

          <div className="jazz-detail-actions">
            {show.link && (
              <a
                href={show.link}
                target="_blank"
                rel="noopener noreferrer"
                className="jazz-ticket-btn"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15,3 21,3 21,9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                {venue.tier === 'indie_scene' ? 'View on Minaret' : 'Get Tickets'}
              </a>
            )}
            <a
              href={venue.url}
              target="_blank"
              rel="noopener noreferrer"
              className="jazz-venue-btn"
            >
              View Venue Site
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default JazzDetail
