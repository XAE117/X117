import { useState, useEffect } from 'react'
import './FormatFilter.css'

const FILTERS = [
  { key: 'all', emoji: '🪩', label: 'ALL' },
  { key: 'film', emoji: '📽️', label: 'FILM' },
  { key: 'new', emoji: '⭐', label: 'NEW' },
  { key: 'favorites', emoji: '✨', label: 'FAVES' },
]

function FormatFilter({ current, onChange, expanded }) {
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

  // Brief label flash on tap in collapsed mode
  const triggerLabel = (key) => {
    setLabelTarget(key)
    setTimeout(() => setLabelTarget(null), 1200)
  }

  const handleSelect = (key) => {
    onChange(key)
    triggerGlow(key)
    if (!expanded) {
      triggerLabel(key)
    }
  }

  if (expanded) {
    return (
      <div className="filter-emoji-stack">
        {FILTERS.map((f, i) => (
          <button
            key={f.key}
            className={`filter-emoji-row ${current === f.key ? 'active' : ''}`}
            onClick={() => handleSelect(f.key)}
            style={{ animationDelay: `${i * 0.06}s` }}
          >
            <span className={`filter-emoji ${glowTarget === f.key ? 'filter-glow-pulse' : ''} ${current === f.key ? '' : 'dimmed'}`}>
              {f.emoji}
            </span>
            <span className="filter-emoji-label">{f.label}</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="filter-emoji-bar">
      {FILTERS.map(f => (
        <button
          key={f.key}
          className="filter-emoji-btn"
          onClick={() => handleSelect(f.key)}
          aria-label={f.label}
        >
          <span className={`filter-emoji ${glowTarget === f.key ? 'filter-glow-pulse' : ''} ${current === f.key ? '' : 'dimmed'}`}>
            {f.emoji}
          </span>
          {labelTarget === f.key && (
            <span className="filter-emoji-tooltip">{f.label}</span>
          )}
        </button>
      ))}
    </div>
  )
}

export default FormatFilter
