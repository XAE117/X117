#!/usr/bin/env bash
# Install the Notion Projects Shard sync on macOS.
# Run from the repo root: bash scripts/install-notion-sync.sh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_PY="$REPO_DIR/scripts/notion_shard_sync.py"
SRC_SHIM="$REPO_DIR/scripts/notion-sync"
SRC_PLIST="$REPO_DIR/scripts/com.jameswalker.notion-shard-sync.plist"

DEST_PY="$HOME/scripts/notion_shard_sync.py"
DEST_SHIM="$HOME/.local/bin/notion-sync"
DEST_PLIST="$HOME/Library/LaunchAgents/com.jameswalker.notion-shard-sync.plist"
LOG_DIR="$HOME/logs"

if [[ "$(uname)" != "Darwin" ]]; then
    echo "This installer targets macOS (launchd). Detected: $(uname)." >&2
    exit 1
fi

mkdir -p "$HOME/scripts" "$HOME/.local/bin" "$HOME/Library/LaunchAgents" "$LOG_DIR"

cp "$SRC_PY" "$DEST_PY"
chmod +x "$DEST_PY"

cp "$SRC_SHIM" "$DEST_SHIM"
chmod +x "$DEST_SHIM"

# Substitute $HOME into the plist template.
sed "s|__HOME__|$HOME|g" "$SRC_PLIST" > "$DEST_PLIST"

# Reload the launchd job.
launchctl unload "$DEST_PLIST" 2>/dev/null || true
launchctl load "$DEST_PLIST"

echo "Installed:"
echo "  script   $DEST_PY"
echo "  trigger  $DEST_SHIM   (ensure ~/.local/bin is in PATH)"
echo "  launchd  $DEST_PLIST  (Sundays 09:00)"
echo "  logs     $LOG_DIR/notion_sync.log"
echo
echo "Next: export NOTION_TOKEN in ~/.zshrc or add it to ~/.env, then run: notion-sync --dry-run"
