import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import './EatsByTier.css'

function HeatIndicator({ score }) {
  const flames = Math.min(Math.ceil(score / 3), 5)
  return (
    <span className="eats-heat" title={`Heat score: ${score}`}>
      {Array.from({ length: flames }, (_, i) => (
        <span key={i} className="eats-flame">&#x1F525;</span>
      ))}
    </span>
  )
}

function SourceBadges({ sources }) {
  if (!sources?.length) return null
  return (
    <div className="eats-sources">
      {sources.map((s, i) => (
        <a
          key={i}
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          className="eats-source-badge"
          onClick={e => e.stopPropagation()}
        >
          {s.name}
          {s.rating && <span className="eats-source-rating">{s.rating}</span>}
        </a>
      ))}
    </div>
  )
}

function NewCard({ restaurant }) {
  const [expanded, setExpanded] = useState(false)
  const cardRef = useRef(null)

  const handleClick = () => {
    if (cardRef.current) {
      cardRef.current.classList.remove('eats-glow-pulse')
      void cardRef.current.offsetWidth
      cardRef.current.classList.add('eats-glow-pulse')
    }
    setExpanded(!expanded)
  }

  const tierLabel = restaurant.tier === 'street' ? 'STREET' : restaurant.tier === 'whale' ? 'WHALE' : 'FEAST'

  return (
    <div
      ref={cardRef}
      className={`eats-card tier-${restaurant.tier} eats-card--new ${expanded ? 'eats-card--open' : ''}`}
      onClick={handleClick}
    >
      <div className="eats-card-header">
        <div className="eats-card-top">
          <span className="eats-card-name">{restaurant.name}</span>
          <span className="eats-card-neighborhood">{restaurant.neighborhood}</span>
        </div>
        <div className="eats-card-meta">
          <span className={`eats-tier-pill tier-${restaurant.tier}`}>{tierLabel}</span>
          <span className="eats-card-cuisine">{restaurant.cuisine}</span>
          <span className="eats-card-price">{restaurant.priceRange}</span>
          <HeatIndicator score={restaurant.heatScore} />
        </div>
      </div>

      {expanded && (
        <div className="eats-card-body">
          <p className="eats-card-description">{restaurant.description}</p>
          {restaurant.whyHot && (
            <p className="eats-card-whyhot">{restaurant.whyHot}</p>
          )}
          <SourceBadges sources={restaurant.sources} />
          <div className="eats-card-actions">
            <Link
              to={`/food/spot/${restaurant.id}`}
              className="eats-action-btn eats-detail-btn"
              onClick={e => e.stopPropagation()}
            >
              View Details
            </Link>
            {restaurant.reservationUrl && (
              <a
                href={restaurant.reservationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="eats-action-btn eats-reserve-btn"
                onClick={e => e.stopPropagation()}
              >
                Reserve
              </a>
            )}
            {restaurant.googleMapsUrl && (
              <a
                href={restaurant.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="eats-action-btn eats-maps-btn"
                onClick={e => e.stopPropagation()}
              >
                Directions
              </a>
            )}
            {restaurant.hours && (
              <span className="eats-card-hours">{restaurant.hours}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function EatsNew({ data }) {
  const newRestaurants = useMemo(() => {
    if (!data?.restaurants || !data?.newThisMonth) return []
    const newIds = new Set(data.newThisMonth)
    return data.restaurants
      .filter(r => newIds.has(r.id) || r.isNew)
      .sort((a, b) => b.heatScore - a.heatScore)
  }, [data])

  if (!data) {
    return (
      <div className="eats-empty">
        <h2>Loading restaurants...</h2>
      </div>
    )
  }

  return (
    <div className="eats-page">
      <div className="eats-new-header">
        <h2 className="eats-new-title">NEW THIS MONTH</h2>
        <p className="eats-new-subtitle">The freshest openings across all tiers</p>
      </div>
      <div className="eats-new-list">
        {newRestaurants.length === 0 ? (
          <p className="eats-empty-text">No new additions this month.</p>
        ) : (
          newRestaurants.map(r => <NewCard key={r.id} restaurant={r} />)
        )}
      </div>
    </div>
  )
}

export default EatsNew
