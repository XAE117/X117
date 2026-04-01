import { useState, useEffect, useMemo, useRef } from 'react'
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

function MichelinBadge({ status }) {
  if (!status) return null
  const labels = {
    'bib-gourmand': 'Bib Gourmand',
    'one-star': '\u2B50',
    'two-star': '\u2B50\u2B50',
    'three-star': '\u2B50\u2B50\u2B50',
  }
  return <span className={`eats-michelin-badge michelin-${status}`}>{labels[status] || status}</span>
}

function RestaurantCard({ restaurant }) {
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

  return (
    <div
      ref={cardRef}
      className={`eats-card tier-${restaurant.tier} ${expanded ? 'eats-card--open' : ''} ${restaurant.isNew ? 'is-new' : ''}`}
      onClick={handleClick}
    >
      <div className="eats-card-header">
        <div className="eats-card-top">
          <span className="eats-card-name">{restaurant.name}</span>
          <span className="eats-card-neighborhood">{restaurant.neighborhood}</span>
        </div>
        <div className="eats-card-meta">
          <span className="eats-card-cuisine">{restaurant.cuisine}</span>
          <span className="eats-card-price">{restaurant.priceRange}</span>
          <MichelinBadge status={restaurant.michelinStatus} />
          <HeatIndicator score={restaurant.heatScore} />
          {restaurant.isNew && <span className="eats-new-badge">NEW</span>}
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
          {restaurant.tags?.length > 0 && (
            <div className="eats-card-tags">
              {restaurant.tags.map(tag => (
                <span key={tag} className="eats-tag">{tag.replace(/-/g, ' ')}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TierSection({ tier, label, subtitle, restaurants, accentClass }) {
  const sorted = useMemo(() =>
    [...restaurants].sort((a, b) => b.heatScore - a.heatScore),
    [restaurants]
  )

  if (sorted.length === 0) return null

  return (
    <section className={`eats-tier-section ${accentClass}`}>
      <div className="eats-tier-header">
        <h2 className="eats-tier-label">{label}</h2>
        <span className="eats-tier-subtitle">{subtitle}</span>
        <span className="eats-tier-count">{sorted.length}</span>
      </div>
      <div className="eats-tier-list">
        {sorted.map(r => (
          <RestaurantCard key={r.id} restaurant={r} />
        ))}
      </div>
    </section>
  )
}

function EatsByTier({ data }) {
  const [tierFilter, setTierFilter] = useState(() => {
    const saved = sessionStorage.getItem('palace-tier-filter')
    if (saved) {
      sessionStorage.removeItem('palace-tier-filter')
      return saved
    }
    return 'all'
  })

  const tiers = useMemo(() => {
    if (!data?.restaurants) return { street: [], feast: [], whale: [], pizza: [], tacos: [] }
    const groups = { street: [], feast: [], whale: [], pizza: [], tacos: [] }
    for (const r of data.restaurants) {
      if (groups[r.tier]) groups[r.tier].push(r)
    }
    return groups
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
      <div className="eats-filter-row">
        {['all', 'street', 'feast', 'whale', 'pizza', 'tacos'].map(t => (
          <button
            key={t}
            className={`eats-filter-pill ${tierFilter === t ? 'active' : ''} tier-pill-${t}`}
            onClick={() => setTierFilter(t)}
          >
            {t === 'all' ? 'All' : t === 'street' ? 'Street' : t === 'feast' ? 'Feast' : t === 'whale' ? 'Whale' : t === 'pizza' ? 'Pizza' : 'Tacos'}
          </button>
        ))}
      </div>

      {(tierFilter === 'all' || tierFilter === 'street') && (
        <TierSection
          tier="street"
          label="STREET"
          subtitle="Pop-ups & Stands \u00B7 Under $20/pp"
          restaurants={tiers.street}
          accentClass="tier-street"
        />
      )}
      {(tierFilter === 'all' || tierFilter === 'feast') && (
        <TierSection
          tier="feast"
          label="FEAST"
          subtitle="The Sweet Spot \u00B7 $20\u2013$120/pp"
          restaurants={tiers.feast}
          accentClass="tier-feast"
        />
      )}
      {(tierFilter === 'all' || tierFilter === 'whale') && (
        <TierSection
          tier="whale"
          label="WHITE WHALE"
          subtitle="Fine Dining \u00B7 $120+/pp"
          restaurants={tiers.whale}
          accentClass="tier-whale"
        />
      )}
      {(tierFilter === 'all' || tierFilter === 'pizza') && (
        <TierSection
          tier="pizza"
          label="PIZZA"
          subtitle="LA\u2019s Best Pies \u00B7 All Styles"
          restaurants={tiers.pizza}
          accentClass="tier-pizza"
        />
      )}
      {(tierFilter === 'all' || tierFilter === 'tacos') && (
        <TierSection
          tier="tacos"
          label="TACOS"
          subtitle="The Global Capital \u00B7 All Styles"
          restaurants={tiers.tacos}
          accentClass="tier-tacos"
        />
      )}
    </div>
  )
}

export default EatsByTier
