/**
 * Michelin Guide LA scraper (live page, not seed file)
 * URL: https://guide.michelin.com/us/en/california/los-angeles/restaurants
 *
 * Extracts restaurant names from links to /restaurant/ pages.
 * Cheerio-safe, no Puppeteer needed.
 */

import axios from 'axios'
import * as cheerio from 'cheerio'

const MICHELIN_URL = 'https://guide.michelin.com/us/en/california/los-angeles/restaurants'

export async function scrapeMichelinGuide() {
  const { data: html } = await axios.get(MICHELIN_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
    },
    timeout: 15000,
  })

  const $ = cheerio.load(html)
  const restaurants = []
  const seen = new Set()

  $('a[href*="/restaurant/"]').each((_, el) => {
    const $a = $(el)
    const name = $a.text().trim()
    const href = $a.attr('href') || ''

    // Skip "Reserve a table" links and other non-name text
    if (!name || name.length < 3 || name.length > 60) return
    if (/reserve|book|table|view|more|see all/i.test(name)) return

    const nameLower = name.toLowerCase()
    if (seen.has(nameLower)) return
    seen.add(nameLower)

    // Extract city/neighborhood from URL slug
    // e.g., /us/en/california/santa-monica/restaurant/seline
    let neighborhood = ''
    const locMatch = href.match(/\/california\/([^/]+)\/restaurant\//)
    if (locMatch) {
      const loc = locMatch[1].replace(/^us-/, '').replace(/-/g, ' ')
      // Capitalize
      neighborhood = loc.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    }

    restaurants.push({
      name,
      neighborhood,
      cuisine: '',
      description: '',
      sources: [{ name: 'Michelin Guide', url: `https://guide.michelin.com${href}` }],
      tags: [],
    })
  })

  return restaurants
}
