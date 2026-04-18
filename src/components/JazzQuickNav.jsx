import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { CalendarIcon, ColumnsIcon, SignalIcon, MusicNoteIcon } from './Icons'
import './FormatFilter.css'

const JAZZ_NAV = [
  { to: '/jazz', end: true, icon: CalendarIcon, label: 'BY DAY' },
  { to: '/jazz/by-venue', icon: ColumnsIcon, label: 'VENUES' },
  { to: '/jazz/proximity', icon: SignalIcon, label: '°LC' },
  { to: '/jazz/bio', icon: MusicNoteIcon, label: 'LC BIO' },
]

function JazzQuickNav({ expanded }) {
  const location = useLocation()
  const [glowTarget, setGlowTarget] = useState(null)
  const [labelTarget, setLabelTarget] = useState(null)

  const triggerGlow = (key) => {
    setGlowTarget(null)
    setLabelTarget(null)
    requestAnimationFrame(() => {
      setGlowTarget(key)
      setLabelTarget(key)
    })
  }

  useEffect(() => {
    if (glowTarget) {
      const timer = setTimeout(() => setGlowTarget(null), 2200)
      return () => clearTimeout(timer)
    }
  }, [glowTarget])

  useEffect(() => {
    if (labelTarget) {
      const timer = setTimeout(() => setLabelTarget(null), 2200)
      return () => clearTimeout(timer)
    }
  }, [labelTarget])

  if (expanded) {
    return (
      <div className="filter-emoji-stack">
        {JAZZ_NAV.map((item, i) => {
          const isActive = item.end
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to)
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={`filter-emoji-row ${isActive ? 'active' : ''}`}
              onClick={() => triggerGlow(item.to)}
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <span className={`filter-icon ${glowTarget === item.to ? 'filter-glow-pulse' : ''} ${isActive ? '' : 'dimmed'}`}>
                <Icon />
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
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className="filter-emoji-btn"
            onClick={() => triggerGlow(item.to)}
          >
            <span className={`filter-icon ${glowTarget === item.to ? 'filter-glow-pulse' : ''} ${isActive ? '' : 'dimmed'}`}>
              <Icon />
            </span>
            <span className={`filter-tooltip ${labelTarget === item.to ? 'label-flash' : ''}`}>{item.label}</span>
          </NavLink>
        )
      })}
    </div>
  )
}

export default JazzQuickNav
