#!/usr/bin/env node

/**
 * THE PALACE — Screening Scraper
 *
 * Fetches real repertory cinema data from revivalhouses.com,
 * filters to our tracked theaters, and outputs public/theaters.json.
 *
 * Usage: npm run scrape
 */

import * as cheerio from 'cheerio'
import { execSync } from 'child_process'
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { sendGodfatherSMS } from './notify.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH = join(__dirname, '..', 'public', 'theaters.json')

// ── Theater Definitions ──
// Maps revivalhouses.com data-t filter IDs to our app's theater config.

const THEATERS = [
  {
    dataT: '3',
    id: 'new-beverly',
    name: 'New Beverly Cinema',
    shortName: 'New Bev',
    neighborhood: 'Fairfax',
    url: 'https://thenewbev.com/schedule/',
    color: '#C9A84C',
  },
  {
    dataT: '22',
    id: 'vista-theatre',
    name: 'Vista Theatre',
    shortName: 'Vista',
    neighborhood: 'Los Feliz',
    url: 'https://www.vistatheaterhollywood.com',
    color: '#8B4513',
  },
  {
    dataT: '28',
    id: 'academy-museum',
    name: 'Academy Museum',
    shortName: 'Academy',
    neighborhood: 'Miracle Mile',
    url: 'https://www.academymuseum.org/en/programs',
    color: '#6B2737',
  },
  {
    dataT: '30',
    id: 'alamo-dtla',
    name: 'Alamo Drafthouse — Downtown LA',
    shortName: 'Alamo',
    neighborhood: 'Downtown',
    url: 'https://drafthouse.com/los-angeles',
    color: '#CC3333',
  },
  {
    dataT: '2',
    id: 'egyptian',
    name: 'American Cinematheque — Egyptian Theatre',
    shortName: 'Egyptian',
    neighborhood: 'Hollywood',
    url: 'https://www.americancinematheque.com/now-showing/',
    color: '#D4A84B',
  },
  {
    dataT: '1',
    id: 'aero',
    name: 'American Cinematheque — Aero Theatre',
    shortName: 'Aero',
    neighborhood: 'Santa Monica',
    url: 'https://www.americancinematheque.com/now-showing/',
    color: '#4A90A4',
  },
  {
    dataT: '57',
    id: 'vidiots',
    name: 'Vidiots',
    shortName: 'Vidiots',
    neighborhood: 'Eagle Rock',
    url: 'https://vidiotsfoundation.org/calendar',
    color: '#5B8C5A',
  },
  {
    dataT: '33',
    id: 'brain-dead',
    name: 'Brain Dead Studios',
    shortName: 'Brain Dead',
    neighborhood: 'Fairfax',
    url: 'https://studios.wearebraindead.com',
    color: '#4A7C59',
  },
  {
    dataT: '5',
    id: 'billy-wilder',
    name: 'Billy Wilder Theater at the Hammer',
    shortName: 'Hammer',
    neighborhood: 'Westwood',
    url: 'https://hammer.ucla.edu/programs-events',
    color: '#2E5090',
  },
  {
    dataT: '67',
    id: 'redcat',
    name: 'REDCAT',
    shortName: 'REDCAT',
    neighborhood: 'Downtown',
    url: 'https://www.redcat.org',
    color: '#D94F30',
  },
  {
    dataT: '34',
    id: 'laemmle-nuart',
    name: 'Laemmle Nuart Theatre',
    shortName: 'Nuart',
    neighborhood: 'West LA',
    url: 'https://www.laemmle.com',
    color: '#7B68AE',
  },
  {
    dataT: '9',
    id: 'laemmle-noho',
    name: 'Laemmle NoHo 7',
    shortName: 'NoHo 7',
    neighborhood: 'North Hollywood',
    url: 'https://www.laemmle.com',
    color: '#9B7EC8',
  },
  {
    dataT: '29',
    id: 'los-feliz-3',
    name: 'Los Feliz 3',
    shortName: 'Los Feliz 3',
    neighborhood: 'Los Feliz',
    url: 'https://www.vintagecinemas.com/losfeliz',
    color: '#A88BC4',
  },
  {
    dataT: '7',
    id: 'laemmle-royal',
    name: 'Laemmle Royal',
    shortName: 'Royal',
    neighborhood: 'West LA',
    url: 'https://www.laemmle.com',
    color: '#6A5B8E',
  },
]

// Build a lookup: data-t value → theater config
const THEATER_BY_DATA_T = {}
for (const t of THEATERS) {
  THEATER_BY_DATA_T[t.dataT] = t
}

// ── Utility ──

function generateId(theaterId, title, date) {
  const slug = `${theaterId}-${title}-${date}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return slug.substring(0, 80)
}

function detectFormat(text) {
  if (!text) return 'digital'
  const lower = text.toLowerCase()
  if (lower.includes('nitrate')) return 'nitrate'
  if (lower.includes('70mm')) return '70mm'
  if (lower.includes('35mm')) return '35mm'
  if (lower.includes('16mm')) return '16mm'
  if (lower.includes('imax')) return 'IMAX'
  return 'digital'
}

function fetchPage(url) {
  const html = execSync(
    `curl -s --max-time 30 -L -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' '${url}'`,
    { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 },
  )
  if (!html || html.length < 100) {
    throw new Error(`Empty response from ${url}`)
  }
  return html
}

// ── Scrape revivalhouses.com ──

async function scrapeRevivalHouses() {
  console.log('Fetching revivalhouses.com...')
  const html = await fetchPage('https://www.revivalhouses.com')
  const $ = cheerio.load(html)

  // Collect screenings grouped by our theater IDs
  const screeningsByTheater = {}
  for (const t of THEATERS) {
    screeningsByTheater[t.id] = []
  }

  // Each date is a <section id="2026-02-28" class="Date__wrapper ...">
  // Inside: <ol class="Movies"> with <li class="Movie" data-t="3"> entries
  const dateSections = $('section.Date__wrapper')
  console.log(`  Found ${dateSections.length} date sections`)

  dateSections.each((_, section) => {
    const $section = $(section)
    const dateId = $section.attr('id') // e.g. "2026-02-28"

    if (!dateId || !/^\d{4}-\d{2}-\d{2}$/.test(dateId)) return

    $section.find('li.Movie').each((_, li) => {
      const $li = $(li)
      const dataT = $li.attr('data-t')

      // Only process screenings at theaters we track
      const theater = THEATER_BY_DATA_T[dataT]
      if (!theater) return

      // Extract fields
      const title = $li.find('cite').first().text().trim()
      const time = $li.find('time').first().text().trim()
      const note = $li.find('.Movie__note').text().trim()
      const ticketLink = $li.find('a.Btn.js-tl').attr('href') || ''
      const filmLink = $li.find('.Movie__title a').attr('href') || ''

      if (!title) return

      // Detect format from title, note, or surrounding text
      const allText = `${title} ${note}`
      const format = detectFormat(allText)

      // Clean up title: remove format suffixes like "(70mm)" that are part of the title on revivalhouses
      const cleanTitle = title
        .replace(/\s*\((?:70mm|35mm|16mm|IMAX|nitrate)\)\s*/gi, '')
        .trim()

      screeningsByTheater[theater.id].push({
        id: generateId(theater.id, cleanTitle, dateId),
        title: cleanTitle,
        date: dateId,
        time: time || '',
        format,
        notes: note || '',
        link: ticketLink || filmLink || theater.url,
      })
    })
  })

  return screeningsByTheater
}

// ── Main ──

async function main() {
  console.log('')
  console.log('╔══════════════════════════════════════╗')
  console.log('║   THE PALACE — Screening Scraper     ║')
  console.log('╚══════════════════════════════════════╝')
  console.log('')

  const screeningsByTheater = await scrapeRevivalHouses()

  // Build output
  const outputTheaters = THEATERS.map(theater => {
    const screenings = screeningsByTheater[theater.id]
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))

    console.log(`  ${theater.name}: ${screenings.length} screenings`)

    return {
      id: theater.id,
      name: theater.name,
      shortName: theater.shortName,
      neighborhood: theater.neighborhood,
      url: theater.url,
      color: theater.color,
      screenings,
    }
  })

  const totalScreenings = outputTheaters.reduce((sum, t) => sum + t.screenings.length, 0)

  if (totalScreenings === 0) {
    console.log('')
    console.log('WARNING: No screenings scraped. Keeping existing theaters.json.')
    console.log('  revivalhouses.com may be down or its HTML structure may have changed.')
    process.exit(1)
  }

  const result = {
    lastUpdated: new Date().toISOString(),
    source: 'revivalhouses.com',
    theaters: outputTheaters,
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2))

  console.log('')
  console.log(`Done! ${totalScreenings} real screenings across ${outputTheaters.length} theaters.`)
  console.log(`Output: ${OUTPUT_PATH}`)

  // Send Liza an SMS if The Godfather is screening
  console.log('')
  console.log('Checking for Godfather screenings...')
  await sendGodfatherSMS(result)

  console.log('')
}

main().catch(err => {
  console.error('Fatal scraper error:', err)
  process.exit(1)
})
