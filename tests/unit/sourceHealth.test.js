import { describe, expect, it } from 'vitest'
import {
  assertMinimumSuccessfulSources,
  summarizeSourceStatuses,
} from '../../scripts/lib/source-health.js'

describe('restaurant source health', () => {
  const statuses = [
    { name: 'Source A', status: 'ok', count: 12 },
    { name: 'Source B', status: 'error', count: 0, error: 'blocked' },
  ]

  it('returns successful sources when the write gate passes', () => {
    expect(assertMinimumSuccessfulSources(statuses, 1)).toEqual([statuses[0]])
  })

  it('prevents stale data from receiving a fresh timestamp when sources fail', () => {
    expect(() => assertMinimumSuccessfulSources(statuses, 2))
      .toThrow(/Existing data was preserved/)
  })

  it('summarizes source failures for operators', () => {
    expect(summarizeSourceStatuses(statuses))
      .toBe('Source A: ok; Source B: error (blocked)')
  })
})
