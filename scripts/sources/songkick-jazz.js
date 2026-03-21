/**
 * Songkick LA Jazz scraper
 * URL: https://www.songkick.com/metro-areas/17835-us-los-angeles-la/genre/jazz
 *
 * Each event has its own JSON-LD MusicEvent schema block.
 * Extracts: artist, date, venue, ticket URL.
 * Cheerio-safe, no Puppeteer needed.
 */

import axios from 'axios'
import * as cheerio from 'cheerio'

const SONGKICK_URL = 'https://www.songkick.com/metro-areas/17835-us-los-angeles-la/genre/jazz'

export async function scrapeSongkick() {
  const { data: html } = await axios.get(SONGKICK_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
    },
    timeout: 15000,
  })

  const $ = cheerio.load(html)
  const shows = []
  const seen = new Set()

  // Each event is a separate JSON-LD block containing an array with a MusicEvent
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      let parsed = JSON.parse($(el).text())
      // Songkick wraps each event in an array
      const items = Array.isArray(parsed) ? parsed : [parsed]

      for (const data of items) {
        if (data['@type'] !== 'MusicEvent') continue

        const artist = data.name?.replace(/@.*$/, '').trim()
        if (!artist) continue

        // Parse date from startDate (ISO 8601)
        const startDate = data.startDate || ''
        const date = startDate.slice(0, 10)
        if (!date || date < new Date().toISOString().slice(0, 10)) continue

        // Parse venue
        const venue = data.location?.name || ''
        const url = data.url || ''

        // Dedup by artist+date
        const key = `${artist.toLowerCase()}-${date}`
        if (seen.has(key)) continue
        seen.add(key)

        shows.push({
          artist,
          date,
          time: startDate.includes('T') ? formatTime(startDate) : '8:00 PM',
          venue,
          link: url,
          source: 'songkick.com',
        })
      }
    } catch {}
  })

  return shows
}

function formatTime(isoDate) {
  try {
    const d = new Date(isoDate)
    if (isNaN(d.getTime())) return '8:00 PM'
    let h = d.getHours()
    const m = d.getMinutes()
    const ampm = h >= 12 ? 'PM' : 'AM'
    h = h % 12 || 12
    return `${h}:${m.toString().padStart(2, '0')} ${ampm}`
  } catch {
    return '8:00 PM'
  }
}
