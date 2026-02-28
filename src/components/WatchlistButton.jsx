import { getCurrentUser, isOnWatchlist, toggleWatchlist } from '../utils/watchlist.js'
import './WatchlistButton.css'

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
