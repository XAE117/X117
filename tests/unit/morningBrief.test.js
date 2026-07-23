import { describe, expect, it } from 'vitest'
import {
  buildCoachBrief,
  calculateAstrology,
  rankProjects,
  summarizeToggl,
} from '../../api/lib/morning-brief.js'

function property(type, value) {
  if (type === 'title') {
    return { type, title: [{ plain_text: value }] }
  }
  if (type === 'rich_text') {
    return { type, rich_text: [{ plain_text: value }] }
  }
  if (type === 'status') {
    return { type, status: { name: value } }
  }
  return { type, [type]: value }
}

describe('Morning Console briefing', () => {
  it('ranks active, finishable money-gravity work ahead of infrastructure', () => {
    const now = new Date('2026-07-23T16:00:00.000Z')
    const pages = [
      {
        id: 'life-os',
        last_edited_time: '2026-07-23T12:00:00.000Z',
        properties: {
          Name: property('title', 'LifeOS maintenance'),
          Status: property('status', 'Active'),
          Progress: property('number', 0.9),
          'Next Action': property('rich_text', 'Tune one more dashboard'),
        },
      },
      {
        id: 'reel',
        last_edited_time: '2026-07-22T12:00:00.000Z',
        properties: {
          Name: property('title', 'Editing Reel'),
          Status: property('status', 'Active'),
          Progress: property('number', 0.72),
          'Next Action': property('rich_text', 'Export the first 30-second proof'),
        },
      },
      {
        id: 'done',
        last_edited_time: '2026-07-23T12:00:00.000Z',
        properties: {
          Name: property('title', 'Finished project'),
          Status: property('status', 'Complete'),
        },
      },
    ]

    const ranked = rankProjects(pages, now)
    expect(ranked.map((project) => project.id)).toEqual(['reel', 'life-os'])
    expect(ranked[0].nextAction).toBe('Export the first 30-second proof')
  })

  it('summarizes only completed Toggl entries in the seven-day window', () => {
    const now = new Date('2026-07-23T16:00:00.000Z')
    const entries = [
      {
        start: '2026-07-22T16:00:00.000Z',
        stop: '2026-07-22T17:00:00.000Z',
        duration: 3600,
        project_id: 1,
      },
      {
        start: '2026-07-10T16:00:00.000Z',
        stop: '2026-07-10T17:00:00.000Z',
        duration: 3600,
        project_id: 1,
      },
      {
        start: '2026-07-23T15:00:00.000Z',
        stop: null,
        duration: -1,
        description: 'Current work',
        project_id: 2,
      },
      {
        start: '2026-07-21T08:00:00.000Z',
        stop: '2026-07-21T16:00:00.000Z',
        duration: 28_800,
        project_id: 3,
      },
    ]
    const summary = summarizeToggl(entries, [
      { id: 1, name: 'Editing Reel' },
      { id: 2, name: 'Morning Console' },
      { id: 3, name: 'SLEEP' },
    ], now)

    expect(summary.totalSeconds).toBe(3600)
    expect(summary.sessions).toBe(1)
    expect(summary.restSeconds).toBe(28_800)
    expect(summary.topProjects[0]).toMatchObject({ name: 'Editing Reel', seconds: 3600 })
    expect(summary.running).toMatchObject({ description: 'Current work', project: 'Morning Console' })
  })

  it('keeps physiological capacity separate from cognitive activation', () => {
    const coach = buildCoachBrief({
      projects: [{
        name: 'Editing Reel',
        nextAction: 'Export one proof',
      }],
      toggl: null,
      body: {
        cognitiveActivation: 8,
        physiologicalCapacity: 2,
      },
      astrology: null,
    })

    expect(coach.opening).toContain('physical capacity')
    expect(coach.pacing).toContain('One project')
  })

  it('returns calculated sky facts and labeled symbolic interpretation', () => {
    const reading = calculateAstrology(new Date('2026-07-23T16:00:00.000Z'))

    expect(reading.sky.moonSign).toBeTruthy()
    expect(reading.sky.sunSign).toBe('Leo')
    expect(reading.method).toContain('calculated')
    expect(reading.interpretation.direction).toBeTruthy()
    expect(reading.strongestAspects.length).toBeLessThanOrEqual(5)
  })
})
