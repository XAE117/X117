import { NavLink } from 'react-router-dom'
import './Nav.css'

function Nav({ hasTonightScreenings, mode }) {
  if (mode === 'jazz') {
    return (
      <nav className="palace-nav jazz-nav">
        <NavLink to="/jazz/tonight" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''} ${hasTonightScreenings ? 'tonight-active' : ''}`}>
          Tonight
          {hasTonightScreenings && <span className="nav-tonight-dot jazz-dot" />}
        </NavLink>
        <span className="nav-diamond jazz-diamond">&#9670;</span>
        <NavLink to="/jazz" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          By Day
        </NavLink>
        <span className="nav-diamond jazz-diamond">&#9670;</span>
        <NavLink to="/jazz/by-venue" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          By Venue
        </NavLink>
      </nav>
    )
  }

  return (
    <nav className="palace-nav">
      <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
        By Day
      </NavLink>
      <span className="nav-diamond">&#9670;</span>
      <NavLink to="/by-theater" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
        By Theater
      </NavLink>
      <span className="nav-diamond">&#9670;</span>
      <NavLink to="/watchlist" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
        {'\u2665'}
      </NavLink>
      <span className="nav-diamond">&#9670;</span>
      <NavLink to="/map" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
        Map
      </NavLink>
    </nav>
  )
}

export default Nav
