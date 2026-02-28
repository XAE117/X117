import './WatchlistButton.css'

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

function getCurrentUser() {
  return localStorage.getItem('palace-user') || null
}

function getOtherUser() {
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
  return idx < 0 // returns true if added
}

export function getWatchlistIds(user) {
  return getWatchlist(user)
}

export { getCurrentUser, getOtherUser }

function WatchlistButton({ screeningId, onToggle }) {
  const user = getCurrentUser()
  if (!user) return null

  const { self, other } = isOnWatchlist(screeningId)

  const handleClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    toggleWatchlist(screeningId)
    if (onToggle) onToggle()
  }

  let className = 'watchlist-btn'
  if (self && other) className += ' both'
  else if (self) className += ' saved'

  const label = self && other ? '\u2665\u2665' : self ? '\u2665' : other ? '\u2661' : '\u2661'

  return (
    <button
      className={className}
      onClick={handleClick}
      title={self ? 'Remove from watchlist' : 'Add to watchlist'}
      aria-label={self ? 'Remove from watchlist' : 'Add to watchlist'}
    >
      {label}
    </button>
  )
}

export default WatchlistButton
