function dayIndex(token) {
  return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(token.toLowerCase().slice(0, 3))
}

const DAY_TOKEN = '(Sun(?:day)?|Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?)'

function dayMatches(schedule, date) {
  if (/daily/i.test(schedule)) return true
  const range = schedule.match(new RegExp(`\\b${DAY_TOKEN}\\s*[–-]\\s*${DAY_TOKEN}\\b`, 'i'))
  if (!range) {
    const singleDay = schedule.match(new RegExp(`\\b${DAY_TOKEN}\\b`, 'i'))
    return Boolean(singleDay && dayIndex(singleDay[1]) === date.getDay())
  }
  const start = dayIndex(range[1])
  const end = dayIndex(range[2])
  const day = date.getDay()
  return start <= end ? day >= start && day <= end : day >= start || day <= end
}

function parseClock(hour, minute, period) {
  let value = Number(hour) % 12
  if (period.toLowerCase() === 'pm') value += 12
  return value * 60 + Number(minute || 0)
}

/**
 * Returns true only when a supplied schedule explicitly covers the given time.
 * Unknown or missing hours stay false so plan generation never implies certainty.
 */
export function isRestaurantOpenAt(hours, date = new Date()) {
  if (!hours) return false
  const segments = hours.split(/,\s*(?=(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)(?:day|sday|nesday|rsday|urday)?\b)/i)
  const nowMinutes = date.getHours() * 60 + date.getMinutes()

  return segments.some(segment => {
    if (!dayMatches(segment, date)) return false
    const ranges = [...segment.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*[–-]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/gi)]
    if (ranges.some(match => {
      const start = parseClock(match[1], match[2], match[3])
      const end = parseClock(match[4], match[5], match[6])
      return end <= start
        ? nowMinutes >= start || nowMinutes <= end
        : nowMinutes >= start && nowMinutes <= end
    })) return true

    // Tasting-menu schedules often list discrete seatings instead of a range.
    const seatings = [...segment.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/gi)]
      .map(match => parseClock(match[1], match[2], match[3]))
    return seatings.some(seating => Math.abs(nowMinutes - seating) <= 20)
  })
}
