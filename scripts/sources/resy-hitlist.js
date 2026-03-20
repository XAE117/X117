/**
 * Resy LA Hit List scraper
 * URL: https://blog.resy.com/the-hit-list/la-restaurants/
 *
 * Extracts numbered restaurant links (e.g., "1. Wilde's") that point to
 * resy.com venue URLs. Cheerio-safe, no Puppeteer needed.
 */

import axios from 'axios'
import * as cheerio from 'cheerio'

const RESY_URL = 'https://blog.resy.com/the-hit-list/la-restaurants/'

export async function scrapeResyHitList() {
  const { data: html } = await axios.get(RESY_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
    },
    timeout: 15000,
  })

  const $ = cheerio.load(html)
  const restaurants = []
  const seen = new Set()

  // Restaurant entries are numbered links like "1. Wilde's" pointing to resy.com venue pages
  $('a[href*="resy.com/cities"]').each((_, el) => {
    const $a = $(el)
    const href = $a.attr('href') || ''
    const text = $a.text().trim()

    // Skip image links, nav links, event links, and non-venue links
    if (!href.includes('/venues/')) return
    if (href.includes('/events/')) return
    if (text.startsWith('<') || !text || text.length > 80) return

    // Strip leading number + period (e.g., "1. Wilde's" → "Wilde's")
    const name = text.replace(/^\d+\.\s*/, '').trim()
    if (!name || name.length < 2) return

    // Skip descriptive phrases that aren't restaurant names
    if (/^(special|staff|great|rooftop|vegan|nearby|global|climbing|top rated|new on)/i.test(name)) return

    const nameLower = name.toLowerCase()
    if (seen.has(nameLower)) return
    seen.add(nameLower)

    // Extract neighborhood from venue URL slug (e.g., "venice-los-angeles-ca" → "Venice")
    let neighborhood = ''
    const cityMatch = href.match(/\/cities\/([^/]+)\/venues\//)
    if (cityMatch) {
      const city = cityMatch[1]
        .replace(/-ca$/, '')
        .replace(/los-angeles/, '')
        .replace(/-/g, ' ')
        .trim()
      if (city && city !== 'los angeles') {
        neighborhood = city.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      }
    }

    restaurants.push({
      name,
      neighborhood,
      cuisine: '',
      description: '',
      reservationUrl: href,
      sources: [{ name: 'Resy Hit List', url: RESY_URL }],
      tags: [],
    })
  })

  return restaurants
}
