/**
 * Eater LA Essential 38 scraper
 *
 * Uses the current Eater 38 map and the same schema.org extraction as the
 * Eater Heatmap adapter.
 */

import axios from 'axios'
import * as cheerio from 'cheerio'

const ESSENTIAL_URL = 'https://la.eater.com/maps/best-los-angeles-restaurants-eater-38-essential'

export async function scrapeEaterEssential() {
  let html
  try {
    const res = await axios.get(ESSENTIAL_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      timeout: 15000,
      validateStatus: s => s < 500,
    })
    if (res.status === 404) return []
    html = res.data
  } catch (err) {
    console.log(`    (Eater Essential fetch failed: ${err.message})`)
    return []
  }

  const $ = cheerio.load(html)
  const restaurants = []
  const seen = new Set()

  // Schema.org ItemList extraction
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
              sources: [{ name: 'Eater Essential 38', url: ESSENTIAL_URL }],
              tags: [],
            })
          }
        }
      }
    } catch {}
  })

  return restaurants
}
