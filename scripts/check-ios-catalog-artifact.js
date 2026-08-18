#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceDir = path.join(root, 'public', 'catalog', 'v1')
const artifactDir = process.env.IOS_CATALOG_ARTIFACT_DIR
  ? path.resolve(root, process.env.IOS_CATALOG_ARTIFACT_DIR)
  : path.join(root, 'dist', 'catalog', 'v1')
const requiredFiles = ['index.json', 'cinema.json', 'jazz.json', 'food.json']

const failures = requiredFiles.flatMap(file => {
  const source = path.join(sourceDir, file)
  const artifact = path.join(artifactDir, file)
  if (!existsSync(source)) return [`Source catalog is missing ${file}`]
  if (!existsSync(artifact)) return [`Built catalog artifact is missing ${file}`]
  return readFileSync(source, 'utf8') === readFileSync(artifact, 'utf8')
    ? []
    : [`Built catalog artifact differs from the verified source: ${file}`]
})

if (failures.length > 0) {
  console.error('iOS catalog artifact check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  console.error('Run npm run build before this check, then inspect the catalog build inputs.')
  process.exit(1)
}

console.log(`iOS catalog artifact check passed (${requiredFiles.length} exact files in ${path.relative(root, artifactDir)}).`)
