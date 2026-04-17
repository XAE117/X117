#!/usr/bin/env node
/**
 * Fetches Rotten Tomatoes scores from OMDb for all films in theaters.json.
 * Writes rottenTomatoes (number) back into the films object.
 * Safe to re-run — skips films that already have RT data unless --force is passed.
 *
 * Run: node scripts/fetch-omdb.js
 * Force refresh: node scripts/fetch-omdb.js --force
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_PATH = join(__dirname, '..', 'public', 'theaters.json')

// Load API key from .env manually (avoid dotenv dependency)
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

const API_KEY = process.env.OMDB_API_KEY
if (!API_KEY) {
  console.error('OMDB_API_KEY not set in .env')
  process.exit(1)
}

const FORCE = process.argv.includes('--force')
const DELAY_MS = 200 // be polite to the free tier (1000 req/day)

function slugify(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

// Strip screening-specific suffixes to get the canonical film title for OMDB lookup
function cleanTitle(title) {
  return title
    .replace(/\s+on\s+35mm$/i, '')
    .replace(/\s+in\s+35mm$/i, '')
    .replace(/\s+\(35mm\)$/i, '')
    .replace(/\s+\(sold\s+out\)$/i, '')
    .replace(/\s+-\s+sold\s+out$/i, '')
    .replace(/\s+sold\s+out$/i, '')
    .trim()
}

async function fetchRT(title, year) {
  const params = new URLSearchParams({ t: title, apikey: API_KEY })
  if (year) params.set('y', year)
  const url = `http://www.omdbapi.com/?${params}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  if (json.Response === 'False') return null
  const rtRating = (json.Ratings || []).find(r => r.Source === 'Rotten Tomatoes')
  return {
    rt: rtRating ? parseInt(rtRating.Value) : null,
    imdbId: json.imdbID || null,
    imdbRating: json.imdbRating ? parseFloat(json.imdbRating) : null,
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Main
const data = JSON.parse(readFileSync(DATA_PATH, 'utf-8'))
const films = data.films || {}

// Build set of unique titles from current screenings
const uniqueTitles = new Map() // slug → { title, year }
data.theaters.forEach(theater => {
  theater.screenings.forEach(s => {
    const slug = slugify(s.title)
    if (!uniqueTitles.has(slug)) {
      const film = films[slug]
      uniqueTitles.set(slug, { title: cleanTitle(s.title), year: film?.year || null })
    }
  })
})

// Also process all films already in the DB (for future screenings)
for (const [slug, film] of Object.entries(films)) {
  if (!uniqueTitles.has(slug)) {
    const title = cleanTitle(film.title || slug.replace(/-/g, ' '))
    uniqueTitles.set(slug, { title, year: film.year || null })
  }
}

const toFetch = [...uniqueTitles.entries()].filter(([slug]) => {
  if (FORCE) return true
  const film = films[slug]
  return !film?.rottenTomatoes // skip if already has RT
})

console.log(`\nFetching RT scores for ${toFetch.length} films (${uniqueTitles.size} total, ${uniqueTitles.size - toFetch.length} already have RT)...\n`)

let fetched = 0, found = 0, notFound = 0, errors = 0

for (const [slug, { title, year }] of toFetch) {
  try {
    const result = await fetchRT(title, year)
    if (!result) {
      // Try without year if year lookup failed
      const retry = year ? await fetchRT(title, null) : null
      if (!retry) {
        notFound++
        process.stdout.write(`✗ ${title}\n`)
        await sleep(DELAY_MS)
        continue
      }
      Object.assign(result || {}, retry)
    }

    if (!films[slug]) films[slug] = {}
    if (result.rt !== null) {
      films[slug].rottenTomatoes = result.rt
      found++
      process.stdout.write(`✓ ${title}: RT ${result.rt}%\n`)
    } else {
      notFound++
      process.stdout.write(`~ ${title}: no RT score\n`)
    }
    if (result.imdbId && !films[slug].imdbId) films[slug].imdbId = result.imdbId

    fetched++
  } catch (err) {
    errors++
    process.stdout.write(`! ${title}: ${err.message}\n`)
  }

  await sleep(DELAY_MS)

  // Save every 25 films in case of interruption
  if (fetched % 25 === 0) {
    data.films = films
    writeFileSync(DATA_PATH, JSON.stringify(data, null, 2))
    console.log(`  [saved at ${fetched}]`)
  }
}

data.films = films
writeFileSync(DATA_PATH, JSON.stringify(data, null, 2))

console.log(`\n── Done ──`)
console.log(`  RT scores found: ${found}`)
console.log(`  No RT data:      ${notFound}`)
console.log(`  Errors:          ${errors}`)
console.log(`  Total films in DB: ${Object.keys(films).length}`)
