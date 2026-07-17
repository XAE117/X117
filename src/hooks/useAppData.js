import { useState, useEffect, useCallback } from 'react'

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

    return {
      ...restaurant,
      tier,
      category,
      priceRange,
      price,
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

  const fetchData = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    const base = import.meta.env.BASE_URL
    const t = Date.now()

    Promise.all([
      fetchJson(base + 'theaters.json?t=' + t),
      fetchJson(base + 'jazz-venues.json?t=' + t).catch(() => null),
      fetchJson(base + 'restaurants.json?t=' + t).catch(() => null),
      fetchJson(base + 'guide-restaurants.json?t=' + t).catch(() => null),
      fetchJson(base + 'louis-cole-bio.json?t=' + t).catch(() => null),
    ])
      .then(([cinemaData, jazz, food, guide, bio]) => {
        setData(cinemaData)
        if (jazz) setJazzData(jazz)
        if (bio) setBioData(bio)
        if (food) setFoodData(normalizeRestaurantData(food))
        if (guide) setGuideData(guide)
        setLoading(false)
        setRefreshing(false)
      })
      .catch(err => {
        console.error('Failed to load data:', err)
        setLoading(false)
        setRefreshing(false)
      })
  }, [])

  useEffect(() => {
    // Client-only Vite app: initial data load happens after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()
  }, [fetchData])

  return { data, jazzData, foodData, guideData, bioData, loading, refreshing, fetchData }
}
