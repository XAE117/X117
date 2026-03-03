import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import './Nav.css'

const TABS = [
  { to: '/', end: true, emoji: '📍', label: 'By Day' },
  { to: '/by-theater', emoji: '🏛️', label: 'Theaters' },
  { to: '/watchlist', emoji: '💛', label: 'Watchlist' },
  { to: '/map', emoji: '🗺️', label: 'Map' },
]

const JAZZ_TABS = [
  { to: '/jazz', end: true, emoji: '📍', label: 'By Day' },
  { to: '/jazz/by-venue', emoji: '🏛️', label: 'Venues' },
  { to: '/jazz/proximity', emoji: '📡', label: '°LC' },
  { to: '/jazz/map', emoji: '🗺️', label: 'Map' },
]

function Nav({ mode }) {
  const [glowTarget, setGlowTarget] = useState(null)

  const triggerGlow = (key) => {
    setGlowTarget(null)
    requestAnimationFrame(() => setGlowTarget(key))
  }

  useEffect(() => {
    if (glowTarget) {
      const timer = setTimeout(() => setGlowTarget(null), 1800)
      return () => clearTimeout(timer)
    }
  }, [glowTarget])

  const tabs = mode === 'jazz' ? JAZZ_TABS : TABS

  return (
    <nav className={`bottom-bar ${mode === 'jazz' ? 'jazz-bar' : ''}`}>
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}
          onClick={() => triggerGlow(tab.to)}
        >
          <span className={`tab-emoji ${glowTarget === tab.to ? 'tab-glow-pulse' : ''}`}>
            {tab.emoji}
          </span>
          <span className="tab-label">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export default Nav
