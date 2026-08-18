#!/usr/bin/env node

/**
 * Restaurant scraper orchestrator for SIXPM Eats mode.
 * Scrapes from multiple LA food media sources, deduplicates, scores by consensus,
 * classifies into tiers, and outputs public/restaurants.json.
 *
 * Run: node scripts/scrape-restaurants.js [--full | --hot]
 *   --full: Scrape all sources (default)
 *   --hot:  Scrape only hot sources (Eater Heatmap + Infatuation Hit List)
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

import { scrapeEaterHeatmap } from './sources/eater-heatmap.js'
import { scrapeEaterEssential } from './sources/eater-essential.js'
import { scrapeInfatuationHitList } from './sources/infatuation-hitlist.js'
import { scrapeResyHitList } from './sources/resy-hitlist.js'
import { scrapeThrillistLA } from './sources/thrillist-la.js'
import { getRestaurantMarketIssue } from './lib/restaurant-market.js'
import { assertMinimumSuccessfulSources } from './lib/source-health.js'
import { sanitizeRestaurantForRights } from './lib/restaurant-rights.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env file if present (no dotenv dependency needed)
try {
  const envFile = readFileSync(join(__dirname, '..', '.env'), 'utf8')
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim()
    if (!process.env[key]) process.env[key] = val
  }
} catch { /* .env not found, use existing env vars */ }
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
  'Thrillist LA': 2,
  'Michelin Guide': 2,
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
}

// ── Name normalization for deduplication ──
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/^(the|sushi|cafe|restaurant|ristorante)\s+/i, '')
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function slugify(name, neighborhood) {
  const slug = (name + '-' + neighborhood)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return slug
}

// ── Tier classification ──
function classifyTier(restaurant) {
  if (restaurant.pricePp && restaurant.pricePp <= 20) return 'street'
  if (restaurant.pricePp && restaurant.pricePp <= 120) return 'feast'
  if (restaurant.pricePp && restaurant.pricePp > 120) return 'whale'

  // Keyword fallbacks
  const tags = restaurant.tags || []
  if (tags.includes('tasting-menu') || tags.includes('omakase')) return 'whale'
  if (tags.includes('pop-up') || tags.includes('food-stall') || tags.includes('truck')) return 'street'

  return 'feast' // default
}

// ── Heat score calculation ──
function calculateHeatScore(sources) {
  let score = 0
  for (const source of sources) {
    // Match source name to weight keys
    for (const [key, weight] of Object.entries(SOURCE_WEIGHTS)) {
      if (source.name.includes(key) || key.includes(source.name)) {
        score += weight
        break
      }
    }
    // Infatuation rating bonus
    if (source.rating && source.rating >= 9.0) score += 1
  }
  return score
}

// ── Deduplication: merge restaurants from multiple sources ──
function deduplicateRestaurants(allRestaurants) {
  const merged = new Map() // normKey -> restaurant

  for (const r of allRestaurants) {
    const normKey = normalizeName(r.name)

    if (merged.has(normKey)) {
      const existing = merged.get(normKey)
      // Merge sources (deduplicate by source name)
      if (!existing.sources) existing.sources = []
      const existingSourceNames = new Set(existing.sources.map(s => s.name))
      for (const source of r.sources || []) {
        if (!existingSourceNames.has(source.name)) {
          existing.sources.push(source)
        }
      }
      // Take richer data
      if (!existing.description && r.description) existing.description = r.description
      if (!existing.address && r.address) existing.address = r.address
      if (!existing.reservationUrl && r.reservationUrl) existing.reservationUrl = r.reservationUrl
      if (!existing.pricePp && r.pricePp) existing.pricePp = r.pricePp
      if (!existing.priceRange && r.priceRange) existing.priceRange = r.priceRange
    } else {
      merged.set(normKey, { ...r })
    }
  }

  return Array.from(merged.values())
}

function deduplicateRestaurantIds(restaurants) {
  const merged = new Map()
  for (const restaurant of restaurants) {
    if (!merged.has(restaurant.id)) {
      merged.set(restaurant.id, restaurant)
      continue
    }

    const existing = merged.get(restaurant.id)
    const sourceNames = new Set((existing.sources || []).map(source => source.name))
    for (const source of restaurant.sources || []) {
      if (!sourceNames.has(source.name)) {
        existing.sources = [...(existing.sources || []), source]
        sourceNames.add(source.name)
      }
    }
    for (const [key, value] of Object.entries(restaurant)) {
      if ((existing[key] === undefined || existing[key] === '' || existing[key] === null) && value) {
        existing[key] = value
      }
    }
  }
  return [...merged.values()]
}

// ── Main orchestrator ──
async function main() {
  const isHotOnly = process.argv.includes('--hot')
  console.log(`\n🍽️  Scraping restaurants (${isHotOnly ? 'hot sources only' : 'full scrape'})...\n`)

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

  // ── Scrape sources ──
  const scraped = []
  const sourceStatuses = []
  const liveSources = [
    { name: 'Eater LA Heatmap', group: 'hot', run: scrapeEaterHeatmap },
    { name: 'Infatuation Hit List', group: 'hot', run: scrapeInfatuationHitList },
    ...(!isHotOnly ? [
      { name: 'Eater Essential 38', group: 'full', run: scrapeEaterEssential },
      { name: 'Resy Hit List', group: 'full', run: scrapeResyHitList },
      { name: 'Thrillist LA', group: 'full', run: scrapeThrillistLA },
    ] : []),
  ]

  for (const source of liveSources) {
    console.log(`  Scraping ${source.name}...`)
    try {
      const results = await source.run()
      if (!Array.isArray(results) || results.length === 0) {
        throw new Error('source returned no restaurant records')
      }
      scraped.push(...results)
      sourceStatuses.push({
        name: source.name,
        group: source.group,
        status: 'ok',
        count: results.length,
      })
      console.log(`    → ${results.length} restaurants`)
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      sourceStatuses.push({
        name: source.name,
        group: source.group,
        status: 'error',
        count: 0,
        error,
      })
      console.error(`    ✗ ${source.name} failed:`, error)
    }
  }

  const requiredSuccesses = isHotOnly ? 1 : 2
  const successfulSources = assertMinimumSuccessfulSources(sourceStatuses, requiredSuccesses)

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
  console.log(`\n  Deduplicating ${existing.restaurants.length + scraped.length + manualRestaurants.length} total entries...`)
  const allRestaurants = [...existing.restaurants, ...scraped, ...manualRestaurants]
  const deduplicated = deduplicateRestaurants(allRestaurants)
  console.log(`    → ${deduplicated.length} unique restaurants after dedup`)

  // ── Filter junk entries (page chrome + event descriptions from scrapers) ──
  const JUNK_NAMES = /^(los angeles|the spots|written by|suggested reading|find places|our app|how to get into|where to eat|top \d+|best restaurant|new restaurant|we checked|la's new|holi |pizza party|celebrate|special events)/i
  const cleaned = deduplicated.filter(r => {
    if (!r.name || r.name.length < 3 || r.name.length > 60) return false
    if (JUNK_NAMES.test(r.name)) return false
    if (r.name.includes('—') && r.name.length > 40) return false // sentence fragments
    // Filter all-lowercase descriptive phrases (event descriptions, not restaurant names)
    if (/^[a-z]/.test(r.name) && r.name.split(' ').length > 2) return false
    return true
  })
  console.log(`    → ${cleaned.length} after junk filter (removed ${deduplicated.length - cleaned.length})`)

  // ── Reject records outside SIXPM's Greater LA + Orange County market ──
  const marketChecks = cleaned
    .map(restaurant => ({ restaurant, issue: getRestaurantMarketIssue(restaurant) }))
  const rejectedOutOfMarket = marketChecks.filter(({ issue }) => issue)
  const inMarket = marketChecks
    .filter(({ issue }) => !issue)
    .map(({ restaurant }) => restaurant)
  if (rejectedOutOfMarket.length > 0) {
    console.log(`    → Rejected ${rejectedOutOfMarket.length} out-of-market restaurants`)
    for (const { restaurant, issue } of rejectedOutOfMarket) {
      console.log(`      - ${restaurant.name}: ${issue}`)
    }
  }

  // ── Classify tiers and calculate heat scores ──
  for (const r of inMarket) {
    r.tier = r.tier || classifyTier(r)
    r.sourceCount = r.sources?.length || 0
    r.heatScore = calculateHeatScore(r.sources || [])
    r.id = r.id || slugify(r.name, r.neighborhood)
    if (r.id === 'leo-taqueria-eagle-rock') r.id = 'leos-taco-truck-hollywood'
  }
  const uniqueById = deduplicateRestaurantIds(inMarket)
  if (uniqueById.length !== inMarket.length) {
    console.log(`    → Merged ${inMarket.length - uniqueById.length} duplicate restaurant IDs`)
    inMarket.splice(0, inMarket.length, ...uniqueById)
  }

  // Source data can leave an ambiguous name with no location evidence.
  // Neither is trustworthy enough to publish.
  for (let index = inMarket.length - 1; index >= 0; index--) {
    const restaurant = inMarket[index]
    const issue = getRestaurantMarketIssue(restaurant)
    if (issue) {
      console.log(`    → Rejected ${restaurant.name} after enrichment: ${issue}`)
      inMarket.splice(index, 1)
      continue
    }
    const hasLocationEvidence = Boolean(
      restaurant.neighborhood?.trim()
      || restaurant.address?.trim()
      || (Number.isFinite(restaurant.lat) && Number.isFinite(restaurant.lng)),
    )
    if (!hasLocationEvidence) {
      inMarket.splice(index, 1)
    }
  }

  // Persist only fields cleared by the provider-rights policy. This happens
  // after geographic validation so legacy source records can still be checked
  // without retaining provider-derived coordinates or operating hours.
  inMarket.splice(0, inMarket.length, ...inMarket.map(sanitizeRestaurantForRights))

  // ── Scrape diff: detect added/removed, preserve addedDate ──
  const previousIds = new Set(existing.restaurants.map(r => r.id))
  const currentIds = new Set(inMarket.map(r => r.id))
  const added = inMarket.filter(r => !previousIds.has(r.id))
  const removed = [...previousIds].filter(id => !currentIds.has(id))

  // Set addedDate on new entries
  const today = new Date().toISOString().split('T')[0]
  for (const r of added) {
    if (!r.addedDate) r.addedDate = today
  }

  // Preserve addedDate from previous data
  for (const r of inMarket) {
    const prev = existing.restaurants.find(p => p.id === r.id)
    if (prev?.addedDate && !r.addedDate) r.addedDate = prev.addedDate
  }

  // ── Determine "new this month" ──
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const newThisMonth = inMarket
    .filter(r => r.isNew || (r.addedDate && new Date(r.addedDate) >= thirtyDaysAgo))
    .map(r => r.id)

  // ── Tier stats ──
  const tiers = { street: 0, feast: 0, whale: 0 }
  for (const r of inMarket) tiers[r.tier]++
  console.log(`\n  Tiers: ${tiers.street} street, ${tiers.feast} feast, ${tiers.whale} whale`)
  console.log(`  New this month: ${newThisMonth.length}`)
  if (added.length > 0) console.log(`  Added: ${added.map(r => r.name).join(', ')}`)
  if (removed.length > 0) console.log(`  Removed: ${removed.join(', ')}`)

  // ── Write scrape log ──
  const log = {
    timestamp: new Date().toISOString(),
    mode: isHotOnly ? 'hot' : 'full',
    sourcesAttempted: sourceStatuses.length,
    sourcesSucceeded: successfulSources.length,
    sourceStatuses,
    recordsScraped: scraped.length,
    totalRestaurants: inMarket.length,
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
    restaurants: inMarket,
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2))
  console.log(`\n  ✓ Wrote ${inMarket.length} restaurants to ${OUTPUT_PATH}\n`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
