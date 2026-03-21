import { useState } from 'react'
import { getStarredIds, toggleStar } from './FoodByCategory.jsx'
import './FoodStarred.css'

function FireBadge({ count }) {
  if (!count) return null
  return <span className="food-fire">{Array.from({ length: count }, () => '🔥').join('')}</span>
}

function StarredCard({ restaurant, onUnstar }) {
  return (
    <div className="starred-card" style={{ borderLeftColor: restaurant.color }}>
      <div className="starred-card-header">
        <div className="starred-card-title-row">
          <h3 className="starred-card-name">{restaurant.name}</h3>
          <span className="starred-card-hood">{restaurant.neighborhood}</span>
        </div>
        <div className="starred-card-meta">
          <span className="starred-card-cuisine">{restaurant.cuisine}</span>
          <span className="starred-card-price">{restaurant.price || restaurant.priceRange}</span>
          {restaurant.michelinStatus === 'bib-gourmand' && <span className="food-bib-badge">Bib Gourmand</span>}
          <FireBadge count={restaurant.fire || Math.min(Math.ceil((restaurant.heatScore || 0) / 3), 5)} />
          <button
            className="food-star-btn starred"
            onClick={() => onUnstar(restaurant.id)}
            aria-label="Unstar"
          >★</button>
        </div>
      </div>
      <p className="starred-card-desc">{restaurant.description}</p>
      {restaurant.tags && (
        <div className="starred-card-tags">
          {restaurant.tags.map(t => <span key={t} className="food-tag-chip">{t}</span>)}
        </div>
      )}
    </div>
  )
}

function FoodStarred({ data }) {
  const [starredIds, setStarredIds] = useState(() => getStarredIds())

  const handleUnstar = (id) => {
    const next = toggleStar(id)
    setStarredIds(next)
  }

  const restaurants = (data?.restaurants || []).filter(r => starredIds.includes(r.id))

  return (
    <div className="food-starred-page">
      <h2 className="food-starred-title">Starred</h2>

      {restaurants.length === 0 ? (
        <div className="food-starred-empty">
          <p>No starred restaurants yet</p>
          <p className="food-starred-hint">Tap the ☆ on any restaurant to save it here</p>
        </div>
      ) : (
        <div className="food-starred-list">
          {restaurants.map(r => (
            <StarredCard key={r.id} restaurant={r} onUnstar={handleUnstar} />
          ))}
        </div>
      )}
    </div>
  )
}

export default FoodStarred
