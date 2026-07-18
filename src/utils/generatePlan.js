/**
 * generatePlan.js — Pure function that assembles date night plans
 * from existing restaurant, cinema, and jazz data.
 */

import { THEATER_COORDS } from '../data/theaterLocations.js'
import { JAZZ_VENUE_COORDS } from '../data/jazzVenueLocations.js'
import { isRestaurantOpenAt } from './restaurantHours.js'

export const MAX_PLAN_DISTANCE_MILES = 8

// ── Time Parsing ──

function parseTime(timeStr) {
  if (!timeStr) return null
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i)
  if (!match) return null
  let hours = parseInt(match[1])
  const minutes = parseInt(match[2])
  const period = match[3].toLowerCase()
  if (period === 'pm' && hours !== 12) hours += 12
  if (period === 'am' && hours === 12) hours = 0
  return hours + minutes / 60
}

function formatTime12(decimalTime) {
  let hours = Math.floor(decimalTime)
  const minutes = Math.round((decimalTime - hours) * 60)
  const period = hours >= 12 ? 'PM' : 'AM'
  if (hours > 12) hours -= 12
  if (hours === 0) hours = 12
  return `${hours}:${minutes.toString().padStart(2, '0')} ${period}`
}

// ── Distance Calculation (Haversine) ──

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 3959 // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function hasCoordinates(point) {
  return Number.isFinite(point?.lat) && Number.isFinite(point?.lng)
}

function isCompatiblePair(restaurant, activity) {
  if (!hasCoordinates(restaurant) || !hasCoordinates(activity?.coords)) return false
  if (!isRestaurantAvailableForActivity(restaurant, activity)) return false
  return getDistance(
    restaurant.lat,
    restaurant.lng,
    activity.coords.lat,
    activity.coords.lng,
  ) <= MAX_PLAN_DISTANCE_MILES
}

function getDinnerDate(activity) {
  if (!activity?.date || !Number.isFinite(activity.timeParsed)) return null
  const [year, month, day] = activity.date.split('-').map(Number)
  const dinnerTime = Math.max(activity.timeParsed - 2, 17)
  return new Date(year, month - 1, day, Math.floor(dinnerTime), Math.round((dinnerTime % 1) * 60))
}

function isRestaurantAvailableForActivity(restaurant, activity) {
  const dinnerDate = getDinnerDate(activity)
  return Boolean(dinnerDate && restaurant.hours && isRestaurantOpenAt(restaurant.hours, dinnerDate))
}

function isPlanStartStillPossible(activity, now) {
  if (!now) return true
  const dinnerDate = getDinnerDate(activity)
  return Boolean(dinnerDate && dinnerDate >= now)
}

// ── Cost Estimation ──

const TIER_COST = {
  street: [10, 20],
  tacos: [8, 18],
  pizza: [12, 22],
  feast: [25, 65],
  whale: [65, 150],
}

function estimateCost(restaurant, activityType) {
  const [rLow, rHigh] = TIER_COST[restaurant?.tier] || TIER_COST.feast
  if (activityType === 'movie') {
    return [rLow + 15, rHigh + 25] // ticket $15-25
  }
  // jazz — cover is usually $0-25
  return [rLow + 0, rHigh + 25]
}

// ── Vibe Filtering ──

function matchesVibe(vibe, item, type) {
  if (!vibe || vibe === 'all') return true

  if (type === 'restaurant') {
    switch (vibe) {
      case 'casual': return ['street', 'tacos', 'pizza'].includes(item.tier)
      case 'romantic': return ['feast', 'whale'].includes(item.tier)
      case 'adventure': return ['whale', 'street'].includes(item.tier) || (item.heatScore || 0) >= 4
      case 'budget': return ['street', 'tacos', 'pizza'].includes(item.tier)
      default: return true
    }
  }

  if (type === 'movie') {
    switch (vibe) {
      case 'casual': return true
      case 'romantic': return ['35mm', '70mm', 'nitrate'].includes(item.format?.toLowerCase())
      case 'adventure': return ['35mm', '70mm', 'nitrate', '16mm'].includes(item.format?.toLowerCase())
      case 'budget': return true
      default: return true
    }
  }

  if (type === 'jazz') {
    switch (vibe) {
      case 'casual': return true
      case 'romantic': return true
      case 'adventure': return item.hot === true
      case 'budget': return true
      default: return true
    }
  }

  return true
}

// ── Shuffle Helper ──

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── Main Generator ──

/**
 * @param {Object} params
 * @param {Object} params.foodData - restaurants.json data
 * @param {Object} params.cinemaData - theaters.json data
 * @param {Object} params.jazzData - jazz-venues.json data
 * @param {string} params.date - YYYY-MM-DD
 * @param {string} params.vibe - 'all' | 'casual' | 'romantic' | 'adventure' | 'budget'
 * @param {Object} params.locked - { planA: { restaurant, activity }, planB: { restaurant, activity } }
 * @param {Object} params.previous - previous plan result (for no-repeat)
 * @returns {{ planA: Object|null, planB: Object|null }}
 */
export function generatePlans({ foodData, cinemaData, jazzData, date, vibe = 'all', locked = {}, previous = null, now = null }) {
  // ── Gather available screenings for the date ──
  const screenings = []
  if (cinemaData?.theaters) {
    for (const theater of cinemaData.theaters) {
      for (const s of theater.screenings) {
        if (s.date !== date) continue
        const time = parseTime(s.time)
        if (time === null) continue
        // Evening window: 7:30 PM – 9:30 PM
        if (time < 19.5 || time > 21.5) continue
        const candidate = { ...s, timeParsed: time }
        if (!isPlanStartStillPossible(candidate, now)) continue
        if (!matchesVibe(vibe, s, 'movie')) continue
        screenings.push({
          ...s,
          theaterName: theater.name,
          theaterShortName: theater.shortName || theater.name,
          theaterId: theater.id,
          theaterNeighborhood: theater.neighborhood,
          theaterColor: theater.color,
          theaterUrl: theater.url,
          timeParsed: time,
          coords: THEATER_COORDS[theater.id] || null,
        })
      }
    }
  }

  // ── Gather available jazz shows for the date ──
  const jazzShows = []
  if (jazzData?.venues) {
    for (const venue of jazzData.venues) {
      for (const show of venue.shows) {
        if (show.date !== date) continue
        const time = parseTime(show.time)
        if (time === null) continue
        // Jazz window: 7:30 PM – 11:00 PM
        if (time < 19.5 || time > 23) continue
        const candidate = { ...show, timeParsed: time }
        if (!isPlanStartStillPossible(candidate, now)) continue
        if (!matchesVibe(vibe, show, 'jazz')) continue
        jazzShows.push({
          ...show,
          venueName: venue.name,
          venueShortName: venue.shortName || venue.name,
          venueId: venue.id,
          venueNeighborhood: venue.neighborhood,
          venueColor: venue.color,
          venueUrl: venue.url,
          venueTier: venue.tier,
          timeParsed: time,
          coords: JAZZ_VENUE_COORDS[venue.id] || null,
        })
      }
    }
  }

  // ── Gather restaurants ──
  let restaurants = []
  if (foodData?.restaurants) {
    restaurants = foodData.restaurants.filter(r => matchesVibe(vibe, r, 'restaurant'))
  }

  // ── Pick for Plan A (Dinner & Movie) ──
  const planA = buildPlan({
    restaurants,
    activities: screenings,
    locked: locked.planA || {},
    previousRestaurantId: previous?.planA?.restaurant?.id,
    previousActivityId: previous?.planA?.activity?.id,
    excludeRestaurantId: null,
  })

  // ── Pick for Plan B (Dinner & Jazz) ──
  const planB = buildPlan({
    restaurants,
    activities: jazzShows,
    locked: locked.planB || {},
    previousRestaurantId: previous?.planB?.restaurant?.id,
    previousActivityId: previous?.planB?.activity?.id,
    excludeRestaurantId: planA?.restaurant?.id || null,
  })

  // ── Compute timelines and costs ──
  if (planA?.restaurant && planA?.activity) {
    planA.timeline = buildTimeline(planA, 'movie')
    planA.costEstimate = estimateCost(planA.restaurant, 'movie')
  }
  if (planB?.restaurant && planB?.activity) {
    planB.timeline = buildTimeline(planB, 'jazz')
    planB.costEstimate = estimateCost(planB.restaurant, 'jazz')
  }

  return { planA, planB }
}

function buildPlan({ restaurants, activities, locked, previousRestaurantId, previousActivityId, excludeRestaurantId }) {
  const lockedRestaurant = locked.restaurant || null
  let activity = locked.activity || null

  if (activity) {
    const hasCompatibleRestaurant = lockedRestaurant
      ? isCompatiblePair(lockedRestaurant, activity)
      : restaurants.some(restaurant => isCompatiblePair(restaurant, activity))
    if (!hasCompatibleRestaurant) return null
  }

  if (!activity) {
    const viableActivities = activities.filter(candidate => {
      if (!hasCoordinates(candidate.coords)) return false
      if (lockedRestaurant) return isCompatiblePair(lockedRestaurant, candidate)
      return restaurants.some(restaurant => isCompatiblePair(restaurant, candidate))
    })
    const nonRepeating = viableActivities.filter(candidate => candidate.id !== previousActivityId)
    const pool = nonRepeating.length > 0 ? nonRepeating : viableActivities
    activity = shuffle(pool)[0] || null
  }

  if (!activity) return null

  if (lockedRestaurant) {
    if (!isCompatiblePair(lockedRestaurant, activity)) return null
    return {
      restaurant: enrichRestaurant(lockedRestaurant, activity),
      activity,
    }
  }

  const compatible = restaurants.filter(restaurant => isCompatiblePair(restaurant, activity))
  if (compatible.length === 0) return null

  let pool = compatible.filter(restaurant =>
    restaurant.id !== previousRestaurantId &&
    restaurant.id !== excludeRestaurantId
  )
  if (pool.length === 0) {
    pool = compatible.filter(restaurant => restaurant.id !== excludeRestaurantId)
  }
  if (pool.length === 0) {
    pool = compatible.filter(restaurant => restaurant.id !== previousRestaurantId)
  }
  if (pool.length === 0) pool = compatible

  return {
    restaurant: enrichRestaurant(shuffle(pool)[0], activity),
    activity,
  }
}

function enrichRestaurant(r, activity) {
  if (!r) return null
  const enriched = { ...r }

  // Distance to activity venue
  if (activity?.coords && r.lat && r.lng) {
    enriched.distanceMiles = getDistance(r.lat, r.lng, activity.coords.lat, activity.coords.lng)
  }

  // Google Maps URL
  if (!enriched.googleMapsUrl) {
    const q = encodeURIComponent(`${r.name} ${r.neighborhood || ''} Los Angeles`)
    enriched.googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${q}`
  }

  return enriched
}

function estimateDriveTime(miles) {
  if (!miles || miles <= 0) return { minutes: 15, label: '~15 min drive' }
  // LA average ~22 mph including signals and traffic
  const raw = miles / 22 * 60
  const rounded = Math.max(5, Math.ceil(raw / 5) * 5)
  return { minutes: rounded, label: `~${rounded} min drive` }
}

function buildTimeline(plan, type) {
  const activityTime = plan.activity.timeParsed
  const drive = estimateDriveTime(plan.restaurant?.distanceMiles)
  const dinnerStart = activityTime - 2
  const dinnerEnd = dinnerStart + 1.25 // ~75 min dinner
  const travelTime = drive.minutes / 60
  const arriveTime = activityTime - travelTime

  // Activity duration estimate
  const activityEnd = type === 'movie' ? activityTime + 2.25 : activityTime + 2

  return {
    dinnerTime: formatTime12(Math.max(dinnerStart, 17)), // no earlier than 5 PM
    dinnerEnd: formatTime12(dinnerEnd),
    travelNote: drive.label,
    arriveTime: formatTime12(arriveTime),
    activityTime: plan.activity.time || formatTime12(activityTime),
    activityEnd: formatTime12(activityEnd),
    eveningStart: formatTime12(Math.max(dinnerStart, 17)),
    eveningEnd: formatTime12(activityEnd),
  }
}

// ── Utilities for the UI ──

export function getNextDays(count = 7) {
  const days = []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() + i)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const iso = `${yyyy}-${mm}-${dd}`
    const dayName = d.toLocaleDateString('en-US', { weekday: 'long' })
    const shortDate = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    days.push({
      iso,
      dayName,
      shortDate,
      label: i === 0 ? 'Tonight' : shortDate,
      isTonight: i === 0,
    })
  }
  return days
}

export function getVenueMapsUrl(name, neighborhood) {
  const q = encodeURIComponent(`${name} ${neighborhood || ''} Los Angeles`)
  return `https://www.google.com/maps/search/?api=1&query=${q}`
}

export function formatCostRange([low, high]) {
  return `$${low}–${high}/person`
}
