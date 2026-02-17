#!/usr/bin/env bash
# =============================================================================
# Telegram Pairing & Smoke Test
# =============================================================================
# Verifies the Telegram bot token, confirms the bot is reachable, and
# sends a test message to validate end-to-end connectivity.
#
# Usage:
#   ./pair-telegram.sh              # Verify + smoke test
#   ./pair-telegram.sh --chat-id    # Also lock down allowedUsers in config
# =============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[+]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[x]${NC} $1" >&2; }
step() { echo -e "\n${CYAN}=== $1 ===${NC}"; }

OPENCLAW_DIR="${OPENCLAW_INSTALL_DIR:-/opt/openclaw}"
ENV_FILE="${OPENCLAW_DIR}/.env"

# --- Load bot token ---
if [[ ! -f "$ENV_FILE" ]]; then
    err ".env not found at ${ENV_FILE}"
    exit 1
fi

TELEGRAM_BOT_TOKEN=$(grep "^TELEGRAM_BOT_TOKEN=" "$ENV_FILE" | cut -d'=' -f2-)
if [[ -z "$TELEGRAM_BOT_TOKEN" ]]; then
    err "TELEGRAM_BOT_TOKEN is empty in ${ENV_FILE}"
    exit 1
fi

# --- Step 1: Verify bot identity ---
step "Step 1: Verifying bot identity"

BOT_INFO=$(curl -sf "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe" || echo '{"ok":false}')

if echo "$BOT_INFO" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['ok']" 2>/dev/null; then
    BOT_USERNAME=$(echo "$BOT_INFO" | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['username'])")
    BOT_NAME=$(echo "$BOT_INFO" | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['first_name'])")
    log "Bot verified: @${BOT_USERNAME} (${BOT_NAME})"
else
    err "Bot token is invalid or Telegram API is unreachable."
    err "Get a valid token from @BotFather on Telegram."
    exit 1
fi

# --- Step 2: Check for pending updates (indicates bot is polling) ---
step "Step 2: Checking bot update queue"

UPDATES=$(curl -sf "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?limit=5&timeout=1" || echo '{"ok":false}')

if echo "$UPDATES" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['ok']" 2>/dev/null; then
    UPDATE_COUNT=$(echo "$UPDATES" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['result']))")
    if [[ "$UPDATE_COUNT" -gt 0 ]]; then
        log "${UPDATE_COUNT} pending update(s) in queue"

        # Show chat IDs from recent messages (for allowedUsers config)
        echo ""
        log "Recent chat IDs (use these for allowedUsers):"
        echo "$UPDATES" | python3 -c "
import sys, json
data = json.load(sys.stdin)
seen = set()
for update in data['result']:
    msg = update.get('message', {})
    chat = msg.get('chat', {})
    chat_id = chat.get('id')
    username = chat.get('username', 'unknown')
    first_name = chat.get('first_name', '')
    if chat_id and chat_id not in seen:
        seen.add(chat_id)
        print(f'  Chat ID: {chat_id}  (@{username}, {first_name})')
"
    else
        log "No pending updates (queue is clean)"
        warn "Send a message to @${BOT_USERNAME} on Telegram to generate an update."
    fi
else
    warn "Could not fetch updates. The gateway may already be consuming them (this is normal)."
fi

# --- Step 3: Smoke test -- check gateway is forwarding ---
step "Step 3: Gateway health check"

GW_STATUS=$(docker inspect --format='{{.State.Health.Status}}' openclaw-gateway 2>/dev/null || echo "not-running")

if [[ "$GW_STATUS" == "healthy" ]]; then
    log "Gateway container: healthy"
elif [[ "$GW_STATUS" == "starting" ]]; then
    warn "Gateway container: starting (wait a moment and retry)"
elif [[ "$GW_STATUS" == "not-running" ]]; then
    err "Gateway container is not running."
    err "Start it: cd ${OPENCLAW_DIR} && docker compose up -d openclaw-gateway"
    exit 1
else
    warn "Gateway container status: ${GW_STATUS}"
fi

# Check Telegram in gateway logs
RECENT_LOGS=$(cd "$OPENCLAW_DIR" && docker compose logs --tail=30 openclaw-gateway 2>&1)
if echo "$RECENT_LOGS" | grep -qi "telegram"; then
    log "Telegram activity found in gateway logs:"
    echo "$RECENT_LOGS" | grep -i "telegram" | tail -5 | while read -r line; do
        echo "  $line"
    done
else
    warn "No Telegram activity in recent logs."
fi

# --- Step 4 (optional): Lock down allowedUsers ---
if [[ "${1:-}" == "--chat-id" ]]; then
    step "Step 4: Locking down allowedUsers"
    echo ""
    echo "Enter your Telegram chat ID (from the list above):"
    read -r CHAT_ID

    if [[ -z "$CHAT_ID" ]]; then
        err "No chat ID provided. Skipping."
    else
        CONFIG_FILE="${OPENCLAW_DIR}/config/openclaw.json"
        if [[ -f "$CONFIG_FILE" ]]; then
            python3 -c "
import json, sys
with open('${CONFIG_FILE}', 'r') as f:
    config = json.load(f)
config['channels']['telegram']['allowedUsers'] = [int(${CHAT_ID})]
with open('${CONFIG_FILE}', 'w') as f:
    json.dump(config, f, indent=2)
print('Updated allowedUsers to [${CHAT_ID}]')
"
            log "Config updated. Restart gateway to apply:"
            log "  cd ${OPENCLAW_DIR} && docker compose restart openclaw-gateway"
        else
            err "Config file not found at ${CONFIG_FILE}"
        fi
    fi
fi

# --- Summary ---
step "Telegram Pairing Status"
echo ""
log "Bot:        @${BOT_USERNAME} (${BOT_NAME})"
log "Gateway:    ${GW_STATUS}"
log ""
log "To test end-to-end:"
log "  1. Open Telegram and find @${BOT_USERNAME}"
log "  2. Send: /start"
log "  3. Send: Hello, LifeOS!"
log "  4. Check response in chat"
log ""
log "To restrict access to your account only:"
log "  ./pair-telegram.sh --chat-id"
echo ""
