/**
 * LA Times 101 Best Restaurants scraper
 * URL: https://www.latimes.com/food/list/101-best-restaurants-in-los-angeles-2025
 *
 * Cheerio-safe: List page renders restaurant names and neighborhoods in visible HTML.
 * Paywall strategy: Only scrape list metadata (name, rank, neighborhood). No review content.
 * The value is the binary signal — being on the list earns the LA Times 101 heat score bonus.
 */

import axios from 'axios'
import * as cheerio from 'cheerio'

const LA_TIMES_URL = 'https://www.latimes.com/food/list/101-best-restaurants-in-los-angeles-2025'

export async function scrapeLatimes101() {
  const { data: html } = await axios.get(LA_TIMES_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml',
    },
    timeout: 15000,
  })

  const $ = cheerio.load(html)
  const restaurants = []

  // LA Times list format: promo-title or story-title elements per list item
  $('[class*="promo-title"], [class*="story-title"], .promo h3, article h3, .listicle-item h3').each((_, el) => {
    const $el = $(el)
    const text = $el.text().trim()
    if (!text || text.length > 100) return

    // Extract rank number if present (e.g. "1. Providence")
    const rankMatch = text.match(/^(\d+)\.\s*(.+)$/)
    const name = rankMatch ? rankMatch[2].trim() : text
    const rank = rankMatch ? parseInt(rankMatch[1]) : null

    // Neighborhood often in a kicker/subtitle near each item
    const $parent = $el.closest('article, [class*="promo"], [class*="item"]')
    const neighborhood = $parent
      .find('[class*="kicker"], [class*="subtitle"], [class*="location"]')
      .first()
      .text()
      .trim()

    if (name.length > 2 && name.length < 80) {
      restaurants.push({
        name,
        rank,
        neighborhood,
        cuisine: '',
        sources: [{ name: 'LA Times 101', url: LA_TIMES_URL }],
        tags: ['la-times-101'],
      })
    }
  })

  // Fallback: numbered headings within article body
  if (restaurants.length === 0) {
    $('main article, .article-body, .entry-content').find('h2, h3').each((_, el) => {
      const text = $(el).text().trim()
      if (!text || text.length > 100 || /^(Best|Top|Los Angeles|The List|101)/i.test(text)) return
      const rankMatch = text.match(/^(\d+)\.\s*(.+)$/)
      const name = rankMatch ? rankMatch[2].trim() : text
      const rank = rankMatch ? parseInt(rankMatch[1]) : null
      restaurants.push({
        name,
        rank,
        neighborhood: '',
        cuisine: '',
        sources: [{ name: 'LA Times 101', url: LA_TIMES_URL }],
        tags: ['la-times-101'],
      })
    })
  }

  return restaurants
}
