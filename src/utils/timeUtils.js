import { useState, useEffect } from 'react'

/**
 * Custom hook that returns the current time, updating every `intervalMs`.
 */
export function useNow(intervalMs = 60000) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

/**
 * Parse a time string like "7:30 PM" into minutes since midnight.
 * Takes the first time if multiple (e.g. "7:00 pm / 8:30 pm").
 */
export function parseTime(timeStr) {
  if (!timeStr) return null
  const first = timeStr.split('/')[0].trim()
  const match = first.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i)
  if (!match) return null
  let [, h, m, period] = match
  h = parseInt(h, 10)
  m = parseInt(m, 10)
  if (period) {
    period = period.toLowerCase()
    if (period === 'pm' && h !== 12) h += 12
    if (period === 'am' && h === 12) h = 0
  }
  return h * 60 + m
}

/**
 * Compare display-time strings chronologically, placing unknown times last.
 */
export function compareTimeStrings(a, b) {
  const aMinutes = parseTime(a)
  const bMinutes = parseTime(b)

  if (aMinutes != null && bMinutes != null) return aMinutes - bMinutes
  if (aMinutes != null) return -1
  if (bMinutes != null) return 1
  return String(a || '').localeCompare(String(b || ''))
}

/**
 * Compare dated screening-like records with deterministic tie-breaking.
 */
export function compareDatedEvents(a, b) {
  const dateComp = String(a.date || '').localeCompare(String(b.date || ''))
  if (dateComp !== 0) return dateComp

  const timeComp = compareTimeStrings(a.time, b.time)
  if (timeComp !== 0) return timeComp

  const aKey = [a.theaterName, a.venueName, a.venue?.name, a.title, a.artist, a.id].filter(Boolean).join('\0')
  const bKey = [b.theaterName, b.venueName, b.venue?.name, b.title, b.artist, b.id].filter(Boolean).join('\0')
  return aKey.localeCompare(bKey)
}

/**
 * Get a relative time label for a screening given its date and time.
 * Returns an object { label, isNow } or null if not applicable.
 *
 * For future screenings: "in 3d 2h", "in 4h 15m", "in 20m"
 * For currently playing (within 2.5h window): "Now showing"
 * For past screenings on today: "Started 2h 30m ago"
 * For past screenings on other days: null
 */
export function getRelativeLabel(dateStr, timeStr, now) {
  const parsed = parseTime(timeStr)
  if (parsed == null) return null

  const [y, mo, da] = dateStr.split('-').map(Number)
  const screeningDate = new Date(y, mo - 1, da, Math.floor(parsed / 60), parsed % 60)

  const diffMs = screeningDate - now
  const diffMin = Math.round(diffMs / 60000)

  if (diffMin > 0) {
    const days = Math.floor(diffMin / 1440)
    const hours = Math.floor((diffMin % 1440) / 60)
    const mins = diffMin % 60

    // 7+ days: show date
    if (days >= 7) {
      const d = new Date(y, mo - 1, da)
      return { label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), isNow: false }
    }
    // 2-6 days: show day name
    if (days >= 2) {
      const d = new Date(y, mo - 1, da)
      return { label: d.toLocaleDateString('en-US', { weekday: 'long' }), isNow: false }
    }
    // Tomorrow
    if (days === 1) {
      return { label: 'Tomorrow', isNow: false }
    }
    // Today: show countdown
    if (hours > 0) return { label: `in ${hours}h ${mins}m`, isNow: false }
    return { label: `in ${mins}m`, isNow: false }
  }

  const elapsed = -diffMin
  if (elapsed <= 150) return { label: 'Now showing', isNow: true }

  // Check if it's today — show "Started Xh ago" for today's past screenings
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  if (dateStr === todayStr) {
    const h = Math.floor(elapsed / 60)
    const m = elapsed % 60
    if (h > 0) return { label: `Started ${h}h ${m}m ago`, isNow: false }
    return { label: `Started ${m}m ago`, isNow: false }
  }

  return null
}

/**
 * Check if a screening has already ended (started more than 2.5h ago).
 * For screenings without a time, checks if the date is before today.
 */
export function isScreeningPast(dateStr, timeStr, now) {
  const parsed = parseTime(timeStr)
  if (parsed != null) {
    const [y, mo, da] = dateStr.split('-').map(Number)
    const screeningDate = new Date(y, mo - 1, da, Math.floor(parsed / 60), parsed % 60)
    const elapsed = (now - screeningDate) / 60000
    return elapsed > 150
  }
  // No time — consider past if date is before today
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const d = new Date(dateStr + 'T00:00:00')
  return d < today
}

/** Returns true once an event's listed start time has passed. */
export function hasEventStarted(dateStr, timeStr, now) {
  const parsed = parseTime(timeStr)
  if (parsed == null) return false
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day, Math.floor(parsed / 60), parsed % 60) < now
}

/**
 * Get film slug from title.
 */
export function slugify(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

/**
 * Get compact film metadata string (director · year).
 */
export function filmMeta(title, films) {
  if (!films) return null
  const f = films[slugify(title)]
  if (!f) return null
  const parts = [f.director, f.year].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : null
}

/**
 * Get film data by title.
 */
export function getFilmData(title, films) {
  if (!films) return null
  return films[slugify(title)] || null
}
