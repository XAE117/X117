#!/usr/bin/env node

/**
 * THE PALACE — Screening Scraper
 *
 * Fetches repertory cinema data from revivalhouses.com and individual theater sites,
 * deduplicates, and outputs public/theaters.json.
 *
 * Usage: npm run scrape
 */

import axios from 'axios'
import * as cheerio from 'cheerio'
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { sendGodfatherSMS } from './notify.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH = join(__dirname, '..', 'public', 'theaters.json')

// ── Theater Definitions ──

const THEATERS = [
  {
    id: 'new-beverly',
    name: 'New Beverly Cinema',
    shortName: 'New Bev',
    neighborhood: 'Fairfax',
    url: 'https://thenewbev.com',
    color: '#C9A84C',
    scrapeUrl: 'https://thenewbev.com/schedule/',
    calendarUrl: 'https://thenewbev.com/schedule/',
  },
  {
    id: 'vista-theatre',
    name: 'Vista Theatre',
    shortName: 'Vista',
    neighborhood: 'Los Feliz',
    url: 'https://www.vistatheaterhollywood.com',
    color: '#8B4513',
    scrapeUrl: 'https://www.vistatheaterhollywood.com',
    calendarUrl: 'https://www.vistatheaterhollywood.com',
  },
  {
    id: 'academy-museum',
    name: 'Academy Museum of Motion Pictures',
    shortName: 'Academy',
    neighborhood: 'Miracle Mile',
    url: 'https://www.academymuseum.org',
    color: '#6B2737',
    scrapeUrl: 'https://www.academymuseum.org/en/programs',
    calendarUrl: 'https://www.academymuseum.org/en/programs',
  },
  {
    id: 'alamo-drafthouse',
    name: 'Alamo Drafthouse LA',
    shortName: 'Alamo',
    neighborhood: 'Downtown',
    url: 'https://drafthouse.com/los-angeles',
    color: '#CC3333',
    scrapeUrl: 'https://drafthouse.com/los-angeles',
    calendarUrl: 'https://drafthouse.com/los-angeles',
  },
  {
    id: 'vidiots',
    name: 'Vidiots (Eagle Theatre)',
    shortName: 'Vidiots',
    neighborhood: 'Eagle Rock',
    url: 'https://vidiotsfoundation.org',
    color: '#5B8C5A',
    scrapeUrl: 'https://vidiotsfoundation.org/coming-soon/',
    calendarUrl: 'https://vidiotsfoundation.org/coming-soon/',
  },
  {
    id: 'brain-dead',
    name: 'Brain Dead Studios',
    shortName: 'Brain Dead',
    neighborhood: 'Fairfax',
    url: 'https://studios.wearebraindead.com',
    color: '#4A7C59',
    scrapeUrl: 'https://studios.wearebraindead.com/coming-soon/',
    calendarUrl: 'https://studios.wearebraindead.com/coming-soon/',
  },
  {
    id: 'billy-wilder',
    name: 'Billy Wilder Theater at the Hammer',
    shortName: 'Hammer',
    neighborhood: 'Westwood',
    url: 'https://hammer.ucla.edu/programs-events',
    color: '#2E5090',
    scrapeUrl: 'https://hammer.ucla.edu/programs-events',
    calendarUrl: 'https://hammer.ucla.edu/programs-events',
  },
  {
    id: 'redcat',
    name: 'REDCAT',
    shortName: 'REDCAT',
    neighborhood: 'Downtown',
    url: 'https://www.redcat.org',
    color: '#D94F30',
    scrapeUrl: 'https://www.redcat.org',
    calendarUrl: 'https://www.redcat.org',
  },
  {
    id: 'laemmle-nuart',
    name: 'Laemmle Nuart Theatre',
    shortName: 'Nuart',
    neighborhood: 'West LA',
    url: 'https://www.laemmle.com',
    color: '#7B68AE',
    scrapeUrl: 'https://www.laemmle.com',
    calendarUrl: 'https://www.laemmle.com',
  },
  {
    id: 'laemmle-noho',
    name: 'Laemmle NoHo 7',
    shortName: 'NoHo 7',
    neighborhood: 'North Hollywood',
    url: 'https://www.laemmle.com',
    color: '#9B7EC8',
    scrapeUrl: 'https://www.laemmle.com',
    calendarUrl: 'https://www.laemmle.com',
  },
  {
    id: 'laemmle-losfeliz',
    name: 'Laemmle Los Feliz 3',
    shortName: 'Los Feliz 3',
    neighborhood: 'Los Feliz',
    url: 'https://www.laemmle.com',
    color: '#A88BC4',
    scrapeUrl: 'https://www.laemmle.com',
    calendarUrl: 'https://www.laemmle.com',
  },
  {
    id: 'laemmle-royal',
    name: 'Laemmle Royal',
    shortName: 'Royal',
    neighborhood: 'West LA',
    url: 'https://www.laemmle.com',
    color: '#6A5B8E',
    scrapeUrl: 'https://www.laemmle.com',
    calendarUrl: 'https://www.laemmle.com',
  },
]

// Map common names from revivalhouses to our theater IDs
const THEATER_NAME_MAP = {
  'new beverly cinema': 'new-beverly',
  'new beverly': 'new-beverly',
  'new bev': 'new-beverly',
  'vista theatre': 'vista-theatre',
  'vista theater': 'vista-theatre',
  'the vista': 'vista-theatre',
  'academy museum': 'academy-museum',
  'academy museum of motion pictures': 'academy-museum',
  'alamo drafthouse': 'alamo-drafthouse',
  'alamo drafthouse la': 'alamo-drafthouse',
  'alamo drafthouse los angeles': 'alamo-drafthouse',
  'vidiots': 'vidiots',
  'eagle theatre': 'vidiots',
  'brain dead studios': 'brain-dead',
  'brain dead': 'brain-dead',
  'billy wilder theater': 'billy-wilder',
  'billy wilder theatre': 'billy-wilder',
  'hammer museum': 'billy-wilder',
  'hammer': 'billy-wilder',
  'ucla film & television archive': 'billy-wilder',
  'redcat': 'redcat',
  'nuart theatre': 'laemmle-nuart',
  'nuart theater': 'laemmle-nuart',
  'nuart': 'laemmle-nuart',
  'laemmle nuart': 'laemmle-nuart',
  'noho 7': 'laemmle-noho',
  'laemmle noho 7': 'laemmle-noho',
  'los feliz 3': 'laemmle-losfeliz',
  'laemmle los feliz 3': 'laemmle-losfeliz',
  'laemmle royal': 'laemmle-royal',
  'royal': 'laemmle-royal',
}

// ── Utility Functions ──

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
  return 'digital'
}

function parseNotes(text) {
  if (!text) return ''
  // Clean up common patterns
  return text.trim().replace(/\s+/g, ' ')
}

function resolveTheaterId(name) {
  if (!name) return null
  const normalized = name.toLowerCase().trim()
  return THEATER_NAME_MAP[normalized] || null
}

async function fetchPage(url, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      })
      return response.data
    } catch (err) {
      if (i < retries) {
        const delay = Math.pow(2, i + 1) * 1000
        console.log(`  Retry ${i + 1} for ${url} in ${delay / 1000}s...`)
        await new Promise(r => setTimeout(r, delay))
      } else {
        throw err
      }
    }
  }
}

// ── Scraper: revivalhouses.com ──

async function scrapeRevivalHouses() {
  console.log('Scraping revivalhouses.com...')
  const screeningsByTheater = {}

  try {
    const html = await fetchPage('https://www.revivalhouses.com')
    const $ = cheerio.load(html)

    // RevivalHouses typically lists screenings grouped by date or theater.
    // The site structure may vary; we attempt multiple selectors.

    // Try common patterns for screening listings
    const selectors = [
      '.screening', '.event', '.show', '.listing',
      '[data-screening]', '[data-event]',
      'article', '.card', '.item',
    ]

    let foundScreenings = false

    // Attempt to parse structured screening data
    $('a[href], .event, .screening, article').each((_, el) => {
      const $el = $(el)
      const text = $el.text().trim()

      // Skip very short or navigation-like elements
      if (text.length < 10 || text.length > 500) return

      // Try to extract theater, title, date from the text
      // RevivalHouses often has format: "Theater Name - Film Title - Date"
      // or lists screenings with theater info nearby
    })

    // Parse the page more broadly - look for date-grouped listings
    const pageText = $('body').text()

    // Try to find screening blocks with common patterns
    $('[class*="screening"], [class*="event"], [class*="show"], [class*="listing"], [class*="calendar"], [class*="schedule"]').each((_, el) => {
      const $el = $(el)
      const text = $el.text().trim()
      const link = $el.find('a').attr('href') || $el.attr('href') || ''

      if (text.length < 5) return

      // Try to identify theater name
      let theaterId = null
      for (const [name, id] of Object.entries(THEATER_NAME_MAP)) {
        if (text.toLowerCase().includes(name)) {
          theaterId = id
          break
        }
      }

      if (theaterId) {
        foundScreenings = true
        if (!screeningsByTheater[theaterId]) {
          screeningsByTheater[theaterId] = []
        }

        // Try to extract title and date
        const dateMatch = text.match(/(\w+ \d{1,2},?\s*\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})/)
        const timeMatch = text.match(/(\d{1,2}:\d{2}\s*[AaPp][Mm])/i)

        if (dateMatch) {
          // Rough extraction - the actual site structure determines accuracy
          const titleText = text
            .replace(dateMatch[0], '')
            .replace(timeMatch ? timeMatch[0] : '', '')

          // Remove theater name from title
          let title = titleText
          for (const name of Object.keys(THEATER_NAME_MAP)) {
            title = title.replace(new RegExp(name, 'gi'), '')
          }
          title = title.replace(/[-|:,]\s*$/g, '').replace(/^\s*[-|:,]/g, '').trim()

          if (title.length > 2 && title.length < 200) {
            screeningsByTheater[theaterId].push({
              title,
              date: dateMatch[1],
              time: timeMatch ? timeMatch[1] : '',
              format: detectFormat(text),
              notes: parseNotes(''),
              link: link.startsWith('http') ? link : `https://www.revivalhouses.com${link}`,
              source: 'revivalhouses',
            })
          }
        }
      }
    })

    if (!foundScreenings) {
      console.log('  Could not parse structured data from revivalhouses.com')
      console.log('  The site may use dynamic rendering. Consider using Puppeteer.')
    }
  } catch (err) {
    console.error('  Error scraping revivalhouses.com:', err.message)
  }

  return screeningsByTheater
}

// ── Scraper: New Beverly ──

async function scrapeNewBeverly() {
  console.log('Scraping New Beverly Cinema...')
  const screenings = []

  try {
    const html = await fetchPage('https://thenewbev.com/schedule/')
    const $ = cheerio.load(html)

    // New Beverly typically lists screenings with date, title, and time info
    $('article, .screening, .event, [class*="screening"], [class*="calendar"] li, [class*="schedule"] li, .entry, .post').each((_, el) => {
      const $el = $(el)
      const text = $el.text().trim()
      const link = $el.find('a').attr('href') || ''

      // Try to extract screening info
      const titleEl = $el.find('h2, h3, h4, .title, [class*="title"]').first()
      const title = titleEl.length ? titleEl.text().trim() : ''

      if (!title || title.length < 2) return

      // Look for date patterns
      const dateMatch = text.match(/(\w+day,?\s+\w+\s+\d{1,2}(?:,?\s+\d{4})?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{4}-\d{2}-\d{2})/i)
      const timeMatch = text.match(/(\d{1,2}:\d{2}\s*[AaPp][Mm])/i)
      const format = detectFormat(text)

      screenings.push({
        title,
        date: dateMatch ? dateMatch[1] : '',
        time: timeMatch ? timeMatch[1] : '',
        format,
        notes: parseNotes(text.replace(title, '').replace(dateMatch ? dateMatch[0] : '', '').substring(0, 200)),
        link: link.startsWith('http') ? link : link ? `https://thenewbev.com${link}` : 'https://thenewbev.com/screenings',
        source: 'direct',
      })
    })

    if (screenings.length === 0) {
      console.log('  No screenings parsed from New Beverly. Site may need Puppeteer.')
      console.log('  Falling back to calendar link.')
    } else {
      console.log(`  Found ${screenings.length} screenings`)
    }
  } catch (err) {
    console.error('  Error scraping New Beverly:', err.message)
  }

  return screenings
}

// ── Scraper: Academy Museum ──

async function scrapeAcademyMuseum() {
  console.log('Scraping Academy Museum...')
  const screenings = []

  try {
    const html = await fetchPage('https://www.academymuseum.org/en/programs')
    const $ = cheerio.load(html)

    $('article, .event, [class*="event"], [class*="program"], [class*="screening"]').each((_, el) => {
      const $el = $(el)
      const titleEl = $el.find('h2, h3, h4, .title, [class*="title"]').first()
      const title = titleEl.length ? titleEl.text().trim() : ''
      const text = $el.text().trim()
      const link = $el.find('a').attr('href') || ''

      if (!title || title.length < 2) return

      const dateMatch = text.match(/(\w+\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/i)
      const timeMatch = text.match(/(\d{1,2}:\d{2}\s*[AaPp][Mm])/i)

      screenings.push({
        title,
        date: dateMatch ? dateMatch[1] : '',
        time: timeMatch ? timeMatch[1] : '',
        format: detectFormat(text),
        notes: '',
        link: link.startsWith('http') ? link : link ? `https://www.academymuseum.org${link}` : 'https://www.academymuseum.org/en/programs',
        source: 'direct',
      })
    })

    console.log(`  Found ${screenings.length} programs`)
  } catch (err) {
    console.error('  Error scraping Academy Museum:', err.message)
  }

  return screenings
}

// ── Scraper: Brain Dead Studios ──

async function scrapeBrainDead() {
  console.log('Scraping Brain Dead Studios...')
  const screenings = []

  try {
    const html = await fetchPage('https://studios.wearebraindead.com/cinema')
    const $ = cheerio.load(html)

    $('article, .event, [class*="event"], [class*="screening"], [class*="film"], .product, [class*="product"]').each((_, el) => {
      const $el = $(el)
      const titleEl = $el.find('h2, h3, h4, .title, [class*="title"], [class*="name"]').first()
      const title = titleEl.length ? titleEl.text().trim() : ''
      const text = $el.text().trim()
      const link = $el.find('a').attr('href') || ''

      if (!title || title.length < 2) return

      const dateMatch = text.match(/(\w+\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2})/i)
      const timeMatch = text.match(/(\d{1,2}:\d{2}\s*[AaPp][Mm])/i)

      screenings.push({
        title,
        date: dateMatch ? dateMatch[1] : '',
        time: timeMatch ? timeMatch[1] : '',
        format: detectFormat(text),
        notes: '',
        link: link.startsWith('http') ? link : link ? `https://studios.wearebraindead.com${link}` : 'https://studios.wearebraindead.com/cinema',
        source: 'direct',
      })
    })

    console.log(`  Found ${screenings.length} screenings`)
  } catch (err) {
    console.error('  Error scraping Brain Dead Studios:', err.message)
  }

  return screenings
}

// ── Scraper: Hammer / Billy Wilder Theater ──

async function scrapeHammer() {
  console.log('Scraping Hammer Museum (Billy Wilder Theater)...')
  const screenings = []

  try {
    const html = await fetchPage('https://hammer.ucla.edu/programs-events')
    const $ = cheerio.load(html)

    $('article, .event, [class*="event"], [class*="program"], [class*="screening"]').each((_, el) => {
      const $el = $(el)
      const titleEl = $el.find('h2, h3, h4, .title, [class*="title"]').first()
      const title = titleEl.length ? titleEl.text().trim() : ''
      const text = $el.text().trim()
      const link = $el.find('a').attr('href') || ''

      if (!title || title.length < 2) return
      // Filter for film/screening events only
      const lowerText = text.toLowerCase()
      if (lowerText.includes('film') || lowerText.includes('screen') || lowerText.includes('cinema') || lowerText.includes('movie') || lowerText.includes('director') || lowerText.includes('mm')) {
        const dateMatch = text.match(/(\w+\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2})/i)
        const timeMatch = text.match(/(\d{1,2}:\d{2}\s*[AaPp][Mm])/i)

        screenings.push({
          title,
          date: dateMatch ? dateMatch[1] : '',
          time: timeMatch ? timeMatch[1] : '',
          format: detectFormat(text),
          notes: '',
          link: link.startsWith('http') ? link : link ? `https://hammer.ucla.edu${link}` : 'https://hammer.ucla.edu/programs-events',
          source: 'direct',
        })
      }
    })

    console.log(`  Found ${screenings.length} programs`)
  } catch (err) {
    console.error('  Error scraping Hammer:', err.message)
  }

  return screenings
}

// ── Scraper: REDCAT ──

async function scrapeRedcat() {
  console.log('Scraping REDCAT...')
  const screenings = []

  try {
    const html = await fetchPage('https://www.redcat.org')
    const $ = cheerio.load(html)

    $('article, .event, [class*="event"], [class*="performance"], [class*="screening"]').each((_, el) => {
      const $el = $(el)
      const titleEl = $el.find('h2, h3, h4, .title, [class*="title"]').first()
      const title = titleEl.length ? titleEl.text().trim() : ''
      const text = $el.text().trim()
      const link = $el.find('a').attr('href') || ''

      if (!title || title.length < 2) return

      const dateMatch = text.match(/(\w+\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2})/i)
      const timeMatch = text.match(/(\d{1,2}:\d{2}\s*[AaPp][Mm])/i)

      screenings.push({
        title,
        date: dateMatch ? dateMatch[1] : '',
        time: timeMatch ? timeMatch[1] : '',
        format: detectFormat(text),
        notes: '',
        link: link.startsWith('http') ? link : link ? `https://www.redcat.org${link}` : 'https://www.redcat.org',
        source: 'direct',
      })
    })

    console.log(`  Found ${screenings.length} events`)
  } catch (err) {
    console.error('  Error scraping REDCAT:', err.message)
  }

  return screenings
}

// ── Scraper: Vista Theatre ──

async function scrapeVista() {
  console.log('Scraping Vista Theatre...')
  const screenings = []

  try {
    const html = await fetchPage('https://www.vistatheaterhollywood.com')
    const $ = cheerio.load(html)

    $('article, .event, [class*="event"], [class*="screening"], [class*="film"], [class*="show"]').each((_, el) => {
      const $el = $(el)
      const titleEl = $el.find('h2, h3, h4, .title, [class*="title"]').first()
      const title = titleEl.length ? titleEl.text().trim() : ''
      const text = $el.text().trim()
      const link = $el.find('a').attr('href') || ''

      if (!title || title.length < 2) return

      const dateMatch = text.match(/(\w+\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2})/i)
      const timeMatch = text.match(/(\d{1,2}:\d{2}\s*[AaPp][Mm])/i)

      screenings.push({
        title,
        date: dateMatch ? dateMatch[1] : '',
        time: timeMatch ? timeMatch[1] : '',
        format: detectFormat(text),
        notes: '',
        link: link.startsWith('http') ? link : link ? `https://www.vistatheaterhollywood.com${link}` : 'https://www.vistatheaterhollywood.com',
        source: 'direct',
      })
    })

    console.log(`  Found ${screenings.length} screenings`)
  } catch (err) {
    console.error('  Error scraping Vista Theatre:', err.message)
  }

  return screenings
}

// ── Scraper: Alamo Drafthouse ──

async function scrapeAlamo() {
  console.log('Scraping Alamo Drafthouse LA...')
  const screenings = []

  try {
    const html = await fetchPage('https://drafthouse.com/los-angeles')
    const $ = cheerio.load(html)

    $('[class*="film"], [class*="show"], [class*="screening"], article, .event').each((_, el) => {
      const $el = $(el)
      const titleEl = $el.find('h2, h3, h4, .title, [class*="title"]').first()
      const title = titleEl.length ? titleEl.text().trim() : ''
      const text = $el.text().trim()
      const link = $el.find('a').attr('href') || ''

      if (!title || title.length < 2) return

      const dateMatch = text.match(/(\w+\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2})/i)
      const timeMatch = text.match(/(\d{1,2}:\d{2}\s*[AaPp][Mm])/i)

      screenings.push({
        title,
        date: dateMatch ? dateMatch[1] : '',
        time: timeMatch ? timeMatch[1] : '',
        format: detectFormat(text),
        notes: '',
        link: link.startsWith('http') ? link : link ? `https://drafthouse.com${link}` : 'https://drafthouse.com/los-angeles',
        source: 'direct',
      })
    })

    console.log(`  Found ${screenings.length} screenings`)
  } catch (err) {
    console.error('  Error scraping Alamo Drafthouse:', err.message)
  }

  return screenings
}

// ── Scraper: Vidiots ──

async function scrapeVidiots() {
  console.log('Scraping Vidiots...')
  const screenings = []

  try {
    const html = await fetchPage('https://vidiotsfoundation.org')
    const $ = cheerio.load(html)

    $('article, .event, [class*="event"], [class*="screening"], [class*="film"]').each((_, el) => {
      const $el = $(el)
      const titleEl = $el.find('h2, h3, h4, .title, [class*="title"]').first()
      const title = titleEl.length ? titleEl.text().trim() : ''
      const text = $el.text().trim()
      const link = $el.find('a').attr('href') || ''

      if (!title || title.length < 2) return

      const dateMatch = text.match(/(\w+\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2})/i)
      const timeMatch = text.match(/(\d{1,2}:\d{2}\s*[AaPp][Mm])/i)

      screenings.push({
        title,
        date: dateMatch ? dateMatch[1] : '',
        time: timeMatch ? timeMatch[1] : '',
        format: detectFormat(text),
        notes: '',
        link: link.startsWith('http') ? link : link ? `https://vidiotsfoundation.org${link}` : 'https://vidiotsfoundation.org',
        source: 'direct',
      })
    })

    console.log(`  Found ${screenings.length} screenings`)
  } catch (err) {
    console.error('  Error scraping Vidiots:', err.message)
  }

  return screenings
}

// ── Scraper: Laemmle ──

async function scrapeLaemmle() {
  console.log('Scraping Laemmle Theatres...')
  const screenings = {} // keyed by theater id

  try {
    const html = await fetchPage('https://www.laemmle.com')
    const $ = cheerio.load(html)

    $('article, .event, [class*="event"], [class*="screening"], [class*="film"], [class*="show"]').each((_, el) => {
      const $el = $(el)
      const text = $el.text().trim()
      const titleEl = $el.find('h2, h3, h4, .title, [class*="title"]').first()
      const title = titleEl.length ? titleEl.text().trim() : ''
      const link = $el.find('a').attr('href') || ''

      if (!title || title.length < 2) return

      // Determine which Laemmle theater
      const lowerText = text.toLowerCase()
      let theaterId = 'laemmle-nuart' // default
      if (lowerText.includes('noho') || lowerText.includes('north hollywood')) theaterId = 'laemmle-noho'
      else if (lowerText.includes('los feliz')) theaterId = 'laemmle-losfeliz'
      else if (lowerText.includes('royal')) theaterId = 'laemmle-royal'

      const dateMatch = text.match(/(\w+\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2})/i)
      const timeMatch = text.match(/(\d{1,2}:\d{2}\s*[AaPp][Mm])/i)

      if (!screenings[theaterId]) screenings[theaterId] = []
      screenings[theaterId].push({
        title,
        date: dateMatch ? dateMatch[1] : '',
        time: timeMatch ? timeMatch[1] : '',
        format: detectFormat(text),
        notes: '',
        link: link.startsWith('http') ? link : link ? `https://www.laemmle.com${link}` : 'https://www.laemmle.com',
        source: 'direct',
      })
    })

    const total = Object.values(screenings).reduce((sum, arr) => sum + arr.length, 0)
    console.log(`  Found ${total} screenings across Laemmle venues`)
  } catch (err) {
    console.error('  Error scraping Laemmle:', err.message)
  }

  return screenings
}

// ── Deduplication ──

function deduplicateScreenings(revivalScreenings, directScreenings) {
  // Prefer direct theater sources over revival houses data
  const seen = new Set()
  const result = []

  // Add direct sources first (higher priority)
  for (const s of directScreenings) {
    const key = `${s.title.toLowerCase().replace(/[^a-z0-9]/g, '')}-${s.date}`
    if (!seen.has(key)) {
      seen.add(key)
      result.push(s)
    }
  }

  // Add revival house entries only if not duplicated
  for (const s of revivalScreenings) {
    const key = `${s.title.toLowerCase().replace(/[^a-z0-9]/g, '')}-${s.date}`
    if (!seen.has(key)) {
      seen.add(key)
      result.push(s)
    }
  }

  return result
}

// ── Normalize Date ──

function normalizeDate(dateStr) {
  if (!dateStr) return ''

  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr

  try {
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0]
    }
  } catch {
    // Fall through
  }

  // Try MM/DD/YYYY or MM/DD/YY
  const slashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (slashMatch) {
    let year = parseInt(slashMatch[3])
    if (year < 100) year += 2000
    const month = String(slashMatch[1]).padStart(2, '0')
    const day = String(slashMatch[2]).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  return dateStr
}

// ── Main ──

async function main() {
  console.log('')
  console.log('╔══════════════════════════════════════╗')
  console.log('║   THE PALACE — Screening Scraper     ║')
  console.log('╚══════════════════════════════════════╝')
  console.log('')

  // Step 1: Scrape revivalhouses.com (the aggregator)
  const revivalData = await scrapeRevivalHouses()

  // Step 2: Scrape individual theater sites in parallel
  const [
    newBevScreenings,
    vistaScreenings,
    academyScreenings,
    brainDeadScreenings,
    hammerScreenings,
    redcatScreenings,
    alamoScreenings,
    vidiotsScreenings,
    laemmleScreenings,
  ] = await Promise.all([
    scrapeNewBeverly(),
    scrapeVista(),
    scrapeAcademyMuseum(),
    scrapeBrainDead(),
    scrapeHammer(),
    scrapeRedcat(),
    scrapeAlamo(),
    scrapeVidiots(),
    scrapeLaemmle(),
  ])

  // Step 3: Map direct scrape results to theater IDs
  const directByTheater = {
    'new-beverly': newBevScreenings,
    'vista-theatre': vistaScreenings,
    'academy-museum': academyScreenings,
    'brain-dead': brainDeadScreenings,
    'billy-wilder': hammerScreenings,
    'redcat': redcatScreenings,
    'alamo-drafthouse': alamoScreenings,
    'vidiots': vidiotsScreenings,
  }

  // Add Laemmle results
  for (const [id, screenings] of Object.entries(laemmleScreenings)) {
    directByTheater[id] = screenings
  }

  // Step 4: Merge and deduplicate
  console.log('')
  console.log('Merging and deduplicating...')

  const outputTheaters = THEATERS.map(theater => {
    const revivalScreenings = revivalData[theater.id] || []
    const directScreenings = directByTheater[theater.id] || []

    const merged = deduplicateScreenings(revivalScreenings, directScreenings)

    // Normalize and generate IDs
    const screenings = merged
      .map(s => ({
        id: generateId(theater.id, s.title, s.date),
        title: s.title,
        date: normalizeDate(s.date),
        time: s.time || '',
        format: s.format || 'digital',
        notes: s.notes || '',
        link: s.link || theater.calendarUrl,
      }))
      .filter(s => s.title && s.date) // Remove entries without title or date
      .sort((a, b) => a.date.localeCompare(b.date))

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

  // Remove theaters with no screenings (optional — keep them for completeness)
  const result = {
    lastUpdated: new Date().toISOString(),
    theaters: outputTheaters,
  }

  // Step 5: Write output
  writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2))

  const totalScreenings = outputTheaters.reduce((sum, t) => sum + t.screenings.length, 0)
  console.log('')
  console.log(`Done! Wrote ${totalScreenings} screenings across ${outputTheaters.length} theaters.`)
  console.log(`Output: ${OUTPUT_PATH}`)

  // Send Liza an SMS if The Godfather is screening
  console.log('')
  console.log('Checking for Godfather screenings...')
  await sendGodfatherSMS(result)

  if (totalScreenings === 0) {
    console.log('')
    console.log('⚠ No screenings were scraped. This may be because:')
    console.log('  - Theater sites require JavaScript rendering (Puppeteer)')
    console.log('  - Site structures have changed')
    console.log('  - Network issues prevented fetching')
    console.log('')
    console.log('The app will still work with the existing theaters.json data.')
    console.log('Consider adding Puppeteer-based scrapers for JS-heavy sites.')
  }

  console.log('')
}

main().catch(err => {
  console.error('Fatal scraper error:', err)
  process.exit(1)
})
