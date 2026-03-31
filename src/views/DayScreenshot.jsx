import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import './DayScreenshot.css'

function FormatBadge({ format }) {
  if (!format || format === 'digital') return null
  return <span className="ss-format-badge">{format}</span>
}

function DayScreenshot({ data }) {
  const { date } = useParams()
  const frameRef = useRef(null)
  const [imageUrl, setImageUrl] = useState(null)
  const [generating, setGenerating] = useState(true)
  const hasGenerated = useRef(false)

  const generateImage = useCallback(async () => {
    if (!frameRef.current) return
    // Temporarily kill the body::before noise overlay — html2canvas hangs on feTurbulence SVG filters
    document.body.classList.add('no-noise')
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await Promise.race([
        html2canvas(frameRef.current, {
          backgroundColor: '#0D0B0A',
          scale: 2,
          useCORS: true,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ])
      const url = canvas.toDataURL('image/png')
      setImageUrl(url)
    } catch {
      setImageUrl(null)
    }
    document.body.classList.remove('no-noise')
    setGenerating(false)
  }, [])

  // Auto-generate the still image on mount
  useEffect(() => {
    if (data && !hasGenerated.current) {
      hasGenerated.current = true
      const timer = setTimeout(() => generateImage(), 300)
      return () => clearTimeout(timer)
    }
  }, [data, generateImage])

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
      {/* Hidden frame — only used to generate the image */}
      <div className="ss-frame-hidden" ref={frameRef}>
        <div className="ss-corner ss-tl" />
        <div className="ss-corner ss-tr" />
        <div className="ss-corner ss-bl" />
        <div className="ss-corner ss-br" />

        <div className="ss-inner-frame">
          <div className="ss-hint">📸</div>

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
                    <span className="ss-time-col">
                      {s.time && <span className="ss-time">{s.time}</span>}
                    </span>
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

      {/* What the user actually sees */}
      <Link to="/" className="ss-back-link">&larr; Back</Link>

      {generating && <p className="ss-generating-text">Generating image...</p>}

      {!generating && !imageUrl && (
        <div className="ss-generating-text">
          <p>Image generation failed — try refreshing</p>
          <button className="ss-retry-btn" onClick={() => { setGenerating(true); hasGenerated.current = false }}>
            Retry
          </button>
        </div>
      )}

      {imageUrl && (
        <div className="ss-image-preview">
          <p className="ss-download-hint">tap + hold to save</p>
          <img src={imageUrl} alt={`${dayLabel} screenings`} className="ss-generated-image" />
          <p className="ss-download-hint">tap + hold to save</p>
        </div>
      )}

      <Link to="/" className="ss-back-link">&larr; Back</Link>
    </div>
  )
}

export default DayScreenshot
