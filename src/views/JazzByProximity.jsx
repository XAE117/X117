import { useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNow, getRelativeLabel } from '../utils/timeUtils.js'
import { TIERS, getProximityTier } from '../data/louisColeProximity.js'
import { TargetIcon, BubblesIcon, MusicNoteIcon } from '../components/Icons'
import './JazzByProximity.css'

const TIER_ICONS = {
  inner_circle: TargetIcon,
  the_bubble: BubblesIcon,
  everyone_else: MusicNoteIcon,
}

function OCBadge({ venue }) {
  if (venue.region !== 'OC') return null
  return <span className="jazz-oc-badge">OC</span>
}

function ShowRow({ show, venue, now }) {
  const relative = getRelativeLabel(show.date, show.time, now)
  const navigate = useNavigate()
  const itemRef = useRef(null)

  const handleClick = (e) => {
    if (e.target.closest('a')) return
    if (itemRef.current) {
      itemRef.current.classList.remove('glow-pulse')
      void itemRef.current.offsetWidth
      itemRef.current.classList.add('glow-pulse')
    }
    setTimeout(() => navigate(`/jazz/show/${show.id}`), 300)
  }

  const d = new Date(show.date + 'T00:00:00')
  const dateLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <li
      ref={itemRef}
      className={`jbp-show-row ${show.hot ? 'is-hot' : ''} ${venue.tier === 'indie_scene' ? 'is-underground' : ''}`}
      onClick={handleClick}
    >
      <span className="jbp-show-date">{dateLabel}</span>
      <span className="jbp-show-artist">{show.artist}</span>
      <span className="jbp-show-venue" style={{ color: venue.color }}>
        {venue.shortName}
        {venue.region === 'OC' && <OCBadge venue={venue} />}
      </span>
      {show.price && <span className="jbp-show-price">{show.price}</span>}
      <span className="jbp-show-time">{show.time || 'TBA'}</span>
      {relative && (
        <span className={`jbp-show-relative ${relative.isNow ? 'is-now' : ''}`}>{relative.label}</span>
      )}
    </li>
  )
}

function JazzByProximity({ data }) {
  const now = useNow()

  const tiers = useMemo(() => {
    if (!data) return []

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Collect all future shows with venue info and tier
    const allShows = []
    data.venues.forEach(venue => {
      venue.shows.forEach(show => {
        if (new Date(show.date + 'T00:00:00') >= today) {
          allShows.push({
            ...show,
            venue,
            proximityTier: getProximityTier(show.artist),
          })
        }
      })
    })

    // Sort by date, then time
    allShows.sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))

    // Group by tier
    return TIERS.map(tier => ({
      ...tier,
      shows: allShows.filter(s => s.proximityTier === tier.key),
    }))
  }, [data])

  if (!data) return null

  return (
    <div className="jbp-page">
      <h2 className="jbp-title">By Proximity to Louis Cole</h2>
      <p className="jbp-subtitle">Degrees of separation from the man himself</p>

      <div className="jbp-tiers">
        {tiers.map(tier => (
          <div key={tier.key} className={`jbp-tier-block jbp-tier-${tier.key}`}>
            <h3 className="jbp-tier-header">
              <span className="jbp-tier-icon">{(() => { const Icon = TIER_ICONS[tier.key]; return Icon ? <Icon /> : null })()}</span>
              <span className="jbp-tier-label">{tier.label}</span>
              <span className="jbp-tier-count">{tier.shows.length}</span>
            </h3>
            <p className="jbp-tier-subtitle">{tier.subtitle}</p>

            {tier.shows.length === 0 ? (
              <p className="jbp-empty">No upcoming shows</p>
            ) : (
              <ul className="jbp-show-list">
                {tier.shows.map(s => (
                  <ShowRow key={s.id} show={s} venue={s.venue} now={now} />
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default JazzByProximity
