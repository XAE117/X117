#!/usr/bin/env node

import { existsSync, renameSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const bundleDir = path.join(root, 'dist-ios')
const viteEntry = path.join(bundleDir, 'ios.html')
const capacitorEntry = path.join(bundleDir, 'index.html')

if (!existsSync(viteEntry)) {
  throw new Error('dist-ios/ios.html is missing. The isolated iPhone Vite entry did not build.')
}

if (existsSync(capacitorEntry)) {
  throw new Error('dist-ios/index.html already exists. Refusing to replace a generated Capacitor entrypoint.')
}

// Capacitor loads index.html from its bundled web directory. Vite preserves the
// intentionally separate source filename (`ios.html`), so normalize only the
// generated artifact after a clean build.
renameSync(viteEntry, capacitorEntry)
console.log('Prepared dist-ios/index.html for the Capacitor shell.')
