#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildIosCatalogBundle } from './lib/ios-catalog.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = path.join(root, 'public')
const outputDir = path.join(publicDir, 'catalog', 'v1')
const checkOnly = process.argv.includes('--check')

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), 'utf8'))
}

function serialize(value) {
  return `${JSON.stringify(value, null, 2)}\n`
}

function expectedFiles(bundle) {
  return {
    'index.json': serialize(bundle.index),
    'cinema.json': serialize(bundle.feeds.cinema),
    'jazz.json': serialize(bundle.feeds.jazz),
    'food.json': serialize(bundle.feeds.food),
  }
}

function main() {
  const policy = readJson('config/ios-provider-policy.json')
  const theaterData = readJson('public/theaters.json')
  const foodData = readJson('public/restaurants.json')
  // A generated catalog must be byte-stable when source files are unchanged so
  // CI can detect an accidentally omitted rebuild. The cinema scrape timestamp
  // is the freshest approved source and changes whenever new AMC data arrives.
  const generatedAt = process.env.IOS_CATALOG_GENERATED_AT || theaterData.lastUpdated
  const bundle = buildIosCatalogBundle({ theaterData, foodData, policy, generatedAt })
  const files = expectedFiles(bundle)

  if (checkOnly) {
    const stale = Object.entries(files)
      .filter(([file, expected]) => !existsSync(path.join(outputDir, file)) || readFileSync(path.join(outputDir, file), 'utf8') !== expected)
      .map(([file]) => file)
    if (stale.length > 0) {
      throw new Error(`iOS catalog is stale or missing: ${stale.join(', ')}. Run npm run catalog:build.`)
    }
    console.log('iOS catalog is current.')
    return
  }

  mkdirSync(outputDir, { recursive: true })
  for (const [file, contents] of Object.entries(files)) {
    writeFileSync(path.join(outputDir, file), contents)
  }
  console.log(`Built iOS catalog v1: ${bundle.feeds.cinema.data.theaters.length} AMC theaters, ${bundle.feeds.food.data.restaurants.length} SIXPM editorial restaurants, 0 enabled jazz venues.`)
}

main()
