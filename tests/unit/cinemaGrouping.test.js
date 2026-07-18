import { describe, expect, it } from 'vitest'
import {
  groupScreeningsByFilm,
  isEveningScreening,
} from '../../src/utils/cinemaGrouping.js'

describe('cinema grouping', () => {
  it('groups repeated film screenings while preserving chronological showtimes', () => {
    const groups = groupScreeningsByFilm([
      { id: 'late', title: 'Same Film', date: '2026-07-17', time: '9:00 pm' },
      { id: 'other', title: 'Other Film', date: '2026-07-17', time: '7:00 pm' },
      { id: 'early', title: 'Same Film', date: '2026-07-17', time: '6:00 pm' },
    ])

    expect(groups.map(group => group.title)).toEqual(['Same Film', 'Other Film'])
    expect(groups[0].screenings.map(screening => screening.id)).toEqual(['early', 'late'])
  })

  it('treats 5 PM and later as evening', () => {
    expect(isEveningScreening({ time: '4:59 pm' })).toBe(false)
    expect(isEveningScreening({ time: '5:00 pm' })).toBe(true)
    expect(isEveningScreening({ time: '11:30 pm' })).toBe(true)
  })
})
