#!/usr/bin/env node

/**
 * SIXPM — Weekly SMS Digest
 *
 * Sends a curated weekend screening digest every Friday at 4pm PT.
 * Prioritizes film formats (35mm/70mm/nitrate), then by popularity.
 *
 * Required env vars:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_PHONE_NUMBER
 *   TWILIO_TO_PHONE
 *
 * Usage: node scripts/weekly-digest.js
 */

import twilio from 'twilio'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_PATH = join(__dirname, '..', 'public', 'theaters.json')

const APP_URL = 'https://xae117.github.io/X117/'
const MAX_SCREENINGS = 10

function getWeekendDates() {
  const now = new Date()
  const day = now.getDay() // 0=Sun, 5=Fri, 6=Sat

  // Find this Friday (or today if it's Friday)
  const friday = new Date(now)
  const daysUntilFriday = (5 - day + 7) % 7
  friday.setDate(now.getDate() + (daysUntilFriday === 0 && day === 5 ? 0 : daysUntilFriday))

  const saturday = new Date(friday)
  saturday.setDate(friday.getDate() + 1)

  const sunday = new Date(friday)
  sunday.setDate(friday.getDate() + 2)

  const fmt = (d) => d.toISOString().slice(0, 10)
  return [fmt(friday), fmt(saturday), fmt(sunday)]
}

function scoreScreening(s) {
  let score = 0
  const format = (s.format || '').toLowerCase()
  if (format === '70mm') score += 100
  if (format === 'nitrate') score += 90
  if (format === '35mm') score += 50
  if (format === '16mm') score += 40
  if (format === 'imax') score += 30
  // Boost for non-digital
  if (format !== 'digital' && format) score += 10
  return score
}

async function sendWeeklyDigest() {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, TWILIO_TO_PHONE } = process.env

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER || !TWILIO_TO_PHONE) {
    console.log('Twilio credentials not configured — skipping weekly digest.')
    return
  }

  let data
  try {
    data = JSON.parse(readFileSync(DATA_PATH, 'utf-8'))
  } catch (err) {
    console.error('Could not read theaters.json:', err.message)
    return
  }

  const weekendDates = getWeekendDates()
  console.log(`Weekend dates: ${weekendDates.join(', ')}`)

  // Collect weekend screenings
  const weekendScreenings = []
  for (const theater of data.theaters) {
    for (const s of theater.screenings) {
      if (weekendDates.includes(s.date)) {
        weekendScreenings.push({
          ...s,
          theaterShort: theater.shortName,
        })
      }
    }
  }

  if (weekendScreenings.length === 0) {
    console.log('No weekend screenings found — skipping digest.')
    return
  }

  // Score and sort
  weekendScreenings.sort((a, b) => scoreScreening(b) - scoreScreening(a))

  // Take top picks
  const picks = weekendScreenings.slice(0, MAX_SCREENINGS)

  // Format day labels
  const dayNames = { 5: 'Fri', 6: 'Sat', 0: 'Sun' }
  const lines = picks.map(s => {
    const d = new Date(s.date + 'T00:00:00')
    const dayLabel = dayNames[d.getDay()] || d.toLocaleDateString('en-US', { weekday: 'short' })
    const fmt = s.format && s.format !== 'digital' ? ` (${s.format})` : ''
    const time = s.time ? ` ${s.time}` : ''
    return `${dayLabel}: ${s.title}${fmt} @ ${s.theaterShort}${time}`
  })

  const message =
    `SIXPM Picks — This Weekend\n\n` +
    `${lines.join('\n')}\n\n` +
    `Full schedule: ${APP_URL}`

  console.log('Digest message:')
  console.log(message)
  console.log(`\n(${message.length} chars)`)

  try {
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    const result = await client.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: TWILIO_TO_PHONE,
    })
    console.log(`SMS sent! SID: ${result.sid}`)
  } catch (err) {
    console.error('Failed to send digest SMS:', err.message)
  }
}

console.log('Weekly Digest — Sending...')
sendWeeklyDigest().then(() => console.log('Done.'))
