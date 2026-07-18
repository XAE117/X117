import { useState, useMemo, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getStarredIds, toggleStar } from '../utils/starredFood.js'
import './TacoGuide.css'
import './PizzaGuideEssay.css'

const STYLE_SECTIONS = [
  {
    key: 'masa',
    title: 'THE MASA TEMPLES',
    intro: 'The nixtamal revolution — artisanal corn processed through millennia-old alkaline chemistry. These specialists reject industrial flour for heirloom varieties, volcanic stone grinding, and variable hydration. The tortilla is the star.',
    styles: ['masa'],
  },
  {
    key: 'al-pastor',
    title: 'AL PASTOR & THE TROMPO',
    intro: 'The vertical rotisserie demands a specific balance of heat management, meat-shaving technique, and marinade chemistry. The "meat croissant" texture — translucent layers with charred edges — separates the masters from the imitators.',
    styles: ['al-pastor'],
  },
  {
    key: 'regional',
    title: 'REGIONAL TRADITIONS',
    intro: 'Sonoran flour tortillas from the border, Michoac\u00e1n blue corn from the highlands. These spots represent distinct regional identities that challenge corn mono-culture and prove that tradition is innovation.',
    styles: ['regional'],
  },
  {
    key: 'slow-cook',
    title: 'CARNITAS, BIRRIA & BARBACOA',
    intro: 'Copper cazo confit, underground pit roasting, 24-hour braising. The slow-cook specialists measure time in hours and generations, producing textures and depths of flavor that speed cannot replicate.',
    styles: ['slow-cook'],
  },
  {
    key: 'mariscos',
    title: 'MARISCOS',
    intro: 'From Michelin-starred smoked kampachi to legendary fried shrimp dorados, LA\'s seafood taco tradition spans street trucks and fine dining — united by the Pacific coast and the obsession with freshness.',
    styles: ['mariscos'],
  },
]

function FireBadge({ count }) {
  if (!count) return null
  return <span className="taco-fire">{'\uD83D\uDD25'.repeat(count)}</span>
}

function StyleBadge({ style }) {
  const labels = {
    'masa': 'Nixtamal',
    'al-pastor': 'Al Pastor',
    'regional': 'Regional',
    'slow-cook': 'Slow-Cook',
    'mariscos': 'Mariscos',
  }
  return <span className={`taco-style-badge style-${style}`}>{labels[style] || style}</span>
}

function StarButton({ id, starred, onToggle }) {
  return (
    <button
      className={`taco-star-btn ${starred ? 'starred' : ''}`}
      onClick={(e) => { e.stopPropagation(); onToggle(id) }}
      aria-label={starred ? 'Unstar' : 'Star'}
    >
      {starred ? '\u2605' : '\u2606'}
    </button>
  )
}

function TacoCard({ restaurant, starred, onToggleStar, expanded, onToggleExpand }) {
  const cardRef = useRef(null)

  const handleClick = () => {
    if (cardRef.current) {
      cardRef.current.classList.remove('taco-glow-pulse')
      void cardRef.current.offsetWidth
      cardRef.current.classList.add('taco-glow-pulse')
    }
    onToggleExpand(restaurant.id)
  }

  return (
    <div
      ref={cardRef}
      className={`taco-card ${expanded ? 'expanded' : ''}`}
    >
      <div className="taco-card-header">
        <button
          type="button"
          className="taco-card-toggle"
          onClick={handleClick}
          aria-expanded={expanded}
          aria-controls={`taco-details-${restaurant.id}`}
        >
          <span className="taco-card-title-row">
            <span className="taco-card-name">{restaurant.name}</span>
            <span className="taco-card-hood">{restaurant.neighborhood}</span>
          </span>
          <span className="taco-card-meta-row">
            <StyleBadge style={restaurant.tacoStyle} />
            <span className="taco-card-price">{restaurant.price || restaurant.priceRange}</span>
            <FireBadge count={restaurant.fire || Math.min(Math.ceil((restaurant.heatScore || 0) / 3), 5)} />
          </span>
        </button>
        <StarButton id={restaurant.id} starred={starred} onToggle={onToggleStar} />
      </div>

      {expanded && (
        <div id={`taco-details-${restaurant.id}`} className="taco-card-body">
          <p className="taco-card-desc">{restaurant.description}</p>
          {restaurant.whyHot && (
            <blockquote className="taco-card-whyhot">{restaurant.whyHot}</blockquote>
          )}
          {restaurant.accolades && restaurant.accolades.length > 0 && (
            <div className="taco-card-accolades">
              {restaurant.accolades.map(a => <span key={a} className="taco-accolade-chip">{a}</span>)}
            </div>
          )}
          {restaurant.tags && restaurant.tags.length > 0 && (
            <div className="taco-card-tags">
              {restaurant.tags.map(t => <span key={t} className="taco-tag-chip">{t}</span>)}
            </div>
          )}
          <div className="taco-card-actions">
            <Link
              to={`/food/spot/${restaurant.id}`}
              className="taco-action-btn taco-detail-btn"
              onClick={e => e.stopPropagation()}
            >
              View Details
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

function TacoGuide({ data }) {
  const [starredIds, setStarredIds] = useState(() => getStarredIds())
  const [expandedId, setExpandedId] = useState(null)

  const handleToggleStar = (id) => {
    const next = toggleStar(id)
    setStarredIds(next)
  }

  const tacoSpots = useMemo(() => {
    if (!data?.restaurants) return []
    return data.restaurants.filter(r => r.category === 'tacos' || r.tier === 'tacos')
  }, [data])

  // Scroll to section if coming from dropdown
  useEffect(() => {
    const scrollTo = sessionStorage.getItem('sixpm-taco-scroll')
    if (scrollTo) {
      sessionStorage.removeItem('sixpm-taco-scroll')
      requestAnimationFrame(() => {
        const el = document.getElementById(`taco-section-${scrollTo}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }, [])

  if (!data) return null

  return (
    <div className="taco-guide">
      <div className="guide-essay-btn-wrap">
        <Link to="/guide/tacos" className="guide-essay-btn">
          📖 Read the Essay
        </Link>
      </div>
      <div className="taco-guide-header">
        <div className="taco-deco-line" />
        <h1 className="taco-guide-title">THE TACO GUIDE</h1>
        <p className="taco-guide-subtitle">LA's Global Capital of the Taco</p>
        <div className="taco-deco-line" />
        <span className="taco-guide-count">{tacoSpots.length} taquer\u00edas</span>
      </div>

      {STYLE_SECTIONS.map(section => {
        const spots = tacoSpots
          .filter(r => section.styles.includes(r.tacoStyle))
          .sort((a, b) => (b.heatScore || 0) - (a.heatScore || 0))

        if (spots.length === 0) return null

        return (
          <section key={section.key} id={`taco-section-${section.key}`} className="taco-section">
            <div className="taco-section-header">
              <h2 className="taco-section-title">{section.title}</h2>
              <p className="taco-section-intro">{section.intro}</p>
              <span className="taco-section-count">{spots.length}</span>
            </div>
            <div className="taco-section-list">
              {spots.map(r => (
                <TacoCard
                  key={r.id}
                  restaurant={r}
                  starred={starredIds.includes(r.id)}
                  onToggleStar={handleToggleStar}
                  expanded={expandedId === r.id}
                  onToggleExpand={(id) => setExpandedId(expandedId === id ? null : id)}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

export default TacoGuide
