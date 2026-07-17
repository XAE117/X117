import { describe, expect, it } from 'vitest'
import { filterCinemaData } from '../../src/hooks/useCinemaFilter.js'

const NOW = new Date('2026-07-17T12:00:00')

const data = {
  lastUpdated: '2026-07-17T10:00:00Z',
  films: {
    'new-release': { year: 2026 },
    'old-release': { year: 1974 },
  },
  theaters: [
    {
      id: 'vista-theatre',
      name: 'Vista',
      screenings: [
        { id: 'past', title: 'Old Release', date: '2026-07-16', format: '35mm' },
        { id: 'film', title: 'Old Release', date: '2026-07-17', format: '35mm' },
        { id: 'new', title: 'New Release', date: '2026-07-18', format: 'digital' },
      ],
    },
    {
      id: 'not-a-favorite',
      name: 'Other',
      screenings: [
        { id: 'other', title: 'Old Release', date: '2026-07-18', format: 'digital' },
      ],
    },
  ],
}

describe('filterCinemaData', () => {
  it('removes past screenings without mutating the source data', () => {
    const result = filterCinemaData(data, 'all', NOW)

    expect(result.theaters[0].screenings.map((screening) => screening.id)).toEqual(['film', 'new'])
    expect(data.theaters[0].screenings).toHaveLength(3)
  })

  it('filters physical film formats case-insensitively', () => {
    const result = filterCinemaData(data, 'film', NOW)

    expect(result.theaters).toHaveLength(1)
    expect(result.theaters[0].screenings.map((screening) => screening.id)).toEqual(['film'])
  })

  it('filters new releases using enrichment metadata', () => {
    const result = filterCinemaData(data, 'new', NOW)

    expect(result.theaters).toHaveLength(1)
    expect(result.theaters[0].screenings.map((screening) => screening.id)).toEqual(['new'])
  })

  it('limits favorites to the curated theater set', () => {
    const result = filterCinemaData(data, 'favorites', NOW)

    expect(result.theaters.map((theater) => theater.id)).toEqual(['vista-theatre'])
  })
})
