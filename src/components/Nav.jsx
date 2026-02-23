import { NavLink } from 'react-router-dom'
import './Nav.css'

function Nav() {
  return (
    <nav className="palace-nav">
      <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
        Dashboard
      </NavLink>
      <span className="nav-diamond">&#9670;</span>
      <NavLink to="/by-theater" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
        By Theater
      </NavLink>
      <span className="nav-diamond">&#9670;</span>
      <NavLink to="/by-month" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
        By Month
      </NavLink>
    </nav>
  )
}

export default Nav
