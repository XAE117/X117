import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './ModeSwitcher.css'

function ModeSwitcher() {
  const location = useLocation()
  const isJazz = location.pathname.startsWith('/jazz')
  const [glowTarget, setGlowTarget] = useState(null)

  const triggerGlow = (target) => {
    setGlowTarget(null)
    requestAnimationFrame(() => setGlowTarget(target))
  }

  useEffect(() => {
    if (glowTarget) {
      const timer = setTimeout(() => setGlowTarget(null), 1800)
      return () => clearTimeout(timer)
    }
  }, [glowTarget])

  return (
    <div className="mode-notch">
      <Link to="/" className="mode-notch-btn" aria-label="Film listings" onClick={() => triggerGlow('film')}>
        <span className={`mode-notch-emoji ${isJazz ? 'dimmed' : ''} ${glowTarget === 'film' ? 'mode-glow-pulse' : ''}`}>🎞️</span>
      </Link>
      <Link to="/jazz" className="mode-notch-btn" aria-label="Jazz listings" onClick={() => triggerGlow('jazz')}>
        <span className={`mode-notch-emoji ${isJazz ? '' : 'dimmed'} ${glowTarget === 'jazz' ? 'mode-glow-pulse' : ''}`}>🎺</span>
      </Link>
    </div>
  )
}

export default ModeSwitcher
