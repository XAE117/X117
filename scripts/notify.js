/**
 * THE PALACE — Godfather SMS Alert
 *
 * Sends Liza an SMS via Twilio when The Godfather is screening
 * at any tracked LA repertory theater.
 *
 * Required env vars:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_PHONE_NUMBER  (your Twilio number, e.g. +1XXXXXXXXXX)
 *
 * Usage: called automatically by scrape.js after data is written,
 *        or standalone: node scripts/notify.js
 */

import twilio from 'twilio'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_PATH = join(__dirname, '..', 'public', 'theaters.json')

const LIZA_PHONE = '+12313490274'
const APP_URL = 'https://xae117.github.io/X117/'

/**
 * Scan theaters.json for Godfather screenings and send SMS if found.
 * Accepts either a parsed data object or reads from disk.
 */
export async function sendGodfatherSMS(data) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.log('  Twilio credentials not configured — skipping SMS notification.')
    console.log('  Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to enable.')
    return
  }

  // Load data from disk if not provided
  if (!data) {
    try {
      data = JSON.parse(readFileSync(DATA_PATH, 'utf-8'))
    } catch (err) {
      console.error('  Could not read theaters.json for SMS check:', err.message)
      return
    }
  }

  // Find all Godfather screenings
  const matches = []
  for (const theater of data.theaters) {
    for (const s of theater.screenings) {
      if (/godfather/i.test(s.title)) {
        matches.push({
          title: s.title,
          date: s.date,
          time: s.time,
          format: s.format,
          theater: theater.shortName,
          link: s.link,
        })
      }
    }
  }

  if (matches.length === 0) {
    console.log('  No Godfather screenings found — no SMS to send.')
    return
  }

  // Build the message
  const screeningLines = matches.map(m => {
    const d = new Date(m.date + 'T00:00:00')
    const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    const fmt = m.format && m.format !== 'digital' ? ` (${m.format})` : ''
    return `  ${m.theater} — ${dateStr} ${m.time}${fmt}`
  }).join('\n')

  const message =
    `"I'm gonna make you an offer you can't refuse."\n\n` +
    `The Godfather is screening in LA!\n\n` +
    `${screeningLines}\n\n` +
    `Leave the cannoli. Take the ticket.\n` +
    `${APP_URL}`

  // Send via Twilio
  try {
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    const result = await client.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: LIZA_PHONE,
    })
    console.log(`  SMS sent to Liza! SID: ${result.sid}`)
  } catch (err) {
    console.error('  Failed to send SMS:', err.message)
  }
}

// Allow running standalone: node scripts/notify.js
if (process.argv[1] && process.argv[1].endsWith('notify.js')) {
  console.log('Checking for Godfather screenings...')
  sendGodfatherSMS().then(() => console.log('Done.'))
}
