/**
 * Google Places enrichment for restaurant entries.
 *
 * Caching strategy:
 *   - If restaurant already has googlePlaceId → cheap Place Details call only
 *   - Otherwise → expensive Text Search to find place_id, then Place Details
 *
 * After first enrichment, googlePlaceId is stored in the restaurant JSON so
 * subsequent scrape runs skip Text Search entirely for known restaurants.
 * Only newly added restaurants trigger the expensive Text Search path.
 *
 * Budget note: Free tier = $200/month (~5,000 Place Details calls).
 * Text Search costs ~5x more than Place Details. Cache the place_id always.
 *
 * Environment variable: GOOGLE_PLACES_API_KEY
 */

import axios from 'axios'

const API_KEY = process.env.GOOGLE_PLACES_API_KEY
const BASE_URL = 'https://maps.googleapis.com/maps/api/place'

async function textSearch(query) {
  const { data } = await axios.get(`${BASE_URL}/textsearch/json`, {
    params: {
      query,
      key: API_KEY,
    },
    timeout: 10000,
  })
  if (data.status !== 'OK' || !data.results?.length) return null
  return data.results[0]
}

async function fetchPlaceDetails(placeId) {
  const { data } = await axios.get(`${BASE_URL}/details/json`, {
    params: {
      place_id: placeId,
      key: API_KEY,
      fields: 'name,formatted_address,geometry,opening_hours,formatted_phone_number,website,rating,price_level,url',
    },
    timeout: 10000,
  })
  if (data.status !== 'OK') return null
  return data.result
}

/**
 * Enrich a single restaurant with Google Places data.
 * Only fills in missing fields — never overwrites curated data.
 * Persists googlePlaceId on the restaurant object for future cheap lookups.
 */
export async function enrichRestaurant(restaurant) {
  if (!API_KEY) return restaurant

  try {
    let placeId = restaurant.googlePlaceId

    if (!placeId) {
      // Expensive path: Text Search (only for new/unknown restaurants)
      const query = `${restaurant.name} ${restaurant.neighborhood} Los Angeles`
      const result = await textSearch(query)
      if (!result) return restaurant
      placeId = result.place_id
      restaurant.googlePlaceId = placeId // persist so future runs skip Text Search
    }

    // Cheap path: Place Details by ID
    const details = await fetchPlaceDetails(placeId)
    if (!details) return restaurant

    // Only fill missing fields — never overwrite curated data
    if (!restaurant.address && details.formatted_address) {
      restaurant.address = details.formatted_address
    }
    if (!restaurant.lat && details.geometry?.location) {
      restaurant.lat = details.geometry.location.lat
      restaurant.lng = details.geometry.location.lng
    }
    if (!restaurant.phone && details.formatted_phone_number) {
      restaurant.phone = details.formatted_phone_number
    }
    if (!restaurant.website && details.website) {
      restaurant.website = details.website
    }
    if (!restaurant.googleRating && details.rating) {
      restaurant.googleRating = details.rating
    }
    if (restaurant.priceLevel === undefined && details.price_level !== undefined) {
      restaurant.priceLevel = details.price_level
    }
    if (!restaurant.googleMapsUrl && details.url) {
      restaurant.googleMapsUrl = details.url
    }
  } catch (err) {
    console.warn(`  Places lookup failed for "${restaurant.name}": ${err.message}`)
  }

  return restaurant
}

/**
 * Enrich a batch of restaurants via Google Places.
 * Only targets restaurants missing address or coordinates to avoid unnecessary calls.
 * Run this as a separate pass after deduplication, not inside the scrape loop.
 */
export async function enrichRestaurants(restaurants) {
  if (!API_KEY) {
    console.log('  (No GOOGLE_PLACES_API_KEY — skipping Places enrichment)')
    return restaurants
  }

  const needsEnrichment = restaurants.filter(r => !r.lat || !r.address)
  console.log(`  Enriching ${needsEnrichment.length} restaurants via Google Places...`)

  for (const restaurant of needsEnrichment) {
    await enrichRestaurant(restaurant)
    // Rate pacing: 200ms between calls keeps well under 50 req/sec limit
    await new Promise(r => setTimeout(r, 200))
  }

  return restaurants
}
