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

function normalizeRestaurants(food) {
  if (!food.restaurants) return
  food.restaurants.forEach(r => {
    // tier ↔ category
    if (!r.tier && r.category) r.tier = r.category
    if (!r.category) r.category = r.tier || 'feast'
    // price ↔ priceRange
    if (!r.priceRange && r.price) r.priceRange = r.price
    if (!r.price && r.priceRange) r.price = r.priceRange
    // bibGourmand → michelinStatus
    if (!r.michelinStatus && r.bibGourmand) r.michelinStatus = 'bib-gourmand'
    // defaults
    if (r.heatScore === undefined) r.heatScore = r.fire || 0
    if (!r.color) r.color = TIER_COLORS[r.tier] || TIER_COLORS.feast
    if (!r.neighborhood) r.neighborhood = ''
    if (!r.cuisine) r.cuisine = ''
  })
  if (!food.categories) {
    food.categories = DEFAULT_CATEGORIES
  }
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
      fetch(base + 'theaters.json?t=' + t).then(res => res.json()),
      fetch(base + 'jazz-venues.json?t=' + t).then(res => res.json()).catch(() => null),
      fetch(base + 'restaurants.json?t=' + t).then(res => res.json()).catch(() => null),
      fetch(base + 'guide-restaurants.json?t=' + t).then(res => res.json()).catch(() => null),
      fetch(base + 'louis-cole-bio.json?t=' + t).then(res => res.json()).catch(() => null),
    ])
      .then(([cinemaData, jazz, food, guide, bio]) => {
        setData(cinemaData)
        if (jazz) setJazzData(jazz)
        if (bio) setBioData(bio)
        if (food) {
          normalizeRestaurants(food)
          setFoodData(food)
        }
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
