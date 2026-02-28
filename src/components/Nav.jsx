import { NavLink } from 'react-router-dom'
import './Nav.css'

function Nav({ hasTonightScreenings }) {
  return (
    <nav className="palace-nav">
      <NavLink to="/tonight" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''} ${hasTonightScreenings ? 'tonight-active' : ''}`}>
        Tonight
        {hasTonightScreenings && <span className="nav-tonight-dot" />}
      </NavLink>
      <span className="nav-diamond">&#9670;</span>
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
