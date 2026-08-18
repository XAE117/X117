#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = path.join(root, 'ios/App/App/PrivacyInfo.xcprivacy')
const projectPath = path.join(root, 'ios/App/App.xcodeproj/project.pbxproj')
const manifest = readFileSync(manifestPath, 'utf8')
const project = readFileSync(projectPath, 'utf8')

const expectations = [
  ['privacy manifest tracks no users', manifest, /<key>NSPrivacyTracking<\/key>\s*<false\/>/],
  ['privacy manifest has no tracking domains', manifest, /<key>NSPrivacyTrackingDomains<\/key>\s*<array\/>/],
  ['privacy manifest declares no local app data collection', manifest, /<key>NSPrivacyCollectedDataTypes<\/key>\s*<array\/>/],
  ['privacy manifest declares app-only UserDefaults use', manifest, /<string>NSPrivacyAccessedAPICategoryUserDefaults<\/string>/],
  ['privacy manifest declares Apple reason CA92.1', manifest, /<string>CA92\.1<\/string>/],
  ['Xcode project includes the privacy manifest', project, /PrivacyInfo\.xcprivacy in Resources/],
]

const failures = expectations
  .filter(([, contents, matcher]) => !matcher.test(contents))
  .map(([description]) => description)

if (failures.length > 0) {
  console.error('iOS privacy-manifest check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('iOS privacy-manifest check passed.')
