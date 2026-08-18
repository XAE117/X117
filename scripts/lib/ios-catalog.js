import { createHash } from 'node:crypto'

export const IOS_CATALOG_SCHEMA_VERSION = 1
export const IOS_CATALOG_VERSION = 'v1'

const VALID_PROVIDER_STATUSES = new Set(['approved', 'pending', 'disabled'])
const FORBIDDEN_PROVIDER_MARKERS = [
  'googlemapsurl',
  'googleapis.com',
  'maps.google.',
  'google-places',
  'tmdb',
  'posterpath',
  'backdroppath',
  'overview',
  'rottenTomatoes',
  'letterboxd',
]

const FEED_KEYS = new Set([
  'schemaVersion', 'catalog', 'generatedAt', 'expiresAt', 'providers',
  'attribution', 'availability', 'data',
])
const AVAILABILITY_KEYS = new Set(['status', 'reasonCode'])
const CINEMA_THEATER_KEYS = new Set([
  'id', 'provider', 'name', 'shortName', 'neighborhood', 'url', 'screenings',
])
const CINEMA_SCREENING_KEYS = new Set([
  'id', 'provider', 'title', 'date', 'time', 'format', 'notes', 'link',
])
const FOOD_RESTAURANT_KEYS = new Set([
  'id', 'provider', 'name', 'neighborhood', 'address', 'cuisine', 'tier',
  'priceRange', 'description', 'whyHot', 'tags', 'hours', 'lat', 'lng',
])

function asIso(value, label) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error(`${label} must be a valid ISO date`)
  return date.toISOString()
}

function requireString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${label} is required`)
  return value.trim()
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value))
}

export function validateProviderPolicy(policy) {
  if (!policy || policy.schemaVersion !== 1 || !policy.providers || typeof policy.providers !== 'object') {
    throw new Error('Invalid iOS provider policy')
  }

  for (const [id, provider] of Object.entries(policy.providers)) {
    if (!VALID_PROVIDER_STATUSES.has(provider?.status)) {
      throw new Error(`Provider ${id} has invalid status ${provider?.status || 'missing'}`)
    }
    if (provider.status === 'approved') {
      if (!Array.isArray(provider.evidence) || provider.evidence.length === 0) {
        throw new Error(`Approved provider ${id} requires evidence`)
      }
      if (!provider.displayName) throw new Error(`Approved provider ${id} requires a display name`)
    }
  }
  return policy
}

export function requireApprovedProvider(policy, id) {
  validateProviderPolicy(policy)
  const provider = policy.providers[id]
  if (!provider) throw new Error(`Unknown provider ${id}`)
  if (provider.status !== 'approved') {
    throw new Error(`Provider ${id} is ${provider.status}; iOS catalog inclusion is forbidden`)
  }
  return provider
}

function sourceExpiry(lastUpdated, maxAgeHours, generatedAt, label) {
  const sourceDate = new Date(asIso(lastUpdated, `${label}.lastUpdated`))
  const generatedDate = new Date(generatedAt)
  const ageHours = (generatedDate.getTime() - sourceDate.getTime()) / 3_600_000
  if (ageHours > maxAgeHours) {
    throw new Error(`${label} is ${Math.floor(ageHours)} hours old; maximum is ${maxAgeHours}`)
  }
  return new Date(sourceDate.getTime() + maxAgeHours * 3_600_000).toISOString()
}

function cinemaScreening(screening) {
  return {
    id: requireString(screening?.id, 'AMC screening.id'),
    provider: 'amc-catalog',
    title: requireString(screening?.title, 'AMC screening.title'),
    date: requireString(screening?.date, 'AMC screening.date'),
    time: requireString(screening?.time, 'AMC screening.time'),
    format: String(screening?.format || 'standard'),
    notes: String(screening?.notes || ''),
    link: requireString(screening?.link, 'AMC screening.link'),
  }
}

function cinemaTheater(theater, today) {
  const screenings = (theater.screenings || [])
    .filter(screening => typeof screening?.date === 'string' && screening.date >= today)
    .map(cinemaScreening)

  return {
    id: requireString(theater?.id, 'AMC theater.id'),
    provider: 'amc-catalog',
    name: requireString(theater?.name, 'AMC theater.name'),
    shortName: String(theater?.shortName || theater.name),
    neighborhood: String(theater?.neighborhood || ''),
    url: requireString(theater?.url, 'AMC theater.url'),
    screenings,
  }
}

function foodRestaurant(restaurant) {
  const lat = Number(restaurant?.lat)
  const lng = Number(restaurant?.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error(`Editorial restaurant ${restaurant?.id || 'unknown'} needs verified coordinates`)
  }

  return {
    id: requireString(restaurant?.id, 'Editorial restaurant.id'),
    provider: 'sixpm-editorial',
    name: requireString(restaurant?.name, 'Editorial restaurant.name'),
    neighborhood: String(restaurant?.neighborhood || ''),
    address: requireString(restaurant?.address, 'Editorial restaurant.address'),
    cuisine: String(restaurant?.cuisine || ''),
    tier: String(restaurant?.tier || 'feast'),
    priceRange: String(restaurant?.priceRange || restaurant?.price || ''),
    description: String(restaurant?.description || ''),
    whyHot: String(restaurant?.whyHot || ''),
    tags: Array.isArray(restaurant?.tags) ? restaurant.tags.map(String) : [],
    hours: requireString(restaurant?.hours, 'Editorial restaurant.hours'),
    lat,
    lng,
  }
}

function buildIndex(feeds) {
  const feedList = Object.entries(feeds).map(([id, feed]) => {
    const payload = JSON.stringify(feed)
    const items = id === 'cinema'
      ? feed.data.theaters.reduce((total, theater) => total + theater.screenings.length, 0)
      : id === 'food'
        ? feed.data.restaurants.length
        : feed.data.venues.length

    return {
      id,
      path: `catalog/${IOS_CATALOG_VERSION}/${id}.json`,
      sha256: sha256(payload),
      generatedAt: feed.generatedAt,
      expiresAt: feed.expiresAt,
      status: feed.availability.status,
      providers: feed.providers,
      recordCount: items,
    }
  })

  return {
    schemaVersion: IOS_CATALOG_SCHEMA_VERSION,
    catalogVersion: IOS_CATALOG_VERSION,
    generatedAt: feedList[0]?.generatedAt || new Date().toISOString(),
    feeds: feedList,
  }
}

export function buildIosCatalogBundle({ theaterData, foodData, policy, generatedAt = new Date().toISOString() }) {
  validateProviderPolicy(policy)
  const generated = asIso(generatedAt, 'generatedAt')
  const today = generated.slice(0, 10)
  const amc = requireApprovedProvider(policy, 'amc-catalog')
  const editorial = requireApprovedProvider(policy, 'sixpm-editorial')

  const cinemaExpiresAt = sourceExpiry(theaterData?.lastUpdated, amc.maxAgeHours, generated, 'theaters.json')
  const theaters = (theaterData?.theaters || [])
    .filter(theater => String(theater?.id || '').startsWith('amc-'))
    .map(theater => cinemaTheater(theater, today))
    .filter(theater => theater.screenings.length > 0)

  if (theaters.length === 0) throw new Error('AMC catalog contains no current theaters with screenings')

  const editorialRestaurants = (foodData?.restaurants || [])
    .filter(restaurant => restaurant?.manualPick === true && restaurant?.locationProvenance === 'sixpm-editorial')
    .map(foodRestaurant)

  const cinema = {
    schemaVersion: IOS_CATALOG_SCHEMA_VERSION,
    catalog: 'cinema',
    generatedAt: generated,
    expiresAt: cinemaExpiresAt,
    providers: ['amc-catalog'],
    attribution: [amc.attribution],
    availability: { status: 'available' },
    data: { theaters },
  }
  const food = {
    schemaVersion: IOS_CATALOG_SCHEMA_VERSION,
    catalog: 'food',
    generatedAt: generated,
    expiresAt: new Date(new Date(generated).getTime() + editorial.maxAgeHours * 3_600_000).toISOString(),
    providers: editorialRestaurants.length > 0 ? ['sixpm-editorial'] : [],
    attribution: editorialRestaurants.length > 0 ? [editorial.attribution] : [],
    availability: editorialRestaurants.length > 0
      ? { status: 'limited', reasonCode: 'editorial_seed_only' }
      : { status: 'disabled', reasonCode: 'no_approved_restaurant_records' },
    data: { restaurants: editorialRestaurants },
  }
  const jazz = {
    schemaVersion: IOS_CATALOG_SCHEMA_VERSION,
    catalog: 'jazz',
    generatedAt: generated,
    expiresAt: generated,
    providers: [],
    attribution: [],
    availability: { status: 'disabled', reasonCode: 'provider_not_approved' },
    data: { venues: [] },
  }

  const feeds = { cinema, jazz, food }
  return { index: buildIndex(feeds), feeds: cloneJson(feeds) }
}

function validateForbiddenMarkers(feed, id, errors) {
  const serialized = JSON.stringify(feed).toLowerCase()
  for (const marker of FORBIDDEN_PROVIDER_MARKERS) {
    if (serialized.includes(marker.toLowerCase())) {
      errors.push(`${id} contains forbidden provider-derived marker ${marker}`)
    }
  }
}

function validateAllowedKeys(value, allowedKeys, label, errors) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${label} must be an object`)
    return
  }
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) errors.push(`${label} has undeclared field ${key}`)
  }
}

function validateFeed(feed, expectedId, policy, now, errors) {
  if (!feed || feed.schemaVersion !== IOS_CATALOG_SCHEMA_VERSION || feed.catalog !== expectedId) {
    errors.push(`${expectedId} has invalid schema or catalog id`)
    return
  }
  validateAllowedKeys(feed, FEED_KEYS, `${expectedId} feed`, errors)
  validateAllowedKeys(feed.availability, AVAILABILITY_KEYS, `${expectedId} availability`, errors)
  for (const provider of feed.providers || []) {
    try {
      requireApprovedProvider(policy, provider)
    } catch (error) {
      errors.push(error.message)
    }
  }

  const expiry = new Date(feed.expiresAt)
  if (Number.isNaN(expiry.getTime())) errors.push(`${expectedId} has invalid expiresAt`)
  if (expectedId === 'cinema' && expiry.getTime() < now.getTime()) errors.push('cinema catalog is expired')
  if (feed.availability?.status !== 'disabled' && (!Array.isArray(feed.providers) || feed.providers.length === 0)) {
    errors.push(`${expectedId} is available without an approved provider`)
  }
  validateForbiddenMarkers(feed, expectedId, errors)

  const items = expectedId === 'cinema'
    ? feed.data?.theaters || []
    : expectedId === 'food'
      ? feed.data?.restaurants || []
      : feed.data?.venues || []
  for (const item of items) {
    if (expectedId === 'cinema') validateAllowedKeys(item, CINEMA_THEATER_KEYS, 'cinema theater', errors)
    if (expectedId === 'food') validateAllowedKeys(item, FOOD_RESTAURANT_KEYS, 'food restaurant', errors)
    if (item.provider) {
      try {
        requireApprovedProvider(policy, item.provider)
      } catch (error) {
        errors.push(error.message)
      }
    }
    if (expectedId === 'cinema') {
      for (const screening of item.screenings || []) {
        validateAllowedKeys(screening, CINEMA_SCREENING_KEYS, 'cinema screening', errors)
        try {
          requireApprovedProvider(policy, screening.provider)
        } catch (error) {
          errors.push(error.message)
        }
      }
    }
  }
}

export function validateIosCatalogBundle({ index, feeds, policy, now = new Date() }) {
  validateProviderPolicy(policy)
  const errors = []
  if (!index || index.schemaVersion !== IOS_CATALOG_SCHEMA_VERSION || index.catalogVersion !== IOS_CATALOG_VERSION) {
    errors.push('Catalog index has invalid schema or version')
  }

  const expected = ['cinema', 'jazz', 'food']
  for (const id of expected) {
    const entry = index?.feeds?.find(feed => feed.id === id)
    const feed = feeds?.[id]
    if (!entry) {
      errors.push(`Catalog index missing ${id}`)
      continue
    }
    if (!feed) {
      errors.push(`Catalog payload missing ${id}`)
      continue
    }
    if (entry.path !== `catalog/${IOS_CATALOG_VERSION}/${id}.json`) errors.push(`${id} has unexpected path`)
    if (entry.sha256 !== sha256(JSON.stringify(feed))) errors.push(`${id} digest does not match payload`)
    validateFeed(feed, id, policy, now, errors)
  }

  return errors
}
