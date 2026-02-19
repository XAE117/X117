#!/usr/bin/env bash
# liza-sync.sh — shell entry point for the nightly Liza iMessage → Notion sync.
#
# Add to crontab with:
#   crontab -e
#   0 2 * * * /path/to/liza-sync.sh >> /var/log/liza-sync.log 2>&1
#
# The script:
#   1. Loads .env from the same directory as this file
#   2. Verifies node is available
#   3. Runs liza-sync.js and exits with its status code

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
SYNC_SCRIPT="${SCRIPT_DIR}/liza-sync.js"

# ── Load environment ──────────────────────────────────────────────────────────

if [ ! -f "$ENV_FILE" ]; then
  echo "[liza-sync.sh] ERROR: .env not found at ${ENV_FILE}" >&2
  echo "[liza-sync.sh] Copy .env.example to .env and fill in NOTION_API_KEY" >&2
  exit 1
fi

# Export all vars defined in .env (ignore comments and blank lines)
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

# ── Verify dependencies ───────────────────────────────────────────────────────

NODE_BIN="$(command -v node 2>/dev/null || true)"
if [ -z "$NODE_BIN" ]; then
  echo "[liza-sync.sh] ERROR: 'node' not found in PATH" >&2
  echo "[liza-sync.sh] Install Node.js (>=18) and make sure it's on PATH for cron" >&2
  echo "[liza-sync.sh] Tip: add 'PATH=/usr/local/bin:\$PATH' to the top of your crontab" >&2
  exit 1
fi

if [ ! -f "${SCRIPT_DIR}/node_modules/.bin/notion" ] && \
   [ ! -d "${SCRIPT_DIR}/node_modules/@notionhq" ]; then
  echo "[liza-sync.sh] ERROR: node_modules not found. Run: cd ${SCRIPT_DIR} && npm install" >&2
  exit 1
fi

# ── Run ───────────────────────────────────────────────────────────────────────

exec "$NODE_BIN" "$SYNC_SCRIPT"
