#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateIosCatalogBundle } from './lib/ios-catalog.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), 'utf8'))
}

const policy = readJson('config/ios-provider-policy.json')
const index = readJson('public/catalog/v1/index.json')
const feeds = {
  cinema: readJson('public/catalog/v1/cinema.json'),
  jazz: readJson('public/catalog/v1/jazz.json'),
  food: readJson('public/catalog/v1/food.json'),
}
const errors = validateIosCatalogBundle({ index, feeds, policy })

if (errors.length > 0) {
  console.error('iOS catalog validation failed:')
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}

console.log('iOS catalog validation passed.')
