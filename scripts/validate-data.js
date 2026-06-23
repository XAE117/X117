#!/usr/bin/env node
// Data Health Validator
// Sanity-checks all four data files and emits a health report.
// Exit codes: 0 healthy, 1 warnings only, 2 critical.
// CLI: node scripts/validate-data.js [--strict]

import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const PUBLIC = path.join(ROOT, 'public')

const STRICT = process.argv.includes('--strict')

// ANSI color helpers (for terminal output only; report file uses markdown)
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
}

const TODAY = new Date()
TODAY.setHours(0, 0, 0, 0)
const todayISO = TODAY.toISOString().slice(0, 10)

function daysSince(iso) {
  if (!iso) return Infinity
  const d = new Date(iso)
  if (isNaN(d.getTime())) return Infinity
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
}

function daysFromToday(iso) {
  if (!iso) return -Infinity
  const d = new Date(iso + 'T00:00:00')
  if (isNaN(d.getTime())) return -Infinity
  return Math.floor((d.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24))
}

function loadJSON(file) {
  const p = path.join(PUBLIC, file)
  if (!existsSync(p)) throw new Error(`File not found: ${file}`)
  const raw = readFileSync(p, 'utf8')
  return JSON.parse(raw)
}

// --- Report accumulator ---
// Each section is { title, level, lines[], criticals[], warnings[] }
const sections = []

function newSection(title) {
  const s = { title, criticals: [], warnings: [], lines: [] }
  sections.push(s)
  return s
}

function checkTheaters() {
  const s = newSection('Cinema (theaters.json)')
  let data
  try {
    data = loadJSON('theaters.json')
  } catch (err) {
    s.criticals.push(`Cannot load theaters.json: ${err.message}`)
    return
  }
  if (!Array.isArray(data.theaters)) {
    s.criticals.push('theaters.json missing theaters[] array')
    return
  }

  const age = daysSince(data.lastUpdated)
  const ageStr = age === 0 ? 'today' : age === 1 ? 'yesterday' : `${age} days ago`
  s.lines.push(`- Last updated: ${data.lastUpdated?.slice(0, 10) || 'unknown'} (${ageStr})`)

  if (age > 5) s.criticals.push(`theaters.json is ${age} days old (CRITICAL: >5)`)
  else if (age > 2) s.warnings.push(`theaters.json is ${age} days old (should be ≤2)`)

  const total = data.theaters.length
  if (total < 20) s.criticals.push(`Only ${total} theaters tracked (floor: 20)`)

  let futureScreenings = 0
  let theatersWithFuture = 0
  let latestDate = ''
  const emptyTheaters = []
  for (const t of data.theaters) {
    const scr = Array.isArray(t.screenings) ? t.screenings : []
    const future = scr.filter(x => x.date && x.date >= todayISO)
    if (future.length === 0) emptyTheaters.push(t.name || t.id)
    else theatersWithFuture++
    futureScreenings += future.length
    for (const x of future) {
      if (x.date > latestDate) latestDate = x.date
    }
  }

  const horizon = latestDate ? daysFromToday(latestDate) : 0
  s.lines.push(`- ${total} theaters tracked, ${theatersWithFuture} with future screenings`)
  s.lines.push(`- ${futureScreenings} future screenings, horizon ${horizon} days`)

  if (futureScreenings < 100) s.criticals.push(`Only ${futureScreenings} future screenings (floor: 100)`)
  if (theatersWithFuture < 20) s.criticals.push(`Only ${theatersWithFuture} theaters have future screenings (floor: 20)`)
  if (horizon < 7) s.criticals.push(`Screening horizon only ${horizon} days (floor: 7)`)

  if (emptyTheaters.length > 0) {
    s.warnings.push(`${emptyTheaters.length} theaters with 0 future screenings: ${emptyTheaters.join(', ')}`)
    s.lines.push(`- ⚠️ ${emptyTheaters.length} theaters with 0 screenings: ${emptyTheaters.join(', ')}`)
  }
}

function checkJazz() {
  const s = newSection('Jazz (jazz-venues.json)')
  let data
  try {
    data = loadJSON('jazz-venues.json')
  } catch (err) {
    s.criticals.push(`Cannot load jazz-venues.json: ${err.message}`)
    return
  }
  if (!Array.isArray(data.venues)) {
    s.criticals.push('jazz-venues.json missing venues[] array')
    return
  }

  const age = daysSince(data.lastUpdated)
  const ageStr = age === 0 ? 'today' : age === 1 ? 'yesterday' : `${age} days ago`
  s.lines.push(`- Last updated: ${data.lastUpdated?.slice(0, 10) || 'unknown'} (${ageStr})`)

  if (age > 5) s.criticals.push(`jazz-venues.json is ${age} days old (CRITICAL: >5)`)
  else if (age > 2) s.warnings.push(`jazz-venues.json is ${age} days old (should be ≤2)`)

  const total = data.venues.length
  let futureShows = 0
  let venuesWithFuture = 0
  let latestDate = ''
  for (const v of data.venues) {
    const shows = Array.isArray(v.shows) ? v.shows : []
    const future = shows.filter(x => x.date && x.date >= todayISO)
    if (future.length > 0) venuesWithFuture++
    futureShows += future.length
    for (const x of future) {
      if (x.date > latestDate) latestDate = x.date
    }
  }
  const horizon = latestDate ? daysFromToday(latestDate) : 0
  s.lines.push(`- ${total} venues, ${venuesWithFuture} with future shows`)
  s.lines.push(`- ${futureShows} future shows, horizon ${horizon} days`)

  if (venuesWithFuture < 5) s.criticals.push(`Only ${venuesWithFuture} venues have future shows (floor: 5)`)
  if (futureShows < 50) s.criticals.push(`Only ${futureShows} future jazz shows (floor: 50)`)

  const errs = Array.isArray(data.scrapeErrors) ? data.scrapeErrors : []
  if (errs.length > 0) {
    const summary = errs.map(e => `${e.source} (${e.error})`).join(', ')
    s.warnings.push(`${errs.length} source errors: ${summary}`)
    s.lines.push(`- ⚠️ ${errs.length} source errors: ${summary}`)
  }
  if (errs.length > total / 2) {
    s.criticals.push(`${errs.length}/${total} jazz sources failing (>50%)`)
  }
}

function checkRestaurants() {
  const s = newSection('Restaurants (restaurants.json)')
  let data
  try {
    data = loadJSON('restaurants.json')
  } catch (err) {
    s.criticals.push(`Cannot load restaurants.json: ${err.message}`)
    return
  }
  if (!Array.isArray(data.restaurants)) {
    s.criticals.push('restaurants.json missing restaurants[] array')
    return
  }

  const age = daysSince(data.lastUpdated)
  const ageStr = age === 0 ? 'today' : age === 1 ? 'yesterday' : `${age} days ago`
  s.lines.push(`- Last updated: ${data.lastUpdated?.slice(0, 10) || 'unknown'} (${ageStr})`)

  if (age > 14) s.criticals.push(`restaurants.json is ${age} days old (CRITICAL: >14)`)
  else if (age > 8) s.warnings.push(`restaurants.json is ${age} days old (should be ≤8)`)

  const total = data.restaurants.length
  s.lines.push(`- ${total} restaurants tracked`)
  if (total < 200) s.criticals.push(`Only ${total} restaurants (floor: 200)`)

  // Tier balance from scrape-log.json
  let log
  try {
    log = loadJSON('scrape-log.json')
  } catch {
    s.warnings.push('scrape-log.json missing — cannot verify tier balance')
    return
  }
  const tiers = log.tiers || {}
  const street = tiers.street || 0
  const feast = tiers.feast || 0
  const whale = tiers.whale || 0
  s.lines.push(`- Tiers: street ${street}, feast ${feast}, whale ${whale}`)
  if (street <= 0) s.warnings.push('Tier balance: street = 0')
  if (feast <= 0) s.warnings.push('Tier balance: feast = 0')
  if (whale <= 0) s.warnings.push('Tier balance: whale = 0')
}

function checkGuide() {
  const s = newSection('Guide (guide-restaurants.json)')
  let data
  try {
    data = loadJSON('guide-restaurants.json')
  } catch (err) {
    s.criticals.push(`Cannot load guide-restaurants.json: ${err.message}`)
    return
  }
  if (!Array.isArray(data.restaurants)) {
    s.criticals.push('guide-restaurants.json missing restaurants[] array')
    return
  }
  const total = data.restaurants.length
  s.lines.push(`- ${total} hand-curated entries`)
  s.lines.push(`- Manual file, no freshness check`)
  if (total < 20) s.criticals.push(`Only ${total} guide entries (floor: 20)`)
}

// --- Run all checks ---
checkTheaters()
checkJazz()
checkRestaurants()
checkGuide()

const allCriticals = sections.flatMap(s => s.criticals.map(m => [s.title, m]))
const allWarnings = sections.flatMap(s => s.warnings.map(m => [s.title, m]))

let status, statusIcon, statusColor
if (allCriticals.length > 0) {
  status = 'CRITICAL'
  statusIcon = '✗'
  statusColor = c.red
} else if (allWarnings.length > 0) {
  status = 'WARNINGS'
  statusIcon = '⚠️'
  statusColor = c.yellow
} else {
  status = 'HEALTHY'
  statusIcon = '✓'
  statusColor = c.green
}

const now = new Date()
const generatedUTC = now.toISOString().slice(0, 16).replace('T', ' ') + ' UTC'

// --- Build markdown report ---
const md = []
md.push(`# SIXPM — Data Health Report`)
md.push('')
md.push(`_Generated ${generatedUTC}_`)
md.push('')
md.push(`**Status: ${status}** ${statusIcon}`)
md.push('')

if (allCriticals.length > 0) {
  md.push(`## Critical Issues (${allCriticals.length})`)
  md.push('')
  for (const [section, msg] of allCriticals) {
    md.push(`- **[${section}]** ${msg}`)
  }
  md.push('')
}
if (allWarnings.length > 0) {
  md.push(`## Warnings (${allWarnings.length})`)
  md.push('')
  for (const [section, msg] of allWarnings) {
    md.push(`- **[${section}]** ${msg}`)
  }
  md.push('')
}

for (const s of sections) {
  md.push(`## ${s.title}`)
  for (const line of s.lines) md.push(line)
  md.push('')
}

md.push('---')
md.push('_Next scheduled refresh: daily 2am PT (cinema + jazz) | Friday 4pm PT (+ restaurants + digest) | Sunday 1am PT (weekly deep refresh)_')
md.push('')

const mdReport = md.join('\n')

// --- Build colorized terminal report ---
const term = []
term.push(`${c.bold}${c.cyan}SIXPM — Data Health Report${c.reset}`)
term.push(`${c.dim}Generated ${generatedUTC}${c.reset}`)
term.push('')
term.push(`${c.bold}Status: ${statusColor}${status} ${statusIcon}${c.reset}`)
term.push('')
if (allCriticals.length > 0) {
  term.push(`${c.red}${c.bold}Critical Issues (${allCriticals.length}):${c.reset}`)
  for (const [section, msg] of allCriticals) {
    term.push(`  ${c.red}✗${c.reset} [${section}] ${msg}`)
  }
  term.push('')
}
if (allWarnings.length > 0) {
  term.push(`${c.yellow}${c.bold}Warnings (${allWarnings.length}):${c.reset}`)
  for (const [section, msg] of allWarnings) {
    term.push(`  ${c.yellow}⚠${c.reset} [${section}] ${msg}`)
  }
  term.push('')
}
for (const s of sections) {
  term.push(`${c.bold}${s.title}${c.reset}`)
  for (const line of s.lines) {
    // strip leading "- " for nicer terminal look
    term.push(`  ${line.replace(/^- /, '')}`)
  }
  term.push('')
}

console.log(term.join('\n'))

// --- Write health-report.md ---
try {
  writeFileSync(path.join(PUBLIC, 'health-report.md'), mdReport)
} catch (err) {
  console.error(`Failed to write public/health-report.md: ${err.message}`)
}

// --- Append to GITHUB_STEP_SUMMARY if in CI ---
if (process.env.GITHUB_STEP_SUMMARY) {
  try {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, mdReport + '\n')
  } catch (err) {
    console.error(`Failed to append GITHUB_STEP_SUMMARY: ${err.message}`)
  }
}

// --- Exit code ---
if (allCriticals.length > 0) process.exit(2)
if (allWarnings.length > 0) process.exit(STRICT ? 2 : 1)
process.exit(0)
