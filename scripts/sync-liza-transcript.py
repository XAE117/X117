#!/usr/bin/env python3
"""
sync-liza-transcript.py — Sync Liza iMessages from BlueBubbles → Notion transcript

Pipeline: iMessages → BlueBubbles (auto) → Liza's Notion Contact Page → this script → Transcript Directory

Usage:
    python3 scripts/sync-liza-transcript.py              # sync new messages
    python3 scripts/sync-liza-transcript.py --dry-run     # preview without pushing
    python3 scripts/sync-liza-transcript.py --status      # check if new messages exist
    python3 scripts/sync-liza-transcript.py --new-week    # create new week page and roll over

Source: BlueBubbles contact page (Liza) in Notion
Destination: Transcript Directory week pages with 🔵/⚪ formatting
"""

import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
from datetime import date, timedelta
from pathlib import Path

# --- Config ---
BLUEBUBBLES_LIZA_PAGE = '305c051d-73d2-815b-93c5-d4050c826099'
TRANSCRIPT_DIR_PAGE   = '2fec051d-73d2-81e7-aa7f-c66537ad064d'
WEEKLY_TABLE_ID       = 'df9af339-45c5-4a83-a3b2-658682b720a7'
LAST_UPDATED_BLOCK    = '691ac0f7-16dd-468d-ae54-8883a6d02e43'
APPENDICES_PAGE       = '2fec051d-73d2-81a3-8450-ee6ca4766a42'

# Current week page — update this when rolling to a new week
CURRENT_WEEK_PAGE     = '311c051d-73d2-8127-a9f2-ef0bc8f9b42e'
CURRENT_WEEK_LABEL    = 'Week 8'
CURRENT_WEEK_NUMBER   = 8

BATCH_SIZE = 100
NOTION_VERSION = '2022-06-28'

# Month name patterns for day header normalization
MONTH_ABBREVS = {
    'JAN': 'JANUARY', 'FEB': 'FEBRUARY', 'MAR': 'MARCH', 'APR': 'APRIL',
    'MAY': 'MAY', 'JUN': 'JUNE', 'JUL': 'JULY', 'AUG': 'AUGUST',
    'SEP': 'SEPTEMBER', 'OCT': 'OCTOBER', 'NOV': 'NOVEMBER', 'DEC': 'DECEMBER'
}

# --- Load env ---
env_path = Path(__file__).resolve().parent.parent / '.env'
if env_path.exists():
    for line in env_path.read_text().splitlines():
        if '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1)
            os.environ[k.strip()] = v.strip()

TOKEN = os.environ.get('NOTION_API_KEY')
if not TOKEN:
    print("ERROR: NOTION_API_KEY not found in .env")
    sys.exit(1)

HEADERS = {
    'Authorization': f'Bearer {TOKEN}',
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json'
}

SCRIPT_PATH = Path(__file__).resolve()


# ============================================================
# Notion API helpers
# ============================================================

def notion_get(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def notion_patch(url, payload):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, headers=HEADERS, method='PATCH')
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def notion_post(url, payload):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, headers=HEADERS, method='POST')
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def fetch_all_blocks(page_id):
    blocks = []
    cursor = None
    while True:
        url = f'https://api.notion.com/v1/blocks/{page_id}/children?page_size=100'
        if cursor:
            url += f'&start_cursor={cursor}'
        data = notion_get(url)
        blocks.extend(data['results'])
        if not data.get('has_more'):
            break
        cursor = data['next_cursor']
    return blocks


def push_blocks(page_id, blocks):
    total = len(blocks)
    pushed = 0
    for i in range(0, total, BATCH_SIZE):
        batch = blocks[i:i + BATCH_SIZE]
        notion_patch(
            f'https://api.notion.com/v1/blocks/{page_id}/children',
            {"children": batch}
        )
        pushed += len(batch)
        print(f"  Batch {i // BATCH_SIZE + 1}: pushed {len(batch)} blocks ({pushed}/{total})")
        if i + BATCH_SIZE < total:
            time.sleep(0.5)
    return pushed


# ============================================================
# Text extraction and matching
# ============================================================

def extract_text(block):
    t = block['type']
    if t in ('paragraph', 'heading_1', 'heading_2', 'heading_3',
             'bulleted_list_item', 'numbered_list_item', 'callout'):
        return ''.join(r['plain_text'] for r in block[t].get('rich_text', []))
    return ''


def find_last_transcript_message(blocks):
    for b in reversed(blocks):
        if b['type'] == 'paragraph':
            txt = extract_text(b)
            if txt.strip():
                return txt.strip()
    return None


def find_cutoff_in_source(blocks, last_msg_text):
    """Find the index in BlueBubbles blocks matching the last transcript message."""
    # Extract message content from transcript format
    m = re.match(r'^[\U0001F535\u26AA]\s*(?:James|Liza)\s*\([^)]+\):\s*(.*)', last_msg_text, re.DOTALL)
    target_content = m.group(1).strip() if m else last_msg_text.strip()

    time_match = re.search(r'\((\d{1,2}:\d{2}\s*[APap][Mm])\)', last_msg_text)
    target_time = time_match.group(1) if time_match else None

    # Search from the END of the source (most efficient for recent messages)
    for i in range(len(blocks) - 1, -1, -1):
        b = blocks[i]
        if b['type'] != 'paragraph':
            continue
        txt = extract_text(b).strip()

        bb_match = re.match(r'^(?:me|Liza)\s+\(([^)]+)\):\s*(.*)', txt, re.DOTALL)
        if bb_match:
            bb_time = bb_match.group(1)
            bb_content = bb_match.group(2).strip()
            if bb_content == target_content:
                if target_time is None or bb_time == target_time:
                    return i

    return None


# ============================================================
# Message transformation
# ============================================================

def normalize_day_header(txt):
    """Normalize day headers: 'Wednesday, Feb 26' → 'WEDNESDAY, FEBRUARY 26'"""
    day_match = re.match(
        r'^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(\w+)\s+(\d+)',
        txt, re.IGNORECASE
    )
    if not day_match:
        return None
    day_name = day_match.group(1).upper()
    month_raw = day_match.group(2).upper()
    day_num = day_match.group(3)

    # Expand abbreviations
    for abbr, full in MONTH_ABBREVS.items():
        if month_raw.startswith(abbr):
            month_raw = full
            break

    return f"{day_name}, {month_raw} {day_num}"


def transform_messages(blocks, start_index):
    """Transform BlueBubbles blocks into transcript-formatted Notion blocks."""
    new_blocks = []
    current_day = None

    for b in blocks[start_index + 1:]:
        t = b['type']
        txt = extract_text(b).strip()

        if not txt:
            continue

        # Skip month-only headers like "February 2026"
        if t == 'heading_2' and re.match(r'^[A-Z][a-z]+\s+\d{4}$', txt):
            continue

        # Day headers — normalize and deduplicate
        if t == 'heading_2':
            new_day = normalize_day_header(txt)
            if new_day and new_day != current_day:
                current_day = new_day
                new_blocks.append(make_heading_block(new_day))
            continue

        # Skip non-paragraph blocks
        if t != 'paragraph':
            continue

        # Parse message
        msg_match = re.match(r'^(me|Liza)\s+\(([^)]+)\):\s*(.*)', txt, re.DOTALL)
        if msg_match:
            sender, time_str, content = msg_match.group(1), msg_match.group(2), msg_match.group(3)
            emoji = '\U0001F535' if sender == 'me' else '\u26AA'
            name = 'James' if sender == 'me' else 'Liza'
            prefix = f"{emoji} {name} ({time_str}): "
            new_blocks.append(make_message_block(prefix, content))
        else:
            new_blocks.append(make_plain_block(txt))

    return new_blocks


# ============================================================
# Block builders
# ============================================================

def make_heading_block(text):
    return {
        "object": "block", "type": "heading_2",
        "heading_2": {
            "rich_text": [{"type": "text", "text": {"content": text}}],
            "is_toggleable": False, "color": "default"
        }
    }


def make_message_block(prefix, content):
    return {
        "object": "block", "type": "paragraph",
        "paragraph": {
            "rich_text": [
                {"type": "text", "text": {"content": prefix},
                 "annotations": {"bold": True, "italic": False, "strikethrough": False,
                                 "underline": False, "code": False, "color": "default"}},
                {"type": "text", "text": {"content": content},
                 "annotations": {"bold": False, "italic": False, "strikethrough": False,
                                 "underline": False, "code": False, "color": "default"}}
            ],
            "color": "default"
        }
    }


def make_plain_block(text):
    return {
        "object": "block", "type": "paragraph",
        "paragraph": {
            "rich_text": [{"type": "text", "text": {"content": text}}],
            "color": "default"
        }
    }


# ============================================================
# Post-sync updates
# ============================================================

def update_last_updated():
    today = date.today().strftime('%B %d, %Y')
    notion_patch(
        f'https://api.notion.com/v1/blocks/{LAST_UPDATED_BLOCK}',
        {"paragraph": {
            "rich_text": [
                {"type": "text", "text": {"content": "Last updated: "},
                 "annotations": {"bold": True, "italic": False, "strikethrough": False,
                                 "underline": False, "code": False, "color": "default"}},
                {"type": "text", "text": {"content": f"{today} ({CURRENT_WEEK_LABEL})"}}
            ],
            "color": "default"
        }}
    )


# ============================================================
# Week rollover
# ============================================================

def create_new_week():
    """Create a new week page and update the script config."""
    new_week_num = CURRENT_WEEK_NUMBER + 1
    new_label = f'Week {new_week_num}'

    # Calculate date range (Sunday to Saturday)
    today = date.today()
    # Find next Sunday (or today if Sunday)
    days_until_sunday = (6 - today.weekday()) % 7
    if days_until_sunday == 0 and today.weekday() != 6:
        days_until_sunday = 7
    week_start = today + timedelta(days=days_until_sunday) if today.weekday() != 6 else today
    week_end = week_start + timedelta(days=6)

    start_str = week_start.strftime('%b %d').lstrip('0').replace(' 0', ' ')
    end_str = week_end.strftime('%b %d').lstrip('0').replace(' 0', ' ')

    # Ask for subtitle
    print(f"\nCreating {new_label} ({start_str}–{end_str})")
    subtitle = input("  Subtitle (optional, press Enter to skip): ").strip()

    if subtitle:
        title = f"{new_label} — {start_str}–{end_str} ({subtitle})"
    else:
        title = f"{new_label} — {start_str}–{end_str}"

    # Create child page under transcript directory
    result = notion_post(
        'https://api.notion.com/v1/pages',
        {
            "parent": {"page_id": TRANSCRIPT_DIR_PAGE},
            "properties": {
                "title": [{"text": {"content": title}}]
            },
            "children": [
                make_heading_block(f"{new_label} Summary"),
                make_plain_block("(Summary will be added at end of week)"),
                {"object": "block", "type": "divider", "divider": {}}
            ]
        }
    )

    new_page_id = result['id']
    print(f"  Created page: {title}")
    print(f"  Page ID: {new_page_id}")

    # Update this script's config
    script_content = SCRIPT_PATH.read_text()
    script_content = re.sub(
        r"CURRENT_WEEK_PAGE\s+=\s+'[^']+'",
        f"CURRENT_WEEK_PAGE     = '{new_page_id}'",
        script_content
    )
    script_content = re.sub(
        r"CURRENT_WEEK_LABEL\s+=\s+'[^']+'",
        f"CURRENT_WEEK_LABEL    = '{new_label}'",
        script_content
    )
    script_content = re.sub(
        r"CURRENT_WEEK_NUMBER\s+=\s+\d+",
        f"CURRENT_WEEK_NUMBER   = {new_week_num}",
        script_content
    )
    SCRIPT_PATH.write_text(script_content)
    print(f"  Updated script config → {new_label}")

    # Add row to weekly table
    dates_str = f"{start_str}–{end_str}"
    notion_patch(
        f'https://api.notion.com/v1/blocks/{WEEKLY_TABLE_ID}/children',
        {"children": [{
            "object": "block",
            "type": "table_row",
            "table_row": {
                "cells": [
                    [{"type": "text", "text": {"content": new_label}}],
                    [{"type": "text", "text": {"content": dates_str}}],
                    [{"type": "text", "text": {"content": "(in progress)"}}]
                ]
            }
        }]}
    )
    print(f"  Added weekly table row: {new_label} | {dates_str}")

    print(f"\n  Week rollover complete. Run sync again to start populating {new_label}.")
    return new_page_id


# ============================================================
# Main
# ============================================================

def main():
    dry_run = '--dry-run' in sys.argv
    status_only = '--status' in sys.argv
    new_week = '--new-week' in sys.argv

    if new_week:
        create_new_week()
        return

    print(f"Fetching transcript from {CURRENT_WEEK_LABEL} page...")
    transcript_blocks = fetch_all_blocks(CURRENT_WEEK_PAGE)
    last_msg = find_last_transcript_message(transcript_blocks)
    print(f"  Transcript has {len(transcript_blocks)} blocks")
    print(f"  Last message: {last_msg[:80] if last_msg else '(empty)'}...")

    print(f"\nFetching BlueBubbles source (Liza contact page)...")
    source_blocks = fetch_all_blocks(BLUEBUBBLES_LIZA_PAGE)
    print(f"  Source has {len(source_blocks)} blocks")

    cutoff_idx = find_cutoff_in_source(source_blocks, last_msg) if last_msg else -1

    if cutoff_idx is None:
        print("\n  WARNING: Could not find matching cutoff message in source.")
        print(f"  Looking for: {last_msg[:80]}")
        print("  The BlueBubbles page may have been truncated or the message format changed.")
        print("  Try checking the source page manually.")
        sys.exit(1)

    remaining = len(source_blocks) - cutoff_idx - 1
    print(f"  Cutoff found at block {cutoff_idx}")
    print(f"  New blocks to process: {remaining}")

    if status_only:
        if remaining == 0:
            print("\n  Transcript is up to date.")
        else:
            print(f"\n  {remaining} new source blocks available to sync.")
        return

    if remaining == 0:
        print("\nTranscript is already up to date. Nothing to sync.")
        return

    new_blocks = transform_messages(source_blocks, cutoff_idx)
    print(f"\nTransformed into {len(new_blocks)} transcript blocks.")

    if len(new_blocks) == 0:
        print("No message blocks to push (only headers/metadata?).")
        return

    # Count actual messages (not headings)
    msg_count = sum(1 for b in new_blocks if b['type'] == 'paragraph')
    day_count = sum(1 for b in new_blocks if b['type'] == 'heading_2')

    if dry_run:
        print(f"\n=== DRY RUN — {msg_count} messages across {day_count} days ===")
        for i, b in enumerate(new_blocks[:15]):
            t = b['type']
            if t == 'heading_2':
                txt = b['heading_2']['rich_text'][0]['text']['content']
                print(f"  [{i+1}] ## {txt}")
            else:
                parts = b['paragraph']['rich_text']
                txt = ''.join(p['text']['content'] for p in parts)
                print(f"  [{i+1}] {txt[:120]}")
        if len(new_blocks) > 15:
            print(f"  ... ({len(new_blocks) - 15} more)")
        print("\n  Run without --dry-run to push.")
        return

    # Push
    print(f"\nPushing {len(new_blocks)} blocks ({msg_count} messages, {day_count} day headers)...")
    pushed = push_blocks(CURRENT_WEEK_PAGE, new_blocks)

    # Update last-updated
    print("\nUpdating 'Last updated' block...")
    update_last_updated()

    print(f"\nDone. {pushed} blocks synced to {CURRENT_WEEK_LABEL} transcript.")
    print(f"  Messages: {msg_count} | Day headers: {day_count}")


if __name__ == '__main__':
    main()
