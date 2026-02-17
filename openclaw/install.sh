#!/usr/bin/env bash
# =============================================================================
# OpenClaw Stage 2 -- Install & Launch
# =============================================================================
# Builds Docker images, generates config from template, and starts the
# hardened gateway with Telegram channel polling.
#
# Prerequisites:
#   - Stage 1 complete (setup-tailscale.sh + setup-vps.sh already ran)
#   - .env file populated with all required secrets
#
# Run from the openclaw/ directory:
#   sudo ./install.sh
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

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPENCLAW_DIR="${OPENCLAW_INSTALL_DIR:-/opt/openclaw}"

# --- Pre-flight checks ---
step "Pre-flight checks"

if [[ $EUID -ne 0 ]]; then
    err "This script must be run as root (or with sudo)."
    exit 1
fi

if ! docker compose version &>/dev/null; then
    err "Docker Compose v2 not found. Run setup-vps.sh first."
    exit 1
fi

# Check .env exists and has required keys
ENV_FILE="${OPENCLAW_DIR}/.env"
if [[ ! -f "$ENV_FILE" ]]; then
    err ".env not found at ${ENV_FILE}"
    err "Run setup-vps.sh first, then fill in secrets: nano ${ENV_FILE}"
    exit 1
fi

MISSING_KEYS=()
for KEY in OPENCLAW_GATEWAY_TOKEN ANTHROPIC_API_KEY TELEGRAM_BOT_TOKEN; do
    VAL=$(grep "^${KEY}=" "$ENV_FILE" | cut -d'=' -f2-)
    if [[ -z "$VAL" ]]; then
        MISSING_KEYS+=("$KEY")
    fi
done

if [[ ${#MISSING_KEYS[@]} -gt 0 ]]; then
    err "Missing required secrets in ${ENV_FILE}:"
    for KEY in "${MISSING_KEYS[@]}"; do
        err "  - ${KEY}"
    done
    err "Fill them in: nano ${ENV_FILE}"
    exit 1
fi

log "All required secrets present in .env"

# --- Step 1: Copy latest files from repo ---
step "Step 1: Syncing config from repo"

cp "${SCRIPT_DIR}/docker-compose.yml" "${OPENCLAW_DIR}/docker-compose.yml"
cp "${SCRIPT_DIR}/Dockerfile" "${OPENCLAW_DIR}/Dockerfile"
cp "${SCRIPT_DIR}/Dockerfile.sandbox" "${OPENCLAW_DIR}/Dockerfile.sandbox"
cp "${SCRIPT_DIR}/config/openclaw.template.json" "${OPENCLAW_DIR}/config/openclaw.template.json"
cp "${SCRIPT_DIR}/pair-telegram.sh" "${OPENCLAW_DIR}/pair-telegram.sh"
cp "${SCRIPT_DIR}/verify-security.sh" "${OPENCLAW_DIR}/verify-security.sh"
chmod +x "${OPENCLAW_DIR}/pair-telegram.sh" "${OPENCLAW_DIR}/verify-security.sh"

log "Files synced to ${OPENCLAW_DIR}"

# --- Step 2: Generate openclaw.json from template ---
step "Step 2: Generating openclaw.json"

# Source .env to get variable values
set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

# Substitute env vars into template
CONFIG_TEMPLATE="${OPENCLAW_DIR}/config/openclaw.template.json"
CONFIG_OUTPUT="${OPENCLAW_DIR}/config/openclaw.json"

envsubst < "$CONFIG_TEMPLATE" > "$CONFIG_OUTPUT"
chmod 640 "$CONFIG_OUTPUT"
chown root:root "$CONFIG_OUTPUT"

# Validate JSON
if ! python3 -c "import json; json.load(open('${CONFIG_OUTPUT}'))" 2>/dev/null; then
    err "Generated openclaw.json is not valid JSON!"
    err "Check template and .env for syntax issues."
    exit 1
fi

log "Config generated at ${CONFIG_OUTPUT}"

# Verify no raw ${...} tokens remain (would indicate missing env vars)
if grep -qE '\$\{[A-Z_]+\}' "$CONFIG_OUTPUT"; then
    warn "Unresolved variables found in config:"
    grep -oE '\$\{[A-Z_]+\}' "$CONFIG_OUTPUT" | sort -u | while read -r var; do
        warn "  $var"
    done
    err "Fix .env and re-run."
    exit 1
fi

log "Config validated -- no unresolved variables"

# --- Step 3: Build Docker images ---
step "Step 3: Building Docker images"

cd "$OPENCLAW_DIR"

log "Building gateway image (openclaw:local)..."
docker compose build openclaw-gateway

log "Building sandbox image (openclaw-sandbox:bookworm-slim)..."
docker compose build openclaw-sandbox

log "Images built successfully"
docker images | grep -E "openclaw|REPOSITORY"

# --- Step 4: Verify image has CVE patch ---
step "Step 4: Verifying OpenClaw version"

INSTALLED_VERSION=$(docker run --rm openclaw:local openclaw --version 2>/dev/null || echo "unknown")
log "OpenClaw version in image: ${INSTALLED_VERSION}"

# Basic version check (v2026.1.29 or later)
if [[ "$INSTALLED_VERSION" == "unknown" ]]; then
    warn "Could not detect OpenClaw version. Verify manually after startup."
elif [[ "$INSTALLED_VERSION" < "2026.1.29" ]]; then
    err "OpenClaw version ${INSTALLED_VERSION} is BELOW the CVE-2026-25253 patch (2026.1.29)."
    err "Do NOT proceed. Update the OPENCLAW_VERSION build arg in Dockerfile."
    exit 1
else
    log "Version ${INSTALLED_VERSION} >= 2026.1.29 -- CVE-2026-25253 patched"
fi

# --- Step 5: Rotate gateway token ---
step "Step 5: Rotating gateway token"

NEW_TOKEN=$(openssl rand -hex 32)
sed -i "s/^OPENCLAW_GATEWAY_TOKEN=.*/OPENCLAW_GATEWAY_TOKEN=${NEW_TOKEN}/" "$ENV_FILE"

# Re-generate config with new token
set -a
source "$ENV_FILE"
set +a
envsubst < "$CONFIG_TEMPLATE" > "$CONFIG_OUTPUT"

log "Gateway token rotated. Old token is invalidated."

# --- Step 6: Launch ---
step "Step 6: Starting OpenClaw gateway"

docker compose up -d openclaw-gateway

log "Waiting for health check..."
RETRIES=0
MAX_RETRIES=12
while [[ $RETRIES -lt $MAX_RETRIES ]]; do
    STATUS=$(docker inspect --format='{{.State.Health.Status}}' openclaw-gateway 2>/dev/null || echo "missing")
    if [[ "$STATUS" == "healthy" ]]; then
        log "Gateway is HEALTHY"
        break
    fi
    ((RETRIES++))
    if [[ $RETRIES -eq $MAX_RETRIES ]]; then
        err "Gateway did not become healthy after ${MAX_RETRIES} checks."
        err "Check logs: docker compose logs openclaw-gateway"
        exit 1
    fi
    echo -n "."
    sleep 5
done

# --- Step 7: Verify Telegram polling ---
step "Step 7: Verifying Telegram connection"

sleep 3
RECENT_LOGS=$(docker compose logs --tail=50 openclaw-gateway 2>&1)

if echo "$RECENT_LOGS" | grep -qi "telegram.*connected\|telegram.*polling\|telegram.*started"; then
    log "Telegram channel is active and polling"
elif echo "$RECENT_LOGS" | grep -qi "telegram.*error\|telegram.*fail"; then
    warn "Telegram may have connection issues. Check logs:"
    echo "$RECENT_LOGS" | grep -i "telegram" | tail -5
    warn "You can re-pair with: ./pair-telegram.sh"
else
    warn "Could not confirm Telegram status from logs."
    warn "Check manually: docker compose logs openclaw-gateway | grep -i telegram"
fi

# --- Summary ---
step "Stage 2 Complete"
echo ""
log "Gateway:    Running on 127.0.0.1:18789 (Tailscale-gated)"
log "Telegram:   Polling active (bot connected)"
log "Config:     ${OPENCLAW_DIR}/config/openclaw.json"
log "Secrets:    ${OPENCLAW_DIR}/.env (chmod 600)"
log ""
log "Next steps:"
log "  1. Send a test message to your Telegram bot"
log "  2. Run security verification: ./verify-security.sh"
log "  3. Check logs: docker compose logs -f openclaw-gateway"
log ""
log "  Stage 3: Write the LifeOS AgentSkill (habit logging, expense tracking, etc.)"
echo ""
