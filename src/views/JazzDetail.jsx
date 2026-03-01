import { useParams, useNavigate } from 'react-router-dom'
import { useNow, getRelativeLabel } from '../utils/timeUtils.js'
import './JazzDetail.css'

const TIER_LABELS = {
  dedicated: 'Club',
  regular: 'Stage',
  concert_hall: 'Hall',
  indie_scene: 'Underground',
}

const TIER_DESCRIPTIONS = {
  dedicated: 'Dedicated jazz club with nightly programming',
  regular: 'Venue with regular jazz programming',
  concert_hall: 'Concert hall with occasional jazz events',
  indie_scene: 'Part of LA\'s underground modern jazz circuit',
}

function generateICS(show, venue) {
  const formatDateTime = (dateStr, timeStr) => {
    const [year, month, day] = dateStr.split('-')
    let [time, period] = (timeStr || '8:00 PM').trim().split(/\s+/)
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

  const firstTime = (show.time || '8:00 PM').split('/')[0].trim()
  const start = formatDateTime(show.date, firstTime)
  const end = addHours(start, 2.5)

  const escapeICS = (str) => (str || '').replace(/[\\;,]/g, (m) => '\\' + m).replace(/\n/g, '\\n')

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Liza\'s Palace//EN',
    'BEGIN:VEVENT',
    `DTSTART;TZID=America/Los_Angeles:${start}`,
    `DTEND;TZID=America/Los_Angeles:${end}`,
    `SUMMARY:${escapeICS(show.artist)}`,
    `LOCATION:${escapeICS(venue.name)}\\, ${escapeICS(venue.neighborhood)}`,
    `DESCRIPTION:${show.notes ? escapeICS(show.notes) + '\\n' : ''}${show.link || ''}`,
    show.link ? `URL:${show.link}` : '',
    `UID:${show.id}@lizaspalace-jazz`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean).join('\r\n')

  const blob = new Blob([lines], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${show.artist.replace(/[^a-zA-Z0-9]/g, '-')}.ics`
  a.click()
  URL.revokeObjectURL(url)
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

          {show.description && (
            <p className="jazz-detail-description">{show.description}</p>
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
            {venue.region === 'OC' && <span className="jazz-oc-badge-detail">OC</span>}
            <span className={`jazz-tier-badge tier-${venue.tier}`}>{TIER_LABELS[venue.tier]}</span>
          </div>

          <p className="jazz-detail-venue-desc">{TIER_DESCRIPTIONS[venue.tier]}</p>

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
            {show.price && (
              <div className="jazz-detail-info-item">
                <span className="jazz-detail-label">Price</span>
                <span className="jazz-detail-value">{show.price}</span>
              </div>
            )}
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
            <button
              className="jazz-calendar-btn"
              onClick={() => generateICS(show, venue)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Add to Calendar
            </button>
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
