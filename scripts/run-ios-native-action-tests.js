#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process'
import { once } from 'node:events'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const simulatorId = process.env.IOS_SIMULATOR_ID?.trim()
const qaBundleId = 'com.xae117.sixpm.qa'
const port = Number(process.env.IOS_NATIVE_QA_PORT || 4174)
const catalogBase = `http://127.0.0.1:${port}/`

if (!simulatorId) {
  console.error('Set IOS_SIMULATOR_ID to the disposable iPhone Simulator UDID before running native action QA.')
  process.exit(2)
}

if (!/^[A-F0-9-]{36}$/i.test(simulatorId)) {
  console.error('IOS_SIMULATOR_ID must be an iOS Simulator UUID.')
  process.exit(2)
}

if (!Number.isInteger(port) || port < 1024 || port > 65_535) {
  console.error('IOS_NATIVE_QA_PORT must be an unprivileged TCP port.')
  process.exit(2)
}

function run(command, args, { env, allowFailure = false, silent = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  })

  if (!silent && result.stdout) process.stdout.write(result.stdout)
  if (!silent && result.stderr) process.stderr.write(result.stderr)
  if (result.error) throw result.error
  if (!allowFailure && result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited ${result.status ?? 'without a status'}.`)
  }
  return result
}

function assertNoMainThreadCheckerWarnings() {
  const logsRoot = path.join('/tmp', 'sixpm-ios-native-action-tests', 'Logs', 'Test')
  const latestResult = spawnSync('find', [logsRoot, '-maxdepth', '1', '-name', 'Test-App-*.xcresult', '-print'], {
    cwd: root,
    encoding: 'utf8',
  }).stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(resultPath => ({ resultPath, modifiedAt: spawnSync('stat', ['-f', '%m', resultPath], { encoding: 'utf8' }).stdout.trim() }))
    .sort((left, right) => Number(right.modifiedAt) - Number(left.modifiedAt))[0]?.resultPath

  if (!latestResult) throw new Error('Native action QA did not produce an XCTest result bundle.')

  const activities = run('xcrun', [
    'xcresulttool',
    'get',
    'test-results',
    'activities',
    '--path', latestResult,
    '--test-id', 'SIXPMAppUITests/testNativeReminderLifecycleWithLocalCatalog()',
  ], { silent: true })
  if (/Main Thread Checker:/i.test(`${activities.stdout || ''}\n${activities.stderr || ''}`)) {
    throw new Error('Native action QA detected a Main Thread Checker warning.')
  }
}

function losAngelesParts(timestamp) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  return Object.fromEntries(formatter.formatToParts(new Date(timestamp))
    .filter(part => part.type !== 'literal')
    .map(part => [part.type, Number(part.value)]))
}

function losAngelesOffsetAt(timestamp) {
  const parts = losAngelesParts(timestamp)
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - timestamp
}

function screeningTimestamp(screening) {
  const dateMatch = String(screening?.date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const timeMatch = String(screening?.time || '').match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i)
  if (!dateMatch || !timeMatch) return Number.NaN

  const year = Number(dateMatch[1])
  const month = Number(dateMatch[2])
  const day = Number(dateMatch[3])
  let hour = Number(timeMatch[1])
  const minute = Number(timeMatch[2])
  const period = timeMatch[3].toLowerCase()
  if (period === 'pm' && hour !== 12) hour += 12
  if (period === 'am' && hour === 12) hour = 0

  const civilTimestamp = Date.UTC(year, month - 1, day, hour, minute)
  const initialOffset = losAngelesOffsetAt(civilTimestamp)
  let timestamp = civilTimestamp - initialOffset
  const settledOffset = losAngelesOffsetAt(timestamp)
  if (settledOffset !== initialOffset) timestamp = civilTimestamp - settledOffset
  return timestamp
}

async function nativeQaSelection() {
  const [cinemaRaw, foodRaw] = await Promise.all([
    readFile(path.join(root, 'public/catalog/v1/cinema.json'), 'utf8'),
    readFile(path.join(root, 'public/catalog/v1/food.json'), 'utf8'),
  ])
  const cinema = JSON.parse(cinemaRaw)
  const food = JSON.parse(foodRaw)
  const now = Date.now()
  const earliestReminderTime = now + 2 * 60 * 60 * 1000
  const expiresAt = new Date(cinema?.expiresAt).getTime()
  const candidates = (cinema?.data?.theaters || [])
    .flatMap(theater => theater.screenings || [])
    .map(screening => ({ screening, timestamp: screeningTimestamp(screening) }))
    .filter(candidate => Number.isFinite(candidate.timestamp) && candidate.timestamp >= earliestReminderTime && candidate.timestamp <= expiresAt)
    .sort((left, right) => left.timestamp - right.timestamp || left.screening.title.localeCompare(right.screening.title))

  const film = candidates[0]?.screening
  const dinner = food?.data?.restaurants?.[0]
  if (!film?.title || !dinner?.name) {
    throw new Error('The local rights-gated catalog has no future film/dinner pair suitable for native reminder QA.')
  }
  return { filmTitle: film.title, dinnerName: dinner.name }
}

async function waitForCatalog() {
  const url = new URL('catalog/v1/index.json', catalogBase)
  let lastError = null
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(url)
      const contentType = response.headers.get('content-type') || ''
      if (response.ok && /json/i.test(contentType)) return
      lastError = new Error(`Catalog server returned ${response.status} ${contentType || 'without a content type'}.`)
    } catch (error) {
      lastError = error
    }
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw new Error(`Local QA catalog did not become available: ${lastError?.message || 'unknown error'}`)
}

async function stopServer(server) {
  if (!server || server.exitCode !== null) return
  server.kill('SIGTERM')
  const exited = await Promise.race([
    once(server, 'exit'),
    new Promise(resolve => setTimeout(resolve, 2_000)),
  ])
  if (!exited && server.exitCode === null) {
    server.kill('SIGKILL')
    await once(server, 'exit')
  }
}

let server
let failure = null

try {
  const selection = await nativeQaSelection()
  console.log(`Native QA uses only the local rights-gated catalog at ${catalogBase}.`)
  console.log(`Selected QA pair: ${selection.filmTitle} + ${selection.dinnerName}`)

  run('xcrun', ['simctl', 'bootstatus', simulatorId, '-b'])
  server = spawn('npm', ['run', 'dev:ios', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: root,
    env: { ...process.env, VITE_IOS_CATALOG_BASE: catalogBase },
    stdio: 'inherit',
  })
  await waitForCatalog()

  run('npm', ['run', 'build:ios'], { env: { VITE_IOS_CATALOG_BASE: catalogBase } })
  run('npx', ['cap', 'sync', 'ios'])
  // The simulator does not permit `simctl privacy reset notifications`. A
  // distinct, disposable QA bundle identifier gives this test an actually new
  // notification authorization record without touching private simulator state.
  run('xcrun', ['simctl', 'uninstall', simulatorId, qaBundleId], { allowFailure: true })

  const result = run('xcodebuild', [
    '-project', 'ios/App/App.xcodeproj',
    '-scheme', 'App',
    '-configuration', 'Debug',
    '-destination', `platform=iOS Simulator,id=${simulatorId}`,
    '-derivedDataPath', '/tmp/sixpm-ios-native-action-tests',
    'CODE_SIGNING_ALLOWED=NO',
    'INFOPLIST_FILE=App/Info-QA.plist',
    `SIXPM_QA_BUNDLE_ID=${qaBundleId}`,
    'SWIFT_ACTIVE_COMPILATION_CONDITIONS=$(inherited) SIXPM_NATIVE_ACTION_QA',
    'test',
    '-only-testing:AppUITests/SIXPMAppUITests/testNativeReminderLifecycleWithLocalCatalog',
  ])

  if (/testNativeReminderLifecycleWithLocalCatalog.*skipped/i.test(`${result.stdout || ''}\n${result.stderr || ''}`)) {
    throw new Error('The native reminder test was skipped instead of executing.')
  }
  assertNoMainThreadCheckerWarnings()
} catch (error) {
  failure = error
  console.error(error?.stack || error?.message || error)
} finally {
  await stopServer(server)
  run('xcrun', ['simctl', 'uninstall', simulatorId, qaBundleId], { allowFailure: true })
  try {
    // Never leave the normal app bundle pointing at a local catalog or carrying
    // the QA transport exception. The tracked Release plist remains canonical.
    run('npm', ['run', 'ios:sync'])
  } catch (error) {
    console.error(error?.stack || error?.message || error)
    failure ||= error
  }
}

if (failure) process.exit(1)
