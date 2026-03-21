#!/usr/bin/env node

/**
 * THE PALACE — Jazz Venue Scraper
 *
 * Sources (in priority order):
 *   1. Blue Note LA (/la/shows/) — calendar grid, highest reliability
 *   2. minaretrecords.com/shows — modern/underground scene (all hot)
 *   3. lajazz.com — primary aggregator (text parsing: "TIME – ARTIST – VENUE")
 *   4. Catalina Jazz Club — Tribe Events / Ticketmaster integration
 *   5. Lodge Room — Tessera JS eventObjects parsed from page source
 *   6. metaljazz.com — Greg Burk's blog listings
 *   7. Baked Potato / Sam First — Puppeteer for JS-rendered sites
 *
 * Usage: npm run scrape:jazz
 */

import * as cheerio from 'cheerio'
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { scrapeSongkick } from './sources/songkick-jazz.js'
import { scrapeDice } from './sources/dice-jazz.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH = join(__dirname, '..', 'public', 'jazz-venues.json')
const HOT_ARTISTS_PATH = join(__dirname, '..', 'public', 'hot-artists.json')

// ── Venue Definitions ──

const VENUES = {
  // ── LA: Dedicated Jazz Clubs ──
  'blue-note-la': { id: 'blue-note-la', name: 'Blue Note Los Angeles', shortName: 'Blue Note', neighborhood: 'Hollywood', url: 'https://www.bluenotejazz.com/la/', color: '#1A5276', tier: 'dedicated', region: 'LA' },
  'baked-potato': { id: 'baked-potato', name: 'The Baked Potato', shortName: 'Baked Potato', neighborhood: 'Studio City', url: 'https://www.thebakedpotato.com/', color: '#8B4513', tier: 'dedicated', region: 'LA' },
  'catalina-jazz': { id: 'catalina-jazz', name: 'Catalina Jazz Club', shortName: 'Catalina', neighborhood: 'Hollywood', url: 'https://catalinajazzclub.com/', color: '#C0392B', tier: 'dedicated', region: 'LA' },
  'sam-first': { id: 'sam-first', name: 'Sam First', shortName: 'Sam First', neighborhood: 'Westchester', url: 'https://www.samfirstbar.com/', color: '#2E86C1', tier: 'dedicated', region: 'LA' },
  'vibrato': { id: 'vibrato', name: 'Vibrato Grill Jazz', shortName: 'Vibrato', neighborhood: 'Bel Air', url: 'https://www.vibratogrilljazz.com/', color: '#7D3C98', tier: 'dedicated', region: 'LA' },
  'world-stage': { id: 'world-stage', name: 'The World Stage', shortName: 'World Stage', neighborhood: 'Leimert Park', url: 'https://www.theworldstage.org/', color: '#D4AC0D', tier: 'dedicated', region: 'LA' },
  // ── LA: Indie Scene ──
  'lodge-room': { id: 'lodge-room', name: 'Lodge Room', shortName: 'Lodge Room', neighborhood: 'Highland Park', url: 'https://www.lodgeroomhlp.com/', color: '#D4A574', tier: 'indie_scene', region: 'LA' },
  'scribble': { id: 'scribble', name: 'Scribble', shortName: 'Scribble', neighborhood: 'Highland Park', url: 'https://www.minaretrecords.com/shows', color: '#E74C3C', tier: 'indie_scene', region: 'LA' },
  'st-barnabas': { id: 'st-barnabas', name: 'St. Barnabas Church', shortName: 'St. Barnabas', neighborhood: 'Eagle Rock', url: 'https://www.minaretrecords.com/shows', color: '#8E44AD', tier: 'indie_scene', region: 'LA' },
  'psstudio': { id: 'psstudio', name: 'PSSTUDIO', shortName: 'PSSTUDIO', neighborhood: 'DTLA', url: 'https://www.minaretrecords.com/shows', color: '#E67E22', tier: 'indie_scene', region: 'LA' },
  'mcyc': { id: 'mcyc', name: 'Mid City Yacht Club', shortName: 'MCYC', neighborhood: 'Mid City', url: 'https://www.minaretrecords.com/shows', color: '#2ECC71', tier: 'indie_scene', region: 'LA' },
  // ── LA: Regular ──
  'the-high-low': { id: 'the-high-low', name: 'The High Low', shortName: 'High Low', neighborhood: 'Atwater Village', url: 'https://www.thehighlow.com/', color: '#27AE60', tier: 'regular', region: 'LA' },
  'the-mint': { id: 'the-mint', name: 'The Mint', shortName: 'The Mint', neighborhood: 'Mid-Wilshire', url: 'https://www.themintla.com/', color: '#16A085', tier: 'regular', region: 'LA' },
  'lighthouse-cafe': { id: 'lighthouse-cafe', name: 'Lighthouse Cafe', shortName: 'Lighthouse', neighborhood: 'Hermosa Beach', url: 'https://www.thelighthousecafe.net/', color: '#3498DB', tier: 'regular', region: 'LA' },
  // ── Orange County ──
  'campus-jax': { id: 'campus-jax', name: 'Campus JAX', shortName: 'Campus JAX', neighborhood: 'Newport Beach', url: 'https://www.campusjax.com/entertainment/', color: '#F39C12', tier: 'dedicated', region: 'OC' },
}

// ── Helpers ──

function makeShowId(venueId, date, artist) {
  const artistSlug = artist.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)
  return `${venueId}-${date}-${artistSlug}`
}

const TODAY = new Date()
TODAY.setHours(0, 0, 0, 0)
const TODAY_ISO = TODAY.toISOString().slice(0, 10)

function isFutureDate(dateISO) {
  return dateISO >= TODAY_ISO
}

async function fetchPage(url, timeout = 15000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } catch (err) {
    clearTimeout(timer)
    throw err
  }
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
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

  for (const ha of hotArtistsList) {
    if (artistLower.includes(ha)) return true
  }

  if (source) {
    const sourceLower = source.toLowerCase()
    for (const hp of hotPromotersList) {
      if (sourceLower.includes(hp)) return true
    }
  }

  if (show.promoter) {
    const promLower = show.promoter.toLowerCase()
    for (const hp of hotPromotersList) {
      if (promLower.includes(hp)) return true
    }
  }

  // Check hot venues
  if (venueId) {
    const venueDef = VENUES[venueId]
    if (venueDef) {
      const venueName = venueDef.name.toLowerCase()
      for (const hv of hotVenuesList) {
        if (venueName.includes(hv)) return true
      }
    }
  }

  return false
}

// ── Junk Artist Filter ──

const JUNK_ARTISTS = new Set([
  'home', 'menu', 'about', 'contact', 'list', 'calendar', 'events',
  'membership', 'donate', 'subscribe', 'recording', 'gift cards', 'bar menu',
  'play video', 'more', 'visit', 'tickets', 'buy tickets', 'see all shows',
  'privacy policy', 'instagram', 'youtube', 'facebook', 'twitter',
  'upcoming shows', 'live music', 'sam first records',
  'quartet', 'trio', 'duo', 'tba', 'special guest', 'allstar band',
])

function isJunkArtist(name) {
  if (!name || name.length < 2) return true
  const lower = name.toLowerCase().trim().replace(/[.\s]+$/, '')
  if (JUNK_ARTISTS.has(lower)) return true
  if (/@/.test(name)) return true // email address
  if (/\.(com|org|net|edu)/.test(lower)) return true // URL fragment
  if (/\d{4,}\s+\w+\s+(blvd|st|ave|rd|dr|ln)/i.test(name)) return true // street address
  if (/^(sun|mon|tue|wed|thu|fri|sat)\w*\s+\d/i.test(name)) return true // "Sunday 3/8..."
  if (lower.includes('click here') || lower.includes('inquire about')) return true
  if (lower.includes('mailing list') || lower.includes('weekly updates')) return true
  if (lower.includes('thank you for') || lower.includes('jazz club and cocktail')) return true
  // All-caps marketing phrases (>15 chars, all caps, no digits = not an artist)
  if (name.length > 15 && name === name.toUpperCase() && !/[0-9]/.test(name)) return true
  return false
}

// ── Date Parsing ──

const MONTH_MAP = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
  apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
  aug: 7, august: 7, sep: 8, sept: 8, september: 8,
  oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
}

function parseShowDate(dateText) {
  if (!dateText) return null
  const text = dateText.trim()

  // ISO format: 2026-03-07
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text

  // MM/DD/YYYY
  const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (slashMatch) {
    const m = slashMatch[1].padStart(2, '0')
    const d = slashMatch[2].padStart(2, '0')
    return `${slashMatch[3]}-${m}-${d}`
  }

  // "March 7, 2026" or "Mar 7 2026" or "March 7"
  const longMatch = text.match(/(\w+)\s+(\d{1,2}),?\s*(\d{4})?/i)
  if (longMatch) {
    const monthStr = longMatch[1].toLowerCase()
    const monthNum = MONTH_MAP[monthStr]
    if (monthNum !== undefined) {
      const year = longMatch[3] ? parseInt(longMatch[3]) : TODAY.getFullYear()
      const day = parseInt(longMatch[2])
      const d = new Date(year, monthNum, day)
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
    }
  }

  // Try native Date parse as last resort
  try {
    const d = new Date(text)
    if (!isNaN(d.getTime()) && d.getFullYear() >= 2024) {
      return d.toISOString().slice(0, 10)
    }
  } catch {}

  return null
}

function parseShowTime(text) {
  if (!text) return null
  const match = text.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM))/i)
  if (match) {
    let t = match[1].toUpperCase()
    t = t.replace(/(\d)(AM|PM)/, '$1 $2')
    if (!t.includes(':')) t = t.replace(/(\d+)\s/, '$1:00 ')
    return t
  }
  return null
}

// ── Scrape: Blue Note LA ──

async function scrapeBlueNote() {
  console.log('  Scraping bluenotejazz.com/la/shows/...')
  const shows = []

  try {
    const html = await fetchPage('https://www.bluenotejazz.com/la/shows/')
    const $ = cheerio.load(html)

    const currentYear = TODAY.getFullYear()
    const calendarMonth = TODAY.getMonth()

    // Build a map of artist name (lowercase) → ticket link from /tm-event/ URLs
    const ticketLinks = {}
    $('a[href*="/tm-event/"]').each((_, el) => {
      const $a = $(el)
      const href = $a.attr('href') || ''
      const text = $a.text().trim().replace(/\s+/g, ' ')
      if (text && text.length > 2) {
        const key = text.toLowerCase()
        ticketLinks[key] = href.startsWith('http') ? href : `https://www.bluenotejazz.com${href}`
      }
    })

    // Parse calendar text sequentially: day numbers followed by artist names
    const bodyText = $('body').text()
    const lines = bodyText.split('\n').map(l => l.trim()).filter(Boolean)

    const SKIP_LINES = new Set([
      'sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat',
      'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
      'blue note los angeles', '7:00 pm & 9:30 pm', 'see all shows',
      'tickets', 'buy tickets', 'march', 'march 2026', 'april', 'april 2026',
    ])

    let lastDay = null

    for (const line of lines) {
      const lower = line.toLowerCase()

      // Check if this line is a standalone day number (1-31) — before length filter
      const dayMatch = line.match(/^(\d{1,2})$/)

      // Skip known junk
      if (!dayMatch && SKIP_LINES.has(lower)) continue
      if (!dayMatch && /^\d{1,2}:\d{2}\s*(am|pm)/i.test(line)) continue
      if (!dayMatch && (line.length < 3 || line.length > 150)) continue
      if (dayMatch) {
        const day = parseInt(dayMatch[1])
        if (day >= 1 && day <= 31) {
          lastDay = day
        }
        continue
      }

      // If we have a pending day and this looks like an artist name
      if (lastDay && /[a-zA-Z]/.test(line)) {
        const d = new Date(currentYear, calendarMonth, lastDay)
        const dateISO = d.toISOString().slice(0, 10)

        // Look up ticket link by artist name
        const link = ticketLinks[lower] || 'https://www.bluenotejazz.com/la/shows/'

        shows.push({
          artist: line,
          date: dateISO,
          time: '7:00 PM',
          venueId: 'blue-note-la',
          link,
          source: 'bluenotejazz.com',
        })
        lastDay = null
      }
    }

    // Deduplicate (multi-night runs appear in multiple calendar cells)
    const seen = new Set()
    const uniqueShows = []
    for (const s of shows) {
      const key = `${s.artist}-${s.date}`
      if (!seen.has(key)) {
        seen.add(key)
        uniqueShows.push(s)
      }
    }

    console.log(`    Found ${uniqueShows.length} shows from Blue Note LA`)
    return uniqueShows
  } catch (err) {
    console.log(`    ERROR scraping Blue Note: ${err.message}`)
    return []
  }
}

// ── Scrape: Minaret Records ──

async function scrapeMinaret() {
  console.log('  Scraping minaretrecords.com/shows...')
  const shows = []

  try {
    const html = await fetchPage('https://www.minaretrecords.com/shows')
    const $ = cheerio.load(html)

    // Squarespace structure (confirmed 2026-03):
    //   Events are in fe-block-* divs (Squarespace feature blocks)
    //   Each event: <a href="/shows/slug"><h2>Title</h2></a>
    //   Dates in adjacent <ul><li> elements
    //   NO .eventlist-event or .summary-item classes exist on this site

    // Strategy 1: Find all show links (most reliable for this Squarespace layout)
    $('a[href*="/shows/"]').each((_, el) => {
      try {
        const $a = $(el)
        const link = $a.attr('href') || ''
        // Title is the h2 inside the link, or the link text itself
        const title = $a.find('h2, h1, h3').first().text().trim() || $a.text().trim()
        if (!title || title.length < 3) return

        // Date: look in the parent fe-block container for adjacent ul > li
        const parent = $a.closest('div[class*="fe-block"], div, section')
        const dateItems = parent.find('ul li')
        let dateText = ''
        dateItems.each((_, li) => {
          const liText = $(li).text().trim()
          // First li is typically the date (e.g., "Tuesday, March 10, 2026")
          if (!dateText && /\d{4}|january|february|march|april|may|june|july|august|september|october|november|december/i.test(liText)) {
            dateText = liText
          }
        })

        // Also check for time in second li
        let timeText = ''
        dateItems.each((_, li) => {
          const liText = $(li).text().trim()
          if (/\d{1,2}:\d{2}\s*(AM|PM)/i.test(liText)) {
            timeText = liText
          }
        })

        const desc = parent.find('p').text().trim()
        const venueId = matchVenueFromText(title + ' ' + desc)

        shows.push({
          artist: cleanArtistName(title, venueId),
          dateText: dateText || '',
          time: timeText || '',
          venueId: venueId || 'lodge-room',
          link: link.startsWith('http') ? link : `https://www.minaretrecords.com${link}`,
          promoter: 'Minaret Records',
          source: 'minaretrecords.com',
        })
      } catch {}
    })

    // Deduplicate by link (same show link may appear in multiple fe-blocks)
    const seen = new Set()
    const deduped = []
    for (const s of shows) {
      if (!seen.has(s.link)) {
        seen.add(s.link)
        deduped.push(s)
      }
    }
    shows.length = 0
    shows.push(...deduped)

    // Strategy 3: Look for TICKETS links and work backwards
    if (shows.length === 0) {
      $('a[href*="/shop/p/"]').each((_, el) => {
        try {
          const $a = $(el)
          const parent = $a.closest('div, article, section')
          const title = parent.find('h1, h2, h3').first().text().trim()
          const dateText = parent.find('time, ul li').first().text().trim()
          const ticketLink = $a.attr('href') || ''

          if (title) {
            const venueId = matchVenueFromText(title + ' ' + parent.text())
            shows.push({
              artist: cleanArtistName(title, venueId),
              dateText,
              venueId: venueId || 'lodge-room',
              link: ticketLink.startsWith('http') ? ticketLink : `https://www.minaretrecords.com${ticketLink}`,
              promoter: 'Minaret Records',
              source: 'minaretrecords.com',
            })
          }
        } catch {}
      })
    }

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
    'https://www.lajazz.com/orange-county---san-diego.html',
  ]

  for (const pageUrl of pages) {
    try {
      const html = await fetchPage(pageUrl)
      const $ = cheerio.load(html)

      // lajazz.com is Weebly — content in absolutely-positioned .txt divs
      // Format: "TIME – ARTIST – VENUE – LOCATION"
      // or sometimes: "ARTIST – VENUE – LOCATION – TIME"

      // lajazz.com (Weebly): listings are in .txt divs, <p>, or <span> elements
      // Format: "TIME – ARTIST – VENUE – CITY"
      const lines = []
      $('p, span, .txt, div.txt, [class*="wsite-multicol-table"] td').each((_, el) => {
        const text = $(el).text().trim()
          .replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ')
        // Must be a listing line (has time + em-dash separator)
        if (text.length > 15 && text.length < 250
          && /\d{1,2}:\d{2}\s*(?:AM|PM)/i.test(text)
          && /–/.test(text)) {
          lines.push(text)
        }
      })

      // Deduplicate (span content duplicates p content)
      const uniqueLines = [...new Set(lines)]

      for (const line of uniqueLines) {
        // Pattern: "TIME – ARTIST – VENUE – CITY"
        const parts = line.split(/\s*–\s*/).map(p => p.trim()).filter(Boolean)
        if (parts.length < 3) continue

        // Try to identify which part is the time, artist, and venue
        let time = null
        let artist = null
        let venueId = null
        let remainingParts = [...parts]

        // Find time (e.g., "8:00PM", "7:30 PM")
        for (let i = 0; i < remainingParts.length; i++) {
          if (/^\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)/i.test(remainingParts[i])) {
            time = parseShowTime(remainingParts[i])
            remainingParts.splice(i, 1)
            break
          }
        }

        // Find venue (match against known venues)
        for (let i = 0; i < remainingParts.length; i++) {
          const vid = matchVenueFromText(remainingParts[i])
          if (vid) {
            venueId = vid
            remainingParts.splice(i, 1)
            break
          }
        }

        // Remove city/location parts
        const CITIES = ['studio city', 'hollywood', 'bel air', 'santa monica', 'hermosa beach',
          'downtown', 'eagle rock', 'highland park', 'atwater village', 'mid-wilshire',
          'westchester', 'leimert park', 'dtla', 'mid city', 'san pedro',
          'newport beach', 'santa ana', 'costa mesa', 'century city',
          'west hollywood', 'los angeles', 'la', 'l.a.', 'west l.a.',
          'south l.a.', 'north hollywood', 'pasadena', 'glendale',
          'long beach', 'culver city', 'inglewood', 'burbank',
          'marina del rey', 'venice', 'silver lake', 'echo park',
          'koreatown', 'los feliz', 'beverly hills', 'west side',
          'east side', 'south bay', 'san fernando valley']
        remainingParts = remainingParts.filter(p => {
          const lower = p.toLowerCase().trim()
          return !CITIES.includes(lower) && lower.length > 0
        })

        // What's left should be the artist — also strip trailing city from concatenated text
        artist = remainingParts.join(' ').trim()
        for (const city of CITIES) {
          const cityRegex = new RegExp('\\s+' + city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i')
          artist = artist.replace(cityRegex, '').trim()
        }

        // Validate: artist should be a real name, not junk
        if (artist && venueId && artist.length > 2 && artist.length < 120) {
          // Skip if artist is mostly non-alpha (junk concatenation)
          const alphaRatio = (artist.match(/[a-zA-Z]/g) || []).length / artist.length
          if (alphaRatio < 0.4) continue

          shows.push({
            artist,
            time: time || '8:00 PM',
            venueId,
            source: 'lajazz.com',
            pageUrl,
          })
        }
      }

      await delay(1500) // Be polite between pages
    } catch (err) {
      console.log(`    ERROR scraping ${pageUrl}: ${err.message}`)
    }
  }

  console.log(`    Found ${shows.length} listings from lajazz.com`)
  return shows
}

// ── Scrape: Catalina Jazz Club ──
// Catalina uses a Ticketweb widget on the homepage — events are JS-rendered.
// Requires Puppeteer with domcontentloaded + delay (networkidle2 times out).
// Each event is a .tw-section with .name-of-month, .date-of-month, .tw-name a, .tw-date-time

async function scrapeCatalina() {
  console.log('  Scraping catalinajazzclub.com...')
  const shows = []

  try {
    const puppeteer = await importPuppeteer()
    if (!puppeteer) {
      console.log('    Puppeteer not available — cannot scrape Catalina (JS-rendered Ticketweb widget)')
      return shows
    }

    let browser
    try {
      browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] })
      const page = await browser.newPage()
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36')
      // Homepage — NOT /events/ (which 404s). Use domcontentloaded (networkidle2 times out)
      await page.goto('https://catalinajazzclub.com/', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      })
      // Wait for Ticketweb widget to render via JavaScript
      await delay(8000)

      const events = await page.evaluate(() => {
        const results = []
        const sections = document.querySelectorAll('.tw-section')
        sections.forEach(section => {
          try {
            const monthEl = section.querySelector('.name-of-month')
            const dayEl = section.querySelector('.date-of-month')
            const nameEl = section.querySelector('.tw-name a') || section.querySelector('.tw-name')
            const timeEl = section.querySelector('.tw-date-time')

            const month = monthEl?.textContent?.trim() || ''
            const day = dayEl?.textContent?.trim() || ''
            const title = nameEl?.textContent?.trim() || ''
            const link = nameEl?.href || nameEl?.querySelector('a')?.href || ''
            const timeText = timeEl?.textContent?.trim() || ''

            if (title && title.length > 2 && month && day) {
              results.push({ title, month, day, link, timeText })
            }
          } catch {}
        })
        return results
      })

      // Convert month abbreviation + day to ISO date
      const MONTH_ABBR = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth() + 1

      for (const ev of events) {
        const titleLow = ev.title.toLowerCase()
        if (['list', 'calendar', 'events', 'home', 'about', 'contact', 'menu'].includes(titleLow)) continue
        if (titleLow.includes('provides a warm') || titleLow.includes('environment')) continue
        if (isJunkArtist(ev.title)) continue

        const monthNum = MONTH_ABBR[ev.month.toLowerCase().slice(0, 3)]
        const dayNum = parseInt(ev.day, 10)
        if (!monthNum || !dayNum) continue

        let year = currentYear
        if (monthNum < currentMonth || (monthNum === currentMonth && dayNum < now.getDate())) {
          year = currentYear + 1
        }
        const dateISO = `${year}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`

        let time = '8:30 PM'
        const showTimeMatch = ev.timeText.match(/Show:\s*(\d{1,2}:\d{2}\s*(?:am|pm))/i)
        if (showTimeMatch) {
          time = showTimeMatch[1].toUpperCase().replace(/(\d)(AM|PM)/, '$1 $2')
        } else {
          const anyTimeMatch = ev.timeText.match(/(\d{1,2}:\d{2}\s*(?:am|pm))/i)
          if (anyTimeMatch) {
            time = anyTimeMatch[1].toUpperCase().replace(/(\d)(AM|PM)/, '$1 $2')
          }
        }

        shows.push({
          artist: ev.title,
          dateText: dateISO,
          venueId: 'catalina-jazz',
          link: ev.link || 'https://catalinajazzclub.com/',
          time,
          source: 'catalinajazzclub.com',
        })
      }

      console.log(`    Puppeteer found ${shows.length} shows from Catalina`)
    } catch (err) {
      console.log(`    Puppeteer scrape failed: ${err.message}`)
    } finally {
      if (browser) await browser.close()
    }

    console.log(`    Found ${shows.length} listings from Catalina`)
  } catch (err) {
    console.log(`    ERROR scraping Catalina: ${err.message}`)
  }

  return shows
}

// ── Scrape: Lodge Room (parse JS eventObjects from page source) ──

async function scrapeLodgeRoom() {
  console.log('  Scraping lodgeroomhlp.com (JS parsing)...')
  const shows = []

  try {
    const html = await fetchPage('https://www.lodgeroomhlp.com/')

    // Lodge Room uses Tessera ticketing — events are in JavaScript:
    // eventObjects.push({ id, eventDate, mainArtist, additionalArtists, venue, link, doors })
    const eventRegex = /eventObjects\.push\(\s*(\{[\s\S]*?\})\s*\)/g
    let match

    while ((match = eventRegex.exec(html)) !== null) {
      try {
        // Clean the JS object to make it valid JSON
        let jsonStr = match[1]
          .replace(/'/g, '"')
          .replace(/,\s*\}/, '}')  // trailing commas
          .replace(/(\w+)\s*:/g, '"$1":')  // unquoted keys
          // Handle already-quoted keys (would become ""key":")
          .replace(/""/g, '"')

        // Try parsing, but fall back to regex extraction if JSON is invalid
        let eventData
        try {
          eventData = JSON.parse(jsonStr)
        } catch {
          // Manual extraction with regex
          const dateMatch = match[1].match(/eventDate['":\s]+["']([^"']+)["']/)
          const artistMatch = match[1].match(/mainArtist['":\s]+\[["']([^"'\]]+)["']/)
          const linkMatch = match[1].match(/link['":\s]+["']([^"']+)["']/)
          const doorsMatch = match[1].match(/doors['":\s]+["']([^"']+)["']/)

          if (dateMatch && artistMatch) {
            eventData = {
              eventDate: dateMatch[1],
              mainArtist: [artistMatch[1]],
              link: linkMatch ? linkMatch[1] : '',
              doors: doorsMatch ? doorsMatch[1] : '',
            }
          }
        }

        if (eventData && eventData.mainArtist) {
          const artists = Array.isArray(eventData.mainArtist)
            ? eventData.mainArtist
            : [eventData.mainArtist]
          // Decode HTML entities and clean up
          let artist = artists.join(', ')
            .replace(/&#8211;/g, '–')
            .replace(/&#8212;/g, '—')
            .replace(/&#8217;/g, "'")
            .replace(/&#8216;/g, "'")
            .replace(/&#8220;/g, '"')
            .replace(/&#8221;/g, '"')
            .replace(/&#038;/g, '&')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .trim()

          // Parse date from "MM/DD/YYYY H:MM pm" format
          const dateISO = parseShowDate(eventData.eventDate)
          const time = parseShowTime(eventData.eventDate || eventData.doors || '') || '8:00 PM'

          if (artist) {
            shows.push({
              artist,
              date: dateISO,
              time,
              venueId: 'lodge-room',
              link: eventData.link || 'https://www.lodgeroomhlp.com/',
              source: 'lodgeroomhlp.com',
            })
          }
        }
      } catch {}
    }

    console.log(`    Found ${shows.length} shows from Lodge Room (JS parse)`)
  } catch (err) {
    console.log(`    ERROR scraping Lodge Room: ${err.message}`)
  }

  return shows
}

// ── Scrape: metaljazz.com ──

async function scrapeMetalJazz() {
  console.log('  Scraping metaljazz.com...')
  const shows = []

  try {
    const html = await fetchPage('https://www.metaljazz.com/')
    const $ = cheerio.load(html)

    // Blogger structure: posts with h3 > a titles
    // Look for "Links: L.A. performances" posts
    $('.post-body, .entry-content, .post').each((_, el) => {
      const $el = $(el)
      const text = $el.text()

      // Only process posts about LA performances
      if (!text.toLowerCase().includes('performances') && !text.toLowerCase().includes('l.a.')) return

      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5)
      for (const line of lines) {
        const venueId = matchVenueFromText(line)
        if (venueId) {
          // Try to extract artist from the line (everything before the venue name)
          const venueDef = VENUES[venueId]
          const venueNames = [venueDef.name, venueDef.shortName].filter(Boolean)
          let artist = line
          for (const vn of venueNames) {
            const idx = line.toLowerCase().indexOf(vn.toLowerCase())
            if (idx > 0) {
              artist = line.slice(0, idx).replace(/[,\-–—:]+$/, '').trim()
              break
            }
          }

          if (artist && artist !== line) {
            shows.push({
              artist,
              venueId,
              source: 'metaljazz.com',
            })
          }
        }
      }
    })

    console.log(`    Found ${shows.length} listings from metaljazz.com`)
  } catch (err) {
    console.log(`    ERROR scraping metaljazz.com: ${err.message}`)
  }

  return shows
}

// ── Scrape: Baked Potato ──
// Baked Potato uses Divi WordPress theme — events are plain text blocks loaded via AJAX.
// The calendar page is /event/ (singular). Content is JS-rendered, requires Puppeteer.
// Events follow pattern: "Day Night, Month DD, YYYY @ Xpm & Xpm PST." with artist info in surrounding text.

async function scrapeBakedPotato() {
  console.log('  Scraping thebakedpotato.com...')
  const shows = []

  try {
    const puppeteer = await importPuppeteer()
    if (!puppeteer) {
      console.log('    Puppeteer not available — cannot scrape Baked Potato (JS-rendered)')
      return shows
    }

    let browser
    try {
      browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] })
      const page = await browser.newPage()
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36')
      await page.goto('https://www.thebakedpotato.com/event/', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      })
      await delay(5000)

      const bodyText = await page.evaluate(() => document.body.innerText)

      const lines = bodyText.split('\n').map(l => l.trim()).filter(Boolean)
      const dateRegex = /^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+Night,\s+(\w+)\s+(\d{1,2}),\s+(\d{4})\s+@\s+(.+?)(?:PST|PT)\.?$/i

      // Each event block: date line → artist name (first meaningful line) → description/prices/etc.
      // We grab ONE artist per date block, then skip to the next date.
      let currentDateISO = null
      let currentTime = null
      let gotArtistForDate = false

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const dateMatch = line.match(dateRegex)

        if (dateMatch) {
          const [, month, day, year, timeStr] = dateMatch
          currentDateISO = parseShowDate(`${month} ${day}, ${year}`)
          const timeMatch = timeStr.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i)
          currentTime = timeMatch ? timeMatch[1].toUpperCase().replace(/(\d)(AM|PM)/, '$1 $2') : '9:30 PM'
          gotArtistForDate = false // reset for new date block
          continue
        }

        // Already captured artist for this date block — skip remaining description lines
        if (gotArtistForDate || !currentDateISO) continue
        if (line.length <= 2 || line.length >= 120) continue

        const lineLow = line.toLowerCase()

        // Skip navigation, site chrome, ticket info, band member listings, prices
        if (/^\$/.test(line)) continue // prices: "$65.00 1st Show..."
        if (/\b(?:seating|patio|processing fee|book now|buy tickets)\b/i.test(line)) continue
        if (/\b(?:1st|2nd)\s+(?:set|show)\b/i.test(line)) continue
        if (/\b(?:featuring|feat\.)\b/i.test(line)) continue
        if (/\bshows?\b/i.test(line) && line.length < 20) continue // "2 SHOWs"
        if (/(?:\s+[–\u2013\u2014…-]\s*|\s+)(?:guitars?|bass|drums|keys|keyboards?|saxophone|sax|trumpet|vocals?|vox|piano|percussion|trombone|flute|organ|vibes|violin|cello|harmonica|rhoads|upright\s*bass|compositions?)\b/i.test(line) && line.split(/\s+/).length <= 6) continue // band member lines
        if (/you are not/i.test(line)) continue
        if (/live video concert/i.test(line)) continue
        if (/entertainment pure/i.test(line)) continue
        if (/^(?:jazz legend|location|showcase|coming soon|stay tuned|more info|details)s?\.{0,3}$/i.test(line)) continue
        if (/^\d+$/.test(line)) continue
        if (line.startsWith('http')) continue
        if (/^[©®™]/.test(line)) continue
        if (lineLow.includes('night,') && /\d{4}/.test(line)) continue

        const skipWords = ['menu', 'about', 'contact', 'home', 'baked potato', 'navigation', 'search',
          'copyright', 'calendar', 'select page', 'the baked potato', 'events',
          'reservations', 'directions', 'gallery', 'history', 'private events', 'gift cards',
          'facebook', 'instagram', 'twitter', 'follow us', 'sign up', 'newsletter',
          'all rights reserved', 'powered by', 'website by', 'pst.', 'pt.',
          'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
          'jazz/rock', 'groove', 'funk', 'the return', '#1 bar band']
        if (skipWords.some(w => lineLow.includes(w))) continue

        const artist = line.replace(/\s+/g, ' ').trim()
        if (artist && !isJunkArtist(artist)) {
          shows.push({
            artist,
            date: currentDateISO,
            time: currentTime || '9:30 PM',
            venueId: 'baked-potato',
            link: 'https://www.thebakedpotato.com/event/',
            price: '',
            source: 'thebakedpotato.com',
          })
          gotArtistForDate = true // one artist per date block
        }
      }

      console.log(`    Puppeteer found ${shows.length} shows from Baked Potato`)
    } catch (err) {
      console.log(`    Puppeteer scrape failed: ${err.message}`)
    } finally {
      if (browser) await browser.close()
    }

    console.log(`    Found ${shows.length} shows from Baked Potato`)
  } catch (err) {
    console.log(`    ERROR scraping Baked Potato: ${err.message}`)
  }

  return shows
}

// ── Scrape: Sam First ──
// Sam First is Wix (JS-rendered) and Puppeteer produces garbage
// (grabs nav, footer, social links, etc.). Shows come from lajazz.com instead.

async function scrapeSamFirst() {
  console.log('  Scraping Sam First... (via lajazz.com only)')
  return []
}

// ── Puppeteer Import Helper ──

async function importPuppeteer() {
  try {
    const mod = await import('puppeteer')
    return mod.default || mod
  } catch {
    return null
  }
}

// ── Scrape: Campus JAX ──
// Campus JAX uses server-rendered HTML with .eventWrapper containers.
// Structure: .eventTitle > p (artist), .eventDate (date), .eventTime (time)

async function scrapeCampusJax() {
  console.log('  Scraping campusjax.com/entertainment/...')
  const shows = []

  try {
    const html = await fetchPage('https://www.campusjax.com/entertainment/')
    const $ = cheerio.load(html)

    $('.eventWrapper, .outerWrapper').each((_, el) => {
      try {
        const $el = $(el)
        const artist = $el.find('.eventTitle p, .eventTitle').first().text().trim()
        if (!artist || isJunkArtist(artist)) return

        // Date: "Tue, Mar 17" — needs year appended
        const dateText = $el.find('.eventDate').first().text().trim()
        let dateISO = null
        if (dateText) {
          // Parse "Tue, Mar 17" or "Wed, Mar 18" format
          const match = dateText.match(/\w+,?\s*(\w+)\s+(\d{1,2})/)
          if (match) {
            const monthStr = match[1].toLowerCase()
            const day = match[2]
            const monthNum = MONTH_MAP[monthStr]
            if (monthNum !== undefined) {
              const year = TODAY.getFullYear()
              const d = new Date(year, monthNum, parseInt(day))
              // If the date is in the past, it's probably next year
              if (d < TODAY) d.setFullYear(year + 1)
              dateISO = d.toISOString().slice(0, 10)
            }
          }
        }

        // Time: "6:30 PM - 8:00 PM\nDoors at 5:00 PM"
        const timeText = $el.find('.eventTime').first().text().trim()
        const time = parseShowTime(timeText) || '7:00 PM'

        // Link from event detail page
        const link = $el.find('a[href*="/events/event/"]').attr('href')
          || $el.find('a').first().attr('href')
          || 'https://www.campusjax.com/entertainment/'
        const fullLink = link.startsWith('http') ? link : `https://www.campusjax.com${link}`

        shows.push({
          artist,
          date: dateISO,
          time,
          venueId: 'campus-jax',
          link: fullLink,
          source: 'campusjax.com',
        })
      } catch {}
    })

    console.log(`    Found ${shows.length} shows from Campus JAX`)
  } catch (err) {
    console.log(`    ERROR scraping Campus JAX: ${err.message}`)
  }

  return shows
}

// ── Venue Matching Helper ──

function matchVenueFromText(text) {
  if (!text) return null
  const lower = text.toLowerCase()

  // Check each venue's name and shortName (longest match first to avoid false positives)
  const entries = Object.entries(VENUES).sort((a, b) => b[1].name.length - a[1].name.length)

  for (const [vid, vdef] of entries) {
    if (lower.includes(vdef.name.toLowerCase())) return vid
  }
  for (const [vid, vdef] of entries) {
    if (lower.includes(vdef.shortName.toLowerCase())) return vid
  }

  return null
}

function cleanArtistName(title, venueId) {
  if (!venueId || !VENUES[venueId]) return title
  const vdef = VENUES[venueId]
  let cleaned = title
  for (const name of [vdef.name, vdef.shortName]) {
    cleaned = cleaned.replace(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '')
  }
  return cleaned.replace(/[@\-–—·|,]+\s*$/g, '').replace(/^\s*[@\-–—·|,]+/g, '').trim() || title
}

// ── Deduplication ──

function deduplicateShows(allShows) {
  const seen = new Map()

  for (const show of allShows) {
    const key = `${(show.artist || '').toLowerCase().replace(/[^a-z0-9]/g, '')}-${show.date}-${show.venueId}`
    if (!seen.has(key)) {
      seen.set(key, show)
    } else {
      // Prefer show with direct ticket link
      const existing = seen.get(key)
      if (show.link && (!existing.link || existing.link.includes('minaretrecords'))) {
        seen.set(key, { ...existing, link: show.link })
      }
    }
  }

  return [...seen.values()]
}

// ── Main ──

async function main() {
  console.log('')
  console.log('╔══════════════════════════════════════╗')
  console.log('║   THE PALACE — Jazz Venue Scraper    ║')
  console.log('╚══════════════════════════════════════╝')
  console.log('')
  console.log(`  Today: ${TODAY_ISO}`)
  console.log('')

  loadHotArtists()
  const scrapeErrors = []

  // ── 1. Scrape all sources ──
  console.log('')
  console.log('Scraping jazz venues...')

  // Blue Note LA (most reliable — structured calendar)
  let blueNoteShows = []
  try {
    blueNoteShows = await scrapeBlueNote()
  } catch (err) {
    scrapeErrors.push({ source: 'bluenotejazz.com', error: err.message })
  }

  await delay(2000)

  // Minaret Records (underground/indie scene)
  let minaretShows = []
  try {
    minaretShows = await scrapeMinaret()
  } catch (err) {
    scrapeErrors.push({ source: 'minaretrecords.com', error: err.message })
    console.log('  CRITICAL: Minaret scrape failed')
  }

  await delay(2000)

  // lajazz.com (aggregator — text parsing)
  let lajazzShows = []
  try {
    lajazzShows = await scrapeLAJazz()
  } catch (err) {
    scrapeErrors.push({ source: 'lajazz.com', error: err.message })
  }

  // Catalina Jazz Club
  let catalinaShows = []
  try {
    catalinaShows = await scrapeCatalina()
  } catch (err) {
    scrapeErrors.push({ source: 'catalinajazzclub.com', error: err.message })
  }

  await delay(2000)

  // Lodge Room (JS eventObjects parsing)
  let lodgeRoomShows = []
  try {
    lodgeRoomShows = await scrapeLodgeRoom()
  } catch (err) {
    scrapeErrors.push({ source: 'lodgeroomhlp.com', error: err.message })
  }

  // metaljazz.com (Greg Burk's blog)
  let metaljazzShows = []
  try {
    metaljazzShows = await scrapeMetalJazz()
  } catch (err) {
    scrapeErrors.push({ source: 'metaljazz.com', error: err.message })
  }

  // Baked Potato (Puppeteer)
  let bakedPotatoShows = []
  try {
    bakedPotatoShows = await scrapeBakedPotato()
  } catch (err) {
    scrapeErrors.push({ source: 'thebakedpotato.com', error: err.message })
  }

  // Sam First (Puppeteer)
  let samFirstShows = []
  try {
    samFirstShows = await scrapeSamFirst()
  } catch (err) {
    scrapeErrors.push({ source: 'samfirstbar.com', error: err.message })
  }

  // Campus JAX (server-rendered)
  let campusJaxShows = []
  try {
    campusJaxShows = await scrapeCampusJax()
  } catch (err) {
    scrapeErrors.push({ source: 'campusjax.com', error: err.message })
  }

  // Songkick LA Jazz (aggregator — JSON-LD MusicEvent schemas)
  let songkickShows = []
  try {
    console.log('  Scraping songkick.com/la/jazz...')
    songkickShows = await scrapeSongkick()
    console.log(`    Found ${songkickShows.length} shows from Songkick`)
  } catch (err) {
    scrapeErrors.push({ source: 'songkick.com', error: err.message })
  }

  // Dice.fm LA Jazz (__NEXT_DATA__ events)
  let diceShows = []
  try {
    console.log('  Scraping dice.fm/la/jazz...')
    diceShows = await scrapeDice()
    console.log(`    Found ${diceShows.length} shows from Dice.fm`)
  } catch (err) {
    scrapeErrors.push({ source: 'dice.fm', error: err.message })
  }

  // ── 2. Normalize all scraped data into structured shows ──
  const allShows = []

  // Blue Note shows — all shows from the calendar are upcoming
  for (const raw of blueNoteShows) {
    const date = raw.date || TODAY_ISO
    if (!isFutureDate(date)) continue
    allShows.push({
      artist: raw.artist,
      date,
      time: raw.time || '7:00 PM',
      venueId: 'blue-note-la',
      link: raw.link,
      notes: '',
      source: 'bluenotejazz.com',
    })
  }

  // Minaret shows (all marked as Minaret promoter)
  for (const raw of minaretShows) {
    const date = parseShowDate(raw.dateText)
    if (!date || !isFutureDate(date)) continue
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

  // lajazz shows — skip venues that have their own dedicated scrapers to avoid
  // duplicate entries with inaccurate TODAY_ISO dates
  const DEDICATED_SCRAPER_VENUES = new Set(['blue-note-la', 'catalina-jazz', 'baked-potato', 'lodge-room', 'campus-jax'])
  for (const raw of lajazzShows) {
    if (DEDICATED_SCRAPER_VENUES.has(raw.venueId)) continue // prefer dedicated scraper data
    allShows.push({
      artist: raw.artist,
      date: TODAY_ISO,
      time: raw.time || '8:00 PM',
      venueId: raw.venueId,
      link: raw.pageUrl || 'https://www.lajazz.com/',
      notes: '',
      source: 'lajazz.com',
    })
  }

  // Catalina shows
  for (const raw of catalinaShows) {
    const date = parseShowDate(raw.dateText)
    if (date && !isFutureDate(date)) continue
    allShows.push({
      artist: raw.artist,
      date: date || TODAY_ISO,
      time: raw.time || parseShowTime(raw.dateText) || '8:30 PM',
      venueId: 'catalina-jazz',
      link: raw.link,
      notes: '',
      source: 'catalinajazzclub.com',
    })
  }

  // Lodge Room shows — include all (books jazz-adjacent acts frequently)
  for (const raw of lodgeRoomShows) {
    if (raw.date && !isFutureDate(raw.date)) continue
    allShows.push({
      artist: raw.artist,
      date: raw.date || TODAY_ISO,
      time: raw.time || '8:00 PM',
      venueId: 'lodge-room',
      link: raw.link,
      notes: '',
      source: 'lodgeroomhlp.com',
    })
  }

  // Baked Potato shows
  for (const raw of bakedPotatoShows) {
    if (raw.date && !isFutureDate(raw.date)) continue
    allShows.push({
      artist: raw.artist,
      date: raw.date || TODAY_ISO,
      time: raw.time || '9:30 PM',
      venueId: 'baked-potato',
      link: raw.link,
      notes: '',
      source: 'thebakedpotato.com',
    })
  }

  // Sam First shows
  for (const raw of samFirstShows) {
    if (raw.date && !isFutureDate(raw.date)) continue
    allShows.push({
      artist: raw.artist,
      date: raw.date || TODAY_ISO,
      time: raw.time || '8:00 PM',
      venueId: 'sam-first',
      link: raw.link,
      notes: '',
      source: 'samfirstbar.com',
    })
  }

  // Campus JAX shows
  for (const raw of campusJaxShows) {
    if (raw.date && !isFutureDate(raw.date)) continue
    allShows.push({
      artist: raw.artist,
      date: raw.date || TODAY_ISO,
      time: raw.time || '7:00 PM',
      venueId: 'campus-jax',
      link: raw.link,
      notes: '',
      source: 'campusjax.com',
    })
  }

  // metaljazz shows (secondary signal, may not have dates)
  for (const raw of metaljazzShows) {
    allShows.push({
      artist: raw.artist,
      date: TODAY_ISO,
      time: '8:00 PM',
      venueId: raw.venueId,
      link: 'https://www.metaljazz.com/',
      notes: '',
      source: 'metaljazz.com',
    })
  }

  // Songkick + Dice shows (aggregators — venue names need mapping)
  const VENUE_NAME_MAP = {
    'blue note los angeles': 'blue-note-la',
    'blue note la': 'blue-note-la',
    'the baked potato': 'baked-potato',
    'baked potato': 'baked-potato',
    'catalina bar & grill': 'catalina-jazz',
    'catalina jazz club': 'catalina-jazz',
    'lodge room': 'lodge-room',
    'lodge room highland park': 'lodge-room',
    'sam first': 'sam-first',
    'vibrato grill & jazz': 'vibrato',
    'vibrato grill jazz': 'vibrato',
    'vibrato': 'vibrato',
    'the world stage': 'world-stage',
    'campus jax': 'campus-jax',
    'the high low': 'the-high-low',
    'the mint': 'the-mint',
    'the mint la': 'the-mint',
    'lighthouse cafe': 'lighthouse-cafe',
    'the lighthouse cafe': 'lighthouse-cafe',
    'scribble': 'scribble',
    'zebulon': 'zebulon',
    'gold diggers': 'gold-diggers',
    '2220 arts + archives': '2220-arts',
    '2220 arts & archives': '2220-arts',
  }

  function mapVenueName(venueName) {
    if (!venueName) return null
    const lower = venueName.toLowerCase().trim()
    return VENUE_NAME_MAP[lower] || null
  }

  for (const raw of [...songkickShows, ...diceShows]) {
    if (!isFutureDate(raw.date)) continue
    const venueId = mapVenueName(raw.venue)
    if (!venueId) continue // skip venues we don't track
    allShows.push({
      artist: raw.artist,
      date: raw.date,
      time: raw.time || '8:00 PM',
      venueId,
      link: raw.link || '',
      notes: '',
      source: raw.source,
    })
  }

  // ── 3. Filter past shows and junk entries ──
  const futureShows = allShows.filter(s => isFutureDate(s.date) && !isJunkArtist(s.artist))
  console.log(`\n  Future shows: ${futureShows.length} (filtered ${allShows.length - futureShows.length} past/junk)`)

  // ── 4. Deduplicate ──
  const dedupedShows = deduplicateShows(futureShows)
  console.log(`  After dedup: ${dedupedShows.length} shows`)

  // ── 5. Hot detection ──
  let hotCount = 0
  for (const show of dedupedShows) {
    show.hot = isHotShow(show, show.venueId, show.source)
    if (show.hot) hotCount++
  }
  console.log(`  Hot shows: ${hotCount}`)

  // ── 6. Organize by venue ──
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

  // ── 7. Build output ──
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
    source: 'bluenotejazz.com + lajazz.com + minaretrecords.com + venue sites',
    venues,
    ...(scrapeErrors.length > 0 ? { scrapeErrors } : {}),
  }

  // If no shows scraped, keep existing data
  const totalShows = venues.reduce((sum, v) => sum + v.shows.length, 0)
  if (totalShows === 0) {
    console.log('\n  WARNING: No shows scraped. Keeping existing jazz-venues.json.')
    console.log('  Sources may be down or HTML structure may have changed.')
    process.exit(0)
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2))

  console.log(`\nDone! ${totalShows} shows across ${venues.length} venues.`)
  console.log(`  Output: public/jazz-venues.json`)
  if (scrapeErrors.length > 0) {
    console.log(`  ${scrapeErrors.length} source(s) had errors:`)
    scrapeErrors.forEach(e => console.log(`    - ${e.source}: ${e.error}`))
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
