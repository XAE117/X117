/**
 * Time Out LA Top 40 Restaurants scraper
 * URL: https://www.timeout.com/los-angeles/restaurants/best-restaurants-in-la
 *
 * Cheerio-safe: Long-form article with embedded restaurant blocks.
 */

import axios from 'axios'
import * as cheerio from 'cheerio'

const TIMEOUT_URL = 'https://www.timeout.com/los-angeles/restaurants/best-restaurants-in-la'

export async function scrapeTimeoutLA() {
  const { data: html } = await axios.get(TIMEOUT_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml',
    },
    timeout: 15000,
  })

  const $ = cheerio.load(html)
  const restaurants = []

  // Time Out uses listing/venue card elements for each restaurant entry
  $('[class*="listing"], [data-testid*="listing"], [class*="venueCard"], article[class*="card"]').each((_, el) => {
    const $el = $(el)
    const name = $el.find('h3, h2, [class*="title"]').first().text().trim()
    const neighborhood = $el
      .find('[class*="neighborhood"], [class*="location"], [class*="area"]')
      .first()
      .text()
      .trim()
    const description = $el.find('p, [class*="description"]').first().text().trim()

    if (name && name.length > 2 && name.length < 100) {
      restaurants.push({
        name,
        neighborhood,
        cuisine: '',
        description: description.slice(0, 300),
        sources: [{ name: 'Time Out Top 40', url: TIMEOUT_URL }],
        tags: [],
      })
    }
  })

  // Fallback: numbered headings within article body
  if (restaurants.length === 0) {
    $('article, main').find('h2, h3').each((_, el) => {
      const text = $(el).text().trim()
      if (!text || text.length > 100 || /^(Best|Top|The best|Los Angeles|Restaurants)/i.test(text)) return
      const rankMatch = text.match(/^\d+\.\s*(.+)$/)
      const name = rankMatch ? rankMatch[1].trim() : text
      restaurants.push({
        name,
        neighborhood: '',
        cuisine: '',
        sources: [{ name: 'Time Out Top 40', url: TIMEOUT_URL }],
        tags: [],
      })
    })
  }

  return restaurants
}
