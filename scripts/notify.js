/**
 * SIXPM — Godfather SMS Alert
 *
 * Sends an SMS via Twilio ONLY when new Godfather screenings
 * appear that have not been alerted yet.
 *
 * Tracks previously notified screenings in .notified-screenings.json
 * so the same text does not go out every day.
 *
 * Required env vars:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_PHONE_NUMBER  (your Twilio number, e.g. +1XXXXXXXXXX)
 *   TWILIO_TO_PHONE      (recipient number, e.g. +1XXXXXXXXXX)
 *
 * Usage: called automatically by scrape.js after data is written,
 *        or standalone: node scripts/notify.js
 */

import twilio from 'twilio'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_PATH = join(__dirname, '..', 'public', 'theaters.json')
const NOTIFIED_PATH = join(__dirname, '..', '.notified-screenings.json')

const APP_URL = 'https://xae117.github.io/X117/'

function loadNotified() {
  try {
    if (existsSync(NOTIFIED_PATH)) {
      return JSON.parse(readFileSync(NOTIFIED_PATH, 'utf-8'))
    }
  } catch {
    // Corrupted file — start fresh
  }
  return []
}

function saveNotified(ids) {
  writeFileSync(NOTIFIED_PATH, JSON.stringify(ids, null, 2))
}

/**
 * Scan theaters.json for Godfather screenings and send SMS
 * only for screenings that have not been texted about yet.
 */
export async function sendGodfatherSMS(data) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, TWILIO_TO_PHONE } = process.env

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER || !TWILIO_TO_PHONE) {
    console.log('  Twilio credentials not configured — skipping SMS notification.')
    console.log('  Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, and TWILIO_TO_PHONE to enable.')
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
  const allMatches = []
  for (const theater of data.theaters) {
    for (const s of theater.screenings) {
      if (/godfather/i.test(s.title)) {
        allMatches.push({
          id: s.id,
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

  if (allMatches.length === 0) {
    console.log('  No Godfather screenings found — no SMS to send.')
    return
  }

  // Filter out screenings that have already been texted about
  const alreadyNotified = loadNotified()
  const newMatches = allMatches.filter(m => !alreadyNotified.includes(m.id))

  if (newMatches.length === 0) {
    console.log(`  ${allMatches.length} Godfather screening(s) found, but all have already been texted.`)
    return
  }

  // Build the message
  const screeningLines = newMatches.map(m => {
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
      to: TWILIO_TO_PHONE,
    })
    console.log(`  SMS sent with ${newMatches.length} new screening(s)! SID: ${result.sid}`)

    // Mark these as notified so they will not send again
    const updatedNotified = [...alreadyNotified, ...newMatches.map(m => m.id)]
    saveNotified(updatedNotified)
  } catch (err) {
    console.error('  Failed to send SMS:', err.message)
  }
}

// Allow running standalone: node scripts/notify.js
if (process.argv[1] && process.argv[1].endsWith('notify.js')) {
  console.log('Checking for Godfather screenings...')
  sendGodfatherSMS().then(() => console.log('Done.'))
}
