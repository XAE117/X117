/**
 * Eater LA Heatmap scraper
 * URL: https://la.eater.com/maps/best-new-restaurants-los-angeles-heatmap
 *
 * Extracts from schema.org ItemList (application/ld+json) + h2/h3 headings.
 * No Puppeteer needed — data is in the static HTML.
 */

import axios from 'axios'
import * as cheerio from 'cheerio'

const HEATMAP_URL = 'https://la.eater.com/maps/best-new-restaurants-los-angeles-heatmap'

export async function scrapeEaterHeatmap() {
  const { data: html } = await axios.get(HEATMAP_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
    },
    timeout: 15000,
  })

  const $ = cheerio.load(html)
  const restaurants = []
  const seen = new Set()

  // Method 1: Schema.org ItemList (most reliable)
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).text())
      if (data['@type'] === 'ItemList' && data.itemListElement) {
        for (const item of data.itemListElement) {
          const r = item.item
          if (r && r.name && !seen.has(r.name.toLowerCase())) {
            seen.add(r.name.toLowerCase())
            restaurants.push({
              name: r.name,
              neighborhood: '',
              cuisine: '',
              description: '',
              sources: [{ name: 'Eater Heatmap', url: HEATMAP_URL }],
              tags: [],
            })
          }
        }
      }
    } catch {}
  })

  // Method 2: If schema.org didn't work, fall back to h2/h3 headings
  if (restaurants.length === 0) {
    const skip = /more maps|see more|the latest|dining out|sign up|newsletter/i
    $('h2, h3').each((_, el) => {
      const name = $(el).text().trim()
      if (name.length > 2 && name.length < 60 && !skip.test(name) && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase())
        restaurants.push({
          name,
          neighborhood: '',
          cuisine: '',
          description: '',
          sources: [{ name: 'Eater Heatmap', url: HEATMAP_URL }],
          tags: [],
        })
      }
    })
  }

  return restaurants
}
