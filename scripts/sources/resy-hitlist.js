/**
 * Resy LA Hit List scraper
 * URL: https://blog.resy.com/the-hit-list/la-restaurants/
 *
 * Cheerio-safe: Standard WordPress blog post, pure HTML, no JS rendering.
 */

import axios from 'axios'
import * as cheerio from 'cheerio'

const RESY_URL = 'https://blog.resy.com/the-hit-list/la-restaurants/'

export async function scrapeResyHitList() {
  const { data: html } = await axios.get(RESY_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml',
    },
    timeout: 15000,
  })

  const $ = cheerio.load(html)
  const restaurants = []

  // Resy blog uses h2/h3 headings for restaurant names within the article body
  // Restaurant entries are typically: heading + paragraph description
  const articleBody = $('article, .entry-content, .post-content, main').first()
  const headings = articleBody.find('h2, h3')

  headings.each((_, el) => {
    const $el = $(el)
    const name = $el.text().trim()

    // Skip non-restaurant headings
    if (!name || name.length > 100 || name.includes('Hit List') || name.includes('Best') || name.includes('Update')) {
      return
    }

    // Try to get description from next paragraph(s)
    const description = $el.next('p').text().trim()

    // Extract neighborhood from description if possible
    let neighborhood = ''
    const hoodMatch = description.match(/(?:in|located in|neighborhood:?)\s+([A-Z][a-zA-Z\s]+?)(?:\.|,|—)/i)
    if (hoodMatch) neighborhood = hoodMatch[1].trim()

    restaurants.push({
      name,
      neighborhood,
      cuisine: '',
      description: description.slice(0, 300),
      sources: [{ name: 'Resy Hit List', url: RESY_URL }],
      tags: [],
    })
  })

  return restaurants
}
