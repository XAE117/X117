#!/usr/bin/env node
// Generates public/louis-cole-bio.json from manuscript chapter files

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CHAPTERS_DIR = '/Users/jameswalker/claude/projects/louis-cole/chapters'
const OUT_FILE = join(__dirname, '../public/louis-cole-bio.json')

const CHAPTER_DEFS = [
  { file: 'ch00_prologue_v2.md',       id: 'prologue',        number: 0,  emoji: '🎭', shortTitle: 'Prologue' },
  { file: 'ch01_living_room_v2.md',    id: 'living-room',     number: 1,  emoji: '🎵', shortTitle: 'The Living Room' },
  { file: 'ch02_toy_drum_set_v2.md',   id: 'toy-drum-set',    number: 2,  emoji: '🥁', shortTitle: 'Toy Drum Set' },
  { file: 'ch03_pep_talk_v2.md',       id: 'pep-talk',        number: 3,  emoji: '💡', shortTitle: 'Pep Talk' },
  { file: 'ch04_galaxy_v2.md',         id: 'knower',          number: 4,  emoji: '🌀', shortTitle: 'Galaxy' },
  { file: 'ch05_bank_account_v2.md',   id: 'bank-account',    number: 5,  emoji: '💳', shortTitle: 'Bank Account' },
  { file: 'ch06_trashy_sacred_v2.md',  id: 'trashy-sacred',   number: 6,  emoji: '🎪', shortTitle: 'Trashy Sacred' },
  { file: 'ch07_terminator_v2.md',     id: 'terminator',      number: 7,  emoji: '⚙️', shortTitle: 'Terminator' },
  { file: 'ch08_nightmare_toilet_v2.md', id: 'nightmare-toilet', number: 8, emoji: '🤡', shortTitle: 'Nightmare Toilet' },
  { file: 'ch09_brainfeeder_v2.md',    id: 'brainfeeder',     number: 9,  emoji: '🐋', shortTitle: 'Brainfeeder' },
  { file: 'ch10_time_v2.md',           id: 'time',            number: 10, emoji: '⏰', shortTitle: 'Time' },
  { file: 'ch11_rude_guy_v2.md',       id: 'rude-guy',        number: 11, emoji: '🎺', shortTitle: 'Rude Guy' },
  { file: 'ch12_pulpit_stilts_v2.md',  id: 'pulpit-stilts',   number: 12, emoji: '💰', shortTitle: 'Pulpit & Stilts' },
  { file: 'ch13_epilogue_v2.md',       id: 'epilogue',        number: 13, emoji: '✨', shortTitle: 'Epilogue' },
]

function extractTitle(content) {
  const lines = content.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('# ')) return trimmed.slice(2).trim()
    if (trimmed.startsWith('## ')) return trimmed.slice(3).trim()
  }
  return null
}

function processContent(raw) {
  // Remove the H1/H2 title line at top
  let content = raw.replace(/^#{1,2} .+\n/, '').trim()

  // Strip [SOURCE: ...] lines
  content = content.replace(/^\[SOURCE:[^\]]*\]\s*$/gm, '')

  // Strip [^n] footnote definitions
  content = content.replace(/^\[\^\d+\]:.+$/gm, '')

  // Collapse 3+ blank lines to 2
  content = content.replace(/\n{3,}/g, '\n\n')

  return content.trim()
}

const chapters = CHAPTER_DEFS.map(def => {
  const raw = readFileSync(join(CHAPTERS_DIR, def.file), 'utf8')
  const extractedTitle = extractTitle(raw)
  const content = processContent(raw)
  return {
    id: def.id,
    number: def.number,
    title: extractedTitle || def.shortTitle,
    shortTitle: def.shortTitle,
    emoji: def.emoji,
    content,
  }
})

const bio = {
  title: 'Grabbing Magic Out of the Boring Air',
  subtitle: 'The Louis Cole Story',
  byline: 'A Biography',
  lastUpdated: '2026-04-18',
  chapters,
}

writeFileSync(OUT_FILE, JSON.stringify(bio, null, 2), 'utf8')

const totalChars = chapters.reduce((sum, ch) => sum + ch.content.length, 0)
console.log(`✓ Generated ${OUT_FILE}`)
console.log(`  ${chapters.length} chapters, ~${Math.round(totalChars / 1000)}K chars`)
chapters.forEach(ch => console.log(`  Ch${ch.number}: "${ch.shortTitle}" — ${ch.content.length} chars`))
