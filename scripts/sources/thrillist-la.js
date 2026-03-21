/**
 * Thrillist LA Best Restaurants scraper
 * URL: https://www.thrillist.com/eat/los-angeles/best-restaurants-los-angeles
 *
 * Next.js page with restaurant names in h2/h3 headings.
 * Cheerio-safe, no Puppeteer needed.
 */

import axios from 'axios'
import * as cheerio from 'cheerio'

const THRILLIST_URL = 'https://www.thrillist.com/eat/los-angeles/best-restaurants-los-angeles'

export async function scrapeThrillistLA() {
  const { data: html } = await axios.get(THRILLIST_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
    },
    timeout: 15000,
  })

  const $ = cheerio.load(html)
  const restaurants = []
  const seen = new Set()

  // Skip editorial/navigation headings
  const skip = /navigation|there is no|best new|sign up|newsletter|trending|more from|related|advertisement|follow us/i

  $('h2, h3').each((_, el) => {
    const name = $(el).text().trim()
    if (!name || name.length < 3 || name.length > 60) return
    if (skip.test(name)) return

    const nameLower = name.toLowerCase()
    if (seen.has(nameLower)) return
    seen.add(nameLower)

    // Try to get neighborhood from nearby text
    let neighborhood = ''
    const nextP = $(el).next('p').text().trim()
    const hoodMatch = nextP.match(/(?:in|neighborhood:?|located in)\s+([A-Z][a-zA-Z\s]+?)(?:\.|,|—|$)/i)
    if (hoodMatch) neighborhood = hoodMatch[1].trim()

    restaurants.push({
      name,
      neighborhood,
      cuisine: '',
      description: nextP.slice(0, 300),
      sources: [{ name: 'Thrillist LA', url: THRILLIST_URL }],
      tags: [],
    })
  })

  return restaurants
}
