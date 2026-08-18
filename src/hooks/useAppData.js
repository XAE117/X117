import { useState, useEffect, useCallback, useRef } from 'react'
import { normalizeCinemaEventIds, normalizeJazzEventIds } from '../utils/eventIdentity.js'
import { createAppleMapsUrl } from '../utils/directions.js'

const TIER_COLORS = { street: '#FF6B35', feast: '#D4A574', whale: '#C9A84C', pizza: '#E84830', tacos: '#7CB342' }

const DEFAULT_CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'street', label: 'Street', description: 'Pop-ups & Stands · Under $20/pp' },
  { key: 'feast', label: 'Feast', description: 'The Sweet Spot · $20–$120/pp' },
  { key: 'whale', label: 'Whale', description: 'Fine Dining · $120+/pp' },
  { key: 'pizza', label: 'Pizza', description: "LA's Best Pies · All Styles" },
  { key: 'tacos', label: 'Tacos', description: 'The Global Capital · All Styles' },
]

export function normalizeRestaurantData(food) {
  if (!food) return null

  const restaurants = (food.restaurants || []).map((restaurant) => {
    const tier = restaurant.tier || restaurant.category || 'feast'
    const category = restaurant.category || tier
    const priceRange = restaurant.priceRange || restaurant.price
    const price = restaurant.price || priceRange
    const directionsUrl = restaurant.directionsUrl || createAppleMapsUrl(restaurant)

    return {
      ...restaurant,
      tier,
      category,
      priceRange,
      price,
      directionsUrl,
      michelinStatus: restaurant.michelinStatus || (restaurant.bibGourmand ? 'bib-gourmand' : undefined),
      heatScore: restaurant.heatScore ?? restaurant.fire ?? 0,
      color: restaurant.color || TIER_COLORS[tier] || TIER_COLORS.feast,
      neighborhood: restaurant.neighborhood || '',
      cuisine: restaurant.cuisine || '',
    }
  })

  return {
    ...food,
    restaurants,
    categories: food.categories || DEFAULT_CATEGORIES,
  }
}

async function fetchJson(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Unable to load ${url}: HTTP ${response.status}`)
  }
  return response.json()
}

export function useAppData() {
  const [data, setData] = useState(null)
  const [jazzData, setJazzData] = useState(null)
  const [foodData, setFoodData] = useState(null)
  const [guideData, setGuideData] = useState(null)
  const [bioData, setBioData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const guideRequest = useRef(null)
  const bioRequest = useRef(null)

  const fetchData = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    const base = import.meta.env.BASE_URL
    const suffix = isRefresh ? `?t=${Date.now()}` : ''

    Promise.all([
      fetchJson(base + 'theaters.json' + suffix),
      fetchJson(base + 'jazz-venues.json' + suffix).catch(() => null),
      fetchJson(base + 'restaurants.json' + suffix).catch(() => null),
    ])
      .then(([cinemaData, jazz, food]) => {
        setData(normalizeCinemaEventIds(cinemaData))
        if (jazz) setJazzData(normalizeJazzEventIds(jazz))
        if (food) setFoodData(normalizeRestaurantData(food))
        setLoading(false)
        setRefreshing(false)
      })
      .catch(err => {
        console.error('Failed to load data:', err)
        setLoading(false)
        setRefreshing(false)
      })
  }, [])

  const loadGuideData = useCallback(() => {
    if (guideData) return Promise.resolve(guideData)
    if (!guideRequest.current) {
      guideRequest.current = fetchJson(`${import.meta.env.BASE_URL}guide-restaurants.json`)
        .then(guide => {
          setGuideData(guide)
          return guide
        })
        .finally(() => {
          guideRequest.current = null
        })
    }
    return guideRequest.current
  }, [guideData])

  const loadBioData = useCallback(() => {
    if (bioData) return Promise.resolve(bioData)
    if (!bioRequest.current) {
      bioRequest.current = fetchJson(`${import.meta.env.BASE_URL}louis-cole-bio.json`)
        .then(bio => {
          setBioData(bio)
          return bio
        })
        .finally(() => {
          bioRequest.current = null
        })
    }
    return bioRequest.current
  }, [bioData])

  useEffect(() => {
    // Client-only Vite app: initial data load happens after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()
  }, [fetchData])

  return {
    data,
    jazzData,
    foodData,
    guideData,
    bioData,
    loading,
    refreshing,
    fetchData,
    loadGuideData,
    loadBioData,
  }
}
