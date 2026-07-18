import { compareDatedEvents, parseTime } from './timeUtils.js'

export const EVENING_START_MINUTES = 17 * 60

export function groupScreeningsByFilm(screenings) {
  const groups = new Map()

  for (const screening of [...screenings].sort(compareDatedEvents)) {
    const key = screening.title.trim().toLowerCase()
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        title: screening.title,
        screenings: [],
      })
    }
    groups.get(key).screenings.push(screening)
  }

  return [...groups.values()]
}

export function isEveningScreening(screening) {
  const minutes = parseTime(screening.time)
  return minutes != null && minutes >= EVENING_START_MINUTES
}
