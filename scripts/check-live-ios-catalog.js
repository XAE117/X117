#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateIosCatalogBundle } from './lib/ios-catalog.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_BASE_URL = 'https://sixpm.vercel.app/'
const baseUrl = normalizeBaseUrl(process.env.IOS_CATALOG_BASE || process.argv[2] || DEFAULT_BASE_URL)
const policy = JSON.parse(readFileSync(path.join(root, 'config/ios-provider-policy.json'), 'utf8'))
const feedIds = ['cinema', 'jazz', 'food']

function normalizeBaseUrl(value) {
  const parsed = new URL(value)
  if (parsed.protocol !== 'https:') {
    throw new Error('Live catalog verification requires an HTTPS base URL.')
  }
  return parsed.href.endsWith('/') ? parsed.href : `${parsed.href}/`
}

async function fetchCatalogJson(relativePath) {
  const url = new URL(relativePath, baseUrl)
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    redirect: 'follow',
  })

  if (response.redirected) {
    throw new Error(`${relativePath} redirected to ${response.url}; the public catalog must be directly reachable.`)
  }
  if (!response.ok) throw new Error(`${relativePath} returned HTTP ${response.status}`)

  const contentType = response.headers.get('content-type') || ''
  if (!/\b(?:application|text)\/(?:[a-z0-9.+-]*\+)?json\b/i.test(contentType)) {
    throw new Error(`${relativePath} returned ${contentType || 'no Content-Type'} instead of JSON.`)
  }
  if (response.headers.get('access-control-allow-origin') !== '*') {
    throw new Error(`${relativePath} is missing the required public CORS header.`)
  }

  try {
    return await response.json()
  } catch {
    throw new Error(`${relativePath} did not contain valid JSON.`)
  }
}

async function main() {
  const index = await fetchCatalogJson('catalog/v1/index.json')
  const feeds = Object.fromEntries(await Promise.all(feedIds.map(async id => [
    id,
    await fetchCatalogJson(`catalog/v1/${id}.json`),
  ])))
  const errors = validateIosCatalogBundle({ index, feeds, policy })

  if (errors.length > 0) {
    throw new Error(`Catalog validation failed: ${errors.join('; ')}`)
  }

  const cinema = feeds.cinema.data.theaters.reduce((total, theater) => total + theater.screenings.length, 0)
  console.log(`Live iOS catalog check passed (${cinema} AMC screenings; ${feeds.food.data.restaurants.length} editorial restaurants; source: ${baseUrl}).`)
}

main().catch(error => {
  console.error(`Live iOS catalog check failed: ${error.message}`)
  process.exit(1)
})
