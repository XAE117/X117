import { useParams, useNavigate } from 'react-router-dom'
import './Detail.css'

function generateICS(screening, theater) {
  const [year, month, day] = screening.date.split('-')
  let startHour = 19, startMin = 0

  if (screening.time) {
    const match = screening.time.match(/(\d+):(\d+)\s*(AM|PM)?/i)
    if (match) {
      startHour = parseInt(match[1], 10)
      startMin = parseInt(match[2], 10)
      const period = (match[3] || '').toUpperCase()
      if (period === 'PM' && startHour !== 12) startHour += 12
      if (period === 'AM' && startHour === 12) startHour = 0
    }
  }

  const pad = (n) => String(n).padStart(2, '0')
  const dtStart = `${year}${pad(month)}${pad(day)}T${pad(startHour)}${pad(startMin)}00`

  // Assume ~2.5 hour screening
  const endDate = new Date(
    parseInt(year), parseInt(month) - 1, parseInt(day),
    startHour, startMin + 150
  )
  const dtEnd = `${endDate.getFullYear()}${pad(endDate.getMonth() + 1)}${pad(endDate.getDate())}T${pad(endDate.getHours())}${pad(endDate.getMinutes())}00`

  const escapeText = (text) => text.replace(/[\\;,]/g, (c) => '\\' + c).replace(/\n/g, '\\n')

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//THE PALACE//Cinema Calendar//EN',
    'BEGIN:VEVENT',
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeText(screening.title)}`,
    `LOCATION:${escapeText(theater.name)}`,
    `DESCRIPTION:${escapeText([
      screening.format ? `Format: ${screening.format}` : '',
      screening.notes || '',
      screening.link ? `Tickets: ${screening.link}` : '',
    ].filter(Boolean).join('\\n'))}`,
    screening.link ? `URL:${screening.link}` : '',
    `UID:${screening.id}@thepalace`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)

  return lines.join('\r\n')
}

function downloadICS(screening, theater) {
  const ics = generateICS(screening, theater)
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${screening.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function Detail({ data, favorites = [], onToggleFavorite }) {
  const { screeningId } = useParams()
  const navigate = useNavigate()

  let screening = null
  let theater = null

  if (data) {
    for (const t of data.theaters) {
      const found = t.screenings.find(s => s.id === screeningId)
      if (found) {
        screening = found
        theater = t
        break
      }
    }
  }

  if (!screening || !theater) {
    return (
      <div className="detail-not-found">
        <h2>Screening Not Found</h2>
        <p>This screening may no longer be available.</p>
        <button className="back-btn" onClick={() => navigate(-1)}>
          &larr; Go Back
        </button>
      </div>
    )
  }

  const isFav = favorites.includes(screening.id)

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="detail-page">
      <button className="back-btn" onClick={() => navigate(-1)}>
        &larr; Back
      </button>

      <div className="detail-card">
        <div className="detail-corner tl" />
        <div className="detail-corner tr" />
        <div className="detail-corner bl" />
        <div className="detail-corner br" />

        <div className="detail-accent-bar" style={{ background: theater.color }} />

        <div className="detail-title-row">
          <h1 className="detail-title">{screening.title}</h1>
          <button
            className={`detail-fav-btn ${isFav ? 'is-fav' : ''}`}
            onClick={() => onToggleFavorite(screening.id)}
            title={isFav ? 'Remove from saved' : 'Save screening'}
          >
            {isFav ? '\u2605' : '\u2606'}
          </button>
        </div>

        <div className="detail-meta">
          <a
            href={theater.url}
            target="_blank"
            rel="noopener noreferrer"
            className="detail-theater-name"
            style={{ color: theater.color }}
          >
            {theater.name}
          </a>
          <span className="detail-neighborhood">{theater.neighborhood}</span>
        </div>

        <div className="detail-info-grid">
          <div className="detail-info-item">
            <span className="detail-label">Date</span>
            <span className="detail-value">{formatDate(screening.date)}</span>
          </div>
          <div className="detail-info-item">
            <span className="detail-label">Time</span>
            <span className="detail-value">{screening.time}</span>
          </div>
          {screening.format && (
            <div className="detail-info-item">
              <span className="detail-label">Format</span>
              <span className="detail-format-badge">{screening.format}</span>
            </div>
          )}
        </div>

        {screening.notes && (
          <div className="detail-notes">
            <span className="detail-label">Notes</span>
            <p className="detail-notes-text">{screening.notes}</p>
          </div>
        )}

        <div className="detail-actions">
          {screening.link && (
            <a
              href={screening.link}
              target="_blank"
              rel="noopener noreferrer"
              className="ticket-btn"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15,3 21,3 21,9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Get Tickets
            </a>
          )}
          <button
            className="calendar-btn"
            onClick={() => downloadICS(screening, theater)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Add to Calendar
          </button>
        </div>
      </div>
    </div>
  )
}

export default Detail
