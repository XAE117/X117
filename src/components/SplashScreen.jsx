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


function SplashScreen({ title, subtitle, onDone, isJazz }) {
  const [fading, setFading] = useState(false)

  const stars = useMemo(() =>
    Array.from({ length: 60 }, (_, i) => {
      const size = Math.random() * 2.5 + 0.5
      return {
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size,
        delay: Math.random() * 2,
        duration: 2.0 + Math.random() * 3.0,
        bright: size > 1.8,
      }
    }), []
  )

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 2300)
    const doneTimer = setTimeout(() => onDone(), 4000)
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
          className={`splash-star ${s.bright ? 'splash-star-bright' : ''}`}
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
      {isJazz ? (
        <div className="splash-reels-duo">
          <FilmReel />
          <FilmReel />
        </div>
      ) : (
        <FilmReel />
      )}
    </div>
  )
}

export default SplashScreen
