import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import './ModeSwitcher.css'

function ModeSwitcher() {
  const location = useLocation()
  const navigate = useNavigate()
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

  return (
    <div className="mode-notch">
      <Link to="/" className="mode-notch-btn" aria-label="Film listings" onClick={() => triggerGlow('film')}>
        <span className={`mode-notch-emoji ${isJazz ? 'dimmed' : ''} ${glowTarget === 'film' ? 'mode-glow-pulse' : ''}`}>🎞️</span>
        {labelTarget === 'film' && <span className="mode-notch-tooltip">FILM</span>}
      </Link>
      <Link to="/jazz" className="mode-notch-btn" aria-label="Jazz listings" onClick={() => triggerGlow('jazz')}>
        <span className={`mode-notch-emoji ${isJazz ? '' : 'dimmed'} ${glowTarget === 'jazz' ? 'mode-glow-pulse' : ''}`}>🥁</span>
        {labelTarget === 'jazz' && <span className="mode-notch-tooltip">JAZZ</span>}
      </Link>
      <button className="mode-notch-btn mode-notch-back" aria-label="Go back" onClick={() => { triggerGlow('back'); navigate(-1) }}>
        <span className={`mode-notch-emoji ${glowTarget === 'back' ? 'mode-glow-pulse' : ''}`}>🔙</span>
        {labelTarget === 'back' && <span className="mode-notch-tooltip">BACK</span>}
      </button>
    </div>
  )
}

export default ModeSwitcher
