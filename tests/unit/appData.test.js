import { describe, expect, it } from 'vitest'
import { normalizeRestaurantData } from '../../src/hooks/useAppData.js'

describe('restaurant normalization', () => {
  it('creates an Apple Maps directions link when ingestion did not provide one', () => {
    const data = normalizeRestaurantData({
      restaurants: [{
        id: 'spot',
        name: 'Test Kitchen',
        neighborhood: 'Koreatown',
        tier: 'feast',
      }],
    })

    expect(data.restaurants[0].directionsUrl).toContain('maps.apple.com')
    expect(data.restaurants[0].directionsUrl).toContain('Test+Kitchen')
  })
})
