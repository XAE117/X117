import { describe, expect, it } from 'vitest'
import { groupScreeningsByTitle, tonightOrNextScreenings } from '../../src/ios/format.js'

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
    const result = tonightOrNextScreenings(cinemaFeed, new Date('2026-08-18T06:00:00'))

    expect(result.map(item => item.id)).toEqual(['tonight'])
  })

  it('falls forward to the next available evening instead of presenting a daytime matinee', () => {
    const result = tonightOrNextScreenings(cinemaFeed, new Date('2026-08-18T22:00:00'))

    expect(result.map(item => item.id)).toEqual(['tomorrow-evening'])
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
