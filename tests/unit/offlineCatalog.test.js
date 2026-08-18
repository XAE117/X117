import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  clearOfflineCatalogSnapshot,
  loadOfflineCatalogSnapshot,
  saveOfflineCatalogSnapshot,
} from '../../src/ios/offlineCatalog.js'

function fixtureCatalog() {
  const read = name => JSON.parse(readFileSync(
    new URL(`../../public/catalog/v1/${name}.json`, import.meta.url),
    'utf8',
  ))
  const index = read('index')
  return {
    index,
    feeds: {
      cinema: read('cinema'),
      jazz: read('jazz'),
      food: read('food'),
    },
    source: 'https://catalog.example.test/',
    verifiedAt: index.generatedAt,
  }
}

describe('iOS offline catalog snapshots', () => {
  it('stores and revalidates a verified catalog before using it offline', async () => {
    let snapshot = null
    const adapter = {
      readJson: async () => snapshot,
      writeJson: async (_key, payload) => { snapshot = payload },
      removePreference: async () => { snapshot = null },
    }
    const catalog = fixtureCatalog()
    const now = new Date(catalog.index.generatedAt)

    await saveOfflineCatalogSnapshot(catalog, { adapter, now })
    const loaded = await loadOfflineCatalogSnapshot({ adapter, now })

    expect(loaded.source).toBe('offline-snapshot')
    expect(loaded.feeds.cinema.data.theaters.length).toBeGreaterThan(0)
  })

  it('removes an expired AMC snapshot instead of returning stale offline data', async () => {
    let removed = false
    const catalog = fixtureCatalog()
    const adapter = {
      readJson: async () => ({ schemaVersion: 1, savedAt: catalog.index.generatedAt, catalog }),
      removePreference: async () => { removed = true },
    }

    const expired = await loadOfflineCatalogSnapshot({
      adapter,
      now: new Date(new Date(catalog.feeds.cinema.expiresAt).getTime() + 1),
    })

    expect(expired).toBeNull()
    expect(removed).toBe(true)
  })

  it('offers an explicit on-device catalog erase path', async () => {
    const removed = []
    const adapter = {
      removePreference: async key => { removed.push(key) },
    }

    await clearOfflineCatalogSnapshot({ adapter })

    expect(removed).toEqual(['sixpm.catalog-snapshot.v1'])
  })
})
