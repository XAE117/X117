import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  getRestaurantMarketIssue,
  isRestaurantInMarket,
} from '../../scripts/lib/restaurant-market.js'

describe('restaurant market validation', () => {
  it('accepts Greater LA and Orange County restaurants', () => {
    expect(isRestaurantInMarket({
      name: 'Los Feliz Fixture',
      neighborhood: 'Los Feliz',
      lat: 34.106,
      lng: -118.282,
    })).toBe(true)
    expect(isRestaurantInMarket({
      name: 'Santa Ana Fixture',
      neighborhood: 'Santa Ana',
      lat: 33.745,
      lng: -117.868,
    })).toBe(true)
  })

  it('rejects an out-of-market source even when geocoding matched an LA namesake', () => {
    const issue = getRestaurantMarketIssue({
      name: 'Café Riggs',
      neighborhood: 'Downtown Los Angeles',
      lat: 34.047,
      lng: -118.251,
      sources: [{
        name: 'Michelin Guide',
        url: 'https://guide.michelin.com/us/en/district-of-columbia/washington-dc/restaurant/cafe-riggs',
      }],
    })

    expect(issue).toContain('Michelin source outside Greater LA')
  })

  it('rejects coordinates outside the configured market', () => {
    expect(getRestaurantMarketIssue({
      name: 'Washington Fixture',
      lat: 38.907,
      lng: -76.999,
    })).toContain('coordinates outside Greater LA')
  })

  it('keeps the checked-in restaurant catalog free of out-of-market records', () => {
    const data = JSON.parse(readFileSync(
      new URL('../../public/restaurants.json', import.meta.url),
      'utf8',
    ))
    const invalid = data.restaurants
      .map(restaurant => ({ id: restaurant.id, issue: getRestaurantMarketIssue(restaurant) }))
      .filter(({ issue }) => issue)

    expect(invalid).toEqual([])
  })
})
