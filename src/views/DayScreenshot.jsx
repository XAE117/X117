import { useParams, Link } from 'react-router-dom'
import './DayScreenshot.css'

function FormatBadge({ format }) {
  if (!format || format === 'digital') return null
  return <span className="ss-format-badge">{format}</span>
}

function DayScreenshot({ data }) {
  const { date } = useParams()

  if (!data) return null

  const d = new Date(date + 'T00:00:00')
  const dayLabel = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  // Collect screenings for this date
  const screenings = []
  data.theaters.forEach(theater => {
    theater.screenings.forEach(s => {
      if (s.date === date) {
        screenings.push({
          ...s,
          theaterName: theater.shortName,
          theaterColor: theater.color,
        })
      }
    })
  })

  screenings.sort((a, b) => (a.time || '').localeCompare(b.time || ''))

  return (
    <div className="ss-page">
      <div className="ss-frame">
        {/* Decorative corner ornaments */}
        <div className="ss-corner ss-tl" />
        <div className="ss-corner ss-tr" />
        <div className="ss-corner ss-bl" />
        <div className="ss-corner ss-br" />

        {/* Inner decorative border */}
        <div className="ss-inner-frame">
          <div className="ss-hint">&#128248;</div>

          <div className="ss-divider-top">
            <span className="ss-diamond">&#9670;</span>
            <span className="ss-diamond">&#9670;</span>
            <span className="ss-diamond">&#9670;</span>
          </div>

          <h1 className="ss-title">LIZA'S PALACE</h1>
          <h2 className="ss-date">{dayLabel}</h2>

          <div className="ss-divider">
            <span className="ss-line" />
            <span className="ss-diamond-mid">&#9670;</span>
            <span className="ss-line" />
          </div>

          {screenings.length === 0 ? (
            <p className="ss-empty">No screenings this day</p>
          ) : (
            <ul className="ss-list">
              {screenings.map(s => (
                <li key={s.id} className="ss-item">
                  <span className="ss-theater" style={{ color: s.theaterColor }}>
                    {s.theaterName}
                  </span>
                  <span className="ss-film">{s.title}</span>
                  <FormatBadge format={s.format} />
                  {s.time && <span className="ss-time">{s.time}</span>}
                </li>
              ))}
            </ul>
          )}

          <div className="ss-divider-bottom">
            <span className="ss-line" />
            <span className="ss-diamond-mid">&#9670;</span>
            <span className="ss-line" />
          </div>

          <p className="ss-footer-text">xae117.github.io/X117</p>
        </div>
      </div>

      <Link to="/by-day" className="ss-back-link">&larr; Back to By Day</Link>
    </div>
  )
}

export default DayScreenshot
