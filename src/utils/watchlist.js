function getWatchlist(user) {
  try {
    return JSON.parse(localStorage.getItem(`watchlist-${user}`) || '[]')
  } catch {
    return []
  }
}

function setWatchlist(user, ids) {
  localStorage.setItem(`watchlist-${user}`, JSON.stringify(ids))
}

export function getCurrentUser() {
  try {
    return localStorage.getItem('palace-user') || null
  } catch {
    return null
  }
}

export function getOtherUser() {
  const current = getCurrentUser()
  return current === 'James' ? 'Liza' : current === 'Liza' ? 'James' : null
}

export function isOnWatchlist(screeningId) {
  const user = getCurrentUser()
  if (!user) return { self: false, other: false }
  const other = getOtherUser()
  return {
    self: getWatchlist(user).includes(screeningId),
    other: other ? getWatchlist(other).includes(screeningId) : false,
  }
}

export function toggleWatchlist(screeningId) {
  const user = getCurrentUser()
  if (!user) return false
  const list = getWatchlist(user)
  const idx = list.indexOf(screeningId)
  if (idx >= 0) {
    list.splice(idx, 1)
  } else {
    list.push(screeningId)
  }
  setWatchlist(user, list)
  return idx < 0
}

export function getWatchlistIds(user) {
  return getWatchlist(user)
}
