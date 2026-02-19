#!/usr/bin/env node
'use strict';

/**
 * liza-sync.js
 *
 * Nightly iMessage → Notion sync for Liza transcripts.
 * Runs at 2am via system crontab. Pulls new messages from the
 * BlueBubbles → Notion source, appends to the correct week page,
 * and updates the Liza CRM Last Contact date.
 *
 * Required env:  NOTION_API_KEY
 * Optional env:  BLUEBUBBLES_DB_ID   — Notion database ID where BlueBubbles
 *                                       deposits raw messages (most common setup)
 *                LIZA_CONTACT_NAME   — display name in BlueBubbles (default: "Liza")
 *                LIZA_PHONE          — phone number for secondary filtering
 */

const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ─── Environment ─────────────────────────────────────────────────────────────

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const BLUEBUBBLES_DB_ID = process.env.BLUEBUBBLES_DB_ID || null;
const LIZA_CONTACT_NAME = (process.env.LIZA_CONTACT_NAME || 'Liza').toLowerCase();
const LIZA_PHONE = process.env.LIZA_PHONE ? process.env.LIZA_PHONE.replace(/\D/g, '') : null;

const STATE_FILE = path.join(os.homedir(), '.liza-sync-state.json');
const LOG_FILE = path.join(os.homedir(), '.liza-sync-log.json');

// ─── Notion Page IDs ─────────────────────────────────────────────────────────

const LIZA_CRM_PAGE_ID = '306c051d-73d2-813b-b15b-ed1248a60e4b';
const TRANSCRIPT_DIRECTORY_ID = '2fec051d-73d2-81e7-aa7f-c66537ad064d';

// Week 1 anchor: midnight Jan 6, 2026 (local time).
// Weeks are 7 days each. Week N runs (N-1)*7 .. N*7-1 days from anchor.
const WEEK_ANCHOR_MS = new Date('2026-01-06T00:00:00').getTime();
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

// Pre-existing week pages (IDs as provided — Notion accepts them with or without dashes).
// When the cron rolls into a week with no entry here, a new page is created automatically.
const KNOWN_WEEKS = [
  { n: 1,  id: '2fec051d-73d2-81109070cf76a4078c1d', label: 'Jan 6–12' },
  { n: 2,  id: '2fec051d-73d2-81cd-b4dd-e1d0e56ebe13', label: 'Jan 13–19' },
  { n: 3,  id: '2fec051d-73d2-81f7-8ac1-e9658f6c0bb7', label: 'Jan 20–26' },
  { n: 4,  id: '2fec051d-73d2-8198-9172-fb5d4a0951dc', label: 'Jan 27–Feb 2' },
  { n: 5,  id: '2fec051d-73d2-8159-b8ab-fadcdef09c78', label: 'Feb 2–8' },
  { n: 6,  id: '437f4879-1b1b-44bb-a980-1d48f3c45fb5', label: 'Feb 9–15' },
  { n: 7,  id: '30cc051d-73d2-817e-b3c4-dc1c654715ed', label: 'Feb 16–22' },
];

// ─── Logging & State ─────────────────────────────────────────────────────────

function log(msg) {
  process.stdout.write(`[liza-sync ${new Date().toISOString()}] ${msg}\n`);
}

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) {
    log(`Warning: could not load state file (${e.message}), starting fresh`);
  }
  return { last_sync: null, last_message_ts: null };
}

function saveState(state) {
  fs.writeFileSync(
    STATE_FILE,
    JSON.stringify({ ...state, updated_at: new Date().toISOString() }, null, 2),
  );
}

function appendRunLog(entry) {
  let history = [];
  try {
    if (fs.existsSync(LOG_FILE)) {
      history = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
      if (!Array.isArray(history)) history = [];
    }
  } catch (_) { /* start fresh */ }
  history.unshift({ ...entry, timestamp: new Date().toISOString() });
  fs.writeFileSync(LOG_FILE, JSON.stringify(history.slice(0, 90), null, 2));
}

// ─── Week Helpers ─────────────────────────────────────────────────────────────

/** Returns the 1-based week number for a given date. Returns null if before anchor. */
function getWeekNumber(date = new Date()) {
  // Strip time component so we always count full calendar days.
  const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const offset = midnight - WEEK_ANCHOR_MS;
  if (offset < 0) return null;
  return Math.floor(offset / MS_PER_WEEK) + 1;
}

/** Returns the Notion page ID for a known week, or null for unknown future weeks. */
function getKnownWeekPageId(weekNum) {
  const w = KNOWN_WEEKS.find(x => x.n === weekNum);
  return w ? w.id : null;
}

/**
 * Returns a title string for a week page.
 * Format: "Week N — Mon DD–DD"  e.g. "Week 8 — Feb 23–Mar 1"
 */
function buildWeekTitle(weekNum) {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const startMs = WEEK_ANCHOR_MS + (weekNum - 1) * MS_PER_WEEK;
  const endMs   = startMs + 6 * 24 * 60 * 60 * 1000;
  const start = new Date(startMs);
  const end   = new Date(endMs);
  const startStr = `${MONTHS[start.getMonth()]} ${start.getDate()}`;
  const endStr   = end.getMonth() !== start.getMonth()
    ? `${MONTHS[end.getMonth()]} ${end.getDate()}`
    : `${end.getDate()}`;
  return `Week ${weekNum} — ${startStr}–${endStr}`;
}

// ─── Notion Utility Helpers ───────────────────────────────────────────────────

/** Fetches all child blocks of a page (handles pagination). */
async function getAllBlocks(notion, pageId) {
  const blocks = [];
  let cursor;
  do {
    const res = await notion.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
      page_size: 100,
    });
    blocks.push(...res.results);
    cursor = res.has_more ? res.next_cursor : null;
  } while (cursor);
  return blocks;
}

/** Extracts plain text from any block that has rich_text. */
function richTextToPlain(richTextArr) {
  if (!Array.isArray(richTextArr)) return '';
  return richTextArr.map(rt => rt.plain_text || '').join('');
}

function blockPlainText(block) {
  const payload = block[block.type];
  return payload?.rich_text ? richTextToPlain(payload.rich_text) : '';
}

/** Returns true if a heading_3 block with the given text already exists on the page. */
async function dayHeaderExists(notion, pageId, headerText) {
  const blocks = await getAllBlocks(notion, pageId);
  const normalised = headerText.trim().toUpperCase();
  return blocks.some(
    b => b.type === 'heading_3' && blockPlainText(b).trim().toUpperCase() === normalised,
  );
}

/** Appends blocks to a page in batches of 100 (Notion API limit). */
async function appendBlocks(notion, pageId, blocks) {
  for (let i = 0; i < blocks.length; i += 100) {
    await notion.blocks.children.append({
      block_id: pageId,
      children: blocks.slice(i, i + 100),
    });
  }
}

// ─── BlueBubbles Message Extraction ──────────────────────────────────────────

/**
 * Attempts to extract a plain-text value from a Notion property of any common type.
 */
function propToText(prop) {
  if (!prop) return null;
  switch (prop.type) {
    case 'title':     return richTextToPlain(prop.title);
    case 'rich_text': return richTextToPlain(prop.rich_text);
    case 'select':    return prop.select?.name ?? null;
    case 'multi_select': return prop.multi_select?.map(s => s.name).join(', ') ?? null;
    case 'number':    return prop.number != null ? String(prop.number) : null;
    case 'phone_number': return prop.phone_number ?? null;
    case 'email':     return prop.email ?? null;
    case 'url':       return prop.url ?? null;
    case 'checkbox':  return prop.checkbox ? 'true' : 'false';
    default:          return null;
  }
}

function propToDate(prop) {
  if (!prop) return null;
  switch (prop.type) {
    case 'date':           return prop.date?.start ? new Date(prop.date.start) : null;
    case 'created_time':   return new Date(prop.created_time);
    case 'last_edited_time': return new Date(prop.last_edited_time);
    default: return null;
  }
}

function propToBool(prop) {
  if (!prop) return null;
  if (prop.type === 'checkbox') return prop.checkbox;
  const text = propToText(prop);
  if (text == null) return null;
  return ['true', '1', 'yes', 'outgoing', 'sent', 'me'].includes(text.toLowerCase());
}

/**
 * Searches a Notion page's properties for the first matching field name
 * from a priority list, then extracts a value using the given extractor.
 */
function findProp(props, candidates, extractor) {
  for (const name of candidates) {
    if (props[name] != null) {
      const val = extractor(props[name]);
      if (val != null) return val;
    }
  }
  return null;
}

/**
 * Given a Notion database page (from a BlueBubbles database), tries to extract
 * a normalised message object.  Returns null if the page is not a Liza message
 * or is before the cutoff timestamp.
 */
function extractMessage(page, cutoff) {
  const props = page.properties;

  // ── Contact / sender identification ─────────────────────────────────────
  const contactVal = findProp(props,
    ['Contact', 'Name', 'From', 'Sender', 'Handle', 'Phone', 'Person', 'To'],
    propToText,
  );

  if (contactVal) {
    const cv = contactVal.toLowerCase();
    const nameMatch  = cv.includes(LIZA_CONTACT_NAME);
    const phoneMatch = LIZA_PHONE && cv.replace(/\D/g, '').includes(LIZA_PHONE);
    if (!nameMatch && !phoneMatch) return null; // not a Liza message
  }
  // If contactVal is null the database might not segment by contact; we still
  // process it — the user should set LIZA_CONTACT_NAME carefully in that case.

  // ── Timestamp ─────────────────────────────────────────────────────────
  const ts = findProp(props,
    ['Date', 'Timestamp', 'Sent At', 'Time', 'Date Sent', 'Message Date', 'Created'],
    propToDate,
  ) ?? new Date(page.created_time);

  if (ts <= cutoff) return null; // already processed

  // ── Body ──────────────────────────────────────────────────────────────
  const body = findProp(props,
    ['Message', 'Body', 'Text', 'Content', 'Transcription', 'Title', 'Subject'],
    propToText,
  ) ?? '(no text)';

  // ── Direction ─────────────────────────────────────────────────────────
  // BlueBubbles commonly uses "Is From Me" (checkbox) or "Direction" (select: outgoing/incoming).
  const isFromMe = findProp(props,
    ['Is From Me', 'Is Outgoing', 'Outgoing', 'Direction', 'Type', 'Sender Type'],
    propToBool,
  ) ?? false;

  return { id: page.id, timestamp: ts, body, isFromMe };
}

/**
 * Queries the BlueBubbles Notion database and returns messages from Liza
 * that arrived after lastSyncTs (ISO string or null).
 */
async function fetchBlueBubblesMessages(notion, dbId, lastSyncTs) {
  const cutoff = lastSyncTs ? new Date(lastSyncTs) : new Date(0);
  const messages = [];
  let cursor;

  do {
    const res = await notion.databases.query({
      database_id: dbId,
      sorts: [{ timestamp: 'created_time', direction: 'ascending' }],
      start_cursor: cursor,
      page_size: 100,
    });

    for (const page of res.results) {
      const msg = extractMessage(page, cutoff);
      if (msg) messages.push(msg);
    }

    cursor = res.has_more ? res.next_cursor : null;
  } while (cursor);

  return messages;
}

// ─── Message Formatting ───────────────────────────────────────────────────────

const DAYS   = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
const MONTHS = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE',
                'JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];

function formatTime12h(date) {
  const h = date.getHours();
  const m = date.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m} ${ampm}`;
}

/** Returns the day-header string, e.g. "MONDAY, FEBRUARY 18" */
function formatDayHeader(date) {
  return `${DAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

/**
 * Groups messages by calendar day (local time), sorted chronologically.
 * Returns [{ date, messages }].
 */
function groupByDay(messages) {
  const map = new Map();
  for (const msg of messages) {
    const d = msg.timestamp;
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (!map.has(key)) map.set(key, { date: d, messages: [] });
    map.get(key).messages.push(msg);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
}

/** Builds the Notion paragraph block for one message. */
function makeMessageBlock(msg) {
  const time = formatTime12h(msg.timestamp);
  const prefix = msg.isFromMe
    ? `🔵 James (${time}):`
    : `⚪ Liza (${time}):`;

  return {
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [
        {
          type: 'text',
          text: { content: prefix },
          annotations: { bold: true },
        },
        {
          type: 'text',
          text: { content: ` ${msg.body}` },
        },
      ],
    },
  };
}

// ─── Core Operations ──────────────────────────────────────────────────────────

/**
 * Returns the Notion page ID for the current week, creating a new page under
 * TRANSCRIPT_DIRECTORY_ID if the week isn't in KNOWN_WEEKS.
 */
async function ensureWeekPage(notion, weekNum) {
  const knownId = getKnownWeekPageId(weekNum);
  if (knownId) {
    log(`Week ${weekNum} → known page ${knownId}`);
    return knownId;
  }

  const title = buildWeekTitle(weekNum);
  log(`Week ${weekNum} not in known list — creating page: "${title}"`);

  const page = await notion.pages.create({
    parent: { page_id: TRANSCRIPT_DIRECTORY_ID },
    properties: {
      title: { title: [{ type: 'text', text: { content: title } }] },
    },
    children: [
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: `iMessage transcript for ${title}` } }],
        },
      },
    ],
  });

  log(`Created week page: ${page.id}`);
  return page.id;
}

/**
 * Appends new messages to the week page, grouped by day.
 * Skips adding a day header if one already exists (deduplication).
 * Returns the count of message blocks appended.
 */
async function appendMessagesToWeekPage(notion, pageId, messages) {
  if (messages.length === 0) return 0;

  let appended = 0;
  const groups = groupByDay(messages);

  for (const group of groups) {
    const dayHeader = formatDayHeader(group.date);
    const headerExists = await dayHeaderExists(notion, pageId, dayHeader);

    const blocks = [];

    if (!headerExists) {
      // Blank line before a new day section (visual breathing room)
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: { rich_text: [] },
      });
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [{ type: 'text', text: { content: dayHeader } }],
          is_toggleable: false,
        },
      });
    }

    for (const msg of group.messages) {
      blocks.push(makeMessageBlock(msg));
      appended++;
    }

    await appendBlocks(notion, pageId, blocks);
  }

  return appended;
}

/**
 * Updates the "Last Contact" date property on the Liza CRM page.
 * Handles date and rich_text property types.
 */
async function updateCrmLastContact(notion, date) {
  const dateStr = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');

  const page = await notion.pages.retrieve({ page_id: LIZA_CRM_PAGE_ID });
  const props = page.properties;

  const CANDIDATES = ['Last Contact', 'Last Contacted', 'LastContact', 'last_contact',
                      'Last contact date', 'Last Message'];
  const field = CANDIDATES.find(f => f in props);

  if (!field) {
    log(`Warning: no "Last Contact" property found. Available: ${Object.keys(props).join(', ')}`);
    return false;
  }

  const propType = props[field].type;
  let value;
  if (propType === 'date') {
    value = { date: { start: dateStr } };
  } else if (propType === 'rich_text') {
    value = { rich_text: [{ type: 'text', text: { content: dateStr } }] };
  } else {
    log(`Warning: "Last Contact" is type "${propType}" — don't know how to update it`);
    return false;
  }

  await notion.pages.update({
    page_id: LIZA_CRM_PAGE_ID,
    properties: { [field]: value },
  });

  log(`CRM Last Contact set to ${dateStr}`);
  return true;
}

/**
 * Updates (or appends) the "Last updated: …" line in the Transcript Directory page.
 */
async function updateDirectoryTimestamp(notion, date) {
  const dateStr = date.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  const blocks = await getAllBlocks(notion, TRANSCRIPT_DIRECTORY_ID);

  // Find the existing "Last updated" paragraph and replace it.
  const existingBlock = blocks.find(
    b => b.type === 'paragraph' && blockPlainText(b).toLowerCase().includes('last updated'),
  );

  if (existingBlock) {
    await notion.blocks.update({
      block_id: existingBlock.id,
      paragraph: {
        rich_text: [{ type: 'text', text: { content: `Last updated: ${dateStr}` } }],
      },
    });
    log(`Directory "Last updated" → ${dateStr}`);
  } else {
    await appendBlocks(notion, TRANSCRIPT_DIRECTORY_ID, [{
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: `Last updated: ${dateStr}` } }],
      },
    }]);
    log(`Appended "Last updated: ${dateStr}" to directory`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!NOTION_API_KEY) {
    process.stderr.write('[liza-sync] FATAL: NOTION_API_KEY is not set\n');
    process.exit(1);
  }

  const notion = new Client({ auth: NOTION_API_KEY });
  const state  = loadState();
  const result = {
    messages_added: 0,
    week: null,
    week_page_id: null,
    crm_updated: false,
    errors: [],
  };

  try {
    // ── 1. Determine current week ─────────────────────────────────────────
    const today   = new Date();
    const weekNum = getWeekNumber(today);

    if (!weekNum) {
      throw new Error(
        `Today (${today.toDateString()}) is before the Week 1 anchor (Jan 6, 2026). ` +
        'Update WEEK_ANCHOR_MS if the schedule has changed.',
      );
    }

    result.week = weekNum;
    log(`Today: ${today.toDateString()} → Week ${weekNum}`);

    // ── 2. Ensure the week page exists ────────────────────────────────────
    const weekPageId = await ensureWeekPage(notion, weekNum);
    result.week_page_id = weekPageId;

    // ── 3. Check BlueBubbles source ───────────────────────────────────────
    if (!BLUEBUBBLES_DB_ID) {
      log('');
      log('ACTION REQUIRED ─────────────────────────────────────────────────────');
      log('BLUEBUBBLES_DB_ID is not set in your .env file.');
      log('');
      log('To find it:');
      log('  1. Open Notion and search for where BlueBubbles deposits messages.');
      log('     Common names: "Messages", "iMessage Inbox", "BlueBubbles".');
      log('  2. Open that database → copy its ID from the URL:');
      log('     https://notion.so/WORKSPACE/<DATABASE_ID>?v=...');
      log('  3. Add to .env:  BLUEBUBBLES_DB_ID=<paste-id-here>');
      log('─────────────────────────────────────────────────────────────────────');
      log('');
      result.errors.push('BLUEBUBBLES_DB_ID not configured — no messages synced');
      appendRunLog(result);
      // Exit 0 so cron doesn't spam error emails on first run.
      process.exit(0);
    }

    // ── 4. Fetch new messages from BlueBubbles ────────────────────────────
    log(`Querying BlueBubbles DB ${BLUEBUBBLES_DB_ID}`);
    log(`Last sync: ${state.last_sync ?? 'never (full pull)'}`);

    const messages = await fetchBlueBubblesMessages(notion, BLUEBUBBLES_DB_ID, state.last_sync);
    log(`Found ${messages.length} new message(s) since last sync`);

    if (messages.length > 0) {
      // ── 5. Append to week page ────────────────────────────────────────
      const added = await appendMessagesToWeekPage(notion, weekPageId, messages);
      result.messages_added = added;
      log(`Appended ${added} message block(s) to Week ${weekNum} page`);

      // ── 6. Update CRM Last Contact (only when today has messages) ─────
      const todayKey = today.toDateString();
      const hasToday = messages.some(m => m.timestamp.toDateString() === todayKey);
      if (hasToday) {
        result.crm_updated = await updateCrmLastContact(notion, today);
      } else {
        log('No messages from today — skipping CRM update');
      }

      // ── 7. Update directory timestamp ─────────────────────────────────
      await updateDirectoryTimestamp(notion, today);

      // ── 8. Persist state ──────────────────────────────────────────────
      const latestTs = messages.reduce(
        (max, m) => (m.timestamp > max ? m.timestamp : max),
        new Date(0),
      );
      state.last_sync       = new Date().toISOString();
      state.last_message_ts = latestTs.toISOString();
      saveState(state);

    } else {
      log('Nothing to sync');
    }

  } catch (err) {
    result.errors.push(err.message);
    process.stderr.write(`[liza-sync] ERROR: ${err.message}\n`);
    if (err.stack) process.stderr.write(`${err.stack}\n`);
  }

  appendRunLog(result);

  if (result.errors.length > 0) {
    process.exit(1);
  }

  log(`Done. messages_added=${result.messages_added} crm_updated=${result.crm_updated}`);
}

main();
