/**
 * Eventbrite LA Jazz scraper
 * URL: https://www.eventbrite.com/d/ca--los-angeles/jazz/
 *
 * Schema.org ItemList with Event entries including date, venue, description.
 * Cheerio-safe, no Puppeteer needed.
 */

import axios from 'axios'
import * as cheerio from 'cheerio'

const EVENTBRITE_URL = 'https://www.eventbrite.com/d/ca--los-angeles/jazz/'

export async function scrapeEventbrite() {
  const { data: html } = await axios.get(EVENTBRITE_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
    },
    timeout: 15000,
  })

  const $ = cheerio.load(html)
  const shows = []
  const seen = new Set()

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).text())
      if (data['@type'] !== 'ItemList' || !data.itemListElement) return

      for (const item of data.itemListElement) {
        const event = item.item
        if (!event || event['@type'] !== 'Event') continue

        const artist = event.name || ''
        if (!artist || artist.length < 3) continue

        const date = event.startDate?.slice(0, 10) || ''
        const today = new Date().toISOString().slice(0, 10)
        if (!date || date < today) continue

        const venue = event.location?.name || ''
        const link = event.url || ''

        // Dedup
        const key = `${artist.toLowerCase()}-${date}`
        if (seen.has(key)) continue
        seen.add(key)

        // Parse time from startDate
        let time = '8:00 PM'
        if (event.startDate?.includes('T')) {
          try {
            const d = new Date(event.startDate)
            let h = d.getHours()
            const m = d.getMinutes()
            const ampm = h >= 12 ? 'PM' : 'AM'
            h = h % 12 || 12
            time = `${h}:${m.toString().padStart(2, '0')} ${ampm}`
          } catch {}
        }

        shows.push({
          artist,
          date,
          time,
          venue,
          link,
          source: 'eventbrite.com',
        })
      }
    } catch {}
  })

  return shows
}
