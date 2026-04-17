import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import './DayScreenshot.css'
import './JazzDayScreenshot.css'

function JazzDayScreenshot({ data }) {
  const { date } = useParams()
  const frameRef = useRef(null)
  const [imageUrl, setImageUrl] = useState(null)
  const [generating, setGenerating] = useState(true)
  const hasGenerated = useRef(false)

  const generateImage = useCallback(async () => {
    if (!frameRef.current) return
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

  useEffect(() => {
    if (data && !hasGenerated.current) {
      hasGenerated.current = true
      const timer = setTimeout(() => generateImage(), 300)
      return () => clearTimeout(timer)
    }
  }, [data, generateImage])

  if (!data) return null

  const targetDate = date || new Date().toLocaleDateString('en-CA')
  const d = new Date(targetDate + 'T00:00:00')
  const dayLabel = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const updatedLabel = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()

  // Collect shows for this date from all venues
  const shows = []
  data.venues.forEach(venue => {
    venue.shows.forEach(show => {
      if (show.date === targetDate) {
        shows.push({
          ...show,
          venueName: venue.shortName,
          venueColor: venue.color,
          venueRegion: venue.region,
        })
      }
    })
  })

  shows.sort((a, b) => (a.time || '').localeCompare(b.time || ''))

  return (
    <div className="ss-page">
      {/* Hidden frame — only used to generate the image */}
      <div className="ss-frame-hidden" ref={frameRef}>
        <div className="ss-corner ss-tl" />
        <div className="ss-corner ss-tr" />
        <div className="ss-corner ss-bl" />
        <div className="ss-corner ss-br" />

        <div className="ss-inner-frame">
          <div className="ss-hint">🎷</div>

          <div className="ss-divider-top">
            <span className="ss-diamond">&#10022;</span>
            <span className="ss-diamond">&middot;</span>
            <span className="ss-diamond">&#10022;</span>
          </div>

          <h1 className="ss-title">SIXPM</h1>
          <h2 className="ss-date jss-subtitle">TONIGHT'S SETS</h2>
          <h3 className="ss-date">{dayLabel}</h3>

          <div className="ss-divider">
            <span className="ss-line" />
            <span className="ss-diamond-mid">&#9670;</span>
            <span className="ss-line" />
          </div>

          {shows.length === 0 ? (
            <p className="ss-empty">No sets listed for {dayLabel}</p>
          ) : (
            <ul className="ss-list jss-list">
              {shows.map(s => (
                <li key={s.id} className="ss-item jss-item">
                  <div className="jss-row-top">
                    <span className="ss-theater" style={{ color: s.venueColor }}>
                      {s.venueName}
                      {s.venueRegion === 'OC' && <span className="jss-oc-badge">OC</span>}
                    </span>
                    <span className="ss-film">
                      {s.artist}
                      {s.hot && <span className="jss-hot-badge">🔥</span>}
                    </span>
                  </div>
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

          <p className="ss-footer-text">UPDATED {updatedLabel}</p>
        </div>
      </div>

      {/* What the user actually sees */}
      <Link to="/jazz" className="ss-back-link">&larr; Back</Link>

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
          <img src={imageUrl} alt={`${dayLabel} jazz sets`} className="ss-generated-image" />
          <p className="ss-download-hint">tap + hold to save</p>
        </div>
      )}

      <Link to="/jazz" className="ss-back-link">&larr; Back</Link>
    </div>
  )
}

export default JazzDayScreenshot
