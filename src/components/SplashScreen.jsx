import { useState, useEffect, useMemo } from 'react'
import './SplashScreen.css'

function FilmReel() {
  return (
    <svg className="splash-reel" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="3" />
      <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <circle cx="50" cy="50" r="10" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="4" fill="currentColor" />
      {[0, 72, 144, 216, 288].map(angle => {
        const rad = (angle * Math.PI) / 180
        return (
          <line
            key={angle}
            x1={50 + 12 * Math.cos(rad)}
            y1={50 + 12 * Math.sin(rad)}
            x2={50 + 40 * Math.cos(rad)}
            y2={50 + 40 * Math.sin(rad)}
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        )
      })}
      {[36, 108, 180, 252, 324].map(angle => {
        const rad = (angle * Math.PI) / 180
        return (
          <circle
            key={angle}
            cx={50 + 28 * Math.cos(rad)}
            cy={50 + 28 * Math.sin(rad)}
            r="7"
            stroke="currentColor"
            strokeWidth="2"
          />
        )
      })}
    </svg>
  )
}

function SplashScreen({ title, subtitle, onDone }) {
  const [fading, setFading] = useState(false)

  const stars = useMemo(() =>
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      delay: Math.random() * 3,
      duration: 1.5 + Math.random() * 2,
    })), []
  )

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 750)
    const doneTimer = setTimeout(() => onDone(), 1250)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(doneTimer)
    }
  }, [onDone])

  return (
    <div className={`splash-screen ${fading ? 'splash-fading' : ''}`}>
      {stars.map(s => (
        <div
          key={s.id}
          className="splash-star"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        />
      ))}
      <h1 className="splash-title">{title}</h1>
      <p className="splash-subtitle">{subtitle}</p>
      <FilmReel />
    </div>
  )
}

export default SplashScreen
