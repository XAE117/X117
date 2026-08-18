#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const bundleDir = path.join(root, 'dist-ios')
const forbiddenPaths = [
  'morning-console',
  'morning-console.html',
  'momentum-streaks',
  'louis-cole-bio.json',
  'theaters.json',
  'jazz-venues.json',
  'restaurants.json',
  'guide-restaurants.json',
]
const forbiddenSecrets = [
  'TMDB_API_KEY',
  'AMC_API_KEY',
  'GOOGLE_PLACES_API_KEY',
  'NOTION_API_KEY',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_ACCOUNT_SID',
]

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(file) : [file]
  })
}

if (!statSync(bundleDir, { throwIfNoEntry: false })) {
  throw new Error('dist-ios is missing. Run npm run build:ios first.')
}

if (!statSync(path.join(bundleDir, 'index.html'), { throwIfNoEntry: false })) {
  throw new Error('dist-ios/index.html is missing. The Capacitor shell requires a local index.html entrypoint.')
}

const files = walk(bundleDir)
const failures = []
for (const file of files) {
  const relative = path.relative(bundleDir, file).replaceAll(path.sep, '/')
  const lowerPath = relative.toLowerCase()
  for (const forbidden of forbiddenPaths) {
    if (lowerPath.includes(forbidden)) failures.push(`Native bundle includes excluded path: ${relative}`)
  }
  if (/\.(?:js|css|html|json|txt|map)$/i.test(file)) {
    const contents = readFileSync(file, 'utf8')
    for (const token of forbiddenSecrets) {
      if (contents.includes(token)) failures.push(`Native bundle contains a secret variable token: ${token}`)
    }
  }
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`iOS bundle boundary check passed (${files.length} files; no excluded products or API-key tokens).`)
