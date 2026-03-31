import { useMemo } from 'react'
import './EatsByTier.css'

function EatsMapView({ data }) {
  const restaurants = data?.restaurants || []

  const tierColors = {
    street: '#FF6B35',
    feast: '#D4A574',
    whale: '#C9A84C',
  }

  if (!data) {
    return (
      <div className="eats-empty">
        <h2>Loading restaurants...</h2>
      </div>
    )
  }

  // Group by neighborhood, separating unknowns
  const { namedGroups, unknownRestaurants } = useMemo(() => {
    const groups = {}
    const unknown = []
    for (const r of restaurants) {
      if (!r.neighborhood || r.neighborhood.trim() === '') {
        unknown.push(r)
      } else {
        const key = r.neighborhood
        if (!groups[key]) groups[key] = []
        groups[key].push(r)
      }
    }
    const sorted = Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
    return { namedGroups: sorted, unknownRestaurants: unknown }
  }, [restaurants])

  return (
    <div className="eats-page">
      <div className="eats-map-header">
        <h2 className="eats-map-title">BY NEIGHBORHOOD</h2>
        <p className="eats-map-subtitle">{restaurants.length} restaurants across LA</p>
      </div>
      <div className="eats-map-list">
        {namedGroups.map(([neighborhood, spots]) => (
          <div key={neighborhood} className="eats-map-neighborhood">
            <h3 className="eats-map-hood-name">
              {neighborhood}
              <span className="eats-map-hood-count">{spots.length}</span>
            </h3>
            <ul className="eats-map-hood-spots">
              {spots
                .sort((a, b) => b.heatScore - a.heatScore)
                .map(r => (
                  <li key={r.id} className="eats-map-spot">
                    <a
                      href={r.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="eats-map-spot-link"
                    >
                      <span
                        className="eats-map-spot-dot"
                        style={{ background: tierColors[r.tier] }}
                      />
                      <span className="eats-map-spot-name">{r.name}</span>
                      <span className="eats-map-spot-cuisine">{r.cuisine}</span>
                      <span className="eats-map-spot-price">{r.priceRange}</span>
                      {r.isNew && <span className="eats-new-badge">NEW</span>}
                    </a>
                  </li>
                ))}
            </ul>
          </div>
        ))}
        {unknownRestaurants.length > 0 && (
          <div className="eats-map-neighborhood eats-map-unknown">
            <h3 className="eats-map-hood-name">
              Neighborhood Unknown
              <span className="eats-map-hood-count">{unknownRestaurants.length}</span>
            </h3>
            <ul className="eats-map-hood-spots">
              {unknownRestaurants
                .sort((a, b) => b.heatScore - a.heatScore)
                .map(r => (
                  <li key={r.id} className="eats-map-spot">
                    <a
                      href={r.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="eats-map-spot-link"
                    >
                      <span
                        className="eats-map-spot-dot"
                        style={{ background: tierColors[r.tier] }}
                      />
                      <span className="eats-map-spot-name">{r.name}</span>
                      <span className="eats-map-spot-cuisine">{r.cuisine}</span>
                      <span className="eats-map-spot-price">{r.priceRange}</span>
                      {r.isNew && <span className="eats-new-badge">NEW</span>}
                    </a>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default EatsMapView
