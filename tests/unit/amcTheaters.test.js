import { describe, expect, it } from 'vitest'
import { resolveAMCTheaterIds } from '../../scripts/lib/amc-theaters.js'
import {
  filterAmcLosAngelesData,
  isAmcLosAngelesTheater,
} from '../../src/utils/amcCinema.js'

describe('AMC theater discovery', () => {
  it('keeps a theater connected when AMC changes its public slug', () => {
    const configured = [{
      id: 'amc-citywalk',
      amcTheatreId: 2416,
      amcSlug: 'universal-cinema-amc-at-citywalk-hollywood',
    }]
    const locationData = {
      _embedded: {
        locations: [{
          _embedded: {
            theatre: {
              id: 2416,
              slug: 'universal-cinema-an-amc-theatre',
            },
          },
        }],
      },
    }

    const resolution = resolveAMCTheaterIds(configured, locationData)

    expect(resolution.ids['amc-citywalk']).toBe(2416)
    expect(resolution.slugChanges).toEqual([{
      theaterId: 'amc-citywalk',
      configuredSlug: 'universal-cinema-amc-at-citywalk-hollywood',
      apiSlug: 'universal-cinema-an-amc-theatre',
    }])
  })

  it('falls back to configured numeric IDs when locations are unavailable', () => {
    const resolution = resolveAMCTheaterIds([
      { id: 'amc-century-city', amcTheatreId: 245, amcSlug: 'amc-century-city-15' },
    ], null)

    expect(resolution.ids).toEqual({ 'amc-century-city': 245 })
    expect(resolution.discoveredCount).toBe(0)
  })
})

describe('AMC Los Angeles category', () => {
  const data = {
    lastUpdated: '2026-08-07T00:00:00.000Z',
    theaters: [
      { id: 'amc-century-city', screenings: [{ id: 'amc-1' }] },
      { id: 'amc-citywalk', screenings: [{ id: 'amc-2' }] },
      { id: 'new-beverly', screenings: [{ id: 'rep-1' }] },
    ],
  }

  it('recognizes only the tracked LA AMC venues', () => {
    expect(isAmcLosAngelesTheater(data.theaters[0])).toBe(true)
    expect(isAmcLosAngelesTheater(data.theaters[2])).toBe(false)
  })

  it('filters the movie data without mutating it', () => {
    const filtered = filterAmcLosAngelesData(data, 'amc-citywalk')

    expect(filtered.theaters.map(theater => theater.id)).toEqual(['amc-citywalk'])
    expect(data.theaters).toHaveLength(3)
  })
})
