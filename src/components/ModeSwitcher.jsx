import { Link, useLocation } from 'react-router-dom'
import './ModeSwitcher.css'

function ModeSwitcher() {
  const location = useLocation()
  const isJazz = location.pathname.startsWith('/jazz')

  return (
    <div className="mode-switcher">
      <div className="mode-switcher-inner">
        <Link to="/" className="mode-icon">
          <span className={`mode-emoji ${isJazz ? 'dimmed' : ''}`}>🎞️</span>
        </Link>
        <span className="mode-divider" />
        <Link to="/jazz" className="mode-icon">
          <span className={`mode-emoji ${isJazz ? '' : 'dimmed'}`}>🎺</span>
        </Link>
      </div>
    </div>
  )
}

export default ModeSwitcher
