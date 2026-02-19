#!/usr/bin/env node
'use strict';

/**
 * liza-sync.js
 *
 * Nightly iMessage → Notion sync for Liza transcripts.
 * Reads directly from ~/Library/Messages/chat.db on macOS.
 * Runs at 2am via system crontab.
 *
 * Required env: NOTION_API_KEY
 * Optional env: CHAT_DB_PATH (default: ~/Library/Messages/chat.db)
 */

const { Client } = require('@notionhq/client');
const Database   = require('better-sqlite3');
const fs         = require('fs');
const path       = require('path');
const os         = require('os');

// ─── Config ───────────────────────────────────────────────────────────────────

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const CHAT_DB_PATH   = process.env.CHAT_DB_PATH
  || path.join(os.homedir(), 'Library', 'Messages', 'chat.db');

// Liza's iMessage handle — confirmed from chat.db
const LIZA_HANDLE = '+12313490274';

const STATE_FILE = path.join(os.homedir(), '.liza-sync-state.json');
const LOG_FILE   = path.join(os.homedir(), '.liza-sync-log.json');

// ─── Notion Page IDs ─────────────────────────────────────────────────────────

const LIZA_CRM_PAGE_ID        = '306c051d-73d2-813b-b15b-ed1248a60e4b';
const TRANSCRIPT_DIRECTORY_ID = '2fec051d-73d2-81e7-aa7f-c66537ad064d';

// Week 1 anchor: Jan 6, 2026. Each week = 7 days.
const WEEK_ANCHOR_MS = new Date('2026-01-06T00:00:00').getTime();
const MS_PER_WEEK    = 7 * 24 * 60 * 60 * 1000;

const KNOWN_WEEKS = [
  { n: 1, id: '2fec051d-73d2-81109070cf76a4078c1d',  label: 'Jan 6–12'     },
  { n: 2, id: '2fec051d-73d2-81cd-b4dd-e1d0e56ebe13', label: 'Jan 13–19'   },
  { n: 3, id: '2fec051d-73d2-81f7-8ac1-e9658f6c0bb7', label: 'Jan 20–26'   },
  { n: 4, id: '2fec051d-73d2-8198-9172-fb5d4a0951dc', label: 'Jan 27–Feb 2' },
  { n: 5, id: '2fec051d-73d2-8159-b8ab-fadcdef09c78', label: 'Feb 2–8'     },
  { n: 6, id: '437f4879-1b1b-44bb-a980-1d48f3c45fb5', label: 'Feb 9–15'    },
  { n: 7, id: '30cc051d-73d2-817e-b3c4-dc1c654715ed', label: 'Feb 16–22'   },
];

// ─── State & Logging ─────────────────────────────────────────────────────────

function log(msg) {
  process.stdout.write(`[liza-sync ${new Date().toISOString()}] ${msg}\n`);
}

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch (e) { log(`Warning: could not load state (${e.message}), starting fresh`); }
  return { last_rowid: 0, last_sync: null };
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify({ ...state, updated_at: new Date().toISOString() }, null, 2));
}

function appendRunLog(entry) {
  let history = [];
  try {
    if (fs.existsSync(LOG_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
      if (Array.isArray(parsed)) history = parsed;
    }
  } catch (_) {}
  history.unshift({ ...entry, timestamp: new Date().toISOString() });
  fs.writeFileSync(LOG_FILE, JSON.stringify(history.slice(0, 90), null, 2));
}

// ─── iMessage / chat.db ───────────────────────────────────────────────────────

// Apple timestamps: nanoseconds since 2001-01-01
const APPLE_EPOCH_MS = 978307200000;

function appleNsToDate(ns) {
  return new Date(Math.round(Number(ns) / 1e6) + APPLE_EPOCH_MS);
}

function fetchMessages(lastRowid) {
  if (!fs.existsSync(CHAT_DB_PATH)) {
    throw new Error(
      `chat.db not found at ${CHAT_DB_PATH}. ` +
      'Ensure Messages is enabled and Full Disk Access is granted to Terminal/cron.'
    );
  }

  const db = new Database(CHAT_DB_PATH, { readonly: true, fileMustExist: true });

  try {
    const rows = db.prepare(`
      SELECT
        m.ROWID,
        m.text,
        m.date        AS apple_ns,
        m.is_from_me,
        m.associated_message_type
      FROM message m
      JOIN handle h ON m.handle_id = h.ROWID
      WHERE
        h.id = ?
        AND m.ROWID > ?
        AND m.text IS NOT NULL
        AND m.text != ''
        AND m.associated_message_type = 0
      ORDER BY m.date ASC
    `).all(LIZA_HANDLE, lastRowid);

    return rows.map(r => ({
      rowid:     r.ROWID,
      timestamp: appleNsToDate(r.apple_ns),
      body:      r.text.trim(),
      isFromMe:  r.is_from_me === 1,
    }));
  } finally {
    db.close();
  }
}

// ─── Week Helpers ─────────────────────────────────────────────────────────────

function getWeekNumber(date = new Date()) {
  const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const offset = midnight - WEEK_ANCHOR_MS;
  if (offset < 0) return null;
  return Math.floor(offset / MS_PER_WEEK) + 1;
}

function getKnownWeekId(n) {
  const w = KNOWN_WEEKS.find(x => x.n === n);
  return w ? w.id : null;
}

function buildWeekTitle(n) {
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const s = new Date(WEEK_ANCHOR_MS + (n - 1) * MS_PER_WEEK);
  const e = new Date(s.getTime() + 6 * 24 * 60 * 60 * 1000);
  const start = `${M[s.getMonth()]} ${s.getDate()}`;
  const end   = e.getMonth() !== s.getMonth() ? `${M[e.getMonth()]} ${e.getDate()}` : `${e.getDate()}`;
  return `Week ${n} — ${start}–${end}`;
}

// ─── Notion Helpers ───────────────────────────────────────────────────────────

async function getAllBlocks(notion, pageId) {
  const blocks = [];
  let cursor;
  do {
    const res = await notion.blocks.children.list({ block_id: pageId, start_cursor: cursor, page_size: 100 });
    blocks.push(...res.results);
    cursor = res.has_more ? res.next_cursor : null;
  } while (cursor);
  return blocks;
}

function blockText(block) {
  const p = block[block.type];
  return p?.rich_text ? p.rich_text.map(r => r.plain_text || '').join('') : '';
}

async function dayHeaderExists(notion, pageId, header) {
  const blocks = await getAllBlocks(notion, pageId);
  const norm = header.trim().toUpperCase();
  return blocks.some(b => b.type === 'heading_3' && blockText(b).trim().toUpperCase() === norm);
}

async function appendBlocks(notion, pageId, blocks) {
  for (let i = 0; i < blocks.length; i += 100) {
    await notion.blocks.children.append({ block_id: pageId, children: blocks.slice(i, i + 100) });
  }
}

// ─── Formatting ───────────────────────────────────────────────────────────────

const DAYS  = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
const MONS  = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE',
               'JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];

function fmt12h(date) {
  const h = date.getHours(), m = date.getMinutes().toString().padStart(2, '0');
  return `${h % 12 || 12}:${m} ${h >= 12 ? 'PM' : 'AM'}`;
}

function dayHeader(date) {
  return `${DAYS[date.getDay()]}, ${MONS[date.getMonth()]} ${date.getDate()}`;
}

function groupByDay(messages) {
  const map = new Map();
  for (const msg of messages) {
    const d = msg.timestamp;
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (!map.has(key)) map.set(key, { date: d, messages: [] });
    map.get(key).messages.push(msg);
  }
  return [...map.entries()].sort(([a],[b]) => a.localeCompare(b)).map(([,v]) => v);
}

function makeMessageBlock(msg) {
  const prefix = msg.isFromMe ? `🔵 James (${fmt12h(msg.timestamp)}):` : `⚪ Liza (${fmt12h(msg.timestamp)}):`;
  return {
    object: 'block', type: 'paragraph',
    paragraph: {
      rich_text: [
        { type: 'text', text: { content: prefix }, annotations: { bold: true } },
        { type: 'text', text: { content: ` ${msg.body}` } },
      ],
    },
  };
}

// ─── Core Operations ──────────────────────────────────────────────────────────

async function ensureWeekPage(notion, n) {
  const id = getKnownWeekId(n);
  if (id) { log(`Week ${n} → ${id}`); return id; }
  const title = buildWeekTitle(n);
  log(`Creating new week page: "${title}"`);
  const page = await notion.pages.create({
    parent: { page_id: TRANSCRIPT_DIRECTORY_ID },
    properties: { title: { title: [{ type: 'text', text: { content: title } }] } },
    children: [{
      object: 'block', type: 'paragraph',
      paragraph: { rich_text: [{ type: 'text', text: { content: `iMessage transcript — ${title}` } }] },
    }],
  });
  log(`Created: ${page.id}`);
  return page.id;
}

async function appendMessages(notion, pageId, messages) {
  if (!messages.length) return 0;
  let appended = 0;
  for (const group of groupByDay(messages)) {
    const header  = dayHeader(group.date);
    const exists  = await dayHeaderExists(notion, pageId, header);
    const blocks  = [];
    if (!exists) {
      blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [] } });
      blocks.push({
        object: 'block', type: 'heading_3',
        heading_3: { rich_text: [{ type: 'text', text: { content: header } }], is_toggleable: false },
      });
    }
    for (const msg of group.messages) { blocks.push(makeMessageBlock(msg)); appended++; }
    await appendBlocks(notion, pageId, blocks);
  }
  return appended;
}

async function updateCrmLastContact(notion, date) {
  const dateStr = [
    date.getFullYear(),
    String(date.getMonth()+1).padStart(2,'0'),
    String(date.getDate()).padStart(2,'0'),
  ].join('-');

  const page = await notion.pages.retrieve({ page_id: LIZA_CRM_PAGE_ID });
  const props = page.properties;
  const field = ['Last Contact','Last Contacted','LastContact','Last contact date','Last Message']
    .find(f => f in props);

  if (!field) {
    log(`Warning: no Last Contact field found. Props: ${Object.keys(props).join(', ')}`);
    return false;
  }

  const value = props[field].type === 'date'
    ? { date: { start: dateStr } }
    : { rich_text: [{ type: 'text', text: { content: dateStr } }] };

  await notion.pages.update({ page_id: LIZA_CRM_PAGE_ID, properties: { [field]: value } });
  log(`CRM Last Contact → ${dateStr}`);
  return true;
}

async function updateDirectoryTimestamp(notion, date) {
  const dateStr = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const blocks  = await getAllBlocks(notion, TRANSCRIPT_DIRECTORY_ID);
  const existing = blocks.find(b => b.type === 'paragraph' && blockText(b).toLowerCase().includes('last updated'));
  const payload  = { rich_text: [{ type: 'text', text: { content: `Last updated: ${dateStr}` } }] };

  if (existing) {
    await notion.blocks.update({ block_id: existing.id, paragraph: payload });
  } else {
    await appendBlocks(notion, TRANSCRIPT_DIRECTORY_ID,
      [{ object: 'block', type: 'paragraph', paragraph: payload }]);
  }
  log(`Directory timestamp → ${dateStr}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!NOTION_API_KEY) {
    process.stderr.write('FATAL: NOTION_API_KEY not set in .env\n');
    process.exit(1);
  }

  const notion = new Client({ auth: NOTION_API_KEY });
  const state  = loadState();
  const result = { messages_added: 0, week: null, week_page_id: null, crm_updated: false, errors: [] };

  try {
    const today   = new Date();
    const weekNum = getWeekNumber(today);
    if (!weekNum) throw new Error('Today is before the Week 1 anchor (Jan 6, 2026)');

    result.week = weekNum;
    log(`Today: ${today.toDateString()} → Week ${weekNum}`);

    const weekPageId = await ensureWeekPage(notion, weekNum);
    result.week_page_id = weekPageId;

    log(`Reading chat.db from ROWID > ${state.last_rowid ?? 0}`);
    const messages = fetchMessages(state.last_rowid ?? 0);
    log(`Found ${messages.length} new message(s)`);

    if (messages.length > 0) {
      const added = await appendMessages(notion, weekPageId, messages);
      result.messages_added = added;
      log(`Appended ${added} block(s) to Week ${weekNum}`);

      if (messages.some(m => m.timestamp.toDateString() === today.toDateString())) {
        result.crm_updated = await updateCrmLastContact(notion, today);
      }

      await updateDirectoryTimestamp(notion, today);

      state.last_rowid = Math.max(...messages.map(m => m.rowid));
      state.last_sync  = new Date().toISOString();
      saveState(state);
    } else {
      log('Nothing new to sync');
    }

  } catch (err) {
    result.errors.push(err.message);
    process.stderr.write(`ERROR: ${err.message}\n`);
    if (err.stack) process.stderr.write(`${err.stack}\n`);
  }

  appendRunLog(result);
  if (result.errors.length) process.exit(1);
  log(`Done. added=${result.messages_added} crm=${result.crm_updated}`);
}

main();
