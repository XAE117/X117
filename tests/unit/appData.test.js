import { describe, expect, it } from 'vitest'
import { normalizeRestaurantData } from '../../src/hooks/useAppData.js'

describe('restaurant normalization', () => {
  it('creates actionable map links when ingestion did not provide one', () => {
    const data = normalizeRestaurantData({
      restaurants: [{
        id: 'spot',
        name: 'Test Kitchen',
        neighborhood: 'Koreatown',
        tier: 'feast',
      }],
    })

    expect(data.restaurants[0].googleMapsUrl).toContain('google.com/maps/search')
    expect(data.restaurants[0].googleMapsUrl).toContain('Test%20Kitchen')
  })
})
