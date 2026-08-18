#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const simulatorId = process.env.IOS_SIMULATOR_ID?.trim()

if (!simulatorId) {
  console.error('Set IOS_SIMULATOR_ID to the disposable iPhone Simulator UDID before running native UI tests.')
  process.exit(2)
}

if (!/^[A-F0-9-]{36}$/i.test(simulatorId)) {
  console.error('IOS_SIMULATOR_ID must be an iOS Simulator UUID.')
  process.exit(2)
}

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
