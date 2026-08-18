import providerPolicy from '../../config/ios-provider-policy.json'

export const IOS_CATALOG_VERSION = 'v1'
export const DEFAULT_IOS_CATALOG_BASE = 'https://sixpm.vercel.app/'

const FEED_IDS = ['cinema', 'jazz', 'food']
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
const FORBIDDEN_KEYS = new Set([
  'googlemapsurl', 'googleplaceid', 'placeid', 'googleattributions',
  'googlephotourl', 'tmdbid', 'posterpath', 'backdroppath', 'overview',
  'reviews', 'letterboxd', 'rottentomatoes',
])

export class CatalogValidationError extends Error {
  constructor(errors) {
    super(`Catalog validation failed: ${errors.join('; ')}`)
    this.name = 'CatalogValidationError'
    this.errors = errors
  }
}

function normalizeBaseUrl(baseUrl) {
  const value = baseUrl || DEFAULT_IOS_CATALOG_BASE
  return value.endsWith('/') ? value : `${value}/`
}

function expectedPath(id) {
  return `catalog/${IOS_CATALOG_VERSION}/${id}.json`
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function validDate(value) {
  return typeof value === 'string' && !Number.isNaN(new Date(value).getTime())
}

function validateAllowedKeys(value, allowedKeys, label, errors) {
  if (!isObject(value)) {
    errors.push(`${label} must be an object`)
    return
  }
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) errors.push(`${label} has undeclared field ${key}`)
  }
}

function approvedProvider(id, policy) {
  return policy?.providers?.[id]?.status === 'approved'
}

function sameStringList(left, right) {
  return Array.isArray(left) && Array.isArray(right) && left.length === right.length &&
    left.every((value, index) => value === right[index])
}

function scanForbidden(value, path, errors) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanForbidden(item, `${path}[${index}]`, errors))
    return
  }
  if (!isObject(value)) return

  for (const [key, item] of Object.entries(value)) {
    const keyLower = key.toLowerCase()
    if (FORBIDDEN_KEYS.has(keyLower)) errors.push(`${path} contains forbidden field ${key}`)
    if (typeof item === 'string' && /(?:maps\.google\.|googleapis\.com|themoviedb\.org)/i.test(item)) {
      errors.push(`${path}.${key} contains a forbidden provider URL`)
    }
    scanForbidden(item, `${path}.${key}`, errors)
  }
}

function validateCinema(feed, errors, policy) {
  const theaters = feed?.data?.theaters
  if (!Array.isArray(theaters)) {
    errors.push('cinema.data.theaters must be an array')
    return
  }
  if (feed.availability?.status !== 'disabled' && theaters.length === 0) {
    errors.push('cinema is available without screenings')
  }
  for (const theater of theaters) {
    validateAllowedKeys(theater, CINEMA_THEATER_KEYS, 'cinema theater', errors)
    if (theater.provider !== 'amc-catalog' || !approvedProvider(theater.provider, policy)) {
      errors.push('cinema theater has a non-approved provider')
    }
    if (!Array.isArray(theater.screenings)) {
      errors.push('cinema theater screenings must be an array')
      continue
    }
    for (const screening of theater.screenings) {
      validateAllowedKeys(screening, CINEMA_SCREENING_KEYS, 'cinema screening', errors)
      if (screening.provider !== 'amc-catalog' || !approvedProvider(screening.provider, policy)) {
        errors.push('cinema screening has a non-approved provider')
      }
    }
  }
}

function validateFood(feed, errors, policy) {
  const restaurants = feed?.data?.restaurants
  if (!Array.isArray(restaurants)) {
    errors.push('food.data.restaurants must be an array')
    return
  }
  for (const restaurant of restaurants) {
    validateAllowedKeys(restaurant, FOOD_RESTAURANT_KEYS, 'food restaurant', errors)
    if (restaurant.provider !== 'sixpm-editorial' || !approvedProvider(restaurant.provider, policy)) {
      errors.push('food restaurant has a non-approved provider')
    }
  }
}

function validateJazz(feed, errors) {
  if (feed.availability?.status !== 'disabled') errors.push('jazz must remain disabled for iOS V1')
  if (!Array.isArray(feed?.data?.venues) || feed.data.venues.length !== 0) {
    errors.push('disabled jazz feed must have no venues')
  }
  if (!Array.isArray(feed.providers) || feed.providers.length !== 0) {
    errors.push('disabled jazz feed must have no providers')
  }
}

async function sha256Json(value) {
  if (!globalThis.crypto?.subtle) throw new Error('Web Crypto is unavailable for catalog verification')
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function validateRemoteCatalog({
  index,
  feeds,
  policy = providerPolicy,
  now = new Date(),
}) {
  const errors = []
  if (!isObject(index) || index.schemaVersion !== 1 || index.catalogVersion !== IOS_CATALOG_VERSION) {
    errors.push('catalog index has invalid schema or version')
    return errors
  }
  if (!Array.isArray(index.feeds)) {
    errors.push('catalog index feeds must be an array')
    return errors
  }

  for (const id of FEED_IDS) {
    const entry = index.feeds.find(candidate => candidate?.id === id)
    const feed = feeds?.[id]
    if (!entry) {
      errors.push(`catalog index is missing ${id}`)
      continue
    }
    if (!feed) {
      errors.push(`catalog payload is missing ${id}`)
      continue
    }
    if (entry.path !== expectedPath(id)) errors.push(`${id} has an unexpected catalog path`)
    if (!isObject(feed) || feed.schemaVersion !== 1 || feed.catalog !== id) {
      errors.push(`${id} has invalid schema or catalog id`)
      continue
    }
    validateAllowedKeys(feed, FEED_KEYS, `${id} feed`, errors)
    validateAllowedKeys(feed.availability, AVAILABILITY_KEYS, `${id} availability`, errors)
    if (!validDate(feed.generatedAt) || !validDate(feed.expiresAt)) {
      errors.push(`${id} has an invalid timestamp`)
    } else if (feed.availability?.status !== 'disabled' && new Date(feed.expiresAt).getTime() < now.getTime()) {
      errors.push(`${id} catalog is expired`)
    }
    if (entry.status !== feed.availability?.status) errors.push(`${id} index status does not match payload`)
    if (!sameStringList(entry.providers, feed.providers)) errors.push(`${id} index providers do not match payload`)
    if (!Array.isArray(feed.providers)) {
      errors.push(`${id} providers must be an array`)
    } else {
      for (const provider of feed.providers) {
        if (!approvedProvider(provider, policy)) errors.push(`${id} uses non-approved provider ${provider}`)
      }
    }
    if (feed.availability?.status !== 'disabled' && feed.providers?.length === 0) {
      errors.push(`${id} is available without an approved provider`)
    }
    if (entry.sha256 !== await sha256Json(feed)) errors.push(`${id} digest does not match payload`)
    scanForbidden(feed, id, errors)
    if (id === 'cinema') validateCinema(feed, errors, policy)
    if (id === 'food') validateFood(feed, errors, policy)
    if (id === 'jazz') validateJazz(feed, errors)
  }

  return errors
}

async function fetchJson(url, { fetchImpl, signal }) {
  const response = await fetchImpl(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal,
  })
  if (!response.ok) throw new Error(`Catalog request failed (${response.status})`)
  return response.json()
}

export async function loadRemoteCatalog({
  baseUrl = import.meta.env.VITE_IOS_CATALOG_BASE || DEFAULT_IOS_CATALOG_BASE,
  fetchImpl = globalThis.fetch,
  signal,
  now = new Date(),
} = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('Fetch is unavailable for catalog loading')
  const root = normalizeBaseUrl(baseUrl)
  const index = await fetchJson(new URL(`catalog/${IOS_CATALOG_VERSION}/index.json`, root), { fetchImpl, signal })
  const entries = Object.fromEntries((index?.feeds || []).map(entry => [entry.id, entry]))
  const feeds = Object.fromEntries(await Promise.all(FEED_IDS.map(async id => {
    const entry = entries[id]
    if (!entry || entry.path !== expectedPath(id)) {
      throw new CatalogValidationError([`catalog index is missing a safe ${id} path`])
    }
    const feed = await fetchJson(new URL(entry.path, root), { fetchImpl, signal })
    return [id, feed]
  })))
  const errors = await validateRemoteCatalog({ index, feeds, now })
  if (errors.length > 0) throw new CatalogValidationError(errors)

  return {
    index,
    feeds,
    source: root,
    verifiedAt: new Date().toISOString(),
  }
}

export { sha256Json }
