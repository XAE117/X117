import { NavLink } from 'react-router-dom'
import './Nav.css'

function Nav({ thisWeekOnly, onToggleThisWeek }) {
  return (
    <nav className="palace-nav">
      <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
        By Theater
      </NavLink>
      <span className="nav-diamond">&#9670;</span>
      <NavLink to="/by-day" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
        By Day
      </NavLink>
      <span className="nav-diamond">&#9670;</span>
      <NavLink to="/search" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
        Search
      </NavLink>
      <span className="nav-diamond">&#9670;</span>
      <button
        className={`nav-link nav-btn ${thisWeekOnly ? 'active' : ''}`}
        onClick={onToggleThisWeek}
      >
        This Week
      </button>
    </nav>
  )
}

export default Nav
