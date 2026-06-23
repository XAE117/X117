#!/usr/bin/env node

/**
 * Restaurant scraper orchestrator for SIXPM Eats mode.
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
import { scrapeThrillistLA } from './sources/thrillist-la.js'
import { scrapeMichelinGuide } from './sources/michelin-guide.js'

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
const NEIGHBORHOOD_CACHE_PATH = join(__dirname, '..', 'public', 'neighborhood-cache.json')

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
  'Google': 1,
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

// ── Google Places neighborhood enrichment ──
async function enrichNeighborhoods(restaurants) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    console.log('  ⚠ GOOGLE_PLACES_API_KEY not set, skipping neighborhood enrichment')
    return
  }

  // Load cache
  let cache = {}
  try {
    cache = JSON.parse(readFileSync(NEIGHBORHOOD_CACHE_PATH, 'utf8'))
  } catch { /* no cache yet */ }

  const needsEnrichment = restaurants.filter(r => !r.neighborhood || r.neighborhood.trim() === '')
  if (needsEnrichment.length === 0) {
    console.log('  All restaurants have neighborhoods, skipping enrichment')
    return
  }

  console.log(`\n  Enriching ${needsEnrichment.length} restaurants missing neighborhoods...`)
  let enriched = 0

  for (const r of needsEnrichment) {
    const normKey = r.name.toLowerCase().replace(/[^a-z0-9]/g, '')

    // Check cache first
    if (cache[normKey]) {
      if (cache[normKey].neighborhood) {
        r.neighborhood = cache[normKey].neighborhood
        if (cache[normKey].address && !r.address) r.address = cache[normKey].address
        enriched++
      }
      continue
    }

    try {
      // Step 1: Find the place to get place_id
      const query = encodeURIComponent(r.name + ' restaurant Los Angeles')
      const findUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${query}&inputtype=textquery&fields=place_id,formatted_address,name&key=${apiKey}`
      const findRes = await fetch(findUrl)
      const findData = await findRes.json()

      if (findData.candidates && findData.candidates.length > 0) {
        const candidate = findData.candidates[0]
        const placeId = candidate.place_id
        const address = candidate.formatted_address || ''

        // Step 2: Use Place Details to get structured address_components
        let neighborhood = ''
        if (placeId) {
          const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=address_components&key=${apiKey}`
          const detailRes = await fetch(detailUrl)
          const detailData = await detailRes.json()

          if (detailData.result?.address_components) {
            const components = detailData.result.address_components
            // Priority order: neighborhood > sublocality_level_1 > sublocality > locality
            const hoodComp = components.find(c => c.types.includes('neighborhood'))
              || components.find(c => c.types.includes('sublocality_level_1'))
              || components.find(c => c.types.includes('sublocality'))
            if (hoodComp) {
              neighborhood = hoodComp.long_name
            }
            // Fallback: if no neighborhood but we have a locality that isn't "Los Angeles"
            if (!neighborhood) {
              const locality = components.find(c => c.types.includes('locality'))
              if (locality && !/^los angeles$/i.test(locality.long_name)) {
                neighborhood = locality.long_name
              }
            }
          }
        }

        // Final fallback: parse from formatted address
        if (!neighborhood && address) {
          const parts = address.split(',').map(s => s.trim())
          if (parts.length >= 4) {
            const candidate = parts[1]
            if (!/^(los angeles|ca|california|\d)$/i.test(candidate) && candidate.length > 2) {
              neighborhood = candidate
            }
          }
        }

        if (neighborhood) {
          r.neighborhood = neighborhood
          if (!r.address) r.address = address
          cache[normKey] = { neighborhood, address }
          enriched++
        } else {
          // Cache the miss so we don't re-query
          cache[normKey] = { neighborhood: '', address }
        }
      } else {
        // Not found — cache the miss
        cache[normKey] = { neighborhood: '', address: '' }
      }

      // Rate limit: 5 requests per second (2 calls per restaurant)
      await new Promise(resolve => setTimeout(resolve, 200))
    } catch {
      // Skip this restaurant, don't fail the whole scrape
    }
  }

  // Save cache
  writeFileSync(NEIGHBORHOOD_CACHE_PATH, JSON.stringify(cache, null, 2))
  console.log(`    → Enriched ${enriched}/${needsEnrichment.length} restaurants`)
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

  // Hot sources (always scraped)
  try {
    console.log('\n  Scraping Eater LA Heatmap...')
    const eaterHot = await scrapeEaterHeatmap()
    scraped.push(...eaterHot)
    console.log(`    → ${eaterHot.length} restaurants`)
  } catch (err) {
    console.error('    ✗ Eater Heatmap failed:', err.message)
  }

  try {
    console.log('  Scraping Infatuation Hit List...')
    const infatuation = await scrapeInfatuationHitList()
    scraped.push(...infatuation)
    console.log(`    → ${infatuation.length} restaurants`)
  } catch (err) {
    console.error('    ✗ Infatuation Hit List failed:', err.message)
  }

  // Full scrape sources
  if (!isHotOnly) {
    try {
      console.log('  Scraping Eater Essential 38...')
      const eaterEssential = await scrapeEaterEssential()
      scraped.push(...eaterEssential)
      console.log(`    → ${eaterEssential.length} restaurants`)
    } catch (err) {
      console.error('    ✗ Eater Essential 38 failed:', err.message)
    }

    try {
      console.log('  Scraping Resy Hit List...')
      const resy = await scrapeResyHitList()
      scraped.push(...resy)
      console.log(`    → ${resy.length} restaurants`)
    } catch (err) {
      console.error('    ✗ Resy Hit List failed:', err.message)
    }

    try {
      console.log('  Scraping Thrillist LA...')
      const thrillist = await scrapeThrillistLA()
      scraped.push(...thrillist)
      console.log(`    → ${thrillist.length} restaurants`)
    } catch (err) {
      console.error('    ✗ Thrillist LA failed:', err.message)
    }

    try {
      console.log('  Scraping Michelin Guide (live)...')
      const michelinLive = await scrapeMichelinGuide()
      scraped.push(...michelinLive)
      console.log(`    → ${michelinLive.length} restaurants`)
    } catch (err) {
      console.error('    ✗ Michelin Guide failed:', err.message)
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

  // ── Classify tiers and calculate heat scores ──
  for (const r of cleaned) {
    r.tier = r.tier || classifyTier(r)
    r.sourceCount = r.sources?.length || 0
    r.heatScore = calculateHeatScore(r.sources || [])
    r.id = r.id || slugify(r.name, r.neighborhood)
  }

  // ── Enrich missing neighborhoods via Google Places ──
  await enrichNeighborhoods(cleaned)

  // ── Scrape diff: detect added/removed, preserve addedDate ──
  const previousIds = new Set(existing.restaurants.map(r => r.id))
  const currentIds = new Set(cleaned.map(r => r.id))
  const added = cleaned.filter(r => !previousIds.has(r.id))
  const removed = [...previousIds].filter(id => !currentIds.has(id))

  // Set addedDate on new entries
  const today = new Date().toISOString().split('T')[0]
  for (const r of added) {
    if (!r.addedDate) r.addedDate = today
  }

  // Preserve addedDate from previous data
  for (const r of cleaned) {
    const prev = existing.restaurants.find(p => p.id === r.id)
    if (prev?.addedDate && !r.addedDate) r.addedDate = prev.addedDate
  }

  // ── Determine "new this month" ──
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const newThisMonth = cleaned
    .filter(r => r.isNew || (r.addedDate && new Date(r.addedDate) >= thirtyDaysAgo))
    .map(r => r.id)

  // ── Tier stats ──
  const tiers = { street: 0, feast: 0, whale: 0 }
  for (const r of cleaned) tiers[r.tier]++
  console.log(`\n  Tiers: ${tiers.street} street, ${tiers.feast} feast, ${tiers.whale} whale`)
  console.log(`  New this month: ${newThisMonth.length}`)
  if (added.length > 0) console.log(`  Added: ${added.map(r => r.name).join(', ')}`)
  if (removed.length > 0) console.log(`  Removed: ${removed.join(', ')}`)

  // ── Write scrape log ──
  const log = {
    timestamp: new Date().toISOString(),
    mode: isHotOnly ? 'hot' : 'full',
    sourcesScraped: scraped.length,
    totalRestaurants: cleaned.length,
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
    restaurants: cleaned,
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2))
  console.log(`\n  ✓ Wrote ${cleaned.length} restaurants to ${OUTPUT_PATH}\n`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
