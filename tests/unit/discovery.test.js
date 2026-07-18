import { describe, expect, it } from 'vitest'
import { filterDiscoveryItems, isRestaurantOpenAt } from '../../src/utils/discovery.js'

describe('discovery filters', () => {
  it('parses daily and overnight restaurant hours conservatively', () => {
    expect(isRestaurantOpenAt('Daily 11am–10pm', new Date('2026-07-17T18:00:00'))).toBe(true)
    expect(isRestaurantOpenAt('Daily 11am–10pm', new Date('2026-07-17T23:00:00'))).toBe(false)
    expect(isRestaurantOpenAt('Thu-Sun 9pm-3am', new Date('2026-07-17T23:00:00'))).toBe(true)
    expect(isRestaurantOpenAt('Tue–Sat seatings at 6pm & 8:30pm', new Date('2026-07-17T20:30:00'))).toBe(true)
    expect(isRestaurantOpenAt('Tue–Sat seatings at 6pm & 8:30pm', new Date('2026-07-17T19:30:00'))).toBe(false)
    expect(isRestaurantOpenAt('', new Date('2026-07-17T19:30:00'))).toBe(false)
  })

  it('parses single-day Google Places schedules', () => {
    const mondayDinner = new Date(2026, 6, 20, 19, 0)
    const tuesdayDinner = new Date(2026, 6, 21, 19, 0)
    const hours = 'Mon 11:00 AM–10:00 PM, Tue Closed'

    expect(isRestaurantOpenAt(hours, mondayDinner)).toBe(true)
    expect(isRestaurantOpenAt(hours, tuesdayDinner)).toBe(false)
  })

  it('combines type, radius, format, and vibe filters', () => {
    const items = [
      { kind: 'film', id: 'film', name: 'Film', date: '2026-07-17', format: '35mm', coords: { lat: 34.06, lng: -118.31 } },
      { kind: 'film', id: 'far', name: 'Far Film', date: '2026-07-17', format: 'digital', coords: { lat: 33.6, lng: -117.9 } },
      { kind: 'food', id: 'food', name: 'Food', tier: 'feast', heatScore: 5, coords: { lat: 34.06, lng: -118.31 } },
    ]
    const result = filterDiscoveryItems(items, {
      query: '',
      kind: 'film',
      date: 'all',
      radius: '5',
      format: '35mm',
      price: 'all',
      neighborhood: 'all',
      vibe: 'adventure',
      openNow: false,
    }, new Date('2026-07-17T12:00:00'))

    expect(result.map(item => item.id)).toEqual(['film'])
  })

  it('omits past events while retaining restaurants', () => {
    const result = filterDiscoveryItems([
      { kind: 'film', id: 'old-day', name: 'Old', venue: 'A', neighborhood: '', date: '2026-07-16', time: '8:00 PM' },
      { kind: 'jazz', id: 'old-time', name: 'Earlier', venue: 'B', neighborhood: '', date: '2026-07-17', time: '5:00 PM' },
      { kind: 'film', id: 'future', name: 'Later', venue: 'C', neighborhood: '', date: '2026-07-17', time: '8:00 PM' },
      { kind: 'food', id: 'food', name: 'Dinner', venue: 'D', neighborhood: '', heatScore: 1 },
    ], {
      query: '',
      kind: 'all',
      date: 'all',
      radius: 'all',
      format: 'all',
      price: 'all',
      neighborhood: 'all',
      vibe: 'all',
      openNow: false,
    }, new Date('2026-07-17T18:00:00'))

    expect(result.map(item => item.id)).toEqual(['future', 'food'])
  })
})
