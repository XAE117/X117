import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import './FormatFilter.css'

const JAZZ_NAV = [
  { to: '/jazz', end: true, emoji: '🌙', label: 'TONIGHT' },
  { to: '/jazz/by-venue', emoji: '🏛️', label: 'VENUES' },
  { to: '/jazz/proximity', emoji: '📡', label: '°LC' },
]

function JazzQuickNav({ expanded }) {
  const location = useLocation()
  const [glowTarget, setGlowTarget] = useState(null)
  const [labelTarget, setLabelTarget] = useState(null)

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

  const triggerLabel = (key) => {
    setLabelTarget(key)
    setTimeout(() => setLabelTarget(null), 1200)
  }

  const handleClick = (to) => {
    triggerGlow(to)
    if (!expanded) triggerLabel(to)
  }

  if (expanded) {
    return (
      <div className="filter-emoji-stack">
        {JAZZ_NAV.map((item, i) => {
          const isActive = item.end
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to)
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={`filter-emoji-row ${isActive ? 'active' : ''}`}
              onClick={() => handleClick(item.to)}
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <span className={`filter-emoji ${glowTarget === item.to ? 'filter-glow-pulse' : ''} ${isActive ? '' : 'dimmed'}`}>
                {item.emoji}
              </span>
              <span className="filter-emoji-label">{item.label}</span>
            </NavLink>
          )
        })}
      </div>
    )
  }

  return (
    <div className="filter-emoji-bar">
      {JAZZ_NAV.map(item => {
        const isActive = item.end
          ? location.pathname === item.to
          : location.pathname.startsWith(item.to)
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className="filter-emoji-btn"
            onClick={() => handleClick(item.to)}
          >
            <span className={`filter-emoji ${glowTarget === item.to ? 'filter-glow-pulse' : ''} ${isActive ? '' : 'dimmed'}`}>
              {item.emoji}
            </span>
            {labelTarget === item.to && (
              <span className="filter-emoji-tooltip">{item.label}</span>
            )}
          </NavLink>
        )
      })}
    </div>
  )
}

export default JazzQuickNav
