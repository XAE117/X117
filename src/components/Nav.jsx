import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { CalendarIcon, ColumnsIcon, HeartIcon, MapIcon, SignalIcon } from './Icons'
import './Nav.css'

const TABS = [
  { to: '/', end: true, icon: CalendarIcon, label: 'By Day' },
  { to: '/by-theater', icon: ColumnsIcon, label: 'Theaters' },
  { to: '/watchlist', icon: HeartIcon, label: 'Watchlist' },
  { to: '/map', icon: MapIcon, label: 'Map' },
]

const JAZZ_TABS = [
  { to: '/jazz', end: true, icon: CalendarIcon, label: 'By Day' },
  { to: '/jazz/by-venue', icon: ColumnsIcon, label: 'Venues' },
  { to: '/jazz/proximity', icon: SignalIcon, label: '°LC' },
  { to: '/jazz/map', icon: MapIcon, label: 'Map' },
]

function Nav({ mode }) {
  const [glowTarget, setGlowTarget] = useState(null)

  const triggerGlow = (key) => {
    setGlowTarget(null)
    requestAnimationFrame(() => setGlowTarget(key))
  }

  useEffect(() => {
    if (glowTarget) {
      const timer = setTimeout(() => setGlowTarget(null), 2200)
      return () => clearTimeout(timer)
    }
  }, [glowTarget])

  const tabs = mode === 'jazz' ? JAZZ_TABS : TABS

  return (
    <nav className={`bottom-bar ${mode === 'jazz' ? 'jazz-bar' : ''}`}>
      {tabs.map((tab) => {
        const Icon = tab.icon
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}
            onClick={() => triggerGlow(tab.to)}
          >
            <span className={`tab-icon ${glowTarget === tab.to ? 'tab-glow-pulse' : ''}`}>
              <Icon />
            </span>
            <span className={`tab-label ${glowTarget === tab.to ? 'label-flash' : ''}`}>{tab.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

export default Nav
