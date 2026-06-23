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
const OPTIONAL_BLOCK_STATUSES = new Set([403, 405, 406, 429])

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Referer': 'https://www.eventbrite.com/',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-User': '?1',
}

async function fetchHtml(url) {
  const axiosResponse = await axios.get(url, {
    headers: BROWSER_HEADERS,
    timeout: 15000,
    validateStatus: () => true,
  })

  if (axiosResponse.status >= 200 && axiosResponse.status < 300) return axiosResponse.data
  if (OPTIONAL_BLOCK_STATUSES.has(axiosResponse.status)) {
    console.log(`    Eventbrite blocked scrape with HTTP ${axiosResponse.status}; treating optional aggregator as skipped.`)
    return ''
  }

  const fetchResponse = await fetch(url, {
    headers: BROWSER_HEADERS,
    signal: AbortSignal.timeout(15000),
  })
  if (fetchResponse.ok) return await fetchResponse.text()
  if (OPTIONAL_BLOCK_STATUSES.has(fetchResponse.status)) {
    console.log(`    Eventbrite blocked fallback scrape with HTTP ${fetchResponse.status}; treating optional aggregator as skipped.`)
    return ''
  }
  throw new Error(`Eventbrite HTTP ${axiosResponse.status}; fallback HTTP ${fetchResponse.status}`)
}

export async function scrapeEventbrite() {
  const html = await fetchHtml(EVENTBRITE_URL)
  if (!html) return []

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
