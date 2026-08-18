import { createAppleMapsUrl } from '../utils/directions.js'

const EVENING_START_MINUTES = 17 * 60

export function localDateKey(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
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

export function formatCatalogTime(value) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Unknown update time'
  return parsed.toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
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

export function tonightOrNextScreenings(feed, now = new Date()) {
  const today = localDateKey(now)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const screenings = collectScreenings(feed)
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
