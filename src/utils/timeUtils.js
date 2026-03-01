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
    if (days > 0) {
      if (hours > 0) return { label: `in ${days}d ${hours}h`, isNow: false }
      return { label: `in ${days}d`, isNow: false }
    }
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
