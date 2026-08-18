import { createAppleMapsUrl } from '../utils/directions.js'

const EVENING_START_MINUTES = 17 * 60
const EARTH_RADIUS_MILES = 3_958.7613
export const LOS_ANGELES_TIME_ZONE = 'America/Los_Angeles'

const LOS_ANGELES_CLOCK = new Intl.DateTimeFormat('en-US', {
  timeZone: LOS_ANGELES_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function losAngelesClockParts(date = new Date()) {
  return Object.fromEntries(LOS_ANGELES_CLOCK.formatToParts(date)
    .filter(part => part.type !== 'literal')
    .map(part => [part.type, Number(part.value)]))
}

function coordinatesFor(point) {
  const latitude = Number(point?.latitude ?? point?.lat)
  const longitude = Number(point?.longitude ?? point?.lng)
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    ? { latitude, longitude }
    : null
}

function radians(value) {
  return value * Math.PI / 180
}

export function localDateKey(date = new Date()) {
  const { year, month, day } = losAngelesClockParts(date)
  return [
    year,
    String(month).padStart(2, '0'),
    String(day).padStart(2, '0'),
  ].join('-')
}

function localTimeMinutes(date = new Date()) {
  const { hour, minute } = losAngelesClockParts(date)
  return hour * 60 + minute
}

export function parseTimeMinutes(value) {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i)
  if (!match) return Number.MAX_SAFE_INTEGER
  let hours = Number(match[1])
  const minutes = Number(match[2])
  const period = match[3].toLowerCase()
  if (period === 'pm' && hours !== 12) hours += 12
  if (period === 'am' && hours === 12) hours = 0
  return hours * 60 + minutes
}

export function formatScreeningTime(value) {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i)
  if (!match) return String(value || 'Time unavailable')
  return `${Number(match[1])}:${match[2]} ${match[3].toUpperCase()}`
}

export function formatCatalogTime(value) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Unknown update time'
  return parsed.toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

export function distanceMilesBetween(origin, destination) {
  const start = coordinatesFor(origin)
  const end = coordinatesFor(destination)
  if (!start || !end) return null

  const latitudeDelta = radians(end.latitude - start.latitude)
  const longitudeDelta = radians(end.longitude - start.longitude)
  const latitudeStart = radians(start.latitude)
  const latitudeEnd = radians(end.latitude)
  const halfChord = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeStart) * Math.cos(latitudeEnd) * Math.sin(longitudeDelta / 2) ** 2
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(halfChord)))
}

export function formatDistanceMiles(value) {
  if (!Number.isFinite(value) || value < 0) return null
  if (value < 10) return `${value.toFixed(value < 1 ? 1 : 0)} mi away`
  return `${Math.round(value)} mi away`
}

export function sortRestaurantsByDistance(restaurants, origin) {
  if (!Array.isArray(restaurants)) return []
  return restaurants
    .map((restaurant, index) => ({
      restaurant: {
        ...restaurant,
        distanceMiles: distanceMilesBetween(origin, restaurant),
      },
      index,
    }))
    .sort((left, right) => {
      const leftDistance = left.restaurant.distanceMiles ?? Number.POSITIVE_INFINITY
      const rightDistance = right.restaurant.distanceMiles ?? Number.POSITIVE_INFINITY
      return leftDistance - rightDistance || left.index - right.index
    })
    .map(({ restaurant }) => restaurant)
}

export function collectScreenings(feed) {
  const rows = []
  for (const theater of feed?.data?.theaters || []) {
    for (const screening of theater.screenings || []) {
      rows.push({
        ...screening,
        theaterId: theater.id,
        theaterName: theater.name,
        theaterShortName: theater.shortName || theater.name,
        theaterNeighborhood: theater.neighborhood,
      })
    }
  }
  return rows.sort((a, b) => (
    a.date.localeCompare(b.date) ||
    parseTimeMinutes(a.time) - parseTimeMinutes(b.time) ||
    a.title.localeCompare(b.title) ||
    a.id.localeCompare(b.id)
  ))
}

export function groupScreeningsByTitle(screenings) {
  const groups = new Map()
  for (const screening of screenings) {
    const key = String(screening.title || '').trim().toLocaleLowerCase()
    if (!key) continue
    const group = groups.get(key) || { title: screening.title, showings: [] }
    group.showings.push(screening)
    groups.set(key, group)
  }

  return [...groups.values()]
    .map(group => ({
      ...group,
      showings: [...group.showings].sort((a, b) => (
        a.date.localeCompare(b.date) ||
        parseTimeMinutes(a.time) - parseTimeMinutes(b.time) ||
        a.theaterShortName.localeCompare(b.theaterShortName) ||
        a.id.localeCompare(b.id)
      )),
    }))
    .map(group => ({
      ...group,
      id: `${group.showings[0].date}:${group.showings[0].id}`,
      primary: group.showings[0],
    }))
    .sort((a, b) => (
      a.primary.date.localeCompare(b.primary.date) ||
      parseTimeMinutes(a.primary.time) - parseTimeMinutes(b.primary.time) ||
      a.title.localeCompare(b.title)
    ))
}

export function upcomingScreenings(feed, now = new Date()) {
  const today = localDateKey(now)
  const nowMinutes = localTimeMinutes(now)
  return collectScreenings(feed).filter(item => {
    const startMinutes = parseTimeMinutes(item.time)
    if (startMinutes === Number.MAX_SAFE_INTEGER) return false
    return item.date > today || (item.date === today && startMinutes >= nowMinutes)
  })
}

export function tonightOrNextScreenings(feed, now = new Date()) {
  const today = localDateKey(now)
  const nowMinutes = localTimeMinutes(now)
  const screenings = upcomingScreenings(feed, now)
  const tonight = screenings.filter(item =>
    item.date === today &&
    parseTimeMinutes(item.time) >= EVENING_START_MINUTES &&
    parseTimeMinutes(item.time) >= nowMinutes,
  )
  if (tonight.length > 0) return tonight

  return screenings.filter(item =>
    item.date > today && parseTimeMinutes(item.time) >= EVENING_START_MINUTES,
  )
}

export function readableDate(date) {
  const value = new Date(`${date}T12:00:00`)
  if (Number.isNaN(value.getTime())) return date
  return value.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function directionsForCinema(item) {
  return createAppleMapsUrl({ name: item.theaterName, neighborhood: item.theaterNeighborhood })
}

export function directionsForRestaurant(restaurant) {
  return createAppleMapsUrl(restaurant)
}
