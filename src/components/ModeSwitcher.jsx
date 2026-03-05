import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FilmReelIcon, MusicNoteIcon, FlameIcon, ArrowLeftIcon } from './Icons'
import './ModeSwitcher.css'

function ModeSwitcher() {
  const location = useLocation()
  const navigate = useNavigate()
  const isJazz = location.pathname.startsWith('/jazz')
  const isEats = location.pathname.startsWith('/eats')
  const isDetailPage = location.pathname.startsWith('/screening/') || location.pathname.startsWith('/jazz/show/') || location.pathname.startsWith('/eats/spot/')
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
      const timer = setTimeout(() => setGlowTarget(null), 2200)
      return () => clearTimeout(timer)
    }
  }, [glowTarget])

  useEffect(() => {
    if (labelTarget) {
      const timer = setTimeout(() => setLabelTarget(null), 2200)
      return () => clearTimeout(timer)
    }
  }, [labelTarget])

  return (
    <div className="mode-notch">
      <Link to="/" className="mode-notch-btn" aria-label="Film listings" onClick={() => triggerGlow('film')}>
        <span className={`mode-notch-icon ${isJazz || isEats ? 'dimmed' : ''} ${glowTarget === 'film' ? 'mode-glow-pulse' : ''}`}>
          <FilmReelIcon />
        </span>
        <span className={`mode-notch-tooltip ${labelTarget === 'film' ? 'label-flash' : ''}`}>FILM</span>
      </Link>
      <Link to="/jazz" className="mode-notch-btn" aria-label="Jazz listings" onClick={() => triggerGlow('jazz')}>
        <span className={`mode-notch-icon ${isJazz ? '' : 'dimmed'} ${glowTarget === 'jazz' ? 'mode-glow-pulse' : ''}`}>
          <MusicNoteIcon />
        </span>
        <span className={`mode-notch-tooltip ${labelTarget === 'jazz' ? 'label-flash' : ''}`}>JAZZ</span>
      </Link>
      <Link to="/eats" className="mode-notch-btn" aria-label="Restaurant guide" onClick={() => triggerGlow('eats')}>
        <span className={`mode-notch-icon ${isEats ? '' : 'dimmed'} ${glowTarget === 'eats' ? 'mode-glow-pulse eats-glow' : ''}`}>
          <FlameIcon />
        </span>
        <span className={`mode-notch-tooltip ${labelTarget === 'eats' ? 'label-flash' : ''}`}>EATS</span>
      </Link>
      {isDetailPage && (
        <button className="mode-notch-btn mode-notch-back" aria-label="Go back" onClick={() => { triggerGlow('back'); navigate(-1) }}>
          <span className={`mode-notch-icon ${glowTarget === 'back' ? 'mode-glow-pulse' : ''}`}>
            <ArrowLeftIcon />
          </span>
          <span className={`mode-notch-tooltip ${labelTarget === 'back' ? 'label-flash' : ''}`}>BACK</span>
        </button>
      )}
    </div>
  )
}

export default ModeSwitcher
