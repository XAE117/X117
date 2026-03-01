import { useState, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useNow, getRelativeLabel } from '../utils/timeUtils.js'
import './DayScreenshot.css'

function FormatBadge({ format }) {
  if (!format || format === 'digital') return null
  return <span className="ss-format-badge">{format}</span>
}

function DayScreenshot({ data }) {
  const { date } = useParams()
  const now = useNow()
  const frameRef = useRef(null)
  const [imageUrl, setImageUrl] = useState(null)
  const [generating, setGenerating] = useState(false)

  const generateImage = useCallback(async () => {
    if (!frameRef.current || generating) return
    setGenerating(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(frameRef.current, {
        backgroundColor: '#0D0B0A',
        scale: 2,
        useCORS: true,
      })
      const url = canvas.toDataURL('image/png')
      setImageUrl(url)
    } catch {
      // Fallback: just let them screenshot manually
      setImageUrl(null)
    }
    setGenerating(false)
  }, [generating])

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
      <div className="ss-frame" ref={frameRef}>
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
              {screenings.map(s => {
                const relative = getRelativeLabel(s.date, s.time, now)
                return (
                  <li key={s.id} className="ss-item">
                    <span className="ss-theater" style={{ color: s.theaterColor }}>
                      {s.theaterName}
                    </span>
                    <span className="ss-film">{s.title}</span>
                    <FormatBadge format={s.format} />
                    <span className="ss-time-col">
                      {s.time && <span className="ss-time">{s.time}</span>}
                      {relative && (
                        <span className={`ss-relative ${relative.isNow ? 'is-now' : ''}`}>{relative.label}</span>
                      )}
                    </span>
                  </li>
                )
              })}
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

      <div className="ss-actions">
        <button className="ss-download-btn" onClick={generateImage} disabled={generating}>
          {generating ? 'Generating...' : 'Generate Downloadable Image'}
        </button>
      </div>

      {imageUrl && (
        <div className="ss-image-preview">
          <img src={imageUrl} alt={`${dayLabel} screenings`} className="ss-generated-image" />
          <p className="ss-download-hint">tap + hold to download</p>
          <a href={imageUrl} download={`palace-${date}.png`} className="ss-save-link">
            Save Image
          </a>
        </div>
      )}

      <Link to="/by-day" className="ss-back-link">&larr; Back to By Day</Link>
    </div>
  )
}

export default DayScreenshot
