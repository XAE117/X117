#!/usr/bin/env node

/**
 * THE PALACE — Jazz Venue Scraper
 *
 * Sources (in priority order):
 *   1. minaretrecords.com/shows — modern/underground scene (all 🔥)
 *   2. lajazz.com — primary aggregator for traditional jazz
 *   3. metaljazz.com — Greg Burk's comprehensive listings
 *   4. Direct venue sites — Blue Note, Baked Potato, Catalina, Sam First, Lodge Room
 *   5. Bandsintown — fallback for hard-to-scrape venues
 *
 * Usage: npm run scrape:jazz
 */

import * as cheerio from 'cheerio'
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH = join(__dirname, '..', 'public', 'jazz-venues.json')
const HOT_ARTISTS_PATH = join(__dirname, '..', 'public', 'hot-artists.json')

// ── Venue Definitions ──

const VENUES = {
  'blue-note-la': {
    id: 'blue-note-la',
    name: 'Blue Note Los Angeles',
    shortName: 'Blue Note',
    neighborhood: 'Hollywood',
    url: 'https://www.bluenotejazz.com/la/',
    color: '#1A5276',
    tier: 'dedicated',
  },
  'baked-potato': {
    id: 'baked-potato',
    name: 'The Baked Potato',
    shortName: 'Baked Potato',
    neighborhood: 'Studio City',
    url: 'https://www.thebakedpotato.com/',
    color: '#8B4513',
    tier: 'dedicated',
  },
  'catalina-jazz': {
    id: 'catalina-jazz',
    name: 'Catalina Jazz Club',
    shortName: 'Catalina',
    neighborhood: 'Hollywood',
    url: 'https://catalinajazzclub.com/',
    color: '#C0392B',
    tier: 'dedicated',
  },
  'sam-first': {
    id: 'sam-first',
    name: 'Sam First',
    shortName: 'Sam First',
    neighborhood: 'Westchester',
    url: 'https://www.samfirstbar.com/',
    color: '#2E86C1',
    tier: 'dedicated',
  },
  'vibrato': {
    id: 'vibrato',
    name: 'Vibrato Grill Jazz',
    shortName: 'Vibrato',
    neighborhood: 'Bel Air',
    url: 'https://www.vibratogrilljazz.com/',
    color: '#7D3C98',
    tier: 'dedicated',
  },
  'world-stage': {
    id: 'world-stage',
    name: 'The World Stage',
    shortName: 'World Stage',
    neighborhood: 'Leimert Park',
    url: 'https://www.theworldstage.org/',
    color: '#D4AC0D',
    tier: 'dedicated',
  },
  'lodge-room': {
    id: 'lodge-room',
    name: 'Lodge Room',
    shortName: 'Lodge Room',
    neighborhood: 'Highland Park',
    url: 'https://www.lodgeroomhlp.com/',
    color: '#D4A574',
    tier: 'indie_scene',
  },
  'scribble': {
    id: 'scribble',
    name: 'Scribble',
    shortName: 'Scribble',
    neighborhood: 'Highland Park',
    url: 'https://www.minaretrecords.com/shows',
    color: '#E74C3C',
    tier: 'indie_scene',
  },
  'st-barnabas': {
    id: 'st-barnabas',
    name: 'St. Barnabas Church',
    shortName: 'St. Barnabas',
    neighborhood: 'Eagle Rock',
    url: 'https://www.minaretrecords.com/shows',
    color: '#8E44AD',
    tier: 'indie_scene',
  },
  'psstudio': {
    id: 'psstudio',
    name: 'PSSTUDIO',
    shortName: 'PSSTUDIO',
    neighborhood: 'DTLA',
    url: 'https://www.minaretrecords.com/shows',
    color: '#E67E22',
    tier: 'indie_scene',
  },
  'mcyc': {
    id: 'mcyc',
    name: 'Mid City Yacht Club',
    shortName: 'MCYC',
    neighborhood: 'Mid City',
    url: 'https://www.minaretrecords.com/shows',
    color: '#2ECC71',
    tier: 'indie_scene',
  },
  'the-high-low': {
    id: 'the-high-low',
    name: 'The High Low',
    shortName: 'High Low',
    neighborhood: 'Atwater Village',
    url: 'https://www.thehighlow.com/',
    color: '#27AE60',
    tier: 'regular',
  },
  'the-mint': {
    id: 'the-mint',
    name: 'The Mint',
    shortName: 'The Mint',
    neighborhood: 'Mid-Wilshire',
    url: 'https://www.themintla.com/',
    color: '#16A085',
    tier: 'regular',
  },
  'lighthouse-cafe': {
    id: 'lighthouse-cafe',
    name: 'Lighthouse Cafe',
    shortName: 'Lighthouse',
    neighborhood: 'Hermosa Beach',
    url: 'https://www.thelighthousecafe.net/',
    color: '#3498DB',
    tier: 'regular',
  },
  'disney-hall': {
    id: 'disney-hall',
    name: 'Walt Disney Concert Hall',
    shortName: 'Disney Hall',
    neighborhood: 'Downtown',
    url: 'https://www.laphil.com/events/',
    color: '#BDC3C7',
    tier: 'concert_hall',
  },
  'hollywood-bowl': {
    id: 'hollywood-bowl',
    name: 'Hollywood Bowl',
    shortName: 'Hollywood Bowl',
    neighborhood: 'Hollywood Hills',
    url: 'https://www.hollywoodbowl.com/',
    color: '#F1C40F',
    tier: 'concert_hall',
  },
  'broad-stage': {
    id: 'broad-stage',
    name: 'The Broad Stage',
    shortName: 'Broad Stage',
    neighborhood: 'Santa Monica',
    url: 'https://thebroadstage.org/',
    color: '#E74C3C',
    tier: 'concert_hall',
  },
  'alvas-showroom': {
    id: 'alvas-showroom',
    name: "Alva's Showroom",
    shortName: "Alva's",
    neighborhood: 'San Pedro',
    url: 'https://www.alvasshowroom.com/',
    color: '#9B59B6',
    tier: 'concert_hall',
  },
}

// ── Helpers ──

function slugifyVenue(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function makeShowId(venueId, date, artist) {
  const artistSlug = artist.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)
  return `${venueId}-${date}-${artistSlug}`
}

async function fetchPage(url, timeout = 15000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'ThePalace-JazzScraper/1.0' },
    })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } catch (err) {
    clearTimeout(timer)
    throw err
  }
}

// ── Hot Artist Detection ──

let hotArtistsList = []
let hotPromotersList = []
let hotVenuesList = []

function loadHotArtists() {
  try {
    const raw = readFileSync(HOT_ARTISTS_PATH, 'utf-8')
    const data = JSON.parse(raw)
    hotArtistsList = (data.hotArtists || []).map(a => a.toLowerCase())
    hotPromotersList = (data.hotPromoters || []).map(p => p.toLowerCase())
    hotVenuesList = (data.hotVenues || []).map(v => v.toLowerCase())
    console.log(`  Loaded ${hotArtistsList.length} hot artists, ${hotPromotersList.length} hot promoters`)
  } catch {
    console.log('  Warning: Could not load hot-artists.json')
  }
}

function isHotShow(show, venueId, source) {
  const artistLower = (show.artist || '').toLowerCase()

  // Check hot artists (substring match)
  for (const ha of hotArtistsList) {
    if (artistLower.includes(ha)) return true
  }

  // Check if source is a hot promoter
  if (source) {
    const sourceLower = source.toLowerCase()
    for (const hp of hotPromotersList) {
      if (sourceLower.includes(hp)) return true
    }
  }

  // Check promoter field
  if (show.promoter) {
    const promLower = show.promoter.toLowerCase()
    for (const hp of hotPromotersList) {
      if (promLower.includes(hp)) return true
    }
  }

  return false
}

// ── Scrape: Minaret Records ──

async function scrapeMinaret() {
  console.log('  Scraping minaretrecords.com/shows...')
  const shows = []

  try {
    const html = await fetchPage('https://www.minaretrecords.com/shows')
    const $ = cheerio.load(html)

    // Minaret's Squarespace site lists events in chronological order
    // Look for event blocks with dates, artists, venues
    $('[data-block-type="summary-v2"] .summary-item, .eventlist-event, .sqs-block-summary-v2 .summary-item').each((_, el) => {
      try {
        const $el = $(el)
        const title = $el.find('.summary-title, .eventlist-title, h1, h2, h3').first().text().trim()
        const dateText = $el.find('.summary-metadata-item--date, .eventlist-meta-date, time').first().text().trim()
        const link = $el.find('a').first().attr('href') || ''

        if (title && dateText) {
          // Parse venue from title or description
          let venueName = ''
          let artist = title
          const desc = $el.find('.summary-excerpt, .eventlist-description').text().trim().toLowerCase()

          // Try to extract venue from description
          for (const [vid, vdef] of Object.entries(VENUES)) {
            if (desc.includes(vdef.name.toLowerCase()) || desc.includes(vdef.shortName.toLowerCase())) {
              venueName = vid
              break
            }
          }

          // Fallback: check title for venue names
          if (!venueName) {
            const titleLower = title.toLowerCase()
            for (const [vid, vdef] of Object.entries(VENUES)) {
              if (titleLower.includes(vdef.shortName.toLowerCase())) {
                venueName = vid
                artist = title.replace(new RegExp(vdef.shortName, 'i'), '').replace(/[@\-–—·|]+/g, '').trim()
                break
              }
            }
          }

          if (!venueName) venueName = 'lodge-room' // Default Minaret venue

          shows.push({
            artist: artist || title,
            dateText,
            venueId: venueName,
            link: link.startsWith('http') ? link : `https://www.minaretrecords.com${link}`,
            promoter: 'Minaret Records',
            source: 'minaretrecords.com',
          })
        }
      } catch {}
    })

    console.log(`    Found ${shows.length} shows from Minaret`)
  } catch (err) {
    console.log(`    ERROR scraping Minaret: ${err.message}`)
  }

  return shows
}

// ── Scrape: lajazz.com ──

async function scrapeLAJazz() {
  console.log('  Scraping lajazz.com...')
  const shows = []

  const pages = [
    'https://www.lajazz.com/',
    'https://www.lajazz.com/city-center---downtown---central-l.a..html',
    'https://www.lajazz.com/hollywood---west-side---santa-monica.html',
    'https://www.lajazz.com/san-fernando-valley---santa-clarita-valley.html',
    'https://www.lajazz.com/south-l.a.---south-bay.html',
  ]

  for (const pageUrl of pages) {
    try {
      const html = await fetchPage(pageUrl)
      const $ = cheerio.load(html)

      // lajazz.com is Weebly-based — look for event-like content
      // The Quick Calendar on homepage has structured listings
      $('.wsite-content-inner p, .paragraph, .wsite-text').each((_, el) => {
        const text = $(el).text().trim()
        // Try to parse lines with venue + artist + date patterns
        // This is intentionally loose since lajazz has editorial format
        if (text.length > 10 && text.length < 500) {
          // Look for known venue names in the text
          for (const [vid, vdef] of Object.entries(VENUES)) {
            if (text.toLowerCase().includes(vdef.name.toLowerCase()) ||
                text.toLowerCase().includes(vdef.shortName.toLowerCase())) {
              shows.push({
                rawText: text,
                venueId: vid,
                source: 'lajazz.com',
              })
              break
            }
          }
        }
      })
    } catch (err) {
      console.log(`    ERROR scraping ${pageUrl}: ${err.message}`)
    }
  }

  console.log(`    Found ${shows.length} raw listings from lajazz.com`)
  return shows
}

// ── Scrape: Direct Venue Sites ──

async function scrapeBakedPotato() {
  console.log('  Scraping thebakedpotato.com...')
  const shows = []

  try {
    const html = await fetchPage('https://www.thebakedpotato.com/')
    const $ = cheerio.load(html)

    // Look for event listings
    $('[class*="event"], [class*="show"], [class*="calendar"] li, .schedule-item, .lineup-item').each((_, el) => {
      try {
        const $el = $(el)
        const text = $el.text().trim()
        const link = $el.find('a').first().attr('href')

        if (text.length > 5) {
          shows.push({
            rawText: text,
            venueId: 'baked-potato',
            link: link || 'https://www.thebakedpotato.com/',
            source: 'thebakedpotato.com',
          })
        }
      } catch {}
    })

    console.log(`    Found ${shows.length} listings from Baked Potato`)
  } catch (err) {
    console.log(`    ERROR scraping Baked Potato: ${err.message}`)
  }

  return shows
}

async function scrapeCatalina() {
  console.log('  Scraping catalinajazzclub.com...')
  const shows = []

  try {
    const html = await fetchPage('https://catalinajazzclub.com/calendar/')
    const $ = cheerio.load(html)

    $('[class*="event"], [class*="show"], .tribe-events-calendar td, .tribe-event-url').each((_, el) => {
      try {
        const $el = $(el)
        const title = $el.find('h2, h3, .tribe-events-list-event-title, a').first().text().trim()
        const dateText = $el.find('.tribe-event-schedule-details, time, .date').first().text().trim()
        const link = $el.find('a').first().attr('href')

        if (title) {
          shows.push({
            artist: title,
            dateText,
            venueId: 'catalina-jazz',
            link: link || 'https://catalinajazzclub.com/calendar/',
            source: 'catalinajazzclub.com',
          })
        }
      } catch {}
    })

    console.log(`    Found ${shows.length} listings from Catalina`)
  } catch (err) {
    console.log(`    ERROR scraping Catalina: ${err.message}`)
  }

  return shows
}

async function scrapeSamFirst() {
  console.log('  Scraping samfirstbar.com...')
  const shows = []

  try {
    const html = await fetchPage('https://www.samfirstbar.com/')
    const $ = cheerio.load(html)

    $('[class*="event"], [class*="show"], [class*="calendar"]').each((_, el) => {
      try {
        const $el = $(el)
        const text = $el.text().trim()
        const link = $el.find('a').first().attr('href')

        if (text.length > 5) {
          shows.push({
            rawText: text,
            venueId: 'sam-first',
            link: link || 'https://www.samfirstbar.com/',
            source: 'samfirstbar.com',
          })
        }
      } catch {}
    })

    console.log(`    Found ${shows.length} listings from Sam First`)
  } catch (err) {
    console.log(`    ERROR scraping Sam First: ${err.message}`)
  }

  return shows
}

async function scrapeLodgeRoom() {
  console.log('  Scraping lodgeroomhlp.com...')
  const shows = []

  try {
    const html = await fetchPage('https://www.lodgeroomhlp.com/')
    const $ = cheerio.load(html)

    $('[class*="event"], [class*="show"], .event-item, .calendar-event').each((_, el) => {
      try {
        const $el = $(el)
        const title = $el.find('h2, h3, .event-title, a').first().text().trim()
        const dateText = $el.find('.event-date, time, .date').first().text().trim()
        const link = $el.find('a').first().attr('href')

        if (title) {
          shows.push({
            artist: title,
            dateText,
            venueId: 'lodge-room',
            link: link || 'https://www.lodgeroomhlp.com/',
            source: 'lodgeroomhlp.com',
          })
        }
      } catch {}
    })

    console.log(`    Found ${shows.length} listings from Lodge Room`)
  } catch (err) {
    console.log(`    ERROR scraping Lodge Room: ${err.message}`)
  }

  return shows
}

// ── Date Parsing ──

function parseShowDate(dateText) {
  if (!dateText) return null
  try {
    // Try direct ISO parse
    const d = new Date(dateText)
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10)
    }
    // Try common formats: "March 7, 2026", "3/7/2026", etc.
    const match = dateText.match(/(\w+)\s+(\d{1,2}),?\s*(\d{4})/)
    if (match) {
      const d2 = new Date(`${match[1]} ${match[2]}, ${match[3]}`)
      if (!isNaN(d2.getTime())) return d2.toISOString().slice(0, 10)
    }
  } catch {}
  return null
}

function parseShowTime(text) {
  if (!text) return null
  const match = text.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM))/i)
  if (match) {
    let t = match[1].toUpperCase()
    // Normalize: "8PM" → "8:00 PM", "9:30PM" → "9:30 PM"
    t = t.replace(/(\d)(AM|PM)/, '$1 $2')
    if (!t.includes(':')) t = t.replace(/(\d+)\s/, '$1:00 ')
    return t
  }
  return null
}

// ── Deduplication ──

function deduplicateShows(allShows) {
  const seen = new Map()

  for (const show of allShows) {
    // Key: artist (normalized) + date + venueId
    const key = `${(show.artist || '').toLowerCase().replace(/[^a-z0-9]/g, '')}-${show.date}-${show.venueId}`
    if (!seen.has(key)) {
      seen.set(key, show)
    } else {
      // Prefer show with direct ticket link
      const existing = seen.get(key)
      if (show.link && !existing.link) {
        seen.set(key, show)
      }
    }
  }

  return [...seen.values()]
}

// ── Main ──

async function main() {
  console.log('')
  console.log('╔══════════════════════════════════════╗')
  console.log('║   THE PALACE — Jazz Venue Scraper     ║')
  console.log('╚══════════════════════════════════════╝')
  console.log('')

  loadHotArtists()
  const scrapeErrors = []

  // 1. Scrape all sources
  console.log('')
  console.log('Scraping jazz venues...')

  let minaretShows = []
  try {
    minaretShows = await scrapeMinaret()
  } catch (err) {
    scrapeErrors.push({ source: 'minaretrecords.com', error: err.message })
    console.log('  CRITICAL: Minaret scrape failed — 🔥 source unavailable')
  }

  let lajazzShows = []
  try {
    lajazzShows = await scrapeLAJazz()
  } catch (err) {
    scrapeErrors.push({ source: 'lajazz.com', error: err.message })
  }

  // Direct venue scrapes
  const directShows = []
  for (const scrapeFn of [scrapeBakedPotato, scrapeCatalina, scrapeSamFirst, scrapeLodgeRoom]) {
    try {
      const shows = await scrapeFn()
      directShows.push(...shows)
    } catch (err) {
      scrapeErrors.push({ source: scrapeFn.name, error: err.message })
    }
  }

  // 2. Normalize all scraped data into structured shows
  const allShows = []

  // Minaret shows (highest quality data, all 🔥)
  for (const raw of minaretShows) {
    const date = parseShowDate(raw.dateText)
    if (!date) continue

    allShows.push({
      artist: raw.artist,
      date,
      time: parseShowTime(raw.dateText) || '8:00 PM',
      venueId: raw.venueId,
      link: raw.link,
      notes: 'All ages',
      promoter: 'Minaret Records',
      source: 'minaretrecords.com',
    })
  }

  // Direct venue shows
  for (const raw of [...directShows]) {
    if (raw.artist && raw.dateText) {
      const date = parseShowDate(raw.dateText)
      if (!date) continue
      allShows.push({
        artist: raw.artist,
        date,
        time: parseShowTime(raw.dateText) || '8:00 PM',
        venueId: raw.venueId,
        link: raw.link || VENUES[raw.venueId]?.url || '',
        notes: '',
        source: raw.source,
      })
    }
  }

  // 3. Deduplicate
  const dedupedShows = deduplicateShows(allShows)
  console.log(`\n  Total: ${allShows.length} raw → ${dedupedShows.length} deduplicated shows`)

  // 4. Run 🔥 detection
  let hotCount = 0
  for (const show of dedupedShows) {
    show.hot = isHotShow(show, show.venueId, show.source)
    if (show.hot) hotCount++
  }
  console.log(`  🔥 Hot shows: ${hotCount}`)

  // 5. Organize by venue
  const venueShowMap = {}
  for (const show of dedupedShows) {
    if (!venueShowMap[show.venueId]) venueShowMap[show.venueId] = []
    venueShowMap[show.venueId].push({
      id: makeShowId(show.venueId, show.date, show.artist),
      artist: show.artist,
      date: show.date,
      time: show.time,
      notes: show.notes || '',
      link: show.link || '',
      hot: show.hot,
      ...(show.promoter ? { promoter: show.promoter } : {}),
    })
  }

  // 6. Build output
  const venues = []
  for (const [venueId, venueDef] of Object.entries(VENUES)) {
    const shows = venueShowMap[venueId] || []
    if (shows.length > 0) {
      shows.sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
      venues.push({ ...venueDef, shows })
    }
  }

  const result = {
    lastUpdated: new Date().toISOString(),
    source: 'lajazz.com + minaretrecords.com + venue sites',
    venues,
    ...(scrapeErrors.length > 0 ? { scrapeErrors } : {}),
  }

  // If no shows scraped, keep existing data
  const totalShows = venues.reduce((sum, v) => sum + v.shows.length, 0)
  if (totalShows === 0) {
    console.log('\n  WARNING: No shows scraped. Keeping existing jazz-venues.json.')
    console.log('  Sources may be down or HTML structure may have changed.')
    // Don't overwrite — keep the mock/existing data
    process.exit(0)
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2))

  console.log(`\nDone! ${totalShows} shows across ${venues.length} venues.`)
  if (scrapeErrors.length > 0) {
    console.log(`  ⚠️  ${scrapeErrors.length} source(s) had errors:`)
    scrapeErrors.forEach(e => console.log(`    - ${e.source}: ${e.error}`))
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
