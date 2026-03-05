import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { CalendarIcon, ColumnsIcon, HeartIcon, MapIcon, SignalIcon, FlameIcon, StarIcon } from './Icons'
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

const EATS_TABS = [
  { to: '/eats', end: true, icon: FlameIcon, label: 'Hot' },
  { to: '/eats/new', icon: StarIcon, label: 'New' },
  { to: '/eats/map', icon: MapIcon, label: 'Map' },
]

function Nav({ mode }) {
  const [expanded, setExpanded] = useState(false)
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

  const tabs = mode === 'jazz' ? JAZZ_TABS : mode === 'eats' ? EATS_TABS : TABS
  const mainTabs = tabs.slice(0, 3)
  const extraTabs = tabs.slice(3)

  return (
    <nav className={`bottom-bar ${mode === 'jazz' ? 'jazz-bar' : mode === 'eats' ? 'eats-bar' : ''} ${expanded ? 'bottom-bar--open' : ''}`}>
      {expanded && extraTabs.length > 0 && (
        <div className="bar-expand-stack">
          {extraTabs.map(tab => {
            const Icon = tab.icon
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) => `expand-tab ${isActive ? 'active' : ''}`}
                onClick={() => { triggerGlow(tab.to); setExpanded(false) }}
              >
                <span className={`tab-icon ${glowTarget === tab.to ? 'tab-glow-pulse' : ''}`}>
                  <Icon />
                </span>
                <span className="expand-tab-label">{tab.label}</span>
              </NavLink>
            )
          })}
        </div>
      )}
      <div className="bar-main-row">
        <button className="bar-toggle" onClick={() => setExpanded(!expanded)}>
          <span className={expanded ? 'bar-minus' : 'bar-plus'}>
            {expanded ? '\u2212' : '+'}
          </span>
        </button>
        <div className="bar-tabs">
          {mainTabs.map(tab => {
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
        </div>
      </div>
    </nav>
  )
}

export default Nav
