import { useState, useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import ModeSwitcher from './ModeSwitcher.jsx'
import { useAppDataContext } from '../context/useAppDataContext'
import { useAppUIContext } from '../context/useAppUIContext'

const VIBES_OPTIONS = [
  { key: 'all', label: 'All Vibes', emoji: '✨' },
  { key: 'casual', label: 'Casual', emoji: '😌' },
  { key: 'romantic', label: 'Romantic', emoji: '🌹' },
  { key: 'adventure', label: 'Adventure', emoji: '🔥' },
  { key: 'budget', label: 'Budget', emoji: '💸' },
]

const JAZZ_NAV = [
  { to: '/jazz', end: true, emoji: '📍', label: 'By Day' },
  { to: '/jazz/by-venue', emoji: '🏛️', label: 'Venues' },
  { to: '/jazz/proximity', emoji: '📡', label: 'LC ℃' },
  { to: '/jazz/map', emoji: '🗺️', label: 'Map' },
  { to: '/jazz/bio', emoji: '📖', label: 'LC Bio' },
]

const FOOD_NAV = [
  { to: '/food', end: true, emoji: '🍽️', label: 'All' },
  { to: '/food/tacos', emoji: '🌮', label: 'Tacos' },
  { to: '/food/pizza', emoji: '🍕', label: 'Pizza' },
  { to: '/food/starred', emoji: '⭐', label: 'Starred' },
  { to: '/food/map', emoji: '📍', label: 'Hoods' },
  { to: '/guide', emoji: '📖', label: 'Guide' },
]

const CINEMA_NAV = [
  { to: '/', end: true, emoji: '📍', label: 'By Day' },
  { to: '/by-theater', emoji: '🏛️', label: 'Theaters' },
  { to: '/watchlist', emoji: '💛', label: 'Watchlist' },
  { to: '/map', emoji: '🗺️', label: 'Map' },
]

const FORMAT_FILTERS = [
  { key: 'all', emoji: '🪩', label: 'All' },
  { key: 'film', emoji: '📽️', label: 'Film' },
  { key: 'new', emoji: '⭐', label: 'New' },
  { key: 'favorites', emoji: '✨', label: 'Faves' },
]

export default function TopBar() {
  const location = useLocation()
  const { refreshing, fetchData } = useAppDataContext()
  const {
    isJazz: isJazzMode,
    isFood: isFoodMode,
    isGuide: isGuideMode,
    isRoll: isRollMode,
    formatFilter,
    setFormatFilter,
    searchQuery,
    setSearchQuery,
    vibe,
    setVibe,
  } = useAppUIContext()
  const modeKey = isRollMode ? 'roll' : isGuideMode ? 'guide' : isFoodMode ? 'food' : isJazzMode ? 'jazz' : 'cinema'
  const [filtersExpandedFor, setFiltersExpandedFor] = useState(null)
  const [vibeOpenFor, setVibeOpenFor] = useState(null)
  const vibeRef = useRef(null)

  const filtersExpanded = filtersExpandedFor === modeKey
  const vibeOpen = vibeOpenFor === modeKey
  const showFormatFilter = ['/', '/by-theater'].includes(location.pathname)

  // Close vibes dropdown on outside click
  useEffect(() => {
    if (!vibeOpen) return
    const handler = (e) => {
      if (vibeRef.current && !vibeRef.current.contains(e.target)) setVibeOpenFor(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [vibeOpen])

  return (
    <div className="top-bar">
      {/* Guide section pill — guide routes only */}
      {isGuideMode && !isRollMode && (
        <div className="filter-notch guide-section-notch">
          <NavLink to="/guide" end className={({ isActive }) => `guide-section-btn${isActive ? ' active' : ''}`}>MAIN</NavLink>
          <span className="guide-section-sep">|</span>
          <NavLink to="/guide/pizza" className={({ isActive }) => `guide-section-btn${isActive ? ' active' : ''}`}>PIZZA</NavLink>
          <span className="guide-section-sep">|</span>
          <NavLink to="/guide/tacos" className={({ isActive }) => `guide-section-btn${isActive ? ' active' : ''}`}>TACOS</NavLink>
        </div>
      )}

      {/* Vibes pill — roll mode only */}
      {isRollMode && (
        <div className={`filter-notch vibes-notch ${vibeOpen ? 'filter-notch--open' : ''}`} ref={vibeRef}>
          {!vibeOpen ? (
            <button className="notch-toggle vibes-toggle" onClick={() => setVibeOpenFor(modeKey)} aria-label="Vibe filter">
              <span className="notch-quick-emoji">✨</span>
              <span className="vibes-pill-label">VIBES</span>
            </button>
          ) : (
            <div className="filter-notch-expanded">
              <button className="notch-toggle notch-toggle--close" onClick={() => setVibeOpenFor(null)}>
                <span className="notch-plus open">+</span>
              </button>
              <div className="notch-nav-group">
                {VIBES_OPTIONS.map((v, i) => (
                  <button
                    key={v.key}
                    className={`notch-nav-row ${vibe === v.key ? 'active' : ''}`}
                    onClick={() => { setVibe(v.key); setVibeOpenFor(null) }}
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <span className="notch-nav-emoji">{v.emoji}</span>
                    <span className="notch-nav-label">{v.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!isRollMode && !isGuideMode && (
        <div className={`filter-notch ${filtersExpanded ? 'filter-notch--open' : ''}`}>
          {!filtersExpanded && (
            <div className="filter-notch-collapsed">
              <button
                className="notch-toggle"
                onClick={() => setFiltersExpandedFor(modeKey)}
                aria-label="Open menu"
              >
                <span className="notch-plus">+</span>
              </button>
              {/* Film: quick-access format filters */}
              {!isJazzMode && !isFoodMode && (
                <>
                  <span className="notch-quick-divider" />
                  <button className="notch-quick-btn" onClick={() => setFormatFilter('all')} aria-label="All formats">
                    <span className={`notch-quick-emoji ${formatFilter === 'all' ? 'active' : ''}`}>🪩</span>
                  </button>
                  <button className="notch-quick-btn" onClick={() => setFormatFilter('favorites')} aria-label="Favorites">
                    <span className={`notch-quick-emoji ${formatFilter === 'favorites' ? 'active' : ''}`}>✨</span>
                  </button>
                </>
              )}
              {/* Food: quick nav to All and Guide */}
              {isFoodMode && (
                <>
                  <span className="notch-quick-divider" />
                  <NavLink to="/food" end className="notch-quick-btn" aria-label="All restaurants">
                    {({ isActive }) => (
                      <span className={`notch-quick-emoji ${isActive ? 'active' : ''}`}>🍽️</span>
                    )}
                  </NavLink>
                  <NavLink to="/guide" className="notch-quick-btn" aria-label="Guide">
                    {({ isActive }) => (
                      <span className={`notch-quick-emoji ${isActive ? 'active' : ''}`}>📖</span>
                    )}
                  </NavLink>
                </>
              )}
            </div>
          )}
          {filtersExpanded && (
            <div className="filter-notch-expanded">
              <button
                className="notch-toggle notch-toggle--close"
                onClick={() => setFiltersExpandedFor(null)}
                aria-label="Close menu"
              >
                <span className="notch-plus open">+</span>
              </button>

              {/* Nav rows — mode-specific */}
              <div className="notch-nav-group">
                {(isJazzMode ? JAZZ_NAV : isFoodMode ? FOOD_NAV : CINEMA_NAV).map((item, i) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => `notch-nav-row ${isActive ? 'active' : ''}`}
                    onClick={() => setFiltersExpandedFor(null)}
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <span className="notch-nav-emoji">{item.emoji}</span>
                    <span className="notch-nav-label">{item.label}</span>
                  </NavLink>
                ))}
              </div>

              {/* Format filters + search — film mode only */}
              {showFormatFilter && (
                <>
                  <div className="notch-double-divider" />
                  <div className="notch-nav-group">
                    {FORMAT_FILTERS.map((f, i) => (
                      <button
                        key={f.key}
                        className={`notch-nav-row notch-filter-row ${formatFilter === f.key ? 'active' : ''}`}
                        onClick={() => { setFormatFilter(f.key); setFiltersExpandedFor(null) }}
                        style={{ animationDelay: `${(i + 4) * 0.05}s` }}
                      >
                        <span className="notch-nav-emoji">{f.emoji}</span>
                        <span className="notch-nav-label">{f.label}</span>
                        <button
                          className={`refresh-btn ${refreshing ? 'refreshing' : ''}`}
                          style={{ display: f.key === 'all' ? 'inline-flex' : 'none', marginLeft: 'auto' }}
                          onClick={(e) => { e.stopPropagation(); fetchData(true) }}
                          disabled={refreshing}
                          title="Refresh listings"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                            <path d="M23 4v6h-6" />
                            <path d="M1 20v-6h6" />
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                          </svg>
                        </button>
                      </button>
                    ))}
                  </div>
                  <div className="filter-notch-search notch-search-row">
                    <input
                      type="text"
                      className="expanded-search-input"
                      placeholder="Search films..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button className="expanded-search-clear" onClick={() => setSearchQuery('')}>
                        &times;
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Centered dice pill — always visible, teases the Roll page */}
      {!isRollMode && (
        <NavLink to="/roll" className="dice-pill" aria-label="Roll date night">
          🎲
        </NavLink>
      )}
      <ModeSwitcher />
    </div>
  )
}
