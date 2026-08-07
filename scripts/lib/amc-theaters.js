function embeddedTheatres(locationData) {
  return (locationData?._embedded?.locations || [])
    .map(location => location?._embedded?.theatre)
    .filter(Boolean)
}

/**
 * Resolve configured AMC venues against a live locations response.
 *
 * AMC occasionally changes a theatre's public slug. Numeric theatre IDs are
 * more stable, so they are used both to match renamed venues and as a fallback
 * when a venue falls outside a locations query.
 */
export function resolveAMCTheaterIds(configuredTheaters, locationData) {
  const theatres = embeddedTheatres(locationData)
  const byId = new Map(theatres.map(theatre => [String(theatre.id), theatre]))
  const bySlug = new Map(theatres.map(theatre => [theatre.slug, theatre]))
  const ids = {}
  const slugChanges = []

  for (const configured of configuredTheaters) {
    const idMatch = configured.amcTheatreId
      ? byId.get(String(configured.amcTheatreId))
      : null
    const slugMatch = configured.amcSlug ? bySlug.get(configured.amcSlug) : null
    const match = idMatch || slugMatch
    const theatreId = match?.id || configured.amcTheatreId

    if (theatreId) ids[configured.id] = theatreId

    if (idMatch?.slug && configured.amcSlug && idMatch.slug !== configured.amcSlug) {
      slugChanges.push({
        theaterId: configured.id,
        configuredSlug: configured.amcSlug,
        apiSlug: idMatch.slug,
      })
    }
  }

  return {
    ids,
    discoveredCount: theatres.length,
    slugChanges,
  }
}
