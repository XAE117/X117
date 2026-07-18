import { JAZZ_VENUE_COORDS } from '../data/jazzVenueLocations.js'
import { THEATER_COORDS } from '../data/theaterLocations.js'
import { compareDatedEvents, parseTime } from './timeUtils.js'
import { isRestaurantOpenAt } from './restaurantHours.js'

export { isRestaurantOpenAt } from './restaurantHours.js'

export const CENTRAL_LA = { lat: 34.0614, lng: -118.3081 }

function distanceMiles(from, to) {
  if (!Number.isFinite(from?.lat) || !Number.isFinite(from?.lng) || !Number.isFinite(to?.lat) || !Number.isFinite(to?.lng)) {
    return null
  }
  const radius = 3959
  const lat = (to.lat - from.lat) * Math.PI / 180
  const lng = (to.lng - from.lng) * Math.PI / 180
  const a = Math.sin(lat / 2) ** 2 +
    Math.cos(from.lat * Math.PI / 180) *
    Math.cos(to.lat * Math.PI / 180) *
    Math.sin(lng / 2) ** 2
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function localDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function vibeMatches(item, vibe) {
  if (!vibe || vibe === 'all') return true
  if (item.kind === 'food') {
    if (vibe === 'casual' || vibe === 'budget') return ['street', 'tacos', 'pizza'].includes(item.tier)
    if (vibe === 'romantic') return ['feast', 'whale'].includes(item.tier)
    if (vibe === 'adventure') return item.heatScore >= 4 || ['street', 'whale'].includes(item.tier)
  }
  if (item.kind === 'film') {
    if (vibe === 'romantic' || vibe === 'adventure') return ['35mm', '70mm', '16mm', 'nitrate'].includes(item.format?.toLowerCase())
    return true
  }
  if (item.kind === 'jazz') {
    return vibe !== 'adventure' || item.hot
  }
  return true
}

export function buildDiscoveryItems(cinemaData, jazzData, foodData) {
  const items = []

  for (const theater of cinemaData?.theaters || []) {
    for (const screening of theater.screenings || []) {
      items.push({
        kind: 'film',
        id: screening.id,
        name: screening.title,
        venue: theater.shortName || theater.name,
        neighborhood: theater.neighborhood || '',
        date: screening.date,
        time: screening.time,
        format: screening.format || 'digital',
        coords: THEATER_COORDS[theater.id] || null,
        href: `/screening/${screening.id}`,
      })
    }
  }

  for (const venue of jazzData?.venues || []) {
    for (const show of venue.shows || []) {
      items.push({
        kind: 'jazz',
        id: show.id,
        name: show.artist,
        venue: venue.shortName || venue.name,
        neighborhood: venue.neighborhood || '',
        date: show.date,
        time: show.time,
        hot: show.hot,
        coords: JAZZ_VENUE_COORDS[venue.id] || null,
        href: `/jazz/show/${show.id}`,
      })
    }
  }

  for (const restaurant of foodData?.restaurants || []) {
    items.push({
      kind: 'food',
      id: restaurant.id,
      name: restaurant.name,
      venue: restaurant.cuisine || restaurant.tier,
      neighborhood: restaurant.neighborhood || '',
      tier: restaurant.tier,
      heatScore: restaurant.heatScore || 0,
      price: restaurant.price || restaurant.priceRange || '',
      hours: restaurant.hours,
      coords: Number.isFinite(restaurant.lat) && Number.isFinite(restaurant.lng)
        ? { lat: restaurant.lat, lng: restaurant.lng }
        : null,
      href: `/food/spot/${restaurant.id}`,
    })
  }

  return items
}

export function filterDiscoveryItems(items, filters, now = new Date()) {
  const today = localDateKey(now)
  const tomorrowDate = new Date(now)
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrow = localDateKey(tomorrowDate)
  const query = filters.query.trim().toLowerCase()

  return items.filter(item => {
    if (item.kind !== 'food') {
      if (!item.date || item.date < today) return false
      if (item.date === today) {
        const minutes = parseTime(item.time)
        const nowMinutes = now.getHours() * 60 + now.getMinutes()
        if (minutes != null && minutes < nowMinutes) return false
      }
    }
    if (filters.kind !== 'all' && item.kind !== filters.kind) return false
    if (query && !`${item.name} ${item.venue} ${item.neighborhood}`.toLowerCase().includes(query)) return false
    if (filters.date === 'today' && item.date !== today) return false
    if (filters.date === 'tomorrow' && item.date !== tomorrow) return false
    if (filters.date !== 'all' && item.kind === 'food') return false
    if (filters.format !== 'all' && item.format?.toLowerCase() !== filters.format) return false
    if (filters.price !== 'all' && item.tier !== filters.price) return false
    if (filters.neighborhood !== 'all' && item.neighborhood !== filters.neighborhood) return false
    if (!vibeMatches(item, filters.vibe)) return false
    if (filters.openNow && (item.kind !== 'food' || !isRestaurantOpenAt(item.hours, now))) return false

    if (filters.radius !== 'all') {
      const distance = distanceMiles(CENTRAL_LA, item.coords)
      if (distance == null || distance > Number(filters.radius)) return false
    }
    return true
  }).sort((a, b) => {
    if (a.kind === 'food' && b.kind === 'food') return b.heatScore - a.heatScore || a.name.localeCompare(b.name)
    if (a.kind === 'food') return 1
    if (b.kind === 'food') return -1
    return compareDatedEvents(a, b)
  })
}
