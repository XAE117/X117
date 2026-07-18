function slugifyPart(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function normalizeGroupedEvents(data, groupsKey, eventsKey) {
  if (!data?.[groupsKey]) return data

  const seen = new Map()
  const groups = data[groupsKey].map(group => {
    const events = []

    for (const event of group[eventsKey] || []) {
      const baseId = event.id || [
        group.id,
        event.date,
        event.time,
        event.title || event.artist,
      ].map(slugifyPart).filter(Boolean).join('-')
      const occurrence = [group.id, event.date, event.time].map(slugifyPart).join('|')
      const priorOccurrence = seen.get(baseId)

      if (!priorOccurrence) {
        seen.set(baseId, occurrence)
        events.push({ ...event, id: baseId })
        continue
      }

      // Same source occurrence with the same ID is a scraper duplicate.
      if (priorOccurrence === occurrence) continue

      // Preserve genuinely distinct occurrences while guaranteeing a unique ID.
      let uniqueId = `${baseId}-${occurrence.replaceAll('|', '-')}`
      let suffix = 2
      while (seen.has(uniqueId)) {
        uniqueId = `${baseId}-${occurrence.replaceAll('|', '-')}-${suffix}`
        suffix += 1
      }
      seen.set(uniqueId, occurrence)
      events.push({ ...event, id: uniqueId })
    }

    return { ...group, [eventsKey]: events }
  })

  return { ...data, [groupsKey]: groups }
}

export function normalizeCinemaEventIds(data) {
  return normalizeGroupedEvents(data, 'theaters', 'screenings')
}

export function normalizeJazzEventIds(data) {
  return normalizeGroupedEvents(data, 'venues', 'shows')
}
