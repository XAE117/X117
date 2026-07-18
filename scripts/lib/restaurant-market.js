export const RESTAURANT_MARKET_BOUNDS = {
  minLat: 33.3,
  maxLat: 34.9,
  minLng: -119.0,
  maxLng: -117.3,
}

const ALLOWED_MICHELIN_LOCATIONS = new Set([
  'alhambra',
  'anaheim',
  'arcadia',
  'bell-gardens',
  'beverly-hills',
  'burbank',
  'cerritos',
  'costa-mesa',
  'culver-city',
  'fullerton',
  'gardena',
  'glendale',
  'hollywood',
  'la-puente_2880159',
  'long-beach',
  'manhattan-beach',
  'newport-beach',
  'orange',
  'pasadena',
  'rosemead',
  'san-pedro',
  'santa-ana',
  'santa-monica',
  'sherman-oaks',
  'studio-city',
  'torrance',
  'us-long-beach',
  'us-los-angeles',
  'us-monrovia',
  'venice',
  'west-hollywood',
])

const OUT_OF_MARKET_TEXT = /\b(?:Washington,?\s*DC|San Francisco|New York,?\s*NY|Menlo Park|Montecito|Orlando,?\s*FL|Tampa,?\s*FL|Coral Gables|Bonita Springs)\b/i
const MICHELIN_RESTAURANT_PATH = /guide\.michelin\.com\/us\/en\/([^/]+)\/([^/]+)\/restaurant\//i

function hasCoordinate(value) {
  return Number.isFinite(value)
}

export function getRestaurantMarketIssue(restaurant) {
  const hasLat = hasCoordinate(restaurant?.lat)
  const hasLng = hasCoordinate(restaurant?.lng)

  if (hasLat !== hasLng) return 'incomplete coordinates'
  if (hasLat && hasLng) {
    const { minLat, maxLat, minLng, maxLng } = RESTAURANT_MARKET_BOUNDS
    if (
      restaurant.lat < minLat ||
      restaurant.lat > maxLat ||
      restaurant.lng < minLng ||
      restaurant.lng > maxLng
    ) {
      return `coordinates outside Greater LA (${restaurant.lat}, ${restaurant.lng})`
    }
  }

  const locationText = `${restaurant?.neighborhood || ''} ${restaurant?.address || ''}`
  if (OUT_OF_MARKET_TEXT.test(locationText)) {
    return `location outside Greater LA (${locationText.trim()})`
  }

  for (const source of restaurant?.sources || []) {
    const match = String(source?.url || '').match(MICHELIN_RESTAURANT_PATH)
    if (!match) continue

    const [, region, location] = match
    if (region.toLowerCase() !== 'california' || !ALLOWED_MICHELIN_LOCATIONS.has(location.toLowerCase())) {
      return `Michelin source outside Greater LA (${region}/${location})`
    }
  }

  return null
}

export function isRestaurantInMarket(restaurant) {
  return getRestaurantMarketIssue(restaurant) === null
}
