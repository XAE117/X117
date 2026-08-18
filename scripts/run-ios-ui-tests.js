#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const simulatorId = process.env.IOS_SIMULATOR_ID?.trim()
const bundleId = 'com.xae117.sixpm'

if (!simulatorId) {
  console.error('Set IOS_SIMULATOR_ID to the disposable iPhone Simulator UDID before running native UI tests.')
  process.exit(2)
}

if (!/^[A-F0-9-]{36}$/i.test(simulatorId)) {
  console.error('IOS_SIMULATOR_ID must be an iOS Simulator UUID.')
  process.exit(2)
}

// Keep this a genuine fresh-install test. Reusing a previous app container can
// silently substitute a verified offline catalog for the recovery state.
const uninstall = spawnSync('xcrun', [
  'simctl',
  'uninstall',
  simulatorId,
  bundleId,
], {
  cwd: root,
  stdio: 'inherit',
})

if (uninstall.error) {
  console.error(uninstall.error.message)
  process.exit(1)
}

if (uninstall.status !== 0) process.exit(uninstall.status ?? 1)

const privacyReset = spawnSync('xcrun', [
  'simctl',
  'privacy',
  simulatorId,
  'reset',
  'location',
], {
  cwd: root,
  stdio: 'inherit',
})

if (privacyReset.error) {
  console.error(privacyReset.error.message)
  process.exit(1)
}

if (privacyReset.status !== 0) process.exit(privacyReset.status ?? 1)

const result = spawnSync('xcodebuild', [
  '-project', 'ios/App/App.xcodeproj',
  '-scheme', 'App',
  '-configuration', 'Debug',
  '-destination', `platform=iOS Simulator,id=${simulatorId}`,
  '-derivedDataPath', '/tmp/sixpm-ios-ui-tests',
  'CODE_SIGNING_ALLOWED=NO',
  'test',
], {
  cwd: root,
  stdio: 'inherit',
})

if (result.error) {
  console.error(result.error.message)
  process.exit(1)
}

process.exit(result.status ?? 1)
