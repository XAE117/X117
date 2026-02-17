#!/usr/bin/env bash
# =============================================================================
# VPS Bootstrap Script -- OpenClaw Stage 1
# =============================================================================
# Prepares a fresh Ubuntu 22.04/24.04 VPS for the hardened OpenClaw deployment.
# Run order:
#   1. setup-tailscale.sh   (network isolation first)
#   2. setup-vps.sh          (this script -- Docker + environment)
#   3. Stage 2               (install OpenClaw inside container)
#
# This script does NOT install OpenClaw. It only:
#   - Installs Docker + Docker Compose
#   - Creates the directory structure
#   - Sets up the .env file from template
#   - Validates the hardened configuration
# =============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[+]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[x]${NC} $1" >&2; }

OPENCLAW_DIR="/opt/openclaw"

# --- Pre-checks ---
if [[ $EUID -ne 0 ]]; then
    err "This script must be run as root (or with sudo)."
    exit 1
fi

if ! command -v tailscale &>/dev/null; then
    err "Tailscale is not installed. Run setup-tailscale.sh first."
    exit 1
fi

if ! tailscale status &>/dev/null; then
    err "Tailscale is not connected. Run 'tailscale up' first."
    exit 1
fi

log "Tailscale verified. Proceeding with VPS setup."

# --- Step 1: System updates ---
log "Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    jq \
    unattended-upgrades

# Enable automatic security updates
dpkg-reconfigure -plow unattended-upgrades 2>/dev/null || true

# --- Step 2: Install Docker ---
log "Installing Docker..."
if command -v docker &>/dev/null; then
    warn "Docker already installed: $(docker --version)"
else
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    log "Docker installed: $(docker --version)"
fi

# Verify Docker Compose v2
if docker compose version &>/dev/null; then
    log "Docker Compose: $(docker compose version --short)"
else
    err "Docker Compose v2 not found. Please install it manually."
    exit 1
fi

# --- Step 3: Create directory structure ---
log "Creating OpenClaw directory structure at ${OPENCLAW_DIR}..."
mkdir -p "${OPENCLAW_DIR}"
mkdir -p "${OPENCLAW_DIR}/config"

# Copy files from repo (assumes this script is run from the openclaw/ directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cp "${SCRIPT_DIR}/docker-compose.yml" "${OPENCLAW_DIR}/docker-compose.yml"
cp "${SCRIPT_DIR}/config/openclaw.template.json" "${OPENCLAW_DIR}/config/"

# --- Step 4: Set up .env ---
log "Setting up credentials file..."
if [[ -f "${OPENCLAW_DIR}/.env" ]]; then
    warn ".env already exists at ${OPENCLAW_DIR}/.env -- skipping."
    warn "Edit manually if needed: nano ${OPENCLAW_DIR}/.env"
else
    cp "${SCRIPT_DIR}/.env.template" "${OPENCLAW_DIR}/.env"
    chmod 600 "${OPENCLAW_DIR}/.env"
    chown root:root "${OPENCLAW_DIR}/.env"

    # Generate a gateway token automatically
    GATEWAY_TOKEN=$(openssl rand -hex 32)
    sed -i "s/^OPENCLAW_GATEWAY_TOKEN=.*/OPENCLAW_GATEWAY_TOKEN=${GATEWAY_TOKEN}/" "${OPENCLAW_DIR}/.env"

    log "Generated gateway token and wrote to .env"
    warn ""
    warn "  You MUST fill in the remaining secrets before Stage 2:"
    warn "    nano ${OPENCLAW_DIR}/.env"
    warn ""
    warn "  Required:"
    warn "    - ANTHROPIC_API_KEY"
    warn "    - TELEGRAM_BOT_TOKEN"
    warn "    - NOTION_INTEGRATION_TOKEN"
    warn ""
fi

# --- Step 5: Lock down permissions ---
log "Setting file permissions..."
chmod 644 "${OPENCLAW_DIR}/docker-compose.yml"
chmod 755 "${OPENCLAW_DIR}/config"
chmod 644 "${OPENCLAW_DIR}/config/openclaw.template.json"

# --- Step 6: Docker daemon hardening ---
log "Hardening Docker daemon..."
DOCKER_DAEMON_JSON="/etc/docker/daemon.json"
if [[ ! -f "$DOCKER_DAEMON_JSON" ]] || ! jq -e '.["no-new-privileges"]' "$DOCKER_DAEMON_JSON" &>/dev/null; then
    cat > "$DOCKER_DAEMON_JSON" <<'DAEMON_EOF'
{
  "no-new-privileges": true,
  "live-restore": true,
  "userns-remap": "default",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}
DAEMON_EOF
    systemctl restart docker
    log "Docker daemon hardened with user namespace remapping."
else
    warn "Docker daemon already configured."
fi

# --- Step 7: Validate ---
log "Running validation checks..."
echo ""

PASS=0
FAIL=0

check() {
    local desc="$1"
    local result="$2"
    if [[ "$result" == "ok" ]]; then
        echo -e "  ${GREEN}[PASS]${NC} $desc"
        ((PASS++))
    else
        echo -e "  ${RED}[FAIL]${NC} $desc -- $result"
        ((FAIL++))
    fi
}

# Check Tailscale
if tailscale status &>/dev/null; then
    check "Tailscale connected" "ok"
else
    check "Tailscale connected" "not connected"
fi

# Check UFW
if ufw status | grep -q "Status: active"; then
    check "UFW firewall active" "ok"
else
    check "UFW firewall active" "inactive or not installed"
fi

# Check Docker
if docker info &>/dev/null; then
    check "Docker running" "ok"
else
    check "Docker running" "not running"
fi

# Check .env exists and is locked down
if [[ -f "${OPENCLAW_DIR}/.env" ]]; then
    PERMS=$(stat -c '%a' "${OPENCLAW_DIR}/.env")
    if [[ "$PERMS" == "600" ]]; then
        check ".env permissions (600)" "ok"
    else
        check ".env permissions (600)" "currently ${PERMS}"
    fi
else
    check ".env exists" "missing"
fi

# Check docker-compose.yml exists
if [[ -f "${OPENCLAW_DIR}/docker-compose.yml" ]]; then
    check "docker-compose.yml present" "ok"
else
    check "docker-compose.yml present" "missing"
fi

# Check no public ports (other than Tailscale)
PUBLIC_PORTS=$(ss -tlnp | grep -v "127.0.0.1" | grep -v "::1" | grep -v "tailscale" | grep -c "LISTEN" || true)
if [[ "$PUBLIC_PORTS" -eq 0 ]]; then
    check "No public-facing ports" "ok"
else
    check "No public-facing ports" "${PUBLIC_PORTS} public ports detected"
fi

echo ""
log "Validation: ${PASS} passed, ${FAIL} failed"

if [[ "$FAIL" -gt 0 ]]; then
    warn "Fix the failures above before proceeding to Stage 2."
else
    log "All checks passed. Stage 1 complete."
fi

echo ""
log "============================================"
log " Stage 1 Setup Complete"
log "============================================"
log ""
log " Directory:  ${OPENCLAW_DIR}"
log " Config:     ${OPENCLAW_DIR}/config/"
log " Secrets:    ${OPENCLAW_DIR}/.env (chmod 600)"
log ""
log " Next steps:"
log "   1. Fill in API keys: nano ${OPENCLAW_DIR}/.env"
log "   2. Proceed to Stage 2: Install OpenClaw"
log ""
