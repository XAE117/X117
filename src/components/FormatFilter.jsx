import { useState, useEffect } from 'react'
import { ClapboardIcon, DiscoBallIcon, StarIcon } from './Icons'
import './FormatFilter.css'

const FILTERS = [
  { key: 'film', icon: ClapboardIcon, label: 'FILM' },
  { key: 'all', icon: DiscoBallIcon, label: 'ALL' },
  { key: 'favorites', icon: StarIcon, label: 'FAVES' },
]

function FormatFilter({ current, onChange, expanded }) {
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

  const handleSelect = (key) => {
    onChange(key)
    triggerGlow(key)
  }

  if (expanded) {
    return (
      <div className="filter-emoji-stack">
        {FILTERS.map((f, i) => {
          const Icon = f.icon
          return (
            <button
              key={f.key}
              className={`filter-emoji-row ${current === f.key ? 'active' : ''}`}
              onClick={() => handleSelect(f.key)}
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <span className={`filter-icon ${glowTarget === f.key ? 'filter-glow-pulse' : ''} ${current === f.key ? '' : 'dimmed'}`}>
                <Icon />
              </span>
              <span className="filter-emoji-label">{f.label}</span>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="filter-emoji-bar">
      {FILTERS.map(f => {
        const Icon = f.icon
        return (
          <button
            key={f.key}
            className="filter-emoji-btn"
            onClick={() => handleSelect(f.key)}
            aria-label={f.label}
          >
            <span className={`filter-icon ${glowTarget === f.key ? 'filter-glow-pulse' : ''} ${current === f.key ? '' : 'dimmed'}`}>
              <Icon />
            </span>
            <span className={`filter-tooltip ${labelTarget === f.key ? 'label-flash' : ''}`}>{f.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default FormatFilter
