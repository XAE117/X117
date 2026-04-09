import { parseTime } from './timeUtils.js'

/**
 * Determine urgency type for a screening within a theater's schedule.
 *
 * Returns:
 *   'last-screening' — no other showing of this title at this theater has a later date+time
 *   'final-night'    — no showings of this title at this theater exist on any date after this one
 *   null             — not urgent
 *
 * Data-window guard: screenings within 2 days of the max date in allScreenings
 * are excluded to avoid false positives near the scrape boundary.
 */
export function getUrgencyType(screening, allScreenings) {
  if (!screening || !allScreenings || allScreenings.length === 0) return null

  // Find the max date across all screenings (scrape boundary)
  let maxDate = ''
  for (const s of allScreenings) {
    if (s.date > maxDate) maxDate = s.date
  }

  // Data-window guard: skip badges for screenings within 2 days of max date
  const cutoff = subtractDays(maxDate, 2)
  if (screening.date >= cutoff) return null

  // Gather all showings of this title at this theater
  const siblings = allScreenings.filter(
    s => s.title === screening.title && s.theaterId === screening.theaterId
  )

  if (siblings.length <= 1) {
    // Only one showing total — it's the last screening
    return 'last-screening'
  }

  const screeningMinutes = parseTime(screening.time) ?? 0

  // Check if any sibling has a strictly later date+time
  const hasLater = siblings.some(s => {
    if (s.id === screening.id) return false
    if (s.date > screening.date) return true
    if (s.date === screening.date) {
      const sMin = parseTime(s.time) ?? 0
      return sMin > screeningMinutes
    }
    return false
  })

  if (!hasLater) return 'last-screening'

  // Check if any sibling exists on a later date (regardless of time)
  const hasLaterDate = siblings.some(s => {
    if (s.id === screening.id) return false
    return s.date > screening.date
  })

  if (!hasLaterDate) return 'final-night'

  return null
}

/**
 * Subtract N days from an ISO date string, return ISO date string.
 */
function subtractDays(dateISO, n) {
  const d = new Date(dateISO + 'T12:00:00')
  d.setDate(d.getDate() - n)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
