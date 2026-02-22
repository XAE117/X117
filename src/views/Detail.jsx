import { useParams, useNavigate } from 'react-router-dom'
import './Detail.css'

function Detail({ data }) {
  const { screeningId } = useParams()
  const navigate = useNavigate()

  // Find the screening and its theater
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

        <h1 className="detail-title">{screening.title}</h1>

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
      </div>
    </div>
  )
}

export default Detail
