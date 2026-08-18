import { validateRemoteCatalog } from './catalog.js'
import { SIXPM_STORAGE_KEYS, nativeAdapter } from './native/nativeAdapter.js'

export const OFFLINE_CATALOG_SNAPSHOT_VERSION = 1

function snapshotShape(snapshot) {
  return snapshot?.schemaVersion === OFFLINE_CATALOG_SNAPSHOT_VERSION &&
    snapshot?.catalog?.index &&
    snapshot?.catalog?.feeds
}

export async function saveOfflineCatalogSnapshot(catalog, {
  adapter = nativeAdapter,
  now = new Date(),
} = {}) {
  const errors = await validateRemoteCatalog({
    index: catalog?.index,
    feeds: catalog?.feeds,
    now,
  })
  if (errors.length > 0) throw new Error(`Refusing to cache an invalid catalog: ${errors.join('; ')}`)

  await adapter.writeJson(SIXPM_STORAGE_KEYS.catalogSnapshot, {
    schemaVersion: OFFLINE_CATALOG_SNAPSHOT_VERSION,
    savedAt: now.toISOString(),
    catalog: {
      index: catalog.index,
      feeds: catalog.feeds,
      source: catalog.source,
      verifiedAt: catalog.verifiedAt,
    },
  })
}

export async function loadOfflineCatalogSnapshot({
  adapter = nativeAdapter,
  now = new Date(),
} = {}) {
  const snapshot = await adapter.readJson(SIXPM_STORAGE_KEYS.catalogSnapshot, null)
  if (!snapshotShape(snapshot)) return null

  const errors = await validateRemoteCatalog({
    index: snapshot.catalog.index,
    feeds: snapshot.catalog.feeds,
    now,
  })
  if (errors.length > 0) {
    // Catalog expiry is a provider-rights boundary, not merely a cache miss.
    // Drop invalid or stale feed data instead of presenting it offline.
    await adapter.removePreference(SIXPM_STORAGE_KEYS.catalogSnapshot)
    return null
  }

  return {
    ...snapshot.catalog,
    source: 'offline-snapshot',
    verifiedAt: snapshot.savedAt,
  }
}

export async function clearOfflineCatalogSnapshot({ adapter = nativeAdapter } = {}) {
  await adapter.removePreference(SIXPM_STORAGE_KEYS.catalogSnapshot)
}
