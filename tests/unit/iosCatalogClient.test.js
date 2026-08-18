import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  CatalogValidationError,
  loadRemoteCatalog,
  validateRemoteCatalog,
} from '../../src/ios/catalog.js'

function readCatalogFixture() {
  const read = (name) => JSON.parse(readFileSync(
    new URL(`../../public/catalog/v1/${name}.json`, import.meta.url),
    'utf8',
  ))
  return {
    index: read('index'),
    feeds: {
      cinema: read('cinema'),
      jazz: read('jazz'),
      food: read('food'),
    },
  }
}

describe('iOS remote catalog client', () => {
  it('accepts the checked-in rights-gated catalog', async () => {
    const { index, feeds } = readCatalogFixture()
    const errors = await validateRemoteCatalog({
      index,
      feeds,
      now: new Date(index.generatedAt),
    })

    expect(errors).toEqual([])
  })

  it('loads only versioned catalog paths and verifies all payloads', async () => {
    const fixture = readCatalogFixture()
    const calls = []
    const fetchImpl = async (url) => {
      const path = new URL(url).pathname
      calls.push(path)
      const name = path.split('/').pop().replace('.json', '')
      const payload = name === 'index' ? fixture.index : fixture.feeds[name]
      return new Response(JSON.stringify(payload), { status: 200 })
    }

    const catalog = await loadRemoteCatalog({
      baseUrl: 'https://catalog.example.test/',
      fetchImpl,
      now: new Date(fixture.index.generatedAt),
    })

    expect(catalog.feeds.cinema.data.theaters.length).toBeGreaterThan(0)
    expect(calls).toEqual([
      '/catalog/v1/index.json',
      '/catalog/v1/cinema.json',
      '/catalog/v1/jazz.json',
      '/catalog/v1/food.json',
    ])
  })

  it('rejects a payload that attempts to relabel a record as a pending provider', async () => {
    const { index, feeds } = readCatalogFixture()
    feeds.cinema.data.theaters[0].provider = 'jazz-venues'

    const errors = await validateRemoteCatalog({
      index,
      feeds,
      now: new Date(index.generatedAt),
    })

    expect(errors.join('\n')).toContain('non-approved provider')
  })

  it('fails closed when the index exposes an unsafe feed path', async () => {
    const fixture = readCatalogFixture()
    fixture.index.feeds.find(feed => feed.id === 'food').path = 'restaurants.json'
    const fetchImpl = async (url) => {
      const path = new URL(url).pathname
      const name = path.split('/').pop().replace('.json', '')
      const payload = name === 'index' ? fixture.index : fixture.feeds[name]
      return new Response(JSON.stringify(payload), { status: 200 })
    }

    await expect(loadRemoteCatalog({
      baseUrl: 'https://catalog.example.test/',
      fetchImpl,
      now: new Date(fixture.index.generatedAt),
    })).rejects.toBeInstanceOf(CatalogValidationError)
  })
})
