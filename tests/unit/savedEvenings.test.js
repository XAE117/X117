import { describe, expect, it } from 'vitest'
import {
  calendarEventForSavedEvening,
  createSavedEvening,
  loadSavedEvenings,
  normalizeSavedEvenings,
  notificationIdForSavedEvening,
  reminderForSavedEvening,
  screeningStartAt,
  shareContentForSavedEvening,
  validateSavedEvening,
} from '../../src/ios/savedEvenings.js'

const NOW = new Date('2026-08-18T12:00:00.000Z')

const catalog = {
  index: { catalogVersion: 'v1' },
  feeds: {
    cinema: {
      availability: { status: 'available' },
      providers: ['amc-catalog'],
      expiresAt: '2026-08-20T00:00:00.000Z',
    },
    food: {
      availability: { status: 'limited' },
      providers: ['sixpm-editorial'],
      expiresAt: '2027-08-18T12:00:00.000Z',
    },
  },
}

const cinema = {
  id: 'amc-fixture-film',
  provider: 'amc-catalog',
  title: 'Fixture Film',
  date: '2026-08-18',
  time: '7:30 PM',
  format: 'IMAX',
  notes: 'PG-13',
  link: 'https://www.amctheatres.com/showtimes/fixture',
  theaterId: 'amc-fixture',
  theaterName: 'AMC Fixture 12',
  theaterShortName: 'AMC Fixture',
  theaterNeighborhood: 'Hollywood',
}

const food = {
  id: 'fixture-food',
  provider: 'sixpm-editorial',
  name: 'Fixture Tacos',
  neighborhood: 'Hollywood',
  address: '123 Fixture Ave, Los Angeles, CA',
  cuisine: 'Tacos',
  priceRange: '$$',
  hours: 'Daily 5pm–midnight',
  lat: 34.1,
  lng: -118.3,
}

function savedEvening() {
  return createSavedEvening({
    cinema,
    food,
    catalog,
    now: NOW,
    createId: () => 'sixpm-fixture-evening',
  })
}

describe('SIXPM saved evenings', () => {
  it('models an LA screening as a precise whole-evening snapshot with catalog provenance', () => {
    expect(screeningStartAt(cinema).toISOString()).toBe('2026-08-19T02:30:00.000Z')

    const evening = savedEvening()
    expect(validateSavedEvening(evening)).toEqual([])
    expect(evening).toMatchObject({
      schemaVersion: 1,
      id: 'sixpm-fixture-evening',
      status: 'planned',
      catalogVersion: 'v1',
      cinema: {
        availability: 'available',
        provider: 'amc-catalog',
        startAt: '2026-08-19T02:30:00.000Z',
      },
      food: {
        availability: 'available',
        provider: 'sixpm-editorial',
      },
    })
  })

  it('refuses a showing that would outlive the approved AMC persistence window', () => {
    const laterCinema = { ...cinema, date: '2026-08-22' }
    expect(() => createSavedEvening({
      cinema: laterCinema,
      food,
      catalog,
      now: NOW,
      createId: () => 'sixpm-later-evening',
    })).toThrow('outside the approved offline-save window')
  })

  it('redacts expired provider data instead of retaining it in local saved storage', async () => {
    const writes = []
    const adapter = {
      readJson: async () => ({ schemaVersion: 1, evenings: [savedEvening()] }),
      writeJson: async (_key, payload) => writes.push(payload),
    }

    const evenings = await loadSavedEvenings({
      adapter,
      now: new Date('2026-08-20T01:00:00.000Z'),
    })

    expect(evenings[0].cinema).toEqual({
      availability: 'expired',
      provider: 'amc-catalog',
      expiresAt: '2026-08-20T00:00:00.000Z',
    })
    expect(evenings[0].food.availability).toBe('available')
    expect(writes).toHaveLength(1)
    expect(writes[0].evenings[0].cinema.title).toBeUndefined()
  })

  it('removes expired provider details from outbound Calendar and share actions', () => {
    const now = new Date('2027-08-18T12:00:01.000Z')
    const normalized = normalizeSavedEvenings({
      schemaVersion: 1,
      evenings: [savedEvening()],
    }, now)
    const evening = normalized.evenings[0]

    expect(evening.cinema).toEqual({
      availability: 'expired',
      provider: 'amc-catalog',
      expiresAt: '2026-08-20T00:00:00.000Z',
    })
    expect(evening.food).toEqual({
      availability: 'expired',
      provider: 'sixpm-editorial',
      expiresAt: '2027-08-18T12:00:00.000Z',
    })
    expect(() => calendarEventForSavedEvening(evening, now)).toThrow('Cinema details are no longer available')
    expect(shareContentForSavedEvening(evening, now)).toEqual({
      title: 'SIXPM saved evening',
      text: 'A saved SIXPM evening',
    })
  })

  it('drops corrupt rows while retaining valid rights-compliant evenings', () => {
    const normalized = normalizeSavedEvenings({
      schemaVersion: 1,
      evenings: [savedEvening(), { id: 'unsafe', status: 'planned' }],
    }, NOW)

    expect(normalized.changed).toBe(true)
    expect(normalized.evenings.map(item => item.id)).toEqual(['sixpm-fixture-evening'])
  })

  it('creates Calendar, reminder, and share payloads only while the provider snapshots are fresh', () => {
    const evening = savedEvening()
    const calendar = calendarEventForSavedEvening(evening, NOW)
    const reminder = reminderForSavedEvening(evening, 41, { now: NOW })
    const share = shareContentForSavedEvening(evening, NOW)

    expect(calendar).toMatchObject({
      title: 'SIXPM · Fixture Film',
      location: 'AMC Fixture 12',
      url: 'https://www.amctheatres.com/showtimes/fixture',
    })
    expect(reminder).toMatchObject({ id: 41, extra: { eveningId: 'sixpm-fixture-evening' } })
    expect(reminder.at.toISOString()).toBe('2026-08-19T01:00:00.000Z')
    expect(share.text).toContain('Fixture Tacos')
  })

  it('allocates stable, positive local-notification ids without colliding with saved plans', () => {
    const first = notificationIdForSavedEvening('sixpm-fixture-evening')
    const second = notificationIdForSavedEvening('sixpm-fixture-evening', [first])

    expect(first).toBeGreaterThan(0)
    expect(second).not.toBe(first)
  })
})
