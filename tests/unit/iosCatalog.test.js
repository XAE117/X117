import { describe, expect, it } from 'vitest'
import {
  buildIosCatalogBundle,
  validateIosCatalogBundle,
} from '../../scripts/lib/ios-catalog.js'

const generatedAt = '2026-08-18T12:00:00.000Z'

function providerPolicy() {
  return {
    schemaVersion: 1,
    providers: {
      'amc-catalog': {
        status: 'approved',
        displayName: 'AMC catalog',
        evidence: [{ url: 'https://example.test/amc' }],
        maxAgeHours: 36,
        attribution: 'Showtimes supplied by AMC Theatres.',
      },
      'sixpm-editorial': {
        status: 'approved',
        displayName: 'SIXPM editorial',
        evidence: [{ path: 'fixture' }],
        maxAgeHours: 8760,
        attribution: 'Curated by SIXPM.',
      },
      'jazz-venues': { status: 'pending' },
      tmdb: { status: 'disabled' },
    },
  }
}

function buildFixture() {
  return buildIosCatalogBundle({
    generatedAt,
    policy: providerPolicy(),
    theaterData: {
      lastUpdated: '2026-08-18T10:00:00.000Z',
      theaters: [
        {
          id: 'amc-century-city',
          name: 'AMC Century City 15',
          shortName: 'Century City',
          neighborhood: 'Century City',
          url: 'https://www.amctheatres.com/movie-theatres/los-angeles/amc-century-city-15',
          screenings: [{
            id: 'amc-1',
            title: 'Approved Film',
            date: '2026-08-19',
            time: '7:30 PM',
            format: 'IMAX',
            notes: 'Reserved seating',
            link: 'https://www.amctheatres.com/showtimes',
            posterPath: '/not-allowed.jpg',
            overview: 'Not an approved field',
          }],
        },
        {
          id: 'vista-theatre',
          name: 'Vista Theatre',
          url: 'https://example.test/vista',
          screenings: [{
            id: 'vista-1', title: 'Excluded Film', date: '2026-08-19', time: '8:00 PM', link: 'https://example.test',
          }],
        },
      ],
    },
    foodData: {
      restaurants: [
        {
          id: 'manual-pick',
          manualPick: true,
          locationProvenance: 'sixpm-editorial',
          name: 'Editorial Tacos',
          neighborhood: 'Mid-City',
          address: '100 Test Blvd, Los Angeles, CA',
          cuisine: 'Tacos',
          tier: 'street',
          priceRange: '$10/pp',
          description: 'A verified editorial fixture.',
          whyHot: 'First-party record.',
          tags: ['late-night'],
          hours: 'Daily 5pm-11pm',
          lat: 34.05,
          lng: -118.34,
          googleMapsUrl: 'https://maps.google.com/?q=must-not-ship',
        },
        {
          id: 'scraped',
          name: 'Scraped Restaurant',
          address: 'Elsewhere',
          lat: 34.1,
          lng: -118.2,
          hours: 'Daily 5pm-11pm',
        },
      ],
    },
  })
}

describe('iOS rights-gated catalog', () => {
  it('emits only declared AMC and first-party editorial fields', () => {
    const { feeds } = buildFixture()

    expect(feeds.cinema.data.theaters).toHaveLength(1)
    expect(feeds.cinema.data.theaters[0].id).toBe('amc-century-city')
    expect(feeds.cinema.data.theaters[0].screenings[0]).toEqual({
      id: 'amc-1',
      provider: 'amc-catalog',
      title: 'Approved Film',
      date: '2026-08-19',
      time: '7:30 PM',
      format: 'IMAX',
      notes: 'Reserved seating',
      link: 'https://www.amctheatres.com/showtimes',
    })
    expect(feeds.food.data.restaurants).toHaveLength(1)
    expect(feeds.food.data.restaurants[0]).not.toHaveProperty('googleMapsUrl')
    expect(JSON.stringify(feeds)).not.toContain('posterPath')
    expect(JSON.stringify(feeds)).not.toContain('overview')
  })

  it('rejects a feed whose record is relabeled as a pending provider', () => {
    const bundle = buildFixture()
    bundle.feeds.cinema.data.theaters[0].provider = 'jazz-venues'

    const errors = validateIosCatalogBundle({
      index: bundle.index,
      feeds: bundle.feeds,
      policy: providerPolicy(),
      now: new Date(generatedAt),
    })

    expect(errors.join('\n')).toContain('Provider jazz-venues is pending')
  })
})
