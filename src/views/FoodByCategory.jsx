import { useState, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import './FoodByCategory.css'

const STAR_KEY = 'palace-starred-restaurants'

function getStarredIds() {
  try {
    return JSON.parse(localStorage.getItem(STAR_KEY)) || []
  } catch { return [] }
}

function toggleStar(id) {
  const ids = getStarredIds()
  const next = ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]
  localStorage.setItem(STAR_KEY, JSON.stringify(next))
  return next
}

function FireBadge({ count }) {
  if (!count) return null
  return <span className="food-fire">{Array.from({ length: count }, (_, i) => '🔥').join('')}</span>
}

function BibBadge() {
  return <span className="food-bib-badge">Bib Gourmand</span>
}

function StarButton({ id, starred, onToggle }) {
  return (
    <button
      className={`food-star-btn ${starred ? 'starred' : ''}`}
      onClick={(e) => { e.stopPropagation(); onToggle(id) }}
      aria-label={starred ? 'Unstar' : 'Star'}
    >
      {starred ? '★' : '☆'}
    </button>
  )
}

function RestaurantCard({ restaurant, starred, onToggleStar, expanded, onToggleExpand }) {
  const cardRef = useRef(null)

  const handleClick = () => {
    if (cardRef.current) {
      cardRef.current.classList.remove('food-glow-pulse')
      void cardRef.current.offsetWidth
      cardRef.current.classList.add('food-glow-pulse')
    }
    onToggleExpand(restaurant.id)
  }

  return (
    <div
      ref={cardRef}
      className={`food-card ${expanded ? 'expanded' : ''}`}
      style={{ borderLeftColor: restaurant.color }}
      onClick={handleClick}
    >
      <div className="food-card-header">
        <div className="food-card-title-row">
          <h3 className="food-card-name">{restaurant.name}</h3>
          <span className="food-card-hood">{restaurant.neighborhood}</span>
        </div>
        <div className="food-card-meta-row">
          <span className="food-card-cuisine">{restaurant.cuisine}</span>
          <span className="food-card-price">{restaurant.price || restaurant.priceRange}</span>
          {(restaurant.bibGourmand || restaurant.michelinStatus === 'bib-gourmand') && <BibBadge />}
          <FireBadge count={restaurant.fire || Math.min(Math.ceil((restaurant.heatScore || 0) / 3), 5)} />
          <StarButton id={restaurant.id} starred={starred} onToggle={onToggleStar} />
        </div>
      </div>

      {expanded && (
        <div className="food-card-body">
          <p className="food-card-desc">{restaurant.description}</p>
          {restaurant.quote && (
            <blockquote className="food-card-quote">{restaurant.quote}</blockquote>
          )}
          {restaurant.accolades && restaurant.accolades.length > 0 && (
            <div className="food-card-accolades">
              {restaurant.accolades.map(a => <span key={a} className="food-accolade-chip">{a}</span>)}
            </div>
          )}
          {restaurant.sources && restaurant.sources.length > 0 && !restaurant.accolades?.length && (
            <div className="food-card-accolades">
              {restaurant.sources.map(s => (
                <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer" className="food-accolade-chip food-source-link" onClick={e => e.stopPropagation()}>
                  {s.name}
                </a>
              ))}
            </div>
          )}
          {restaurant.hours && (
            <div className="food-card-hours">
              <span className="food-hours-label">DIRECTIONS</span>
              <span className="food-hours-value">{restaurant.hours}</span>
            </div>
          )}
          {restaurant.tags && restaurant.tags.length > 0 && (
            <div className="food-card-tags">
              {restaurant.tags.map(t => <span key={t} className="food-tag-chip">{t}</span>)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FoodByCategory({ data }) {
  const [activeCategory, setActiveCategory] = useState('all')
  const [starredIds, setStarredIds] = useState(() => getStarredIds())
  const [expandedId, setExpandedId] = useState(null)

  const handleToggleStar = (id) => {
    const next = toggleStar(id)
    setStarredIds(next)
  }

  const categories = data?.categories || []
  const restaurants = data?.restaurants || []

  const filtered = useMemo(() => {
    if (activeCategory === 'all') return restaurants
    return restaurants.filter(r => r.category === activeCategory)
  }, [restaurants, activeCategory])

  const activeDesc = categories.find(c => c.key === activeCategory)?.description

  const grouped = useMemo(() => {
    if (activeCategory !== 'all') return null
    const groups = {}
    categories.filter(c => c.key !== 'all').forEach(c => {
      groups[c.key] = { ...c, items: restaurants.filter(r => r.category === c.key) }
    })
    return groups
  }, [activeCategory, restaurants, categories])

  if (!data) return null

  return (
    <div className="food-page">
      <div className="food-category-bar">
        {categories.map(c => (
          <button
            key={c.key}
            className={`food-cat-btn ${activeCategory === c.key ? 'active' : ''}`}
            onClick={() => setActiveCategory(c.key)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {activeCategory === 'all' ? (
        Object.values(grouped || {}).map(group => (
          <div key={group.key} className="food-group">
            <div className="food-group-header">
              <h2 className="food-group-title">{group.label}</h2>
              {group.description && <span className="food-group-desc">{group.description}</span>}
              <span className="food-group-count">{group.items.length}</span>
            </div>
            {group.key === 'pizza' ? (
              <Link to="/food/pizza" className="food-guide-link food-guide-link--pizza">
                <span className="food-guide-link-emoji">{'\uD83C\uDF55'}</span>
                <span className="food-guide-link-text" style={{ color: 'var(--eats-pizza)' }}>View the Pizza Guide</span>
                <span className="food-guide-link-count">{group.items.length} pizzerias</span>
                <span className="food-guide-link-arrow">{'\u2192'}</span>
              </Link>
            ) : group.key === 'tacos' ? (
              <Link to="/food/tacos" className="food-guide-link food-guide-link--tacos">
                <span className="food-guide-link-emoji">{'\uD83C\uDF2E'}</span>
                <span className="food-guide-link-text" style={{ color: 'var(--eats-tacos)' }}>View the Taco Guide</span>
                <span className="food-guide-link-count">{group.items.length} taquer\u00edas</span>
                <span className="food-guide-link-arrow">{'\u2192'}</span>
              </Link>
            ) : (
              <div className="food-list">
                {group.items.map(r => (
                  <RestaurantCard
                    key={r.id}
                    restaurant={r}
                    starred={starredIds.includes(r.id)}
                    onToggleStar={handleToggleStar}
                    expanded={expandedId === r.id}
                    onToggleExpand={(id) => setExpandedId(expandedId === id ? null : id)}
                  />
                ))}
              </div>
            )}
          </div>
        ))
      ) : (
        <>
          {activeDesc && <p className="food-cat-desc">{activeDesc}</p>}
          <div className="food-list">
            {filtered.map(r => (
              <RestaurantCard
                key={r.id}
                restaurant={r}
                starred={starredIds.includes(r.id)}
                onToggleStar={handleToggleStar}
                expanded={expandedId === r.id}
                onToggleExpand={(id) => setExpandedId(expandedId === id ? null : id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export { getStarredIds, toggleStar }
export default FoodByCategory
