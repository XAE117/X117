import { useState, useEffect } from 'react'
import './SplashScreen.css'

function FilmReel() {
  return (
    <svg className="splash-reel" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer ring */}
      <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="3" />
      <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      {/* Center hub */}
      <circle cx="50" cy="50" r="10" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="4" fill="currentColor" />
      {/* Spokes */}
      {[0, 72, 144, 216, 288].map(angle => {
        const rad = (angle * Math.PI) / 180
        const x1 = 50 + 12 * Math.cos(rad)
        const y1 = 50 + 12 * Math.sin(rad)
        const x2 = 50 + 40 * Math.cos(rad)
        const y2 = 50 + 40 * Math.sin(rad)
        return <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      })}
      {/* Sprocket holes between spokes */}
      {[36, 108, 180, 252, 324].map(angle => {
        const rad = (angle * Math.PI) / 180
        const cx = 50 + 28 * Math.cos(rad)
        const cy = 50 + 28 * Math.sin(rad)
        return <circle key={angle} cx={cx} cy={cy} r="7" stroke="currentColor" strokeWidth="2" />
      })}
      {/* Outer sprocket notches */}
      {Array.from({ length: 24 }, (_, i) => {
        const angle = (i * 15 * Math.PI) / 180
        const x = 50 + 46 * Math.cos(angle)
        const y = 50 + 46 * Math.sin(angle)
        return <circle key={i} cx={x} cy={y} r="1.2" fill="currentColor" opacity="0.4" />
      })}
    </svg>
  )
}

function SplashScreen({ title, subtitle, onDone }) {
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 1500)
    const doneTimer = setTimeout(() => onDone(), 2500)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(doneTimer)
    }
  }, [onDone])

  return (
    <div className={`splash-screen ${fading ? 'splash-fading' : ''}`}>
      <h1 className="splash-title">{title}</h1>
      <p className="splash-subtitle">{subtitle}</p>
      <FilmReel />
    </div>
  )
}

export default SplashScreen
