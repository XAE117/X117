#!/usr/bin/env node

/**
 * THE PALACE — Screening Scraper
 *
 * Primary source: revivalhouses.com (~7 days out)
 * Supplemental: direct theater website scraping for further-out dates
 *
 * Theaters with extended scheduling horizons:
 *   - New Beverly Cinema: ~1 month (thenewbev.com)
 *   - Vista Theatre: ~5 weeks (vistatheaterhollywood.com)
 *   - Brain Dead Studios: ~6 weeks (studios.wearebraindead.com)
 *   - Vidiots: ~1 month (vidiotsfoundation.org)
 *
 * Usage: npm run scrape
 */

import * as cheerio from 'cheerio'
import { execSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync } from 'fs'
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
    color: '#D98A87',
  },
  {
    dataT: '22',
    id: 'vista-theatre',
    name: 'Vista Theatre',
    shortName: 'Vista',
    neighborhood: 'Los Feliz',
    url: 'https://www.vistatheaterhollywood.com',
    color: '#B89AD4',
  },
  {
    dataT: '28',
    id: 'academy-museum',
    name: 'Academy Museum',
    shortName: 'Academy',
    neighborhood: 'Miracle Mile',
    url: 'https://www.academymuseum.org/en/programs',
    color: '#C98A8E',
  },
  {
    dataT: '30',
    id: 'alamo-dtla',
    name: 'Alamo Drafthouse — Downtown LA',
    shortName: 'Alamo',
    neighborhood: 'Downtown',
    url: 'https://drafthouse.com/los-angeles',
    color: '#D4C07A',
  },
  {
    dataT: '2',
    id: 'egyptian',
    name: 'American Cinematheque — Egyptian Theatre',
    shortName: 'Egyptian',
    neighborhood: 'Hollywood',
    url: 'https://www.americancinematheque.com/now-showing/',
    color: '#D9A878',
  },
  {
    dataT: '1',
    id: 'aero',
    name: 'American Cinematheque — Aero Theatre',
    shortName: 'Aero',
    neighborhood: 'Santa Monica',
    url: 'https://www.americancinematheque.com/now-showing/',
    color: '#7ABFC0',
  },
  {
    dataT: '57',
    id: 'vidiots',
    name: 'Vidiots',
    shortName: 'Vidiots',
    neighborhood: 'Eagle Rock',
    url: 'https://vidiotsfoundation.org/calendar',
    color: '#D4A0B8',
  },
  {
    dataT: '33',
    id: 'brain-dead',
    name: 'Brain Dead Studios',
    shortName: 'Brain Dead',
    neighborhood: 'Fairfax',
    url: 'https://studios.wearebraindead.com',
    color: '#8EBF8E',
  },
  {
    dataT: '5',
    id: 'billy-wilder',
    name: 'Billy Wilder Theater at the Hammer',
    shortName: 'Hammer',
    neighborhood: 'Westwood',
    url: 'https://hammer.ucla.edu/programs-events',
    color: '#8EA0CF',
  },
  {
    dataT: '67',
    id: 'redcat',
    name: 'REDCAT',
    shortName: 'REDCAT',
    neighborhood: 'Downtown',
    url: 'https://www.redcat.org',
    color: '#D9907A',
  },
  {
    dataT: '34',
    id: 'laemmle-nuart',
    name: 'Laemmle Nuart Theatre',
    shortName: 'Nuart',
    neighborhood: 'West LA',
    url: 'https://www.laemmle.com',
    color: '#B4A0D4',
  },
  {
    dataT: '9',
    id: 'laemmle-noho',
    name: 'Laemmle NoHo 7',
    shortName: 'NoHo 7',
    neighborhood: 'North Hollywood',
    url: 'https://www.laemmle.com',
    color: '#C8A8D9',
  },
  {
    dataT: '29',
    id: 'los-feliz-3',
    name: 'Los Feliz 3',
    shortName: 'Los Feliz 3',
    neighborhood: 'Los Feliz',
    url: 'https://www.vintagecinemas.com/losfeliz',
    color: '#CCA8C8',
  },
  {
    dataT: '7',
    id: 'laemmle-royal',
    name: 'Laemmle Royal',
    shortName: 'Royal',
    neighborhood: 'West LA',
    url: 'https://www.laemmle.com',
    color: '#7AAED4',
  },
  // ── Expanded theaters ──
  {
    dataT: '70',
    id: 'secret-movie-club',
    name: 'Secret Movie Club',
    shortName: 'Secret MC',
    neighborhood: 'Various',
    url: 'https://www.secretmovieclub.com',
    color: '#B89878',
  },
  {
    dataT: '62',
    id: 'cinespia',
    name: 'Cinespia',
    shortName: 'Cinespia',
    neighborhood: 'Hollywood Forever',
    url: 'https://cinespia.org',
    color: '#8EBFD4',
  },
  {
    dataT: '65',
    id: '2220-arts',
    name: '2220 Arts + Archives',
    shortName: '2220 Arts',
    neighborhood: 'Historic Filipinotown',
    url: 'https://2220arts.com',
    color: '#D4A0C4',
  },
  {
    dataT: '68',
    id: 'whammy-analog',
    name: 'WHAMMY! Analog Media',
    shortName: 'WHAMMY!',
    neighborhood: 'Various',
    url: 'https://whammyanalog.com',
    color: '#D9A090',
  },
  {
    dataT: '71',
    id: 'glendale-theatre',
    name: 'Glendale Theatre',
    shortName: 'Glendale',
    neighborhood: 'Glendale',
    url: 'https://www.regencymovies.com/theatres/glendale-theatre',
    color: '#A0CFB4',
  },
  {
    dataT: '72',
    id: 'lumiere-music-hall',
    name: 'Lumiere Music Hall',
    shortName: 'Lumiere',
    neighborhood: 'Beverly Hills',
    url: 'https://lumieremusichall.com',
    color: '#D4C890',
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

// ── Month name → number lookup ──

const MONTH_NUM = {
  january: '01', february: '02', march: '03', april: '04',
  may: '05', june: '06', july: '07', august: '08',
  september: '09', october: '10', november: '11', december: '12',
  jan: '01', feb: '02', mar: '03', apr: '04',
  jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
}

function parseMonthDay(monthStr, dayStr, fallbackYear) {
  const m = MONTH_NUM[monthStr.toLowerCase()]
  if (!m) return null
  const d = String(parseInt(dayStr, 10)).padStart(2, '0')
  return `${fallbackYear}-${m}-${d}`
}

// ── Supplemental: New Beverly Cinema ──
// Scrapes thenewbev.com/schedule/ which shows ~1 month of screenings

async function scrapeNewBeverly(cutoffDate) {
  console.log('  Fetching thenewbev.com/schedule/...')
  try {
    const html = fetchPage('https://thenewbev.com/schedule/')
    const $ = cheerio.load(html)
    const screenings = []

    $('article.event-card').each((_, el) => {
      const $el = $(el)
      const monthName = $el.find('.event-card__month').text().trim()
      const dayNum = $el.find('.event-card__numb').text().trim()
      const yearText = $el.closest('.calendar-month').find('h2').text().trim()
      const year = yearText.match(/(\d{4})/)?.[1] || new Date().getFullYear().toString()

      const date = parseMonthDay(monthName, dayNum, year)
      if (!date || date <= cutoffDate) return

      // Get times (may be multiple for double features)
      const times = []
      $el.find('time.event-card__time').each((_, t) => {
        times.push($(t).text().trim())
      })

      // Title (may include double feature separated by " / ")
      const titleRaw = $el.find('h4.event-card__title').text().trim()
        .replace(/\s+/g, ' ')
      const link = $el.find('a').attr('href') || 'https://thenewbev.com/schedule/'

      // Format label (Midnight, Grindhouse, etc.)
      const label = $el.find('i.event-card__label').attr('aria-label') || ''

      // Split double features into separate screenings
      const titles = titleRaw.split(/\s*\/\s*/).filter(Boolean)
      titles.forEach((title, i) => {
        const cleanTitle = title.replace(/\s*\((?:70mm|35mm|16mm|IMAX|nitrate)\)\s*/gi, '').trim()
        const time = times[i] || times[0] || ''
        const format = detectFormat(`${cleanTitle} ${label}`)

        screenings.push({
          id: generateId('new-beverly', cleanTitle, date),
          title: cleanTitle,
          date,
          time,
          format,
          notes: label || '',
          link,
        })
      })
    })

    console.log(`    → ${screenings.length} screenings beyond cutoff`)
    return screenings
  } catch (err) {
    console.log(`    → Failed: ${err.message}`)
    return []
  }
}

// ── Supplemental: Vista Theatre ──
// Scrapes vistatheaterhollywood.com which shows ~5 weeks

async function scrapeVista(cutoffDate) {
  console.log('  Fetching vistatheaterhollywood.com...')
  try {
    const html = fetchPage('https://www.vistatheaterhollywood.com')
    const $ = cheerio.load(html)
    const screenings = []
    const currentYear = new Date().getFullYear().toString()

    $('.shows__grid--row').each((_, row) => {
      const $row = $(row)
      const title = $row.find('h3.alt').text().trim()
      if (!title) return

      const metaText = $row.find('h3.alt').next('p').text().trim()
      const format = detectFormat(metaText + ' ' + title)
      const cleanTitle = title.replace(/\s*\((?:70mm|35mm|16mm|IMAX|nitrate)\)\s*/gi, '').trim()

      // Parse dates and times from the first cell
      // Dates are: p.month (optional), p.text__size-2 (day ordinal), p (day name), div.times
      const scheduleCell = $row.find('.shows__grid--cell').first()
      let currentMonth = null

      // Walk all elements inside the inner container
      const innerEl = scheduleCell.find('.inner')
      const children = innerEl.find('p, div.times')

      let pendingDay = null
      children.each((_, child) => {
        const $child = $(child)
        const tagName = child.tagName?.toLowerCase()

        if (tagName === 'p' && $child.hasClass('month')) {
          currentMonth = $child.text().trim()
        } else if (tagName === 'p' && $child.hasClass('text__size-2')) {
          // Day number like "27th", "1st"
          const dayStr = $child.text().trim().replace(/\D+$/, '')
          pendingDay = dayStr
        } else if (tagName === 'div' && $child.hasClass('times') && pendingDay && currentMonth) {
          const date = parseMonthDay(currentMonth, pendingDay, currentYear)
          if (!date || date <= cutoffDate) {
            pendingDay = null
            return
          }

          $child.find('a.card__button').each((_, a) => {
            const $a = $(a)
            if ($a.hasClass('sold-out')) return
            const timeText = $a.clone().children().remove().end().text().trim()
            const ticketLink = $a.attr('href') || 'https://www.vistatheaterhollywood.com'

            screenings.push({
              id: generateId('vista-theatre', cleanTitle, date) + `-${timeText.replace(/\s+/g, '')}`,
              title: cleanTitle,
              date,
              time: timeText,
              format,
              notes: '',
              link: ticketLink,
            })
          })
          pendingDay = null
        }
      })
    })

    console.log(`    → ${screenings.length} screenings beyond cutoff`)
    return screenings
  } catch (err) {
    console.log(`    → Failed: ${err.message}`)
    return []
  }
}

// ── Supplemental: Filmbot-powered theaters (Brain Dead, Vidiots) ──
// These sites use the Filmbot/Marquee WordPress theme with:
//   - themeScheduledDates JS array listing all dates
//   - Date-specific pages at /<YYYY-MM-DD>/ with now-playing shows + times

function scrapeFilmbotDatePage($, theaterId, date, baseUrl) {
  const screenings = []

  // Each show in the #now-playing section
  $('#now-playing .show').each((_, el) => {
    const $show = $(el)
    const title = $show.find('> a > h2').text().trim()
    if (!title) return

    const format = detectFormat(title)
    const cleanTitle = title.replace(/\s*\((?:70mm|35mm|16mm|IMAX|nitrate)\)\s*/gi, '').trim()
    const detailUrl = $show.find('> a').attr('href') || ''
    const link = detailUrl.startsWith('http') ? detailUrl : `${baseUrl}${detailUrl}`

    // Get showtimes from the adjacent <ol class="showtimes">
    const $showtimes = $show.next('ol.showtimes').length
      ? $show.next('ol.showtimes')
      : $show.parent().find('ol.showtimes')

    if ($showtimes.length) {
      $showtimes.find('a.showtime').each((_, a) => {
        const time = $(a).text().trim()
        const ticketHref = $(a).attr('href') || ''
        const ticketLink = ticketHref.startsWith('http') ? ticketHref : `${baseUrl}${ticketHref}`

        screenings.push({
          id: generateId(theaterId, cleanTitle, date) + `-${time.replace(/\s+/g, '')}`,
          title: cleanTitle,
          date,
          time,
          format,
          notes: '',
          link: ticketLink,
        })
      })
    } else {
      // No showtimes listed, just record the screening
      screenings.push({
        id: generateId(theaterId, cleanTitle, date),
        title: cleanTitle,
        date,
        time: '',
        format,
        notes: '',
        link,
      })
    }
  })

  return screenings
}

async function scrapeFilmbotSite(theaterId, baseUrl, cutoffDate) {
  const label = baseUrl.replace(/^https?:\/\//, '')
  console.log(`  Fetching ${label}...`)
  try {
    const html = fetchPage(baseUrl)
    const $ = cheerio.load(html)

    // Extract themeScheduledDates from inline script
    let scheduledDates = []
    $('script').each((_, el) => {
      const text = $(el).html()
      if (text && text.includes('themeScheduledDates')) {
        const match = text.match(/themeScheduledDates[^=]*=\s*(\[.*?\])/)
        if (match) {
          try { scheduledDates = JSON.parse(match[1]) } catch {}
        }
      }
    })

    // Filter to dates beyond the cutoff
    const futureDates = scheduledDates.filter(d => d > cutoffDate).sort()
    console.log(`    → ${futureDates.length} dates beyond cutoff (through ${futureDates[futureDates.length - 1] || 'none'})`)

    if (futureDates.length === 0) return []

    // Fetch each date page to get actual show titles + times
    const screenings = []
    for (const date of futureDates) {
      try {
        const dateHtml = fetchPage(`${baseUrl}/${date}/`)
        const $date = cheerio.load(dateHtml)
        const dateScreenings = scrapeFilmbotDatePage($date, theaterId, date, baseUrl)
        screenings.push(...dateScreenings)
      } catch {
        // Skip failed date pages silently
      }
    }

    console.log(`    → ${screenings.length} total screenings`)
    return screenings
  } catch (err) {
    console.log(`    → Failed: ${err.message}`)
    return []
  }
}

async function scrapeBrainDead(cutoffDate) {
  return scrapeFilmbotSite('brain-dead', 'https://studios.wearebraindead.com', cutoffDate)
}

// ── Supplemental: Vidiots ──

async function scrapeVidiots(cutoffDate) {
  return scrapeFilmbotSite('vidiots', 'https://vidiotsfoundation.org', cutoffDate)
}

// ── Supplemental: Cinespia ──
// Scrapes cinespia.org for outdoor screenings at Hollywood Forever Cemetery

async function scrapeCinespia(cutoffDate) {
  console.log('  Fetching cinespia.org...')
  try {
    const html = fetchPage('https://cinespia.org')
    const $ = cheerio.load(html)
    const screenings = []
    const currentYear = new Date().getFullYear().toString()

    // Cinespia typically lists events on their main page
    $('article, .event-item, .screening-item').each((_, el) => {
      const $el = $(el)
      const title = $el.find('h2, h3, .event-title').first().text().trim()
      if (!title) return

      const dateText = $el.find('time, .event-date, .date').first().text().trim()
      if (!dateText) return

      // Try to parse the date
      const dateMatch = dateText.match(/(\w+)\s+(\d{1,2})/)
      if (!dateMatch) return

      const date = parseMonthDay(dateMatch[1], dateMatch[2], currentYear)
      if (!date || date <= cutoffDate) return

      const link = $el.find('a').first().attr('href') || 'https://cinespia.org'
      const fullLink = link.startsWith('http') ? link : `https://cinespia.org${link}`

      screenings.push({
        id: generateId('cinespia', title, date),
        title,
        date,
        time: '8:00 PM',
        format: 'digital',
        notes: 'Outdoor screening at Hollywood Forever Cemetery',
        link: fullLink,
      })
    })

    console.log(`    → ${screenings.length} screenings beyond cutoff`)
    return screenings
  } catch (err) {
    console.log(`    → Failed: ${err.message}`)
    return []
  }
}

// ── Supplemental: 2220 Arts + Archives ──

async function scrape2220Arts(cutoffDate) {
  console.log('  Fetching 2220arts.com...')
  try {
    const html = fetchPage('https://2220arts.com')
    const $ = cheerio.load(html)
    const screenings = []
    const currentYear = new Date().getFullYear().toString()

    // 2220 Arts lists events, look for film-related entries
    $('.event, .event-item, article').each((_, el) => {
      const $el = $(el)
      const title = $el.find('h2, h3, .event-title').first().text().trim()
      if (!title) return

      const dateText = $el.find('time, .event-date, .date').first().text().trim()
      if (!dateText) return

      const dateMatch = dateText.match(/(\w+)\s+(\d{1,2})/)
      if (!dateMatch) return

      const date = parseMonthDay(dateMatch[1], dateMatch[2], currentYear)
      if (!date || date <= cutoffDate) return

      const link = $el.find('a').first().attr('href') || 'https://2220arts.com'
      const fullLink = link.startsWith('http') ? link : `https://2220arts.com${link}`
      const format = detectFormat(title)

      screenings.push({
        id: generateId('2220-arts', title, date),
        title: title.replace(/\s*\((?:70mm|35mm|16mm|IMAX|nitrate)\)\s*/gi, '').trim(),
        date,
        time: '',
        format,
        notes: '',
        link: fullLink,
      })
    })

    console.log(`    → ${screenings.length} screenings beyond cutoff`)
    return screenings
  } catch (err) {
    console.log(`    → Failed: ${err.message}`)
    return []
  }
}

// ── Run all supplemental scrapers ──
// Only adds screenings with dates after the revivalhouses.com cutoff

async function scrapeSupplemental(screeningsByTheater) {
  // Find the latest date from revivalhouses data across all theaters
  let maxDate = '0000-00-00'
  for (const theaterId in screeningsByTheater) {
    for (const s of screeningsByTheater[theaterId]) {
      if (s.date > maxDate) maxDate = s.date
    }
  }
  console.log(`  RevivalHouses cutoff: ${maxDate}`)

  const supplementalResults = await Promise.all([
    scrapeNewBeverly(maxDate),
    scrapeVista(maxDate),
    scrapeBrainDead(maxDate),
    scrapeVidiots(maxDate),
    scrapeCinespia(maxDate),
    scrape2220Arts(maxDate),
  ])

  const [newBev, vista, brainDead, vidiots, cinespia, arts2220] = supplementalResults

  // Merge supplemental screenings (only dates beyond the cutoff, so no dedup needed)
  screeningsByTheater['new-beverly'].push(...newBev)
  screeningsByTheater['vista-theatre'].push(...vista)
  screeningsByTheater['brain-dead'].push(...brainDead)
  screeningsByTheater['vidiots'].push(...vidiots)
  screeningsByTheater['cinespia'].push(...cinespia)
  screeningsByTheater['2220-arts'].push(...arts2220)

  const totalSupplemental = newBev.length + vista.length + brainDead.length + vidiots.length + cinespia.length + arts2220.length
  return totalSupplemental
}

// ── TMDB Enrichment ──
// Fetches poster, director, year, overview, rating, and runtime for each unique film title.
// Requires TMDB_API_KEY env var. Gracefully skips if unavailable.

function slugifyTitle(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

/**
 * Normalize a screening title for TMDB lookup:
 * - Strip format suffixes: "on 35mm", "in 70mm", "in 16mm", etc.
 * - Strip "(Adults Only)", "(Sold Out)", "en Español"
 * - Strip "Presented by X", "Presents:", "Mezzanine Presents:"
 * - Handle year suffixes like "(1976)" by keeping them for disambiguation
 * - For double features "A / B", return just the first film
 */
function normalizeTitleForSearch(title) {
  let t = title
  // Strip format suffixes
  t = t.replace(/\s+(on|in)\s+(35mm|70mm|16mm|nitrate)\b/i, '')
  // Strip "– 70mm Early Access" etc.
  t = t.replace(/\s*[–—-]\s*\d+mm\s*\w*\s*$/i, '')
  // Strip "(Adults Only)", "(Sold Out)"
  t = t.replace(/\s*\((?:Adults Only|Sold Out)\)/gi, '')
  // Strip "en Español"
  t = t.replace(/\s+en\s+Espa[ñn]ol\b/i, '')
  // Strip presenter prefixes
  t = t.replace(/^(?:Cinematic Void Presents\s+|PHANTASMAGORIA presents\s+|Mezzanine Presents:\s*|Vidiots Presents:\s*)/i, '')
  // Handle double features: "Film A / Film B" → "Film A"
  if (t.includes(' / ')) {
    t = t.split(' / ')[0].trim()
  }
  // Strip "Extended Edition" etc. for matching, but keep for slug
  t = t.replace(/:\s*Extended Edition\b/i, '')
  return t.trim()
}

async function tmdbSearch(title, apiKey) {
  const url = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(title)}&api_key=${apiKey}`
  const html = execSync(
    `curl -s --max-time 10 '${url}'`,
    { encoding: 'utf-8' },
  )
  return JSON.parse(html)
}

async function tmdbCredits(movieId, apiKey) {
  const url = `https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${apiKey}`
  const html = execSync(
    `curl -s --max-time 10 '${url}'`,
    { encoding: 'utf-8' },
  )
  return JSON.parse(html)
}

async function tmdbMovieDetails(movieId, apiKey) {
  const url = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${apiKey}`
  const html = execSync(
    `curl -s --max-time 10 '${url}'`,
    { encoding: 'utf-8' },
  )
  return JSON.parse(html)
}

async function enrichWithTMDB(outputTheaters) {
  const apiKey = process.env.TMDB_API_KEY
  // Load existing film data to preserve even without TMDB API key
  let existingFilmsForFallback = {}
  try {
    if (existsSync(OUTPUT_PATH)) {
      const existing = JSON.parse(readFileSync(OUTPUT_PATH, 'utf8'))
      existingFilmsForFallback = existing.films || {}
    }
  } catch {}

  if (!apiKey) {
    console.log('  TMDB_API_KEY not set — preserving existing film data.')
    return existingFilmsForFallback
  }

  console.log('')
  console.log('TMDB enrichment...')

  // Collect unique film titles
  const uniqueTitles = new Set()
  for (const theater of outputTheaters) {
    for (const s of theater.screenings) {
      uniqueTitles.add(s.title)
    }
  }

  console.log(`  ${uniqueTitles.size} unique titles to look up`)

  // Load existing film data to preserve hand-curated enrichments
  // (rottenTomatoes, letterboxd, afi100, sightAndSound, reviews, podcasts)
  let existingFilms = {}
  try {
    if (existsSync(OUTPUT_PATH)) {
      const existing = JSON.parse(readFileSync(OUTPUT_PATH, 'utf8'))
      existingFilms = existing.films || {}
    }
  } catch {}

  const films = {}
  let enriched = 0
  let batch = 0

  for (const title of uniqueTitles) {
    const slug = slugifyTitle(title)
    if (films[slug]) continue

    // Start with existing enrichments (reviews, podcasts, scores, etc.)
    const existing = existingFilms[slug] || {}

    try {
      // Rate limiting: pause every 35 requests
      batch++
      if (batch > 0 && batch % 35 === 0) {
        await new Promise(r => setTimeout(r, 10000))
      }

      const searchTitle = normalizeTitleForSearch(title)
      const searchResult = await tmdbSearch(searchTitle, apiKey)
      const movie = searchResult.results?.[0]
      if (!movie) {
        // No TMDB match but preserve existing data if any
        if (Object.keys(existing).length > 0) {
          films[slug] = existing
        }
        continue
      }

      // Get credits for director
      let director = ''
      try {
        const credits = await tmdbCredits(movie.id, apiKey)
        const directorEntry = credits.crew?.find(c => c.job === 'Director')
        director = directorEntry?.name || ''
      } catch {}

      // Get runtime from movie details
      let runtime = null
      try {
        const details = await tmdbMovieDetails(movie.id, apiKey)
        runtime = details.runtime || null
      } catch {}

      // Merge: TMDB fields update, but preserve hand-curated enrichments
      films[slug] = {
        ...existing,
        director,
        year: movie.release_date ? parseInt(movie.release_date.slice(0, 4)) : (existing.year || null),
        runtime: runtime || existing.runtime || null,
        posterPath: movie.poster_path || existing.posterPath || null,
        overview: movie.overview ? movie.overview.slice(0, 200) : (existing.overview || ''),
        rating: movie.vote_average || existing.rating || 0,
      }
      enriched++
    } catch {
      // Failed TMDB lookup — preserve existing data
      if (Object.keys(existing).length > 0) {
        films[slug] = existing
      }
    }
  }

  // Also preserve film data for titles no longer in screenings
  // (so manually added enrichments aren't lost when screenings rotate)
  for (const [slug, data] of Object.entries(existingFilms)) {
    if (!films[slug]) {
      films[slug] = data
    }
  }

  // Merge hand-curated enrichments from film-enrichments.json
  // This file contains RT scores, Letterboxd ratings, reviews, and podcasts
  // that are maintained separately from TMDB data
  try {
    const enrichmentsPath = join(__dirname, '..', 'public', 'film-enrichments.json')
    if (existsSync(enrichmentsPath)) {
      const curated = JSON.parse(readFileSync(enrichmentsPath, 'utf8'))
      let curatedCount = 0
      for (const [slug, data] of Object.entries(curated)) {
        if (films[slug]) {
          // Merge: curated fields override, but don't remove existing TMDB fields
          films[slug] = { ...films[slug], ...data }
        } else {
          // Film not found by TMDB — add curated data as-is
          films[slug] = data
        }
        curatedCount++
      }
      console.log(`  + ${curatedCount} films enriched from film-enrichments.json`)
    }
  } catch {}

  console.log(`  Enriched ${enriched} of ${uniqueTitles.size} films (${Object.keys(existingFilms).length} existing preserved)`)
  return films
}

// ── Main ──

async function main() {
  console.log('')
  console.log('╔══════════════════════════════════════╗')
  console.log('║   THE PALACE — Screening Scraper     ║')
  console.log('╚══════════════════════════════════════╝')
  console.log('')

  const screeningsByTheater = await scrapeRevivalHouses()

  // Scrape individual theater sites for further-out dates
  console.log('')
  console.log('Supplemental scraping (extended horizons)...')
  const supplementalCount = await scrapeSupplemental(screeningsByTheater)
  console.log(`  Total supplemental: ${supplementalCount} screenings`)

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

  // TMDB enrichment (optional, requires TMDB_API_KEY)
  const films = await enrichWithTMDB(outputTheaters)

  const result = {
    lastUpdated: new Date().toISOString(),
    source: 'revivalhouses.com + theater websites',
    theaters: outputTheaters,
  }

  // Only add films object if we got enrichment data
  if (Object.keys(films).length > 0) {
    result.films = films
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2))

  console.log('')
  console.log(`Done! ${totalScreenings} real screenings across ${outputTheaters.length} theaters.`)
  if (Object.keys(films).length > 0) {
    console.log(`  + ${Object.keys(films).length} films enriched via TMDB`)
  }
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
