#!/usr/bin/env python3
"""
sync-liza-transcript.py — Sync Liza iMessages from BlueBubbles → Notion transcript

Pulls new messages from Liza's BlueBubbles contact page in Notion,
finds the last message already in the Week transcript page,
transforms "me" → "James" with 🔵/⚪ formatting, deduplicates day headers,
and appends to the transcript page.

Usage:
    python3 scripts/sync-liza-transcript.py              # sync new messages
    python3 scripts/sync-liza-transcript.py --dry-run     # preview without pushing
    python3 scripts/sync-liza-transcript.py --status      # show sync status

Source: BlueBubbles contact page (Liza) → Notion Transcript Directory (Week page)
"""

import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
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

BATCH_SIZE = 100
NOTION_VERSION = '2022-06-28'

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


def notion_get(url):
    """GET request to Notion API."""
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def notion_patch(url, payload):
    """PATCH request to Notion API."""
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, headers=HEADERS, method='PATCH')
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def fetch_all_blocks(page_id):
    """Fetch all child blocks from a Notion page, paginating as needed."""
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


def extract_text(block):
    """Extract plain text from a block."""
    t = block['type']
    if t in ('paragraph', 'heading_1', 'heading_2', 'heading_3',
             'bulleted_list_item', 'numbered_list_item', 'callout'):
        return ''.join(r['plain_text'] for r in block[t].get('rich_text', []))
    return ''


def find_last_transcript_message(blocks):
    """Find the last message text in the transcript (ignoring headings)."""
    for b in reversed(blocks):
        if b['type'] == 'paragraph':
            txt = extract_text(b)
            if txt.strip():
                return txt.strip()
    return None


def find_cutoff_in_source(blocks, last_msg_text):
    """Find the index in BlueBubbles blocks matching the last transcript message.

    BlueBubbles uses "me" instead of "James" and "(TIME):" format,
    so we match on the message content after the prefix.
    """
    # Extract just the message part from the last transcript message
    # e.g., "🔵 James (8:11 PM): I hope you have fun" → "I hope you have fun"
    m = re.match(r'^[\U0001F535\u26AA]\s*(?:James|Liza)\s*\([^)]+\):\s*(.*)', last_msg_text, re.DOTALL)
    if m:
        target_content = m.group(1).strip()
    else:
        target_content = last_msg_text.strip()

    # Also extract the time from the transcript message
    time_match = re.search(r'\((\d{1,2}:\d{2}\s*[APap][Mm])\)', last_msg_text)
    target_time = time_match.group(1) if time_match else None

    for i, b in enumerate(blocks):
        if b['type'] != 'paragraph':
            continue
        txt = extract_text(b).strip()

        # Parse BlueBubbles format: "me (TIME): content" or "Liza (TIME): content"
        bb_match = re.match(r'^(?:me|Liza)\s+\(([^)]+)\):\s*(.*)', txt, re.DOTALL)
        if bb_match:
            bb_time = bb_match.group(1)
            bb_content = bb_match.group(2).strip()

            if bb_content == target_content:
                if target_time is None or bb_time == target_time:
                    return i

    return None


def transform_messages(blocks, start_index):
    """Transform BlueBubbles blocks into transcript-formatted Notion blocks."""
    new_blocks = []
    current_day = None

    for b in blocks[start_index + 1:]:
        t = b['type']
        txt = extract_text(b).strip()

        if not txt:
            continue

        # Skip month headers like "February 2026"
        if t == 'heading_2' and re.match(r'^[A-Z][a-z]+\s+\d{4}$', txt):
            continue

        # Day headers — deduplicate
        if t == 'heading_2':
            day_match = re.match(
                r'^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(Feb\w*\s+\d+)',
                txt, re.IGNORECASE
            )
            if day_match:
                day_name = day_match.group(1).upper()
                date_part = day_match.group(2).upper()
                # Normalize "FEB" → "FEBRUARY"
                date_part = re.sub(r'^FEB\b', 'FEBRUARY', date_part)
                new_day = f"{day_name}, {date_part}"
                if new_day != current_day:
                    current_day = new_day
                    new_blocks.append(make_heading_block(new_day))
                continue

        # Skip non-paragraph blocks (callouts, dividers, etc.)
        if t != 'paragraph':
            continue

        # Parse message: "me (TIME): text" or "Liza (TIME): text"
        msg_match = re.match(r'^(me|Liza)\s+\(([^)]+)\):\s*(.*)', txt, re.DOTALL)
        if msg_match:
            sender = msg_match.group(1)
            time_str = msg_match.group(2)
            content = msg_match.group(3)

            if sender == 'me':
                emoji = '\U0001F535'
                name = 'James'
            else:
                emoji = '\u26AA'
                name = 'Liza'

            prefix = f"{emoji} {name} ({time_str}): "
            new_blocks.append(make_message_block(prefix, content))
        else:
            # Fallback — plain text
            new_blocks.append(make_plain_block(txt))

    return new_blocks


def make_heading_block(text):
    return {
        "object": "block",
        "type": "heading_2",
        "heading_2": {
            "rich_text": [{"type": "text", "text": {"content": text}}],
            "is_toggleable": False,
            "color": "default"
        }
    }


def make_message_block(prefix, content):
    return {
        "object": "block",
        "type": "paragraph",
        "paragraph": {
            "rich_text": [
                {
                    "type": "text",
                    "text": {"content": prefix},
                    "annotations": {
                        "bold": True, "italic": False, "strikethrough": False,
                        "underline": False, "code": False, "color": "default"
                    }
                },
                {
                    "type": "text",
                    "text": {"content": content},
                    "annotations": {
                        "bold": False, "italic": False, "strikethrough": False,
                        "underline": False, "code": False, "color": "default"
                    }
                }
            ],
            "color": "default"
        }
    }


def make_plain_block(text):
    return {
        "object": "block",
        "type": "paragraph",
        "paragraph": {
            "rich_text": [{"type": "text", "text": {"content": text}}],
            "color": "default"
        }
    }


def push_blocks(page_id, blocks):
    """Push blocks to a Notion page in batches."""
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


def update_last_updated(last_msg_text):
    """Update the 'Last updated' block on the directory page."""
    # Try to extract date info from the last day heading
    from datetime import date
    today = date.today().strftime('%B %d, %Y')

    notion_patch(
        f'https://api.notion.com/v1/blocks/{LAST_UPDATED_BLOCK}',
        {
            "paragraph": {
                "rich_text": [
                    {
                        "type": "text",
                        "text": {"content": "Last updated: "},
                        "annotations": {"bold": True, "italic": False, "strikethrough": False,
                                        "underline": False, "code": False, "color": "default"}
                    },
                    {
                        "type": "text",
                        "text": {"content": f"{today} ({CURRENT_WEEK_LABEL})"}
                    }
                ],
                "color": "default"
            }
        }
    )


def main():
    dry_run = '--dry-run' in sys.argv
    status_only = '--status' in sys.argv

    print(f"Fetching transcript from {CURRENT_WEEK_LABEL} page...")
    transcript_blocks = fetch_all_blocks(CURRENT_WEEK_PAGE)
    last_msg = find_last_transcript_message(transcript_blocks)
    print(f"  Transcript has {len(transcript_blocks)} blocks")
    print(f"  Last message: {last_msg[:80] if last_msg else '(empty)'}...")

    print(f"\nFetching BlueBubbles source (Liza contact page)...")
    source_blocks = fetch_all_blocks(BLUEBUBBLES_LIZA_PAGE)
    print(f"  Source has {len(source_blocks)} blocks")

    # Find where to start
    cutoff_idx = find_cutoff_in_source(source_blocks, last_msg) if last_msg else -1

    if cutoff_idx is None:
        print("\n  WARNING: Could not find matching cutoff message in source.")
        print(f"  Looking for: {last_msg[:80]}")
        print("  You may need to manually verify the last synced message.")
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

    # Transform
    new_blocks = transform_messages(source_blocks, cutoff_idx)
    print(f"\nTransformed into {len(new_blocks)} transcript blocks.")

    if len(new_blocks) == 0:
        print("No message blocks to push (only headers/metadata?).")
        return

    if dry_run:
        print("\n=== DRY RUN — would push these blocks ===")
        for i, b in enumerate(new_blocks[:10]):
            t = b['type']
            if t == 'heading_2':
                txt = b['heading_2']['rich_text'][0]['text']['content']
                print(f"  [{i+1}] ## {txt}")
            else:
                parts = b['paragraph']['rich_text']
                txt = ''.join(p['text']['content'] for p in parts)
                print(f"  [{i+1}] {txt[:120]}")
        if len(new_blocks) > 10:
            print(f"  ... ({len(new_blocks) - 10} more)")
        print("\n  Run without --dry-run to push.")
        return

    # Push
    print(f"\nPushing {len(new_blocks)} blocks to {CURRENT_WEEK_LABEL} page...")
    pushed = push_blocks(CURRENT_WEEK_PAGE, new_blocks)

    # Update last-updated
    print("\nUpdating 'Last updated' block...")
    update_last_updated(last_msg)

    print(f"\nDone. {pushed} blocks synced to {CURRENT_WEEK_LABEL} transcript.")


if __name__ == '__main__':
    main()
