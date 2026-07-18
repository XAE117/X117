import { describe, expect, it } from 'vitest'
import { compareDatedEvents, compareTimeStrings, hasEventStarted, parseTime } from '../../src/utils/timeUtils.js'

describe('time utilities', () => {
  it.each([
    ['12:30 am', 30],
    ['10:00 am', 600],
    ['1:00 pm', 780],
    ['7:00 PM', 1140],
    ['10:30 PM', 1350],
  ])('parses %s into minutes since midnight', (time, expected) => {
    expect(parseTime(time)).toBe(expected)
  })

  it('distinguishes already-started events from future choices', () => {
    const now = new Date('2026-07-17T18:00:00')
    expect(hasEventStarted('2026-07-17', '5:30 PM', now)).toBe(true)
    expect(hasEventStarted('2026-07-17', '7:30 PM', now)).toBe(false)
  })

  it('sorts AM and PM display strings chronologically and puts unknown times last', () => {
    const times = ['7:00 pm', '10:30 PM', '1:00 pm', '10:00 am', null, '12:30 am']

    expect(times.sort(compareTimeStrings)).toEqual([
      '12:30 am',
      '10:00 am',
      '1:00 pm',
      '7:00 pm',
      '10:30 PM',
      null,
    ])
  })

  it('sorts dated events chronologically with a deterministic secondary key', () => {
    const events = [
      { id: 'b', title: 'Beta', theaterName: 'Vista', date: '2026-07-17', time: '10:00 am' },
      { id: 'later-date', date: '2026-07-18', time: '12:30 am' },
      { id: 'a', title: 'Alpha', theaterName: 'Aero', date: '2026-07-17', time: '10:00 am' },
      { id: 'evening', date: '2026-07-17', time: '7:00 pm' },
      { id: 'midnight', date: '2026-07-17', time: '12:30 am' },
    ]

    expect(events.sort(compareDatedEvents).map((event) => event.id)).toEqual([
      'midnight',
      'a',
      'b',
      'evening',
      'later-date',
    ])
  })
})
