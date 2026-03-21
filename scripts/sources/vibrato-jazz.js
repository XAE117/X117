/**
 * Vibrato Grill Jazz scraper
 * URL: https://www.vibratogrilljazz.com/music
 *
 * Squarespace event list with .eventlist-event articles.
 * Each article has: artist name in link, "Day, Month DD, YYYY" date, time.
 * Cheerio-safe, no Puppeteer needed.
 */

import axios from 'axios'
import * as cheerio from 'cheerio'

const VIBRATO_URL = 'https://www.vibratogrilljazz.com/music'

const MONTH_MAP = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
}

export async function scrapeVibrato() {
  const { data: html } = await axios.get(VIBRATO_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
    },
    timeout: 15000,
  })

  const $ = cheerio.load(html)
  const shows = []
  const seen = new Set()

  $('.eventlist-event').each((_, el) => {
    const $el = $(el)
    const text = $el.text().trim().replace(/\s+/g, ' ')

    // Artist: first link to /music/slug (not ICS/calendar links)
    let artist = ''
    let link = ''
    $el.find('a[href*="/music/"]').each((_, a) => {
      const href = $(a).attr('href') || ''
      if (href.includes('format=ical') || href === '/music' || href === '/music/') return
      if (!artist) {
        artist = $(a).text().trim()
        link = href.startsWith('http') ? href : `https://www.vibratogrilljazz.com${href}`
      }
    })
    if (!artist || artist.length < 3) return

    // Date: "Friday, March 20, 2026" pattern
    const dateMatch = text.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(\w+)\s+(\d{1,2}),?\s+(\d{4})/i)
    let date = ''
    if (dateMatch) {
      const month = MONTH_MAP[dateMatch[1].toLowerCase()]
      if (month !== undefined) {
        const d = new Date(parseInt(dateMatch[3]), month, parseInt(dateMatch[2]))
        date = d.toISOString().slice(0, 10)
      }
    }

    // Time: "9:00 PM" pattern
    const timeMatch = text.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i)
    const time = timeMatch ? timeMatch[1].toUpperCase() : '9:00 PM'

    // Dedup by artist+date
    const key = `${artist.toLowerCase()}-${date}`
    if (seen.has(key)) return
    seen.add(key)

    shows.push({
      artist,
      date: date || new Date().toISOString().slice(0, 10),
      time,
      link,
      source: 'vibratogrilljazz.com',
    })
  })

  return shows
}
