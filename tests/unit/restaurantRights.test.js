import { describe, expect, it } from 'vitest'
import {
  sanitizeGuideRestaurantForRights,
  sanitizeRestaurantForRights,
} from '../../scripts/lib/restaurant-rights.js'

describe('restaurant rights sanitation', () => {
  it('keeps only verified editorial planning fields for manual picks', () => {
    const sanitized = sanitizeRestaurantForRights({
      id: 'manual',
      manualPick: true,
      lat: 34.05,
      lng: -118.34,
      hours: 'Daily 5pm-11pm',
      googleMapsUrl: 'https://maps.google.com/?q=manual',
      googlePlaceId: 'place-id',
    })

    expect(sanitized).toMatchObject({
      locationProvenance: 'sixpm-editorial',
      lat: 34.05,
      lng: -118.34,
      hours: 'Daily 5pm-11pm',
    })
    expect(sanitized).not.toHaveProperty('googleMapsUrl')
    expect(sanitized).not.toHaveProperty('googlePlaceId')
  })

  it('removes legacy provider-derived planning fields from non-manual records', () => {
    const sanitized = sanitizeRestaurantForRights({
      id: 'legacy',
      lat: 34.05,
      lng: -118.34,
      hours: 'Daily 5pm-11pm',
      googleMapsUrl: 'https://maps.google.com/?q=legacy',
    })

    expect(sanitized).toMatchObject({ locationProvenance: 'legacy-unverified' })
    expect(sanitized).not.toHaveProperty('lat')
    expect(sanitized).not.toHaveProperty('lng')
    expect(sanitized).not.toHaveProperty('hours')
    expect(sanitized).not.toHaveProperty('googleMapsUrl')
  })

  it('removes unverified location fields and map-provider URLs from guide records', () => {
    const sanitized = sanitizeGuideRestaurantForRights({
      id: 'guide',
      googleMapsUrl: 'https://maps.google.com/?q=guide',
      lat: 34.05,
      lng: -118.34,
      hours: 'Daily 5pm-11pm',
    })

    expect(sanitized).toMatchObject({ locationProvenance: 'legacy-unverified' })
    expect(sanitized).not.toHaveProperty('googleMapsUrl')
    expect(sanitized).not.toHaveProperty('lat')
    expect(sanitized).not.toHaveProperty('lng')
    expect(sanitized).not.toHaveProperty('hours')
  })
})
