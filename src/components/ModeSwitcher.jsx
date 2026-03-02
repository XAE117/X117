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

  // Clear glow state after animation finishes (0.2s in + 1.5s out = 1.7s)
  useEffect(() => {
    if (glowTarget) {
      const timer = setTimeout(() => setGlowTarget(null), 1800)
      return () => clearTimeout(timer)
    }
  }, [glowTarget])

  return (
    <div className="mode-switcher">
      <div className="mode-switcher-inner">
        <Link to="/" className="mode-icon" aria-label="Switch to film listings" onClick={() => triggerGlow('film')}>
          <span className={`mode-emoji ${isJazz ? 'dimmed' : ''} ${glowTarget === 'film' ? 'mode-glow-pulse' : ''}`} aria-hidden="true">🎞️</span>
          <span className={`mode-label ${isJazz ? 'dimmed' : ''}`}>Film</span>
        </Link>
        <span className="mode-divider" aria-hidden="true" />
        <Link to="/jazz" className="mode-icon" aria-label="Switch to jazz listings" onClick={() => triggerGlow('jazz')}>
          <span className={`mode-emoji ${isJazz ? '' : 'dimmed'} ${glowTarget === 'jazz' ? 'mode-glow-pulse' : ''}`} aria-hidden="true">🎺</span>
          <span className={`mode-label ${isJazz ? '' : 'dimmed'}`}>Jazz</span>
        </Link>
      </div>
    </div>
  )
}

export default ModeSwitcher
