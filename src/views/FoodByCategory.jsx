import { useState, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import DataFreshness from '../components/DataFreshness.jsx'
import { getStarredIds, toggleStar } from '../utils/starredFood.js'
import './FoodByCategory.css'

function FireBadge({ count }) {
  if (!count) return null
  return <span className="food-fire">{'🔥'.repeat(count)}</span>
}

function BibBadge() {
  return <span className="food-bib-badge">Bib Gourmand</span>
}

function StarButton({ id, starred, onToggle }) {
  return (
    <button
      type="button"
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
  const detailsId = `food-details-${restaurant.id}`

  const handleToggle = () => {
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
    >
      <div className="food-card-header">
        <button
          type="button"
          className="food-card-toggle"
          onClick={handleToggle}
          aria-expanded={expanded}
          aria-controls={detailsId}
          aria-label={`${expanded ? 'Hide' : 'Show'} details for ${restaurant.name}`}
        >
          <span className="food-card-title-row">
            <span className="food-card-name">{restaurant.name}</span>
            <span className="food-card-hood">{restaurant.neighborhood}</span>
          </span>
          <span className="food-card-meta-row">
            <span className="food-card-cuisine">{restaurant.cuisine}</span>
            <span className="food-card-price">{restaurant.price || restaurant.priceRange}</span>
            {(restaurant.bibGourmand || restaurant.michelinStatus === 'bib-gourmand') && <BibBadge />}
            <FireBadge count={restaurant.fire || Math.min(Math.ceil((restaurant.heatScore || 0) / 3), 5)} />
          </span>
        </button>
        <StarButton id={restaurant.id} starred={starred} onToggle={onToggleStar} />
      </div>

      {expanded && (
        <div id={detailsId} className="food-card-body">
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

function RestaurantList({ restaurants, starredIds, onToggleStar, expandedId, onToggleExpand }) {
  const [visible, setVisible] = useState(18)

  return (
    <>
      <div className="food-list">
        {restaurants.slice(0, visible).map(restaurant => (
          <RestaurantCard
            key={restaurant.id}
            restaurant={restaurant}
            starred={starredIds.includes(restaurant.id)}
            onToggleStar={onToggleStar}
            expanded={expandedId === restaurant.id}
            onToggleExpand={onToggleExpand}
          />
        ))}
      </div>
      {visible < restaurants.length && (
        <button type="button" className="food-show-more" onClick={() => setVisible(count => count + 18)}>
          Show {Math.min(18, restaurants.length - visible)} more
        </button>
      )}
    </>
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

  const categories = useMemo(() => data?.categories || [], [data])
  const restaurants = useMemo(() => data?.restaurants || [], [data])

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
      <DataFreshness sources={[{ label: 'Food', updated: data.lastUpdated }]} />
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
              <RestaurantList
                restaurants={group.items}
                starredIds={starredIds}
                onToggleStar={handleToggleStar}
                expandedId={expandedId}
                onToggleExpand={(id) => setExpandedId(expandedId === id ? null : id)}
              />
            )}
          </div>
        ))
      ) : (
        <>
          {activeDesc && <p className="food-cat-desc">{activeDesc}</p>}
          <RestaurantList
            key={activeCategory}
            restaurants={filtered}
            starredIds={starredIds}
            onToggleStar={handleToggleStar}
            expandedId={expandedId}
            onToggleExpand={(id) => setExpandedId(expandedId === id ? null : id)}
          />
        </>
      )}
    </div>
  )
}

export default FoodByCategory
