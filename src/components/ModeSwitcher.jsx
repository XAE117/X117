import { useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './ModeSwitcher.css'

function ModeSwitcher() {
  const location = useLocation()
  const isJazz = location.pathname.startsWith('/jazz')
  const filmRef = useRef(null)
  const jazzRef = useRef(null)

  const triggerGlow = (ref) => {
    if (!ref.current) return
    ref.current.classList.remove('mode-glow-pulse')
    void ref.current.offsetWidth
    ref.current.classList.add('mode-glow-pulse')
  }

  return (
    <div className="mode-switcher">
      <div className="mode-switcher-inner">
        <Link to="/" className="mode-icon" aria-label="Switch to film listings" onClick={() => triggerGlow(filmRef)}>
          <span ref={filmRef} className={`mode-emoji ${isJazz ? 'dimmed' : ''}`} aria-hidden="true">🎞️</span>
          <span className={`mode-label ${isJazz ? 'dimmed' : ''}`}>Film</span>
        </Link>
        <span className="mode-divider" aria-hidden="true" />
        <Link to="/jazz" className="mode-icon" aria-label="Switch to jazz listings" onClick={() => triggerGlow(jazzRef)}>
          <span ref={jazzRef} className={`mode-emoji ${isJazz ? '' : 'dimmed'}`} aria-hidden="true">🎺</span>
          <span className={`mode-label ${isJazz ? '' : 'dimmed'}`}>Jazz</span>
        </Link>
      </div>
    </div>
  )
}

export default ModeSwitcher
