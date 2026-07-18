import { useState, useMemo, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getStarredIds, toggleStar } from '../utils/starredFood.js'
import './PizzaGuide.css'
import './PizzaGuideEssay.css'

const STYLE_SECTIONS = [
  {
    key: 'tokyo-neapolitan',
    title: 'TOKYO-STYLE & NEO-NEAPOLITAN',
    intro: 'The convergence of Japanese precision and Italian tradition. These pizzerias treat dough as a living medium — long fermentation, obsessive temperature control, and ingredients sourced from both hemispheres.',
    styles: ['tokyo-neapolitan', 'neo-neapolitan'],
  },
  {
    key: 'sourdough',
    title: 'THE SOURDOUGH RENAISSANCE',
    intro: 'Wild-fermented, naturally leavened, and deeply flavored. LA\'s sourdough pizza movement treats the crust as the star — tangy, complex, and alive with character that commercial yeast can\'t touch.',
    styles: ['sourdough'],
  },
  {
    key: 'chicago',
    title: 'CHICAGO DEEP DISH & TAVERN',
    intro: 'The Midwest diaspora brought deep dish west, but the real sleeper is tavern-style — cracker-thin, square-cut party pizza that actual Chicagoans eat daily. Both traditions thrive in LA.',
    styles: ['chicago'],
  },
  {
    key: 'detroit-square',
    title: 'DETROIT & SQUARE SLICES',
    intro: 'Blue steel pans, Wisconsin brick cheese, and that legendary caramelized frico edge. Detroit-style has exploded in LA — thick, airy, geometric, and deeply satisfying.',
    styles: ['detroit-square'],
  },
]

function FireBadge({ count }) {
  if (!count) return null
  return <span className="pizza-fire">{'\uD83D\uDD25'.repeat(count)}</span>
}

function StyleBadge({ style }) {
  const labels = {
    'tokyo-neapolitan': 'Tokyo-Neapolitan',
    'neo-neapolitan': 'Neo-Neapolitan',
    'sourdough': 'Sourdough',
    'chicago': 'Chicago',
    'detroit-square': 'Detroit',
  }
  return <span className={`pizza-style-badge style-${style}`}>{labels[style] || style}</span>
}

function StarButton({ id, starred, onToggle }) {
  return (
    <button
      className={`pizza-star-btn ${starred ? 'starred' : ''}`}
      onClick={(e) => { e.stopPropagation(); onToggle(id) }}
      aria-label={starred ? 'Unstar' : 'Star'}
    >
      {starred ? '\u2605' : '\u2606'}
    </button>
  )
}

function PizzaCard({ restaurant, starred, onToggleStar, expanded, onToggleExpand }) {
  const cardRef = useRef(null)

  const handleClick = () => {
    if (cardRef.current) {
      cardRef.current.classList.remove('pizza-glow-pulse')
      void cardRef.current.offsetWidth
      cardRef.current.classList.add('pizza-glow-pulse')
    }
    onToggleExpand(restaurant.id)
  }

  return (
    <div
      ref={cardRef}
      className={`pizza-card ${expanded ? 'expanded' : ''}`}
    >
      <div className="pizza-card-header">
        <button
          type="button"
          className="pizza-card-toggle"
          onClick={handleClick}
          aria-expanded={expanded}
          aria-controls={`pizza-details-${restaurant.id}`}
        >
          <span className="pizza-card-title-row">
            <span className="pizza-card-name">{restaurant.name}</span>
            <span className="pizza-card-hood">{restaurant.neighborhood}</span>
          </span>
          <span className="pizza-card-meta-row">
            <StyleBadge style={restaurant.pizzaStyle} />
            <span className="pizza-card-price">{restaurant.price || restaurant.priceRange}</span>
            <FireBadge count={restaurant.fire || Math.min(Math.ceil((restaurant.heatScore || 0) / 3), 5)} />
          </span>
        </button>
        <StarButton id={restaurant.id} starred={starred} onToggle={onToggleStar} />
      </div>

      {expanded && (
        <div id={`pizza-details-${restaurant.id}`} className="pizza-card-body">
          <p className="pizza-card-desc">{restaurant.description}</p>
          {restaurant.whyHot && (
            <blockquote className="pizza-card-whyhot">{restaurant.whyHot}</blockquote>
          )}
          {restaurant.accolades && restaurant.accolades.length > 0 && (
            <div className="pizza-card-accolades">
              {restaurant.accolades.map(a => <span key={a} className="pizza-accolade-chip">{a}</span>)}
            </div>
          )}
          {restaurant.tags && restaurant.tags.length > 0 && (
            <div className="pizza-card-tags">
              {restaurant.tags.map(t => <span key={t} className="pizza-tag-chip">{t}</span>)}
            </div>
          )}
          <div className="pizza-card-actions">
            <Link
              to={`/food/spot/${restaurant.id}`}
              className="pizza-action-btn pizza-detail-btn"
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

function PizzaGuide({ data }) {
  const [starredIds, setStarredIds] = useState(() => getStarredIds())
  const [expandedId, setExpandedId] = useState(null)

  const handleToggleStar = (id) => {
    const next = toggleStar(id)
    setStarredIds(next)
  }

  const pizzaSpots = useMemo(() => {
    if (!data?.restaurants) return []
    return data.restaurants.filter(r => r.category === 'pizza' || r.tier === 'pizza')
  }, [data])

  // Scroll to section if coming from dropdown
  useEffect(() => {
    const scrollTo = sessionStorage.getItem('sixpm-pizza-scroll')
    if (scrollTo) {
      sessionStorage.removeItem('sixpm-pizza-scroll')
      requestAnimationFrame(() => {
        const el = document.getElementById(`pizza-section-${scrollTo}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }, [])

  if (!data) return null

  return (
    <div className="pizza-guide">
      <div className="guide-essay-btn-wrap">
        <Link to="/guide/pizza" className="guide-essay-btn">
          📖 Read the Essay
        </Link>
      </div>
      <div className="pizza-guide-header">
        <div className="pizza-deco-line" />
        <h1 className="pizza-guide-title">THE PIZZA GUIDE</h1>
        <p className="pizza-guide-subtitle">A Curated Tour of LA's Best Pies</p>
        <div className="pizza-deco-line" />
        <span className="pizza-guide-count">{pizzaSpots.length} pizzerias</span>
      </div>

      {STYLE_SECTIONS.map(section => {
        const spots = pizzaSpots
          .filter(r => section.styles.includes(r.pizzaStyle))
          .sort((a, b) => (b.heatScore || 0) - (a.heatScore || 0))

        if (spots.length === 0) return null

        return (
          <section key={section.key} id={`pizza-section-${section.key}`} className="pizza-section">
            <div className="pizza-section-header">
              <h2 className="pizza-section-title">{section.title}</h2>
              <p className="pizza-section-intro">{section.intro}</p>
              <span className="pizza-section-count">{spots.length}</span>
            </div>
            <div className="pizza-section-list">
              {spots.map(r => (
                <PizzaCard
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

export default PizzaGuide
