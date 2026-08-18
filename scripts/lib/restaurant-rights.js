const GOOGLE_DERIVED_FIELDS = [
  'googleMapsUrl',
  'googlePlaceId',
  'placeId',
  'googleAttributions',
  'googlePhotoUrl',
]

/**
 * Remove legacy Google Places artifacts from the public restaurant pipeline.
 * Only records explicitly designated as manual SIXPM editorial picks retain
 * location and hours data for iOS planning.
 */
export function sanitizeRestaurantForRights(restaurant) {
  const next = { ...restaurant }
  for (const field of GOOGLE_DERIVED_FIELDS) delete next[field]

  if (next.manualPick === true) {
    next.locationProvenance = 'sixpm-editorial'
    return next
  }

  delete next.lat
  delete next.lng
  delete next.hours
  next.locationProvenance = 'legacy-unverified'
  return next
}

export function sanitizeGuideRestaurantForRights(restaurant) {
  const next = { ...restaurant }
  for (const field of GOOGLE_DERIVED_FIELDS) delete next[field]
  delete next.lat
  delete next.lng
  delete next.hours
  next.locationProvenance = 'legacy-unverified'
  return next
}

export function isEditorialRestaurant(record) {
  return record?.manualPick === true && record?.locationProvenance === 'sixpm-editorial'
}
