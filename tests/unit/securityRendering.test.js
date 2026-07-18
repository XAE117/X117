import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('scraped content rendering', () => {
  it('does not interpolate scraped map data into popup HTML', () => {
    const cinemaMap = read('../../src/views/MapView.jsx')
    const jazzMap = read('../../src/views/JazzMapView.jsx')

    expect(cinemaMap).not.toContain('const popupContent = `')
    expect(jazzMap).not.toContain('const popupContent = `')
    expect(cinemaMap).toContain("document.createElement('div')")
    expect(jazzMap).toContain("document.createElement('div')")
    expect(cinemaMap).toContain('.textContent =')
    expect(jazzMap).toContain('.textContent =')
  })

  it('does not use dangerouslySetInnerHTML for biography content', () => {
    const biography = read('../../src/views/JazzBioEssay.jsx')

    expect(biography).not.toContain('dangerouslySetInnerHTML')
  })
})
