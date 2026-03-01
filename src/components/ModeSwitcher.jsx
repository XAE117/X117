import { Link, useLocation } from 'react-router-dom'
import './ModeSwitcher.css'

function ModeSwitcher() {
  const location = useLocation()
  const isJazz = location.pathname.startsWith('/jazz')

  return (
    <div className="mode-switcher">
      <div className="mode-switcher-inner">
        <Link to="/" className="mode-icon" aria-label="Switch to film listings">
          <span className={`mode-emoji ${isJazz ? 'dimmed' : ''}`} aria-hidden="true">🎞️</span>
          <span className={`mode-label ${isJazz ? 'dimmed' : ''}`}>Film</span>
        </Link>
        <span className="mode-divider" aria-hidden="true" />
        <Link to="/jazz" className="mode-icon" aria-label="Switch to jazz listings">
          <span className={`mode-emoji ${isJazz ? '' : 'dimmed'}`} aria-hidden="true">🎺</span>
          <span className={`mode-label ${isJazz ? '' : 'dimmed'}`}>Jazz</span>
        </Link>
      </div>
    </div>
  )
}

export default ModeSwitcher
