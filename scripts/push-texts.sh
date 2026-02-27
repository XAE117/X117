#!/usr/bin/env bash
#
# push-texts.sh — Push iMessage transcripts to Notion Week 8 page
#
# Usage:
#   ./scripts/push-texts.sh texts.txt
#   cat texts.txt | ./scripts/push-texts.sh -
#   ./scripts/push-texts.sh --dry-run texts.txt
#
# Input format (one message per line):
#   WEDNESDAY, FEBRUARY 25          ← day break (all caps, auto-detected)
#   James 8:15 PM: Hey what's up    ← James message
#   Liza 8:16 PM: Not much          ← Liza message
#   James Loved "Not much"          ← Reaction
#   Liza 🎙️ 8:20 PM: [voice msg]   ← Voice message
#
# Also accepts the emoji-prefixed format already in Notion:
#   🔵 James (8:15 PM): Hey what's up
#   ⚪ Liza (8:16 PM): Not much

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Load .env
if [[ -f "$ROOT_DIR/.env" ]]; then
  export $(grep -v '^#' "$ROOT_DIR/.env" | xargs)
fi

NOTION_API_KEY="${NOTION_API_KEY:?Missing NOTION_API_KEY in .env}"
WEEK8_PAGE_ID="311c051d-73d2-8127-a9f2-ef0bc8f9b42e"
BATCH_SIZE=100
DRY_RUN=false

# Parse args
INPUT_FILE=""
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    *) INPUT_FILE="$arg" ;;
  esac
done

if [[ -z "$INPUT_FILE" ]]; then
  echo "Usage: $0 [--dry-run] <texts.txt | ->"
  echo ""
  echo "Paste texts into a file, one message per line."
  echo "Day breaks: ALL CAPS lines like 'WEDNESDAY, FEBRUARY 25'"
  echo "Messages: 'James 8:15 PM: message' or 'Liza 8:15 PM: message'"
  echo "Reactions: 'James Loved \"message\"' or 'Liza Laughed at \"message\"'"
  exit 1
fi

if [[ "$INPUT_FILE" == "-" ]]; then
  INPUT=$(cat)
else
  INPUT=$(cat "$INPUT_FILE")
fi

if [[ -z "$INPUT" ]]; then
  echo "Error: No input text provided."
  exit 1
fi

# Build JSON blocks using Python (handles escaping properly)
BLOCKS_JSON=$(python3 << 'PYEOF'
import sys, json, re

lines = """INPUT_PLACEHOLDER""".strip().split('\n')

blocks = []

for line in lines:
    line = line.strip()
    if not line:
        continue

    # Day break: ALL CAPS line with day name (e.g., WEDNESDAY, FEBRUARY 25)
    if re.match(r'^[A-Z]{3,}DAY,\s+[A-Z]+\s+\d+', line):
        blocks.append({
            "object": "block",
            "type": "heading_2",
            "heading_2": {
                "rich_text": [{"type": "text", "text": {"content": line}}],
                "color": "default"
            }
        })
        continue

    # Already formatted: 🔵 James (TIME): msg  or  ⚪ Liza (TIME): msg
    m = re.match(r'^([🔵⚪]\s+(?:James|Liza)\s+\([^)]+\):\s*)(.*)', line)
    if m:
        prefix, msg = m.group(1), m.group(2)
        blocks.append({
            "object": "block",
            "type": "paragraph",
            "paragraph": {
                "rich_text": [
                    {"type": "text", "text": {"content": prefix}, "annotations": {"bold": True}},
                    {"type": "text", "text": {"content": msg}}
                ],
                "color": "default"
            }
        })
        continue

    # Raw format: James 8:15 PM: msg  or  Liza 8:15 PM: msg
    m = re.match(r'^(James|Liza)\s+(\d{1,2}:\d{2}\s*[APap][Mm]):\s*(.*)', line)
    if m:
        name, time, msg = m.group(1), m.group(2).upper().replace(' ', ' '), m.group(3)
        emoji = '🔵' if name == 'James' else '⚪'
        prefix = f"{emoji} {name} ({time}): "
        blocks.append({
            "object": "block",
            "type": "paragraph",
            "paragraph": {
                "rich_text": [
                    {"type": "text", "text": {"content": prefix}, "annotations": {"bold": True}},
                    {"type": "text", "text": {"content": msg}}
                ],
                "color": "default"
            }
        })
        continue

    # Reactions: James Reacted ❤️ to "msg" / James Loved "msg" / Liza Laughed at "msg"
    m = re.match(r'^(James|Liza)\s+(Reacted\s+.+\s+to|Loved|Laughed at|Liked|Emphasized|Questioned|Disliked)\s+"(.*)"', line)
    if m:
        name, reaction, quoted = m.group(1), m.group(2), m.group(3)
        emoji = '🔵' if name == 'James' else '⚪'
        prefix = f"{emoji} {name}: "
        msg = f'{reaction} "{quoted}"'
        blocks.append({
            "object": "block",
            "type": "paragraph",
            "paragraph": {
                "rich_text": [
                    {"type": "text", "text": {"content": prefix}, "annotations": {"bold": True}},
                    {"type": "text", "text": {"content": msg}}
                ],
                "color": "default"
            }
        })
        continue

    # Voice message: James 🎙️ 8:15 PM: msg  or  Liza 🎙️ 8:15 PM: msg
    m = re.match(r'^(James|Liza)\s+🎙️?\s*(\d{1,2}:\d{2}\s*[APap][Mm]):\s*(.*)', line)
    if m:
        name, time, msg = m.group(1), m.group(2).upper(), m.group(3)
        emoji = '🔵' if name == 'James' else '⚪'
        prefix = f"{emoji} {name} ({time}): "
        msg = f"🎙️ {msg}"
        blocks.append({
            "object": "block",
            "type": "paragraph",
            "paragraph": {
                "rich_text": [
                    {"type": "text", "text": {"content": prefix}, "annotations": {"bold": True}},
                    {"type": "text", "text": {"content": msg}}
                ],
                "color": "default"
            }
        })
        continue

    # Fallback: treat as a plain paragraph (for notes, etc.)
    blocks.append({
        "object": "block",
        "type": "paragraph",
        "paragraph": {
            "rich_text": [{"type": "text", "text": {"content": line}}],
            "color": "default"
        }
    })

print(json.dumps(blocks))
PYEOF
)

# Replace placeholder with actual input (using temp file to handle special chars)
TMPINPUT=$(mktemp)
echo "$INPUT" > "$TMPINPUT"
BLOCKS_JSON=$(python3 << PYEOF2
import sys, json, re

with open("$TMPINPUT", "r") as f:
    lines = f.read().strip().split('\n')

blocks = []

for line in lines:
    line = line.strip()
    if not line:
        continue

    # Day break: ALL CAPS line with day name
    if re.match(r'^[A-Z]{3,}DAY,\s+[A-Z]+\s+\d+', line):
        blocks.append({
            "object": "block",
            "type": "heading_2",
            "heading_2": {
                "rich_text": [{"type": "text", "text": {"content": line}}],
                "color": "default"
            }
        })
        continue

    # Already formatted: 🔵 James (TIME): msg  or  ⚪ Liza (TIME): msg
    m = re.match(r'^([\U0001F535\u26AA]\s*(?:James|Liza)\s*\([^)]+\):\s*)(.*)', line)
    if m:
        prefix, msg = m.group(1), m.group(2)
        blocks.append({
            "object": "block",
            "type": "paragraph",
            "paragraph": {
                "rich_text": [
                    {"type": "text", "text": {"content": prefix}, "annotations": {"bold": True, "italic": False, "strikethrough": False, "underline": False, "code": False, "color": "default"}},
                    {"type": "text", "text": {"content": msg}, "annotations": {"bold": False, "italic": False, "strikethrough": False, "underline": False, "code": False, "color": "default"}}
                ],
                "color": "default"
            }
        })
        continue

    # Raw format: James 8:15 PM: msg  or  Liza 8:15 PM: msg
    m = re.match(r'^(James|Liza)\s+(\d{1,2}:\d{2}\s*[APap][Mm]):\s*(.*)', line)
    if m:
        name, time_str, msg = m.group(1), m.group(2).strip(), m.group(3)
        # Normalize time: "8:15 PM" -> "8:15 PM"
        time_str = re.sub(r'\s+', ' ', time_str).upper()
        emoji = '\U0001F535' if name == 'James' else '\u26AA'
        prefix = f"{emoji} {name} ({time_str}): "
        blocks.append({
            "object": "block",
            "type": "paragraph",
            "paragraph": {
                "rich_text": [
                    {"type": "text", "text": {"content": prefix}, "annotations": {"bold": True, "italic": False, "strikethrough": False, "underline": False, "code": False, "color": "default"}},
                    {"type": "text", "text": {"content": msg}, "annotations": {"bold": False, "italic": False, "strikethrough": False, "underline": False, "code": False, "color": "default"}}
                ],
                "color": "default"
            }
        })
        continue

    # Reactions with time: James 8:15 PM: Reacted ❤️ to "msg"
    m = re.match(r'^(James|Liza)\s+(\d{1,2}:\d{2}\s*[APap][Mm]):\s*(Reacted\s+.+\s+to\s+".*")', line)
    if m:
        name, time_str, msg = m.group(1), m.group(2).strip().upper(), m.group(3)
        emoji = '\U0001F535' if name == 'James' else '\u26AA'
        prefix = f"{emoji} {name} ({time_str}): "
        blocks.append({
            "object": "block",
            "type": "paragraph",
            "paragraph": {
                "rich_text": [
                    {"type": "text", "text": {"content": prefix}, "annotations": {"bold": True, "italic": False, "strikethrough": False, "underline": False, "code": False, "color": "default"}},
                    {"type": "text", "text": {"content": msg}, "annotations": {"bold": False, "italic": False, "strikethrough": False, "underline": False, "code": False, "color": "default"}}
                ],
                "color": "default"
            }
        })
        continue

    # Reactions without time: James Loved "msg" / Liza Laughed at "msg"
    m = re.match(r'^(James|Liza)\s+(Reacted\s+.+\s+to|Loved|Laughed at|Liked|Emphasized|Questioned|Disliked)\s+"(.*)"', line)
    if m:
        name, reaction, quoted = m.group(1), m.group(2), m.group(3)
        emoji = '\U0001F535' if name == 'James' else '\u26AA'
        prefix = f"{emoji} {name}: "
        msg = f'{reaction} "{quoted}"'
        blocks.append({
            "object": "block",
            "type": "paragraph",
            "paragraph": {
                "rich_text": [
                    {"type": "text", "text": {"content": prefix}, "annotations": {"bold": True, "italic": False, "strikethrough": False, "underline": False, "code": False, "color": "default"}},
                    {"type": "text", "text": {"content": msg}, "annotations": {"bold": False, "italic": False, "strikethrough": False, "underline": False, "code": False, "color": "default"}}
                ],
                "color": "default"
            }
        })
        continue

    # Voice message: James 🎙️ 8:15 PM: msg
    m = re.match(r'^(James|Liza)\s+\U0001F399\uFE0F?\s*(\d{1,2}:\d{2}\s*[APap][Mm]):\s*(.*)', line)
    if m:
        name, time_str, msg = m.group(1), m.group(2).strip().upper(), m.group(3)
        emoji = '\U0001F535' if name == 'James' else '\u26AA'
        prefix = f"{emoji} {name} ({time_str}): "
        msg = f"\U0001F399\uFE0F {msg}"
        blocks.append({
            "object": "block",
            "type": "paragraph",
            "paragraph": {
                "rich_text": [
                    {"type": "text", "text": {"content": prefix}, "annotations": {"bold": True, "italic": False, "strikethrough": False, "underline": False, "code": False, "color": "default"}},
                    {"type": "text", "text": {"content": msg}, "annotations": {"bold": False, "italic": False, "strikethrough": False, "underline": False, "code": False, "color": "default"}}
                ],
                "color": "default"
            }
        })
        continue

    # Fallback: plain paragraph
    blocks.append({
        "object": "block",
        "type": "paragraph",
        "paragraph": {
            "rich_text": [{"type": "text", "text": {"content": line}}],
            "color": "default"
        }
    })

print(json.dumps(blocks))
PYEOF2
)
rm -f "$TMPINPUT"

BLOCK_COUNT=$(echo "$BLOCKS_JSON" | python3 -c "import sys,json; print(len(json.loads(sys.stdin.read())))")

echo "Parsed $BLOCK_COUNT blocks from input."

if [[ "$DRY_RUN" == "true" ]]; then
  echo ""
  echo "=== DRY RUN — would push these blocks to Week 8 page ==="
  echo "$BLOCKS_JSON" | python3 -c "
import sys, json
blocks = json.loads(sys.stdin.read())
for i, b in enumerate(blocks):
    t = b['type']
    if t == 'heading_2':
        txt = b['heading_2']['rich_text'][0]['text']['content']
        print(f'  [{i+1}] ## {txt}')
    elif t == 'paragraph':
        parts = b['paragraph']['rich_text']
        txt = ''.join(p['text']['content'] for p in parts)
        print(f'  [{i+1}] {txt[:120]}')
"
  echo ""
  echo "Run without --dry-run to push to Notion."
  exit 0
fi

# Push in batches of 100
echo "Pushing to Notion Week 8 page..."

echo "$BLOCKS_JSON" | python3 -c "
import sys, json, urllib.request, time

blocks = json.loads(sys.stdin.read())
token = '$NOTION_API_KEY'
page_id = '$WEEK8_PAGE_ID'
batch_size = $BATCH_SIZE

headers = {
    'Authorization': f'Bearer {token}',
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json'
}

total = len(blocks)
pushed = 0

for i in range(0, total, batch_size):
    batch = blocks[i:i+batch_size]
    payload = json.dumps({'children': batch}).encode()

    req = urllib.request.Request(
        f'https://api.notion.com/v1/blocks/{page_id}/children',
        data=payload,
        headers=headers,
        method='PATCH'
    )

    try:
        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read())
            pushed += len(batch)
            print(f'  Batch {i//batch_size + 1}: pushed {len(batch)} blocks ({pushed}/{total})')
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f'  ERROR batch {i//batch_size + 1}: {e.code} {body}', file=sys.stderr)
        sys.exit(1)

    if i + batch_size < total:
        time.sleep(0.5)  # rate limit courtesy

print(f'Done. {pushed} blocks pushed to Notion.')
"

echo "✓ Transcript updated."
