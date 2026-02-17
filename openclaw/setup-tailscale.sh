#!/usr/bin/env bash
# =============================================================================
# Tailscale Setup for OpenClaw VPS
# =============================================================================
# Installs Tailscale and configures the firewall so that:
#   - OpenClaw gateway (18789) is ONLY reachable via Tailscale
#   - SSH (22) is ONLY reachable via Tailscale
#   - Public internet access is blocked for these ports
#   - The VPS can still reach out to the internet (for Docker pulls, etc.)
#
# Run as root on a fresh Ubuntu 22.04/24.04 VPS.
# =============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[+]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[x]${NC} $1" >&2; }

# --- Pre-checks ---
if [[ $EUID -ne 0 ]]; then
    err "This script must be run as root (or with sudo)."
    exit 1
fi

# --- Step 1: Install Tailscale ---
log "Installing Tailscale..."
if command -v tailscale &>/dev/null; then
    warn "Tailscale already installed: $(tailscale version)"
else
    curl -fsSL https://tailscale.com/install.sh | sh
    log "Tailscale installed successfully."
fi

# --- Step 2: Authenticate Tailscale ---
log "Starting Tailscale..."
if tailscale status &>/dev/null; then
    warn "Tailscale already connected."
    tailscale status
else
    echo ""
    warn "Authenticate with your Tailscale account."
    warn "A URL will appear below -- open it in your browser to authorize this machine."
    echo ""
    tailscale up --ssh
    log "Tailscale connected."
fi

# Get the Tailscale interface name and IP
TS_IFACE=$(tailscale status --json | python3 -c "import sys,json; print(json.load(sys.stdin).get('Self',{}).get('TailscaleIPs',[''])[0])" 2>/dev/null || echo "")
if [[ -z "$TS_IFACE" ]]; then
    warn "Could not detect Tailscale IP. Firewall rules will use 'tailscale0' interface."
fi
log "Tailscale IP: ${TS_IFACE:-unknown}"

# --- Step 3: Configure UFW Firewall ---
log "Configuring UFW firewall..."

# Install UFW if not present
apt-get update -qq && apt-get install -y -qq ufw

# Reset UFW to clean state
ufw --force reset

# Default policies: deny inbound, allow outbound
ufw default deny incoming
ufw default allow outgoing

# Allow SSH only from Tailscale network (100.64.0.0/10 is the Tailscale CGNAT range)
ufw allow in on tailscale0 to any port 22 proto tcp comment "SSH via Tailscale only"

# Allow OpenClaw gateway only from Tailscale
ufw allow in on tailscale0 to any port 18789 proto tcp comment "OpenClaw gateway via Tailscale"

# Allow OpenClaw OAuth callback only from Tailscale
ufw allow in on tailscale0 to any port 1455 proto tcp comment "OpenClaw OAuth via Tailscale"

# Enable UFW
ufw --force enable

log "Firewall configured. Current rules:"
ufw status verbose

# --- Step 4: Harden sshd ---
log "Hardening SSH configuration..."
SSHD_CONFIG="/etc/ssh/sshd_config"

# Disable password auth (Tailscale SSH or key-based only)
if grep -q "^PasswordAuthentication" "$SSHD_CONFIG"; then
    sed -i 's/^PasswordAuthentication.*/PasswordAuthentication no/' "$SSHD_CONFIG"
else
    echo "PasswordAuthentication no" >> "$SSHD_CONFIG"
fi

# Disable root login via password
if grep -q "^PermitRootLogin" "$SSHD_CONFIG"; then
    sed -i 's/^PermitRootLogin.*/PermitRootLogin prohibit-password/' "$SSHD_CONFIG"
else
    echo "PermitRootLogin prohibit-password" >> "$SSHD_CONFIG"
fi

systemctl reload sshd 2>/dev/null || systemctl reload ssh 2>/dev/null || warn "Could not reload sshd"

# --- Step 5: Verify ---
echo ""
log "============================================"
log " Tailscale + Firewall Setup Complete"
log "============================================"
log ""
log " Tailscale IP: ${TS_IFACE:-run 'tailscale ip -4' to check}"
log " SSH:          Only via Tailscale (port 22)"
log " OpenClaw:     Only via Tailscale (port 18789)"
log " Public:       All inbound ports blocked"
log ""
log " To access from your machine:"
log "   ssh root@\$(tailscale ip -4)          # SSH"
log "   http://\$(tailscale ip -4):18789      # OpenClaw dashboard"
log ""
log " Next: Run setup-vps.sh to install Docker and prepare the environment."
