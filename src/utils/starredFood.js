// Starred-restaurant persistence. Split out of FoodByCategory.jsx so that
// file can pure-export components (Fast Refresh requirement).

const STAR_KEY = 'palace-starred-restaurants'

export function getStarredIds() {
  try {
    return JSON.parse(localStorage.getItem(STAR_KEY)) || []
  } catch {
    return []
  }
}

export function toggleStar(id) {
  const ids = getStarredIds()
  const next = ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]
  localStorage.setItem(STAR_KEY, JSON.stringify(next))
  return next
}
