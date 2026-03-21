/**
 * Dice.fm LA Jazz scraper
 * URL: https://dice.fm/browse/losangeles-.../music/gig/jazz
 *
 * Events are in __NEXT_DATA__ pageProps.events array with full metadata.
 * Cheerio-safe, no Puppeteer needed.
 */

import axios from 'axios'
import * as cheerio from 'cheerio'

const DICE_URL = 'https://dice.fm/browse/losangeles-5982e13c613de866017c3e3a/music/gig/jazz'

export async function scrapeDice() {
  const { data: html } = await axios.get(DICE_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
    },
    timeout: 15000,
  })

  const $ = cheerio.load(html)
  const shows = []

  const nextDataText = $('script#__NEXT_DATA__').text()
  if (!nextDataText) return shows

  try {
    const nextData = JSON.parse(nextDataText)
    const events = nextData.props?.pageProps?.events || []

    for (const event of events) {
      const artist = event.name || ''
      if (!artist || artist.length < 3) continue

      // Parse date from date_unix (seconds)
      let date = ''
      if (event.date_unix) {
        const d = new Date(event.date_unix * 1000)
        date = d.toISOString().slice(0, 10)
      } else if (event.dates?.[0]?.date_unix) {
        const d = new Date(event.dates[0].date_unix * 1000)
        date = d.toISOString().slice(0, 10)
      }

      const today = new Date().toISOString().slice(0, 10)
      if (!date || date < today) continue

      // Parse venue
      let venue = ''
      if (event.venues && event.venues.length > 0) {
        venue = event.venues[0].name || ''
      }

      // Parse time
      let time = '8:00 PM'
      if (event.date_unix) {
        const d = new Date(event.date_unix * 1000)
        let h = d.getHours()
        const m = d.getMinutes()
        const ampm = h >= 12 ? 'PM' : 'AM'
        h = h % 12 || 12
        time = `${h}:${m.toString().padStart(2, '0')} ${ampm}`
      }

      // Build link from perm_name
      const link = event.perm_name
        ? `https://dice.fm/event/${event.perm_name}`
        : ''

      shows.push({
        artist,
        date,
        time,
        venue,
        link,
        price: event.price || '',
        source: 'dice.fm',
      })
    }
  } catch {}

  return shows
}
