import { NavLink, useLocation } from 'react-router-dom'
import { useAppDataContext } from '../context/useAppDataContext'
import { useAppUIContext } from '../context/useAppUIContext'

const PRIMARY_NAV = [
  { to: '/', end: true, label: 'Tonight' },
  { to: '/browse', label: 'Film' },
  { to: '/jazz', label: 'Jazz' },
  { to: '/food', label: 'Food' },
  { to: '/roll', label: 'Roll' },
]

const CINEMA_NAV = [
  { to: '/browse', label: 'By day' },
  { to: '/tonight', label: 'After 5' },
  { to: '/by-theater', label: 'Theaters' },
  { to: '/watchlist', label: 'Watchlist' },
  { to: '/map', label: 'Map' },
]

const JAZZ_NAV = [
  { to: '/jazz', end: true, label: 'By day' },
  { to: '/jazz/tonight', label: 'Tonight' },
  { to: '/jazz/by-venue', label: 'Venues' },
  { to: '/jazz/proximity', label: 'Nearby' },
  { to: '/jazz/map', label: 'Map' },
  { to: '/jazz/bio', label: 'Feature' },
]

const FOOD_NAV = [
  { to: '/food', end: true, label: 'All' },
  { to: '/food/tacos', label: 'Tacos' },
  { to: '/food/pizza', label: 'Pizza' },
  { to: '/food/starred', label: 'Starred' },
  { to: '/food/map', label: 'Neighborhoods' },
  { to: '/guide', label: 'Guide' },
]

function navClass({ isActive }) {
  return `site-nav-link${isActive ? ' active' : ''}`
}

export default function TopBar() {
  const location = useLocation()
  const { refreshing, fetchData } = useAppDataContext()
  const { isJazz, isFood, isGuide, isRoll } = useAppUIContext()
  const isCinema = !isJazz && !isFood && !isGuide && !isRoll
  const contextual = isJazz ? JAZZ_NAV : (isFood || isGuide) ? FOOD_NAV : isCinema ? CINEMA_NAV : []

  return (
    <header className="site-header">
      <div className="site-header-main">
        <NavLink to="/" className="site-brand" aria-label="SIXPM home">sixpm</NavLink>
        <nav className="site-primary-nav" aria-label="Primary">
          {PRIMARY_NAV.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="site-header-actions">
          <NavLink to="/search" className="site-search-link" aria-label="Search film, jazz, and food">
            Search
          </NavLink>
          <button
            className={`site-refresh-btn ${refreshing ? 'refreshing' : ''}`}
            onClick={() => fetchData(true)}
            disabled={refreshing}
            aria-label="Refresh listings"
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {contextual.length > 0 && (
        <nav className="site-context-nav" aria-label="Current section">
          {contextual.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `site-context-link${isActive ? ' active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
          <span className="site-route-context" aria-hidden="true">{location.pathname}</span>
        </nav>
      )}
    </header>
  )
}
