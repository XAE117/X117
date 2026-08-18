import { describe, expect, it } from 'vitest'
import {
  distanceMilesBetween,
  formatDistanceMiles,
  formatScreeningTime,
  groupScreeningsByTitle,
  sortRestaurantsByDistance,
  tonightOrNextScreenings,
  upcomingScreenings,
} from '../../src/ios/format.js'

const cinemaFeed = {
  data: {
    theaters: [{
      id: 'amc-fixture',
      name: 'AMC Fixture',
      screenings: [
        { id: 'morning', title: 'Morning Movie', date: '2026-08-18', time: '10:00 AM' },
        { id: 'matinee', title: 'Matinee Movie', date: '2026-08-18', time: '3:30 PM' },
        { id: 'tonight', title: 'Evening Movie', date: '2026-08-18', time: '7:30 PM' },
        { id: 'tomorrow-morning', title: 'Tomorrow Matinee', date: '2026-08-19', time: '11:00 AM' },
        { id: 'tomorrow-evening', title: 'Tomorrow Night', date: '2026-08-19', time: '8:00 PM' },
      ],
    }],
  },
}

describe('iOS Tonight screening selection', () => {
  it('shows only unstarted evening screenings for tonight', () => {
    const result = tonightOrNextScreenings(cinemaFeed, new Date('2026-08-18T13:00:00.000Z'))

    expect(result.map(item => item.id)).toEqual(['tonight'])
  })

  it('falls forward to the next available evening instead of presenting a daytime matinee', () => {
    const result = tonightOrNextScreenings(cinemaFeed, new Date('2026-08-19T05:00:00.000Z'))

    expect(result.map(item => item.id)).toEqual(['tomorrow-evening'])
  })

  it('omits screenings that have already started from the current iPhone directory', () => {
    const result = upcomingScreenings(cinemaFeed, new Date('2026-08-18T15:30:00.000Z'))

    expect(result.map(item => item.id)).toEqual([
      'morning',
      'matinee',
      'tonight',
      'tomorrow-morning',
      'tomorrow-evening',
    ])
  })

  it('groups the same film into one stable card with its venue options', () => {
    const groups = groupScreeningsByTitle([
      { id: 'late', title: 'One Film', date: '2026-08-18', time: '9:00 PM', theaterId: 'amc-b', theaterShortName: 'AMC B' },
      { id: 'early', title: 'One Film', date: '2026-08-18', time: '7:00 PM', theaterId: 'amc-a', theaterShortName: 'AMC A' },
      { id: 'other', title: 'Another Film', date: '2026-08-18', time: '8:00 PM', theaterId: 'amc-a', theaterShortName: 'AMC A' },
    ])

    expect(groups.map(group => group.title)).toEqual(['One Film', 'Another Film'])
    expect(groups[0].primary.id).toBe('early')
    expect(groups[0].showings.map(showing => showing.id)).toEqual(['early', 'late'])
  })
})

describe('iOS local nearby food ordering', () => {
  it('sorts only on-device restaurant coordinates while preserving records without coordinates last', () => {
    const origin = { latitude: 34.0522, longitude: -118.2437 }
    const restaurants = [
      { id: 'far', name: 'Far', lat: 34.1800, lng: -118.3000 },
      { id: 'missing', name: 'Missing' },
      { id: 'near', name: 'Near', lat: 34.0540, lng: -118.2450 },
    ]

    const sorted = sortRestaurantsByDistance(restaurants, origin)

    expect(sorted.map(item => item.id)).toEqual(['near', 'far', 'missing'])
    expect(sorted[0].distanceMiles).toBeLessThan(sorted[1].distanceMiles)
    expect(sorted[2].distanceMiles).toBeNull()
    expect(restaurants[0].distanceMiles).toBeUndefined()
  })

  it('formats a local distance without treating a missing coordinate as a distance', () => {
    expect(distanceMilesBetween({ latitude: 34.0522, longitude: -118.2437 }, { lat: 34.0522, lng: -118.2437 })).toBe(0)
    expect(formatDistanceMiles(0.84)).toBe('0.8 mi away')
    expect(formatDistanceMiles(13.2)).toBe('13 mi away')
    expect(formatDistanceMiles(null)).toBeNull()
  })

  it('normalizes AM/PM casing for iPhone presentation without changing sort semantics', () => {
    expect(formatScreeningTime('7:00 am')).toBe('7:00 AM')
    expect(formatScreeningTime('12:05 PM')).toBe('12:05 PM')
  })
})
