import { useState, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getStarredIds, toggleStar } from './FoodByCategory.jsx'
import './PizzaGuide.css'

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
  return <span className="pizza-fire">{Array.from({ length: count }, (_, i) => '\uD83D\uDD25').join('')}</span>
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
      onClick={handleClick}
    >
      <div className="pizza-card-header">
        <div className="pizza-card-title-row">
          <h3 className="pizza-card-name">{restaurant.name}</h3>
          <span className="pizza-card-hood">{restaurant.neighborhood}</span>
        </div>
        <div className="pizza-card-meta-row">
          <StyleBadge style={restaurant.pizzaStyle} />
          <span className="pizza-card-price">{restaurant.price || restaurant.priceRange}</span>
          <FireBadge count={restaurant.fire || Math.min(Math.ceil((restaurant.heatScore || 0) / 3), 5)} />
          <StarButton id={restaurant.id} starred={starred} onToggle={onToggleStar} />
        </div>
      </div>

      {expanded && (
        <div className="pizza-card-body">
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

  if (!data) return null

  return (
    <div className="pizza-guide">
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
          <section key={section.key} className="pizza-section">
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
