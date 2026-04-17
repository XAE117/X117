#!/usr/bin/env node
/**
 * Geocodes all restaurants in restaurants.json using Google Places Text Search API.
 * Writes lat/lng back into each restaurant object.
 * Safe to re-run — skips restaurants that already have coords unless --force.
 *
 * Run:         node scripts/geocode-restaurants.js
 * Force all:   node scripts/geocode-restaurants.js --force
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_PATH = join(__dirname, '..', 'public', 'restaurants.json')

function loadEnv() {
  try {
    const env = readFileSync(join(__dirname, '..', '.env'), 'utf-8')
    for (const line of env.split('\n')) {
      const [key, ...rest] = line.split('=')
      if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
    }
  } catch {}
}
loadEnv()

const API_KEY = process.env.GOOGLE_PLACES_API_KEY
if (!API_KEY) {
  console.error('GOOGLE_PLACES_API_KEY not set in .env')
  process.exit(1)
}

const FORCE = process.argv.includes('--force')
const DELAY_MS = 150

async function geocode(name, neighborhood) {
  // Try progressively broader queries until we get a result
  const queries = [
    `${name} ${neighborhood} Los Angeles`,
    `${name} Los Angeles CA`,
    `${name} restaurant Los Angeles`,
  ]

  for (const q of queries) {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q)}&key=${API_KEY}`
    const res = await fetch(url)
    const json = await res.json()
    if (json.status === 'OK' && json.results?.[0]) {
      const loc = json.results[0].geometry.location
      return { lat: loc.lat, lng: loc.lng, resolvedAddress: json.results[0].formatted_address }
    }
    if (json.status === 'REQUEST_DENIED') {
      console.error(`\nAPI key denied for Places Text Search: ${json.error_message}`)
      process.exit(1)
    }
    await sleep(50)
  }
  return null
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

const data = JSON.parse(readFileSync(DATA_PATH, 'utf-8'))
const restaurants = data.restaurants || []

const toGeocode = restaurants.filter(r => FORCE || !r.lat || !r.lng)
console.log(`\nGeocoding ${toGeocode.length} restaurants (${restaurants.length - toGeocode.length} already have coords)...\n`)

let found = 0, failed = 0

for (let i = 0; i < restaurants.length; i++) {
  const r = restaurants[i]
  if (!FORCE && r.lat && r.lng) continue

  const result = await geocode(r.name, r.neighborhood || '')
  if (result) {
    r.lat = parseFloat(result.lat.toFixed(6))
    r.lng = parseFloat(result.lng.toFixed(6))
    found++
    console.log(`✓ ${r.name} (${r.neighborhood || 'LA'}) → ${r.lat}, ${r.lng}`)
  } else {
    failed++
    console.log(`✗ ${r.name} — not found`)
  }

  await sleep(DELAY_MS)

  // Save every 20 to avoid losing progress
  if (found % 20 === 0 && found > 0) {
    data.restaurants = restaurants
    writeFileSync(DATA_PATH, JSON.stringify(data, null, 2))
    console.log(`  [checkpoint saved at ${found}]`)
  }
}

data.restaurants = restaurants
writeFileSync(DATA_PATH, JSON.stringify(data, null, 2))

console.log(`\n── Done ──`)
console.log(`  Geocoded: ${found}`)
console.log(`  Failed:   ${failed}`)
console.log(`  Total with coords: ${restaurants.filter(r => r.lat && r.lng).length} / ${restaurants.length}`)
