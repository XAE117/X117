import { useParams, Link } from 'react-router-dom'
import './EatsByTier.css'

function EatsDetail({ data }) {
  const { spotId } = useParams()

  const restaurant = data?.restaurants?.find(r => r.id === spotId)

  if (!restaurant) {
    return (
      <div className="eats-empty">
        <h2>Restaurant Not Found</h2>
        <p>This restaurant may no longer be listed.</p>
        <Link to="/food" className="back-btn">&larr; Back to Eats</Link>
      </div>
    )
  }

  const tierLabel = restaurant.tier === 'street' ? 'STREET' : restaurant.tier === 'whale' ? 'WHITE WHALE' : 'FEAST'

  return (
    <div className="eats-detail-page">
      <div className={`eats-detail-card tier-${restaurant.tier}`}>
        <div className="eats-detail-header">
          <h1 className="eats-detail-name">{restaurant.name}</h1>
          <span className="eats-detail-neighborhood">{restaurant.neighborhood}</span>
          <span className={`eats-detail-tier tier-${restaurant.tier}`}>{tierLabel}</span>
        </div>

        <div className="eats-detail-meta">
          <span className="eats-detail-cuisine">{restaurant.cuisine}</span>
          <span className="eats-detail-price">{restaurant.priceRange}</span>
          {restaurant.michelinStatus && (
            <span className={`eats-michelin-badge michelin-${restaurant.michelinStatus}`}>
              {restaurant.michelinStatus === 'bib-gourmand' ? 'Bib Gourmand' :
                restaurant.michelinStatus === 'one-star' ? '\u2B50 Michelin' :
                  restaurant.michelinStatus === 'two-star' ? '\u2B50\u2B50 Michelin' :
                    '\u2B50\u2B50\u2B50 Michelin'}
            </span>
          )}
        </div>

        <p className="eats-detail-description">{restaurant.description}</p>

        {restaurant.whyHot && (
          <div className="eats-detail-whyhot">
            <span className="eats-detail-label">Why It's Hot</span>
            <p>{restaurant.whyHot}</p>
          </div>
        )}

        {restaurant.sources?.length > 0 && (
          <div className="eats-detail-sources">
            <span className="eats-detail-label">Featured In</span>
            <div className="eats-sources">
              {restaurant.sources.map((s, i) => (
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="eats-source-badge"
                >
                  {s.name}
                  {s.rating && <span className="eats-source-rating">{s.rating}</span>}
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="eats-detail-info">
          {restaurant.address && (
            <div className="eats-detail-info-item">
              <span className="eats-detail-label">Address</span>
              <span>{restaurant.address}</span>
            </div>
          )}
          {restaurant.hours && (
            <div className="eats-detail-info-item">
              <span className="eats-detail-label">Hours</span>
              <span>{restaurant.hours}</span>
            </div>
          )}
        </div>

        <div className="eats-detail-actions">
          {restaurant.reservationUrl && (
            <a href={restaurant.reservationUrl} target="_blank" rel="noopener noreferrer" className="eats-action-btn eats-reserve-btn">
              Reserve a Table
            </a>
          )}
          {restaurant.googleMapsUrl && (
            <a href={restaurant.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="eats-action-btn eats-maps-btn">
              Get Directions
            </a>
          )}
          {restaurant.instagramHandle && (
            <a href={`https://instagram.com/${restaurant.instagramHandle}`} target="_blank" rel="noopener noreferrer" className="eats-action-btn">
              @{restaurant.instagramHandle}
            </a>
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

      <Link to="/food" className="back-btn">&larr; back</Link>
    </div>
  )
}

export default EatsDetail
