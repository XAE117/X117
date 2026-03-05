/**
 * The Infatuation LA Hit List scraper
 * URL: https://www.theinfatuation.com/los-angeles/guides/best-new-los-angeles-restaurants-hit-list
 *
 * NOTE: The Hit List guide page may lazy-load restaurant cards.
 * Try Cheerio first. If fewer than ~10 results, fall back to Puppeteer with scroll injection.
 */

import axios from 'axios'
import * as cheerio from 'cheerio'

const HITLIST_URL = 'https://www.theinfatuation.com/los-angeles/guides/best-new-los-angeles-restaurants-hit-list'

export async function scrapeInfatuationHitList() {
  // Try Cheerio first (individual restaurant pages are server-rendered)
  try {
    const { data: html } = await axios.get(HITLIST_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      timeout: 15000,
    })

    const $ = cheerio.load(html)
    const restaurants = []

    // Infatuation uses structured restaurant card elements
    $('[data-testid="venue-card"], .venue-card, article[class*="VenueCard"], [class*="GuideVenue"]').each((_, el) => {
      const $el = $(el)
      const name = $el.find('h2, h3, [class*="name"], [class*="Name"]').first().text().trim()
      const neighborhood = $el.find('[class*="neighborhood"], [class*="Neighborhood"], [class*="location"]').first().text().trim()
      const cuisine = $el.find('[class*="cuisine"], [class*="Cuisine"], [class*="category"]').first().text().trim()
      const ratingText = $el.find('[class*="rating"], [class*="Rating"], [class*="score"]').first().text().trim()
      const rating = parseFloat(ratingText) || null

      if (name) {
        restaurants.push({
          name,
          neighborhood,
          cuisine,
          sources: [{
            name: 'The Infatuation Hit List',
            url: HITLIST_URL,
            ...(rating ? { rating } : {}),
          }],
          tags: ['new-opening'],
          isNew: true,
        })
      }
    })

    // Fallback: try broader selectors if structured ones didn't work
    if (restaurants.length === 0) {
      $('h2, h3').each((_, el) => {
        const $el = $(el)
        const text = $el.text().trim()
        // Skip non-restaurant headings
        if (text.length > 3 && text.length < 80 && !text.includes('Hit List') && !text.includes('Best New')) {
          restaurants.push({
            name: text,
            neighborhood: '',
            cuisine: '',
            sources: [{ name: 'The Infatuation Hit List', url: HITLIST_URL }],
            tags: ['new-opening'],
            isNew: true,
          })
        }
      })
    }

    if (restaurants.length >= 5) {
      return restaurants
    }

    // If too few results, the page likely lazy-loads. Try Puppeteer.
    console.log(`    (Cheerio got ${restaurants.length} results, trying Puppeteer...)`)
  } catch (err) {
    console.log(`    (Cheerio failed: ${err.message}, trying Puppeteer...)`)
  }

  // Puppeteer fallback with scroll injection
  try {
    const puppeteer = await import('puppeteer-extra').then(m => m.default).catch(() => null)
    if (!puppeteer) return []

    const StealthPlugin = await import('puppeteer-extra-plugin-stealth').then(m => m.default)
    puppeteer.use(StealthPlugin())

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const page = await browser.newPage()
    await page.goto(HITLIST_URL, { waitUntil: 'networkidle2', timeout: 30000 })

    // Scroll to trigger lazy loading
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollBy(0, 800))
      await new Promise(r => setTimeout(r, 500))
    }

    const restaurants = await page.evaluate(() => {
      const cards = document.querySelectorAll('[data-testid="venue-card"], .venue-card, article')
      return Array.from(cards).map(card => {
        const name = card.querySelector('h2, h3')?.textContent?.trim() || ''
        const neighborhood = card.querySelector('[class*="neighborhood"], [class*="location"]')?.textContent?.trim() || ''
        return { name, neighborhood }
      }).filter(r => r.name && r.name.length < 80)
    })

    await browser.close()

    return restaurants.map(r => ({
      name: r.name,
      neighborhood: r.neighborhood,
      cuisine: '',
      sources: [{ name: 'The Infatuation Hit List', url: HITLIST_URL }],
      tags: ['new-opening'],
      isNew: true,
    }))
  } catch (err) {
    console.log(`    (Puppeteer fallback failed: ${err.message})`)
    return []
  }
}
