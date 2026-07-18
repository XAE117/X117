import { describe, expect, it } from 'vitest'
import {
  normalizeCinemaEventIds,
  normalizeJazzEventIds,
} from '../../src/utils/eventIdentity.js'

describe('event identity normalization', () => {
  it('removes duplicate source occurrences with the same event ID', () => {
    const source = {
      venues: [{
        id: 'club',
        shows: [
          { id: 'duplicate', date: '2026-08-07', time: '8:30 PM', artist: 'Long title' },
          { id: 'duplicate', date: '2026-08-07', time: '8:30 PM', artist: 'Short title' },
        ],
      }],
    }

    const normalized = normalizeJazzEventIds(source)

    expect(normalized.venues[0].shows).toHaveLength(1)
    expect(normalized.venues[0].shows[0].artist).toBe('Long title')
    expect(source.venues[0].shows).toHaveLength(2)
  })

  it('suffixes an ID collision when the occurrences are genuinely distinct', () => {
    const source = {
      theaters: [{
        id: 'vista',
        screenings: [
          { id: 'shared', date: '2026-08-07', time: '7:00 PM', title: 'One' },
          { id: 'shared', date: '2026-08-08', time: '7:00 PM', title: 'Two' },
        ],
      }],
    }

    const normalized = normalizeCinemaEventIds(source)
    const ids = normalized.theaters[0].screenings.map(event => event.id)

    expect(new Set(ids).size).toBe(2)
    expect(ids[0]).toBe('shared')
    expect(ids[1]).toContain('shared-vista-2026-08-08-7-00-pm')
  })
})
