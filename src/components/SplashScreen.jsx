import { useState, useEffect } from 'react'
import './SplashScreen.css'

function SplashScreen({ title, subtitle, onDone }) {
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 1500)
    const doneTimer = setTimeout(() => onDone(), 2000)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(doneTimer)
    }
  }, [onDone])

  return (
    <div className={`splash-screen ${fading ? 'splash-fading' : ''}`}>
      <h1 className="splash-title">{title}</h1>
      <p className="splash-subtitle">{subtitle}</p>
      <div className="splash-reel">🎞️</div>
    </div>
  )
}

export default SplashScreen
