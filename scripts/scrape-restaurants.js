#!/usr/bin/env node

/**
 * Restaurant scraper orchestrator for Liza's Palace EATS mode.
 * Scrapes from multiple LA food media sources, deduplicates, scores by consensus,
 * classifies into tiers, and outputs public/restaurants.json.
 *
 * Run: node scripts/scrape-restaurants.js [--full | --hot]
 *   --full: Scrape all sources (default)
 *   --hot:  Scrape only hot sources (Eater Heatmap + Infatuation Hit List)
 *
 * Environment variables:
 *   GOOGLE_PLACES_API_KEY — For address/hours/rating enrichment
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { scrapeEaterHeatmap } from './sources/eater-heatmap.js'
import { scrapeEaterEssential } from './sources/eater-essential.js'
import { scrapeInfatuationHitList } from './sources/infatuation-hitlist.js'
import { scrapeResyHitList } from './sources/resy-hitlist.js'
import { scrapeLatimes101 } from './sources/latimes-101.js'
import { scrapeTimeoutLA } from './sources/timeout-la.js'
import { enrichRestaurants } from './enrichment/google-places.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH = join(__dirname, '..', 'public', 'restaurants.json')
const MANUAL_PATH = join(__dirname, '..', 'public', 'restaurants-manual.json')
const MICHELIN_PATH = join(__dirname, '..', 'public', 'michelin-seed.json')
const ALIASES_PATH = join(__dirname, '..', 'public', 'restaurant-aliases.json')
const LOG_PATH = join(__dirname, '..', 'public', 'scrape-log.json')

// ── Source weights for heat scoring ──
const SOURCE_WEIGHTS = {
  'Eater Heatmap': 3,
  'The Infatuation Hit List': 3,
  'Resy Hit List': 2,
  'Michelin': 2,
  'Michelin 1 Star': 2,
  'Michelin 2 Stars': 3,
  'Michelin 3 Stars': 3,
  'Michelin Bib Gourmand': 2,
  'Eater Essential 38': 2,
  'Time Out Top 40': 1,
  'LA Times 101': 2,
  'LA Magazine': 1,
  'The Infatuation': 1,
  'Google': 1,
}

// ── Name normalization for deduplication ──
// Per spec:
//  1. Lowercase
//  2. Strip leading "The " and common cuisine prefixes
//  3. Strip trailing cuisine/type words
//  4. Remove non-alphanumeric except spaces
//  5. Collapse multiple spaces
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/^(the\s+|sushi\s+|osteria\s+|trattoria\s+|brasserie\s+|cafe\s+|ristorante\s+)/i, '')
    .replace(/\s+(restaurant|kitchen|bar|bistro|cafe|omakase|grill|house)\s*$/i, '')
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// ── Levenshtein distance for fuzzy name matching ──
function levenshtein(a, b) {
  const m = a.length
  const n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1]
      else dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1])
    }
  }
  return dp[m][n]
}

// ── Load alias map from restaurant-aliases.json ──
// Returns: { variantNorm -> canonicalNorm }
function loadAliasMap() {
  try {
    const { aliases = [], distinct = [] } = JSON.parse(readFileSync(ALIASES_PATH, 'utf8'))
    const map = new Map()
    for (const entry of aliases) {
      const canonNorm = normalizeName(entry.canonical)
      for (const variant of entry.variants) {
        map.set(normalizeName(variant), canonNorm)
      }
    }
    // distinct entries are treated as independent — no extra mapping needed,
    // they'll naturally separate because their normalized names differ
    void distinct
    return map
  } catch {
    return new Map()
  }
}

function slugify(name, neighborhood) {
  return (name + '-' + neighborhood)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// ── Tier classification ──
function classifyTier(restaurant) {
  if (restaurant.pricePp && restaurant.pricePp <= 20) return 'street'
  if (restaurant.pricePp && restaurant.pricePp <= 120) return 'feast'
  if (restaurant.pricePp && restaurant.pricePp > 120) return 'whale'

  const tags = restaurant.tags || []
  if (tags.includes('tasting-menu') || tags.includes('omakase')) return 'whale'
  if (tags.includes('pop-up') || tags.includes('food-stall') || tags.includes('truck')) return 'street'

  return 'feast'
}

// ── Heat score calculation ──
function calculateHeatScore(sources) {
  let score = 0
  for (const source of sources) {
    for (const [key, weight] of Object.entries(SOURCE_WEIGHTS)) {
      if (source.name.includes(key) || key.includes(source.name)) {
        score += weight
        break
      }
    }
    if (source.rating && source.rating >= 9.0) score += 1
  }
  return score
}

// ── Deduplication: merge restaurants from multiple sources ──
// Uses:
//  1. Exact normalized name match
//  2. Alias map lookup
//  3. Levenshtein distance ≤ 3 with same neighborhood (fuzzy match)
function deduplicateRestaurants(allRestaurants, aliasMap) {
  // Map from merge key -> restaurant
  const merged = new Map()
  // Track normalized keys of merged entries for Levenshtein lookup
  const normKeys = []

  for (const r of allRestaurants) {
    const rawNorm = normalizeName(r.name)
    // Resolve via alias map (e.g. "kaneyoshi" -> "sushi kaneyoshi")
    const norm = aliasMap.get(rawNorm) ?? rawNorm

    if (merged.has(norm)) {
      // Exact or alias match — merge into existing entry
      mergeInto(merged.get(norm), r)
    } else {
      // Fuzzy match: find existing entry within Levenshtein distance ≤ 3
      // that also shares the same neighborhood (or one of them has no neighborhood)
      let fuzzyKey = null
      for (const existingNorm of normKeys) {
        if (levenshtein(norm, existingNorm) <= 3) {
          const existing = merged.get(existingNorm)
          const sameHood =
            !r.neighborhood ||
            !existing.neighborhood ||
            r.neighborhood.toLowerCase() === existing.neighborhood.toLowerCase()
          if (sameHood) {
            fuzzyKey = existingNorm
            break
          }
        }
      }

      if (fuzzyKey) {
        mergeInto(merged.get(fuzzyKey), r)
      } else {
        // New unique entry
        merged.set(norm, { ...r })
        normKeys.push(norm)
      }
    }
  }

  return Array.from(merged.values())
}

function mergeInto(existing, incoming) {
  // Merge sources (deduplicate by source name)
  const existingSourceNames = new Set(existing.sources.map(s => s.name))
  for (const source of incoming.sources || []) {
    if (!existingSourceNames.has(source.name)) {
      existing.sources.push(source)
    }
  }
  // Take richer data from incoming if existing is empty
  if (!existing.description && incoming.description) existing.description = incoming.description
  if (!existing.address && incoming.address) existing.address = incoming.address
  if (!existing.reservationUrl && incoming.reservationUrl) existing.reservationUrl = incoming.reservationUrl
  if (!existing.pricePp && incoming.pricePp) existing.pricePp = incoming.pricePp
  if (!existing.priceRange && incoming.priceRange) existing.priceRange = incoming.priceRange
  if (!existing.michelinStatus && incoming.michelinStatus) existing.michelinStatus = incoming.michelinStatus
  if (!existing.googlePlaceId && incoming.googlePlaceId) existing.googlePlaceId = incoming.googlePlaceId
}

// ── Main orchestrator ──
async function main() {
  const isHotOnly = process.argv.includes('--hot')
  console.log(`\n  Scraping restaurants (${isHotOnly ? 'hot sources only' : 'full scrape'})...\n`)

  // Load existing data
  let existing = { restaurants: [], newThisMonth: [] }
  try {
    existing = JSON.parse(readFileSync(OUTPUT_PATH, 'utf8'))
    console.log(`  Loaded ${existing.restaurants.length} existing restaurants`)
  } catch {
    console.log('  No existing restaurants.json found, starting fresh')
  }

  // Load manual additions
  let manualRestaurants = []
  try {
    const manual = JSON.parse(readFileSync(MANUAL_PATH, 'utf8'))
    manualRestaurants = manual.restaurants || []
    console.log(`  Loaded ${manualRestaurants.length} manual restaurants`)
  } catch {
    console.log('  No restaurants-manual.json found')
  }

  // Load alias map for deduplication
  const aliasMap = loadAliasMap()

  // ── Define sources with error isolation ──
  // Each source fails independently — one broken source never blocks the others.
  const hotSources = [
    { name: 'Eater Heatmap', fn: scrapeEaterHeatmap },
    { name: 'Infatuation Hit List', fn: scrapeInfatuationHitList },
  ]
  const fullSources = [
    { name: 'Eater Essential 38', fn: scrapeEaterEssential },
    { name: 'Resy Hit List', fn: scrapeResyHitList },
    { name: 'LA Times 101', fn: scrapeLatimes101 },
    { name: 'Time Out LA', fn: scrapeTimeoutLA },
  ]

  const activeSources = isHotOnly ? hotSources : [...hotSources, ...fullSources]
  const scraped = []
  const sourceResults = []

  for (const source of activeSources) {
    try {
      const restaurants = await source.fn()
      scraped.push(...restaurants)
      sourceResults.push({ source: source.name, count: restaurants.length, error: null })
      console.log(`  ✓ ${source.name}: ${restaurants.length} restaurants`)
    } catch (err) {
      sourceResults.push({ source: source.name, count: 0, error: err.message })
      console.error(`  ✗ ${source.name}: ${err.message}`)
    }
  }

  // ── Load Michelin seed data and merge as source ──
  try {
    const michelin = JSON.parse(readFileSync(MICHELIN_PATH, 'utf8'))
    const michelinEntries = []
    for (const s of michelin.starred || []) {
      michelinEntries.push({
        name: s.name,
        neighborhood: s.neighborhood,
        cuisine: s.cuisine,
        pricePp: s.pricePp,
        michelinStatus: s.stars === 3 ? 'three-star' : s.stars === 2 ? 'two-star' : 'one-star',
        sources: [{ name: `Michelin ${s.stars} Star${s.stars > 1 ? 's' : ''}`, url: 'https://guide.michelin.com/us/en/california/los-angeles/restaurants' }],
        tags: ['reservations-required', 'tasting-menu'],
      })
    }
    for (const b of michelin.bibGourmand || []) {
      michelinEntries.push({
        name: b.name,
        neighborhood: b.neighborhood,
        cuisine: b.cuisine,
        pricePp: b.pricePp,
        michelinStatus: 'bib-gourmand',
        sources: [{ name: 'Michelin Bib Gourmand', url: 'https://guide.michelin.com/us/en/california/los-angeles/restaurants' }],
        tags: ['bib-gourmand'],
      })
    }
    scraped.push(...michelinEntries)
    console.log(`  Merged ${michelinEntries.length} Michelin seed entries`)
  } catch {
    console.log('  No michelin-seed.json found')
  }

  // ── Merge: existing + scraped + manual ──
  const totalBefore = existing.restaurants.length + scraped.length + manualRestaurants.length
  console.log(`\n  Deduplicating ${totalBefore} total entries...`)
  const allRestaurants = [...existing.restaurants, ...scraped, ...manualRestaurants]
  const deduplicated = deduplicateRestaurants(allRestaurants, aliasMap)
  console.log(`    → ${deduplicated.length} unique restaurants after dedup`)

  // ── Classify tiers and calculate heat scores ──
  for (const r of deduplicated) {
    r.tier = r.tier || classifyTier(r)
    r.sourceCount = r.sources?.length || 0
    r.heatScore = calculateHeatScore(r.sources || [])
    r.id = r.id || slugify(r.name, r.neighborhood)
  }

  // ── Google Places enrichment pass ──
  // Runs after dedup so we only enrich unique restaurants.
  // Only targets entries missing address or coordinates.
  // googlePlaceId is preserved in JSON so subsequent runs skip Text Search.
  await enrichRestaurants(deduplicated)

  // ── Scrape diff: detect added/removed, preserve addedDate ──
  const previousIds = new Set(existing.restaurants.map(r => r.id))
  const currentIds = new Set(deduplicated.map(r => r.id))
  const added = deduplicated.filter(r => !previousIds.has(r.id))
  const removed = [...previousIds].filter(id => !currentIds.has(id))

  const today = new Date().toISOString().split('T')[0]
  for (const r of added) {
    if (!r.addedDate) r.addedDate = today
  }
  for (const r of deduplicated) {
    const prev = existing.restaurants.find(p => p.id === r.id)
    if (prev?.addedDate && !r.addedDate) r.addedDate = prev.addedDate
  }

  // ── Determine "new this month" ──
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const newThisMonth = deduplicated
    .filter(r => r.isNew || (r.addedDate && new Date(r.addedDate) >= thirtyDaysAgo))
    .map(r => r.id)

  // ── Tier stats ──
  const tiers = { street: 0, feast: 0, whale: 0 }
  for (const r of deduplicated) {
    if (tiers[r.tier] !== undefined) tiers[r.tier]++
  }
  console.log(`\n  Tiers: ${tiers.street} street, ${tiers.feast} feast, ${tiers.whale} whale`)
  console.log(`  New this month: ${newThisMonth.length}`)
  if (added.length > 0) console.log(`  Added: ${added.map(r => r.name).join(', ')}`)
  if (removed.length > 0) console.log(`  Removed: ${removed.join(', ')}`)

  // ── Write scrape log ──
  const log = {
    timestamp: new Date().toISOString(),
    mode: isHotOnly ? 'hot' : 'full',
    sources: sourceResults,
    totalRestaurants: deduplicated.length,
    added: added.map(r => r.name),
    removed,
    tiers,
  }
  writeFileSync(LOG_PATH, JSON.stringify(log, null, 2))

  // ── Write output ──
  const output = {
    lastUpdated: new Date().toISOString(),
    lastFullScrape: isHotOnly ? existing.lastFullScrape : new Date().toISOString(),
    newThisMonth,
    restaurants: deduplicated,
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2))
  console.log(`\n  ✓ Wrote ${deduplicated.length} restaurants to ${OUTPUT_PATH}\n`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
