import { describe, expect, it } from 'vitest'
import {
  getMode,
  isFoodMode,
  isGuideMode,
  isJazzMode,
  isRollMode,
  isScreenshotRoute,
} from '../../src/utils/modeDetection.js'

describe('mode detection', () => {
  it.each([
    ['/', 'cinema'],
    ['/tonight', 'cinema'],
    ['/jazz', 'jazz'],
    ['/jazz/tonight', 'jazz'],
    ['/food', 'food'],
    ['/guide/tacos', 'guide'],
    ['/roll', 'roll'],
  ])('maps %s to %s', (pathname, mode) => {
    expect(getMode(pathname)).toBe(mode)
  })

  it('keeps guide routes in the food layout without losing guide identity', () => {
    expect(isGuideMode('/guide/pizza')).toBe(true)
    expect(isFoodMode('/guide/pizza')).toBe(true)
  })

  it('recognizes special route families', () => {
    expect(isJazzMode('/jazz/show/abc')).toBe(true)
    expect(isRollMode('/roll')).toBe(true)
    expect(isScreenshotRoute('/day/2026-07-17')).toBe(true)
    expect(isScreenshotRoute('/jazz/day/2026-07-17')).toBe(true)
  })
})
