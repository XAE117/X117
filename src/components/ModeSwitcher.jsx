import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './ModeSwitcher.css'

function ModeSwitcher() {
  const location = useLocation()
  const isJazz = location.pathname.startsWith('/jazz')
  const [glowTarget, setGlowTarget] = useState(null)
  const [labelTarget, setLabelTarget] = useState(null)

  const triggerGlow = (target) => {
    setGlowTarget(null)
    setLabelTarget(null)
    requestAnimationFrame(() => {
      setGlowTarget(target)
      setLabelTarget(target)
    })
  }

  useEffect(() => {
    if (glowTarget) {
      const timer = setTimeout(() => setGlowTarget(null), 1800)
      return () => clearTimeout(timer)
    }
  }, [glowTarget])

  useEffect(() => {
    if (labelTarget) {
      const timer = setTimeout(() => setLabelTarget(null), 1200)
      return () => clearTimeout(timer)
    }
  }, [labelTarget])

  const isFood = location.pathname.startsWith('/food') || location.pathname === '/guide'
  return (
    <div className="mode-notch">
      <Link to="/" className="mode-notch-btn" aria-label="Film listings" onClick={() => triggerGlow('film')}>
        <span className={`mode-notch-emoji ${!isJazz && !isFood ? '' : 'dimmed'} ${glowTarget === 'film' ? 'mode-glow-pulse glow-blue' : ''}`}>🎞️</span>
        {labelTarget === 'film' && <span className="mode-notch-tooltip">FILM</span>}
      </Link>
      <Link to="/jazz" className="mode-notch-btn" aria-label="Jazz listings" onClick={() => triggerGlow('jazz')}>
        <span className={`mode-notch-emoji ${isJazz ? '' : 'dimmed'} ${glowTarget === 'jazz' ? 'mode-glow-pulse glow-green' : ''}`}>🎺</span>
        {labelTarget === 'jazz' && <span className="mode-notch-tooltip">JAZZ</span>}
      </Link>
      <Link to="/food" className="mode-notch-btn" aria-label="Food listings" onClick={() => triggerGlow('food')}>
        <span className={`mode-notch-emoji ${isFood ? '' : 'dimmed'} ${glowTarget === 'food' ? 'mode-glow-pulse glow-red' : ''}`}>🍕</span>
        {labelTarget === 'food' && <span className="mode-notch-tooltip">FOOD</span>}
      </Link>
    </div>
  )
}

export default ModeSwitcher
