import { useState, useEffect } from 'react'
import './CinemaFilter.css'

const CINEMA_MODES = [
  { key: 'repertory', emoji: '🎞️', label: 'REP' },
  { key: 'now-playing', emoji: '🍿', label: 'NOW' },
  { key: 'all', emoji: '🎬', label: 'ALL' },
]

function CinemaFilter({ current, onChange, expanded }) {
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

  const handleSelect = (key) => {
    onChange(key)
    triggerGlow(key)
    if (!expanded) triggerLabel(key)
  }

  if (expanded) {
    return (
      <div className="cinema-filter-stack">
        {CINEMA_MODES.map((m, i) => (
          <button
            key={m.key}
            className={`cinema-filter-row ${current === m.key ? 'active' : ''}`}
            onClick={() => handleSelect(m.key)}
            style={{ animationDelay: `${i * 0.06}s` }}
          >
            <span className={`cinema-filter-emoji ${glowTarget === m.key ? 'cinema-glow-pulse' : ''} ${current === m.key ? '' : 'dimmed'}`}>
              {m.emoji}
            </span>
            <span className="cinema-filter-label">{m.label}</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="cinema-filter-bar">
      {CINEMA_MODES.map(m => (
        <button
          key={m.key}
          className="cinema-filter-btn"
          onClick={() => handleSelect(m.key)}
          aria-label={m.label}
        >
          <span className={`cinema-filter-emoji ${glowTarget === m.key ? 'cinema-glow-pulse' : ''} ${current === m.key ? '' : 'dimmed'}`}>
            {m.emoji}
          </span>
          {labelTarget === m.key && (
            <span className="cinema-filter-tooltip">{m.label}</span>
          )}
        </button>
      ))}
    </div>
  )
}

export default CinemaFilter
