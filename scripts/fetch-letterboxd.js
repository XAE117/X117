#!/usr/bin/env node
/**
 * Fetches Letterboxd ratings for all films in theaters.json.
 * Writes letterboxd (number 0-5) back into the films object.
 * Safe to re-run — skips films that already have data unless --force.
 *
 * Run:          node scripts/fetch-letterboxd.js
 * Force all:    node scripts/fetch-letterboxd.js --force
 * Dry run:      node scripts/fetch-letterboxd.js --dry-run
 * Single film:  node scripts/fetch-letterboxd.js --slug reservoir-dogs
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_PATH = join(__dirname, '..', 'public', 'theaters.json')

const FORCE    = process.argv.includes('--force')
const DRY_RUN  = process.argv.includes('--dry-run')
const SLUG_ARG = process.argv.includes('--slug') ? process.argv[process.argv.indexOf('--slug') + 1] : null
const DELAY_MS = 500

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// Letterboxd URL slug: remove apostrophes so "bueller's" → "buellers"
function slugify(title) {
  return title.toLowerCase()
    .replace(/[\u0027\u2018\u2019\u02BC\u0060]/g, '')   // strip all apostrophe variants
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// App DB slug: matches how the app/fetch-omdb slugifies (apostrophe → hyphen)
// "Ferris Bueller's" → "ferris-bueller-s"
function appSlugify(title) {
  return title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function cleanTitle(title) {
  return title
    // Screening format suffixes
    .replace(/\s+on\s+35mm$/i, '')
    .replace(/\s+in\s+35mm$/i, '')
    .replace(/\s+\(35mm\)$/i, '')
    .replace(/\s+\(sold\s+out\)$/i, '')
    .replace(/\s+-\s+sold\s+out$/i, '')
    .replace(/\s+sold\s+out$/i, '')
    // 4K / restoration suffixes
    .replace(/\s+in\s+4k$/i, '')
    .replace(/\s+in\s+2k$/i, '')
    .replace(/\s+\(4k(\s+restoration)?\)$/i, '')
    .replace(/\s+4k\s+restoration$/i, '')
    // Subtitled / dubbed
    .replace(/\s+\((subtitled|dubbed|english\s+subtitles?)\)$/i, '')
    // Trailing year in parens: "Title (1986)"
    .replace(/\s+\(\d{4}\)$/i, '')
    // Parenthetical native-language title: "Title (Native Title)"
    .replace(/\s+\([^)]{4,}\)$/i, '')
    .trim()
}

// For double-bill slugs ("Film A / Film B"), extract just the first title
function extractFirstTitle(title) {
  const parts = title.split(/\s*[\/+]\s*/)
  return parts[0].trim()
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchLetterboxdPage(slug) {
  const url = `https://letterboxd.com/film/${slug}/`
  const res = await fetch(url, {
    headers: { 'User-Agent': UA },
    redirect: 'follow',
    signal: AbortSignal.timeout(10000)
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const html = await res.text()
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
  if (!match) return null

  // Strip CDATA wrapper that Letterboxd wraps JSON-LD in
  const content = match[1]
    .replace(/\/\*\s*<!\[CDATA\[\s*\*\//g, '')
    .replace(/\/\*\s*\]\]>\s*\*\//g, '')
    .trim()

  let json
  try {
    json = JSON.parse(content)
  } catch {
    return null
  }

  if (json['@type'] !== 'Movie') return null

  const rating = json.aggregateRating?.ratingValue
  if (rating == null) return null

  // Year lives in releasedEvent, NOT dateCreated (which is Letterboxd's own creation date)
  const pageYear = parseInt(json.releasedEvent?.[0]?.startDate) || null

  return {
    rating: parseFloat(rating),
    pageYear,
    name: json.name,
  }
}

async function findLetterboxd(title, year) {
  const cleaned = cleanTitle(title)
  const slug = slugify(cleaned)

  // Candidate slugs to try in order:
  // 1. Plain slug
  // 2. Slug + year (some Letterboxd disambiguation pages)
  // 3. If it's a double-bill ("A / B"), try just the first title
  const candidates = [slug]
  if (year) candidates.push(`${slug}-${year}`)

  const first = extractFirstTitle(cleaned)
  if (first !== cleaned) {
    const firstSlug = slugify(first)
    candidates.push(firstSlug)
    if (year) candidates.push(`${firstSlug}-${year}`)
  }

  for (const candidate of candidates) {
    let result
    try {
      result = await fetchLetterboxdPage(candidate)
    } catch (err) {
      throw new Error(`Fetch error on ${candidate}: ${err.message}`)
    }
    if (!result) continue

    // Loose year check — Letterboxd year should match ±2 (festival vs wide release)
    if (year && result.pageYear && Math.abs(result.pageYear - year) > 2) {
      continue
    }

    return { rating: result.rating, slug: candidate }
  }

  return null
}

// ── Main ─────────────────────────────────────────────────────────────────────

const data  = JSON.parse(readFileSync(DATA_PATH, 'utf-8'))
const films = data.films || {}

// Build title map: slug → { title, year }
const titleMap = new Map()

// Pre-pass: map appSlugify(cleanTitle) → canonical clean title + year from screenings
// This lets step 2 find the proper title for DB-only slugs (e.g. ferris-bueller-s-day-off)
const screeningByCleanSlug = new Map()
data.theaters.forEach(theater => {
  theater.screenings.forEach(s => {
    const cleaned = cleanTitle(s.title)
    const slug = appSlugify(cleaned)
    if (!screeningByCleanSlug.has(slug)) {
      screeningByCleanSlug.set(slug, { title: cleaned, year: films[slug]?.year || null })
    }
  })
})

// 1. Scan screening data for canonical titles (raw title → DB slug match)
data.theaters.forEach(theater => {
  theater.screenings.forEach(s => {
    const slug = appSlugify(s.title)
    if (!titleMap.has(slug)) {
      titleMap.set(slug, { title: cleanTitle(s.title), year: films[slug]?.year || null })
    }
  })
})

// 2. Also include films already in DB but maybe not currently screening
for (const [slug, film] of Object.entries(films)) {
  if (!titleMap.has(slug)) {
    // Try to find the screening title that maps to this slug after cleaning
    const fromScreening = screeningByCleanSlug.get(slug)
    const title = fromScreening?.title
      || film.title
      || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    titleMap.set(slug, { title, year: film.year || fromScreening?.year || null })
  }
}

// Apply --slug filter if provided
const toProcess = [...titleMap.entries()].filter(([slug]) => {
  if (SLUG_ARG) return slug === SLUG_ARG
  if (FORCE) return true
  return films[slug]?.letterboxd == null
})

console.log(`\nLetterboxd fetch: ${toProcess.length} films to process (${titleMap.size} total, ${titleMap.size - toProcess.length} already have data)`)
if (DRY_RUN) console.log('DRY RUN — no writes\n')
console.log()

let found = 0, notFound = 0, errors = 0, saved = 0

for (const [slug, { title, year }] of toProcess) {
  try {
    const result = await findLetterboxd(title, year)

    if (!result) {
      notFound++
      process.stdout.write(`✗ ${title}${year ? ` (${year})` : ''}\n`)
    } else {
      found++
      process.stdout.write(`✓ ${title}: ${result.rating} ★  [${result.slug}]\n`)
      if (!DRY_RUN) {
        // Only write to existing film entries — never create ghost entries
        // from screening-format slugs (e.g. "rocco-and-his-brothers-in-4k")
        if (films[slug]) {
          films[slug].letterboxd = result.rating
        }
      }
    }
  } catch (err) {
    errors++
    process.stdout.write(`! ${title}: ${err.message}\n`)
  }

  await sleep(DELAY_MS)

  // Save every 25 films
  saved++
  if (!DRY_RUN && saved % 25 === 0) {
    data.films = films
    writeFileSync(DATA_PATH, JSON.stringify(data, null, 2))
    console.log(`  [checkpoint: saved at ${saved}]`)
  }
}

if (!DRY_RUN) {
  data.films = films
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2))
}

console.log(`\n── Done ──────────────────────────────────`)
console.log(`  Found:        ${found}`)
console.log(`  Not found:    ${notFound}`)
console.log(`  Errors:       ${errors}`)
console.log(`  Total in DB:  ${Object.keys(films).length}`)
console.log(`  With LB now:  ${Object.values(films).filter(f => f.letterboxd != null).length}`)
