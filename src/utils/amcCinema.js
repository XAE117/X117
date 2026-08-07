const AMC_LA_THEATER_IDS = new Set([
  'amc-century-city',
  'amc-burbank',
  'amc-rolling-hills',
  'amc-americana',
  'amc-citywalk',
])

export function isAmcLosAngelesTheater(theater) {
  return AMC_LA_THEATER_IDS.has(theater?.id)
}

export function filterAmcLosAngelesData(data, theaterId = 'all') {
  if (!data) return null

  const theaters = (data.theaters || []).filter(theater => (
    isAmcLosAngelesTheater(theater)
    && (theaterId === 'all' || theater.id === theaterId)
  ))

  return { ...data, theaters }
}
