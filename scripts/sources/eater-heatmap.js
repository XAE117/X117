/**
 * Eater LA Heatmap scraper
 * URL: https://la.eater.com/maps/best-new-restaurants-los-angeles-heatmap
 *
 * NOTE: Eater /maps/ URLs are Next.js with Mapbox — requires Puppeteer.
 * Cheerio returns empty restaurant containers. Use Puppeteer with stealth plugin.
 */

import axios from 'axios'

const HEATMAP_URL = 'https://la.eater.com/maps/best-new-restaurants-los-angeles-heatmap'

/**
 * Attempt to scrape Eater Heatmap.
 * Falls back to returning empty array if Puppeteer unavailable.
 * In production, use puppeteer-extra + stealth plugin.
 */
export async function scrapeEaterHeatmap() {
  // Try Puppeteer first (Eater maps are JS-rendered via Next.js + Mapbox)
  try {
    const puppeteer = await import('puppeteer-extra').then(m => m.default).catch(() => null)
    if (!puppeteer) {
      console.log('    (puppeteer-extra not available, skipping live scrape)')
      return []
    }

    const StealthPlugin = await import('puppeteer-extra-plugin-stealth').then(m => m.default)
    puppeteer.use(StealthPlugin())

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')
    await page.goto(HEATMAP_URL, { waitUntil: 'networkidle2', timeout: 30000 })

    // Wait for restaurant cards to render
    await page.waitForSelector('[class*="venue-card"], [data-venue-card], .c-mapstack__card', { timeout: 15000 })
      .catch(() => console.log('    (card selector timeout, trying alternative)'))

    // Pace: wait 2s for any lazy-loaded content
    await new Promise(r => setTimeout(r, 2000))

    const restaurants = await page.evaluate(() => {
      const cards = document.querySelectorAll('[class*="venue-card"], [data-venue-card], .c-mapstack__card')
      return Array.from(cards).map(card => {
        const name = card.querySelector('h2, h3, [class*="venue-name"]')?.textContent?.trim() || ''
        const neighborhood = card.querySelector('[class*="venue-neighborhood"], [class*="venue-address"]')?.textContent?.trim() || ''
        const description = card.querySelector('p, [class*="venue-description"]')?.textContent?.trim() || ''
        return { name, neighborhood, description }
      }).filter(r => r.name)
    })

    await browser.close()

    return restaurants.map(r => ({
      name: r.name,
      neighborhood: r.neighborhood,
      cuisine: '',
      description: r.description,
      sources: [{ name: 'Eater Heatmap', url: HEATMAP_URL }],
      tags: [],
    }))
  } catch (err) {
    console.log(`    (Puppeteer scrape failed: ${err.message})`)
    return []
  }
}
