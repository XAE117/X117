import { SIXPM_STORAGE_KEYS, nativeAdapter } from './native/nativeAdapter.js'
import { formatScreeningTime } from './format.js'

export const SAVED_EVENINGS_SCHEMA_VERSION = 1
export const SAVED_EVENINGS_LIMIT = 24
export const LOS_ANGELES_TIME_ZONE = 'America/Los_Angeles'

const AMC_PROVIDER = 'amc-catalog'
const FOOD_PROVIDER = 'sixpm-editorial'
const SAVED_STATUSES = new Set(['planned', 'completed'])

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function validTimestamp(value) {
  return typeof value === 'string' && Number.isFinite(new Date(value).getTime())
}

function secureUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

function requireText(value, label) {
  const text = nonEmpty(value)
  if (!text) throw new Error(`${label} is required.`)
  return text
}

function requireSecureUrl(value, label) {
  const url = secureUrl(value)
  if (!url) throw new Error(`${label} must be a secure URL.`)
  return url
}

function datePartsAt(timestamp, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  return Object.fromEntries(formatter.formatToParts(new Date(timestamp))
    .filter(part => part.type !== 'literal')
    .map(part => [part.type, Number(part.value)]))
}

function timeZoneOffsetAt(timestamp, timeZone) {
  const parts = datePartsAt(timestamp, timeZone)
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - timestamp
}

export function screeningStartAt(cinema, timeZone = LOS_ANGELES_TIME_ZONE) {
  const dateMatch = requireText(cinema?.date, 'Screening date').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const timeMatch = requireText(cinema?.time, 'Screening time').match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i)
  if (!dateMatch || !timeMatch) throw new Error('Screening date and time must be valid.')

  const year = Number(dateMatch[1])
  const month = Number(dateMatch[2])
  const day = Number(dateMatch[3])
  let hour = Number(timeMatch[1])
  const minute = Number(timeMatch[2])
  const period = timeMatch[3].toLowerCase()
  if (hour < 1 || hour > 12 || minute > 59) throw new Error('Screening time must be valid.')
  if (period === 'pm' && hour !== 12) hour += 12
  if (period === 'am' && hour === 12) hour = 0

  const civilTimestamp = Date.UTC(year, month - 1, day, hour, minute)
  const initialOffset = timeZoneOffsetAt(civilTimestamp, timeZone)
  let timestamp = civilTimestamp - initialOffset
  const settledOffset = timeZoneOffsetAt(timestamp, timeZone)
  if (settledOffset !== initialOffset) timestamp = civilTimestamp - settledOffset
  return new Date(timestamp)
}

function activeProviderSnapshot(section, provider, requiredFields) {
  if (!isObject(section) || section.availability !== 'available' || section.provider !== provider) return false
  if (!validTimestamp(section.expiresAt) || (provider === AMC_PROVIDER && !validTimestamp(section.startAt))) return false
  return requiredFields.every(field => nonEmpty(section[field]))
}

function providerSnapshotIsFresh(section, now) {
  return section?.availability === 'available' && validTimestamp(section.expiresAt) && new Date(section.expiresAt).getTime() >= now.getTime()
}

function cinemaSnapshot(cinema, feed, now) {
  if (cinema?.provider !== AMC_PROVIDER) throw new Error('Only the approved AMC cinema catalog may be saved.')
  if (feed?.availability?.status === 'disabled' || !feed?.providers?.includes(AMC_PROVIDER)) {
    throw new Error('The cinema catalog is not approved for saved evenings.')
  }
  const expiresAt = requireText(feed?.expiresAt, 'Cinema catalog expiry')
  const end = new Date(expiresAt).getTime()
  if (!Number.isFinite(end) || end < now.getTime()) throw new Error('The cinema catalog is no longer current.')
  const startAt = screeningStartAt(cinema)
  if (startAt.getTime() > end) {
    throw new Error('This showing is outside the approved offline-save window. Refresh closer to the date.')
  }

  return {
    availability: 'available',
    provider: AMC_PROVIDER,
    expiresAt,
    id: requireText(cinema.id, 'Screening id'),
    title: requireText(cinema.title, 'Film title'),
    date: requireText(cinema.date, 'Screening date'),
    time: requireText(cinema.time, 'Screening time'),
    startAt: startAt.toISOString(),
    format: nonEmpty(cinema.format) || 'Standard',
    notes: nonEmpty(cinema.notes) || '',
    link: requireSecureUrl(cinema.link, 'AMC showtime link'),
    theaterId: requireText(cinema.theaterId, 'Theater id'),
    theaterName: requireText(cinema.theaterName, 'Theater name'),
    theaterShortName: requireText(cinema.theaterShortName, 'Theater short name'),
    theaterNeighborhood: requireText(cinema.theaterNeighborhood, 'Theater neighborhood'),
  }
}

function foodSnapshot(food, feed, now) {
  if (food?.provider !== FOOD_PROVIDER) throw new Error('Only approved SIXPM editorial food records may be saved.')
  if (feed?.availability?.status === 'disabled' || !feed?.providers?.includes(FOOD_PROVIDER)) {
    throw new Error('The food catalog is not approved for saved evenings.')
  }
  const expiresAt = requireText(feed?.expiresAt, 'Food catalog expiry')
  if (new Date(expiresAt).getTime() < now.getTime()) throw new Error('The food catalog is no longer current.')
  const lat = Number(food.lat)
  const lng = Number(food.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error('Approved food directions require editorial coordinates.')

  return {
    availability: 'available',
    provider: FOOD_PROVIDER,
    expiresAt,
    id: requireText(food.id, 'Restaurant id'),
    name: requireText(food.name, 'Restaurant name'),
    neighborhood: requireText(food.neighborhood, 'Restaurant neighborhood'),
    address: requireText(food.address, 'Restaurant address'),
    cuisine: requireText(food.cuisine, 'Restaurant cuisine'),
    priceRange: nonEmpty(food.priceRange) || nonEmpty(food.tier) || 'Price unavailable',
    hours: nonEmpty(food.hours) || 'Hours unavailable',
    lat,
    lng,
  }
}

function redactedSnapshot(section, now) {
  if (!isObject(section) || section.availability !== 'available' || !validTimestamp(section.expiresAt)) {
    return { section, changed: false }
  }
  if (new Date(section.expiresAt).getTime() >= now.getTime()) return { section, changed: false }
  return {
    section: {
      availability: 'expired',
      provider: section.provider,
      expiresAt: section.expiresAt,
    },
    changed: true,
  }
}

function normalizedId(value) {
  return typeof value === 'string' && /^sixpm-[a-z0-9-]+$/i.test(value) ? value : null
}

function sortEvenings(evenings) {
  return [...evenings].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'planned' ? -1 : 1
    const aStart = new Date(a.cinema?.startAt || a.updatedAt).getTime()
    const bStart = new Date(b.cinema?.startAt || b.updatedAt).getTime()
    return bStart - aStart || b.updatedAt.localeCompare(a.updatedAt)
  })
}

export function createSavedEvening({
  cinema,
  food,
  catalog,
  now = new Date(),
  createId = () => `sixpm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
} = {}) {
  const createdAt = now.toISOString()
  const id = normalizedId(createId())
  if (!id) throw new Error('Saved evening id is invalid.')
  const cinemaFeed = catalog?.feeds?.cinema
  const foodFeed = catalog?.feeds?.food
  if (!nonEmpty(catalog?.index?.catalogVersion)) throw new Error('Catalog version is required to save an evening.')

  return {
    schemaVersion: SAVED_EVENINGS_SCHEMA_VERSION,
    id,
    status: 'planned',
    createdAt,
    updatedAt: createdAt,
    completedAt: null,
    catalogVersion: catalog.index.catalogVersion,
    cinema: cinemaSnapshot(cinema, cinemaFeed, now),
    food: foodSnapshot(food, foodFeed, now),
    reminder: null,
    calendar: null,
  }
}

export function savedEveningAvailability(evening, now = new Date()) {
  return {
    cinema: providerSnapshotIsFresh(evening?.cinema, now),
    food: providerSnapshotIsFresh(evening?.food, now),
  }
}

export function redactExpiredProviderData(evening, now = new Date()) {
  const cinema = redactedSnapshot(evening?.cinema, now)
  const food = redactedSnapshot(evening?.food, now)
  if (!cinema.changed && !food.changed) return { evening, changed: false }
  return {
    evening: {
      ...evening,
      cinema: cinema.section,
      food: food.section,
      reminder: cinema.changed ? null : evening.reminder,
      updatedAt: now.toISOString(),
    },
    changed: true,
  }
}

export function validateSavedEvening(evening) {
  const errors = []
  if (!isObject(evening)) return ['Saved evening must be an object.']
  if (evening.schemaVersion !== SAVED_EVENINGS_SCHEMA_VERSION) errors.push('Saved evening has an unsupported schema version.')
  if (!normalizedId(evening.id)) errors.push('Saved evening has an invalid id.')
  if (!SAVED_STATUSES.has(evening.status)) errors.push('Saved evening has an invalid status.')
  if (!validTimestamp(evening.createdAt) || !validTimestamp(evening.updatedAt)) errors.push('Saved evening has invalid timestamps.')
  if (!nonEmpty(evening.catalogVersion)) errors.push('Saved evening is missing catalog provenance.')

  const cinema = evening.cinema
  if (cinema?.availability === 'available') {
    if (!activeProviderSnapshot(cinema, AMC_PROVIDER, ['id', 'title', 'date', 'time', 'startAt', 'link', 'theaterId', 'theaterName', 'theaterShortName', 'theaterNeighborhood'])) {
      errors.push('Saved evening has an invalid cinema snapshot.')
    } else if (!secureUrl(cinema.link)) {
      errors.push('Saved evening has an insecure cinema link.')
    }
  } else if (!(cinema?.availability === 'expired' && cinema?.provider === AMC_PROVIDER && validTimestamp(cinema.expiresAt))) {
    errors.push('Saved evening has an invalid redacted cinema snapshot.')
  }

  const food = evening.food
  if (food?.availability === 'available') {
    if (!activeProviderSnapshot(food, FOOD_PROVIDER, ['id', 'name', 'neighborhood', 'address', 'cuisine', 'priceRange', 'hours'])) {
      errors.push('Saved evening has an invalid food snapshot.')
    } else if (!Number.isFinite(food.lat) || !Number.isFinite(food.lng)) {
      errors.push('Saved evening has invalid food coordinates.')
    }
  } else if (!(food?.availability === 'expired' && food?.provider === FOOD_PROVIDER && validTimestamp(food.expiresAt))) {
    errors.push('Saved evening has an invalid redacted food snapshot.')
  }

  return errors
}

export function normalizeSavedEvenings(payload, now = new Date()) {
  const rows = Array.isArray(payload?.evenings) ? payload.evenings : []
  const seen = new Set()
  let changed = payload !== null && payload?.schemaVersion !== SAVED_EVENINGS_SCHEMA_VERSION
  const evenings = []

  for (const candidate of rows) {
    const errors = validateSavedEvening(candidate)
    if (errors.length > 0 || seen.has(candidate.id)) {
      changed = true
      continue
    }
    seen.add(candidate.id)
    const redacted = redactExpiredProviderData(candidate, now)
    changed ||= redacted.changed
    evenings.push(redacted.evening)
  }

  const sorted = sortEvenings(evenings).slice(0, SAVED_EVENINGS_LIMIT)
  if (sorted.length !== evenings.length) changed = true
  return { evenings: sorted, changed }
}

export async function loadSavedEvenings({ adapter = nativeAdapter, now = new Date() } = {}) {
  const payload = await adapter.readJson(SIXPM_STORAGE_KEYS.savedEvenings, null)
  const normalized = normalizeSavedEvenings(payload, now)
  if (normalized.changed) {
    await adapter.writeJson(SIXPM_STORAGE_KEYS.savedEvenings, {
      schemaVersion: SAVED_EVENINGS_SCHEMA_VERSION,
      evenings: normalized.evenings,
    })
  }
  return normalized.evenings
}

export async function persistSavedEvenings(evenings, { adapter = nativeAdapter, now = new Date() } = {}) {
  const normalized = normalizeSavedEvenings({
    schemaVersion: SAVED_EVENINGS_SCHEMA_VERSION,
    evenings,
  }, now)
  await adapter.writeJson(SIXPM_STORAGE_KEYS.savedEvenings, {
    schemaVersion: SAVED_EVENINGS_SCHEMA_VERSION,
    evenings: normalized.evenings,
  })
  return normalized.evenings
}

export function completeSavedEvening(evening, now = new Date()) {
  if (evening?.status === 'completed') return evening
  return {
    ...evening,
    status: 'completed',
    completedAt: now.toISOString(),
    updatedAt: now.toISOString(),
    reminder: null,
  }
}

export function withSavedEveningReminder(evening, reminder, now = new Date()) {
  return {
    ...evening,
    reminder,
    updatedAt: now.toISOString(),
  }
}

export function notificationIdForSavedEvening(id, occupiedIds = []) {
  const occupied = new Set(occupiedIds)
  let hash = 2166136261
  for (const char of String(id)) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  let candidate = (hash >>> 0) % 2_147_483_646 + 1
  while (occupied.has(candidate)) candidate = candidate === 2_147_483_647 ? 1 : candidate + 1
  return candidate
}

export function calendarEventForSavedEvening(evening, now = new Date()) {
  const availability = savedEveningAvailability(evening, now)
  if (!availability.cinema) throw new Error('Cinema details are no longer available for Calendar.')
  const cinema = evening.cinema
  const food = availability.food ? evening.food : null
  const startAt = new Date(cinema.startAt)
  if (startAt.getTime() <= now.getTime()) throw new Error('This evening has already started.')
  const endAt = new Date(startAt.getTime() + 3 * 60 * 60 * 1000)
  const foodNote = food
    ? `Dinner: ${food.name}\n${food.address}\n${food.hours}`
    : 'Dinner details are no longer available in SIXPM.'

  return {
    title: `SIXPM · ${cinema.title}`,
    startAt,
    endAt,
    location: cinema.theaterName,
    notes: `${formatScreeningTime(cinema.time)} at ${cinema.theaterName}\n${foodNote}`,
    url: cinema.link,
  }
}

export function reminderForSavedEvening(evening, id, { leadMinutes = 90, now = new Date() } = {}) {
  const availability = savedEveningAvailability(evening, now)
  if (!availability.cinema) throw new Error('Cinema details are no longer available for a reminder.')
  const at = new Date(new Date(evening.cinema.startAt).getTime() - leadMinutes * 60 * 1000)
  if (at.getTime() <= now.getTime()) throw new Error('This evening starts too soon for the default reminder.')
  const food = availability.food ? evening.food.name : 'your saved evening'
  return {
    id,
    at,
    title: `SIXPM · ${evening.cinema.title}`,
    body: `${formatScreeningTime(evening.cinema.time)} at ${evening.cinema.theaterShortName}. Dinner: ${food}.`,
    extra: { eveningId: evening.id },
  }
}

export function shareContentForSavedEvening(evening, now = new Date()) {
  const availability = savedEveningAvailability(evening, now)
  const lines = ['A saved SIXPM evening']
  if (availability.cinema) {
    lines.push(`${evening.cinema.title} · ${evening.cinema.date} at ${formatScreeningTime(evening.cinema.time)}`)
    lines.push(`${evening.cinema.theaterName} · ${evening.cinema.theaterNeighborhood}`)
  }
  if (availability.food) {
    lines.push(`Dinner: ${evening.food.name} · ${evening.food.address}`)
  }
  return {
    title: availability.cinema ? `SIXPM · ${evening.cinema.title}` : 'SIXPM saved evening',
    text: lines.join('\n'),
    ...(availability.cinema ? { url: evening.cinema.link } : {}),
  }
}
