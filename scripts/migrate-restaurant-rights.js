#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  sanitizeGuideRestaurantForRights,
  sanitizeRestaurantForRights,
} from './lib/restaurant-rights.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function migrate(relativePath, transformCollection) {
  const file = path.join(root, relativePath)
  const data = JSON.parse(readFileSync(file, 'utf8'))
  const next = transformCollection(data)
  writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`)
  return next.restaurants.length
}

const restaurantCount = migrate('public/restaurants.json', data => ({
  ...data,
  restaurants: (data.restaurants || []).map(sanitizeRestaurantForRights),
}))
const manualCount = migrate('public/restaurants-manual.json', data => ({
  ...data,
  restaurants: (data.restaurants || []).map(sanitizeRestaurantForRights),
}))
const guideCount = migrate('public/guide-restaurants.json', data => ({
  ...data,
  restaurants: (data.restaurants || []).map(sanitizeGuideRestaurantForRights),
}))

console.log(`Removed Google Places artifacts and marked provenance for ${restaurantCount} restaurants, ${manualCount} manual records, and ${guideCount} guide records.`)
