import { NavLink } from 'react-router-dom'
import './Nav.css'

function Nav({ mode }) {
  if (mode === 'jazz') {
    return (
      <nav className="bottom-bar jazz-bar">
        <NavLink to="/jazz" end className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="tab-icon">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className="tab-label">By Day</span>
        </NavLink>
        <NavLink to="/jazz/by-venue" className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="tab-icon">
            <path d="M3 21h18" />
            <path d="M5 21V7l7-4 7 4v14" />
            <path d="M9 21v-6h6v6" />
          </svg>
          <span className="tab-label">Venues</span>
        </NavLink>
        <NavLink to="/jazz/proximity" className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="tab-icon">
            <circle cx="12" cy="12" r="3" />
            <circle cx="12" cy="12" r="8" opacity="0.4" />
          </svg>
          <span className="tab-label">LC &#8451;</span>
        </NavLink>
        <NavLink to="/jazz/map" className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="tab-icon">
            <polygon points="1,6 1,22 8,18 16,22 23,18 23,2 16,6 8,2" />
            <line x1="8" y1="2" x2="8" y2="18" />
            <line x1="16" y1="6" x2="16" y2="22" />
          </svg>
          <span className="tab-label">Map</span>
        </NavLink>
      </nav>
    )
  }

  return (
    <nav className="bottom-bar">
      <NavLink to="/" end className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="tab-icon">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span className="tab-label">By Day</span>
      </NavLink>
      <NavLink to="/by-theater" className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="tab-icon">
          <path d="M3 21h18" />
          <path d="M5 21V7l7-4 7 4v14" />
          <path d="M9 21v-6h6v6" />
        </svg>
        <span className="tab-label">Theaters</span>
      </NavLink>
      <NavLink to="/watchlist" className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="tab-icon">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        <span className="tab-label">Watchlist</span>
      </NavLink>
      <NavLink to="/map" className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="tab-icon">
          <polygon points="1,6 1,22 8,18 16,22 23,18 23,2 16,6 8,2" />
          <line x1="8" y1="2" x2="8" y2="18" />
          <line x1="16" y1="6" x2="16" y2="22" />
        </svg>
        <span className="tab-label">Map</span>
      </NavLink>
    </nav>
  )
}

export default Nav
