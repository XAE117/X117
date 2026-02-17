#!/usr/bin/env bash
# =============================================================================
# Post-Launch Security Verification -- Stage 2
# =============================================================================
# Run this AFTER install.sh to verify all hardening controls are active
# on the running containers.
#
# Usage:
#   sudo ./verify-security.sh
# =============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

pass()  { echo -e "  ${GREEN}[PASS]${NC} $1"; ((PASS++)); }
fail()  { echo -e "  ${RED}[FAIL]${NC} $1"; ((FAIL++)); }
skip()  { echo -e "  ${YELLOW}[WARN]${NC} $1"; ((WARN++)); }
step()  { echo -e "\n${CYAN}--- $1 ---${NC}"; }

OPENCLAW_DIR="${OPENCLAW_INSTALL_DIR:-/opt/openclaw}"

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN} OpenClaw Security Verification -- Stage 2${NC}"
echo -e "${CYAN}============================================${NC}"

# =============================================================================
# Container hardening
# =============================================================================
step "Container Hardening"

# Check gateway is running
if docker inspect openclaw-gateway &>/dev/null; then
    pass "Gateway container exists"
else
    fail "Gateway container not found -- run install.sh first"
    exit 1
fi

# Read-only rootfs
READONLY=$(docker inspect --format='{{.HostConfig.ReadonlyRootfs}}' openclaw-gateway)
if [[ "$READONLY" == "true" ]]; then
    pass "Gateway: read-only rootfs"
else
    fail "Gateway: rootfs is writable (should be read_only: true)"
fi

# Capabilities
CAPDROP=$(docker inspect --format='{{.HostConfig.CapDrop}}' openclaw-gateway)
if echo "$CAPDROP" | grep -q "ALL"; then
    pass "Gateway: cap_drop ALL"
else
    fail "Gateway: capabilities not fully dropped"
fi

CAPADD=$(docker inspect --format='{{.HostConfig.CapAdd}}' openclaw-gateway)
if [[ "$CAPADD" == "[NET_BIND_SERVICE]" ]]; then
    pass "Gateway: only NET_BIND_SERVICE added back"
else
    skip "Gateway: cap_add is ${CAPADD} (expected [NET_BIND_SERVICE])"
fi

# No new privileges
NOPRIVS=$(docker inspect --format='{{.HostConfig.SecurityOpt}}' openclaw-gateway)
if echo "$NOPRIVS" | grep -q "no-new-privileges"; then
    pass "Gateway: no-new-privileges"
else
    fail "Gateway: no-new-privileges not set"
fi

# Memory limit
MEM_LIMIT=$(docker inspect --format='{{.HostConfig.Memory}}' openclaw-gateway)
if [[ "$MEM_LIMIT" -gt 0 ]]; then
    MEM_MB=$((MEM_LIMIT / 1024 / 1024))
    pass "Gateway: memory limit ${MEM_MB}MB"
else
    fail "Gateway: no memory limit set"
fi

# PID limit
PID_LIMIT=$(docker inspect --format='{{.HostConfig.PidsLimit}}' openclaw-gateway)
if [[ "$PID_LIMIT" -gt 0 ]] && [[ "$PID_LIMIT" -le 512 ]]; then
    pass "Gateway: PID limit ${PID_LIMIT}"
else
    fail "Gateway: PID limit not set or too high (${PID_LIMIT})"
fi

# =============================================================================
# Network isolation
# =============================================================================
step "Network Isolation"

# Check port bindings are localhost only
PORTS=$(docker inspect --format='{{json .HostConfig.PortBindings}}' openclaw-gateway)

if echo "$PORTS" | python3 -c "
import sys, json
ports = json.load(sys.stdin)
all_local = True
for port, bindings in ports.items():
    for b in (bindings or []):
        if b.get('HostIp', '') not in ('127.0.0.1', '::1', 'localhost'):
            all_local = False
sys.exit(0 if all_local else 1)
" 2>/dev/null; then
    pass "Gateway: all ports bound to 127.0.0.1"
else
    fail "Gateway: ports exposed beyond localhost!"
fi

# Check no public-facing ports on host
PUBLIC_PORTS=$(ss -tlnp 2>/dev/null | grep -v "127.0.0.1" | grep -v "::1" | grep -v "tailscale" | grep -c "LISTEN" || true)
if [[ "$PUBLIC_PORTS" -eq 0 ]]; then
    pass "Host: no public-facing ports"
else
    skip "Host: ${PUBLIC_PORTS} non-localhost listening port(s) detected"
fi

# UFW status
if command -v ufw &>/dev/null; then
    if ufw status 2>/dev/null | grep -q "Status: active"; then
        pass "UFW firewall: active"
    else
        fail "UFW firewall: inactive"
    fi
else
    skip "UFW not installed (check firewall manually)"
fi

# Tailscale
if command -v tailscale &>/dev/null; then
    if tailscale status &>/dev/null; then
        pass "Tailscale: connected"
    else
        fail "Tailscale: not connected"
    fi
else
    skip "Tailscale not installed"
fi

# =============================================================================
# CVE-2026-25253 mitigations
# =============================================================================
step "CVE-2026-25253 Mitigations"

CONFIG_FILE="${OPENCLAW_DIR}/config/openclaw.json"
if [[ -f "$CONFIG_FILE" ]]; then
    # WebSocket origin validation
    if python3 -c "
import json
with open('${CONFIG_FILE}') as f:
    c = json.load(f)
assert c['gateway']['security']['wsOriginValidation'] == True
" 2>/dev/null; then
        pass "Config: wsOriginValidation enabled"
    else
        fail "Config: wsOriginValidation not enabled"
    fi

    # CORS restricted
    if python3 -c "
import json
with open('${CONFIG_FILE}') as f:
    c = json.load(f)
origins = c['gateway']['security']['corsAllowOrigins']
assert len(origins) <= 2
assert all('127.0.0.1' in o or 'localhost' in o for o in origins)
" 2>/dev/null; then
        pass "Config: CORS restricted to localhost only"
    else
        fail "Config: CORS allows non-localhost origins"
    fi

    # Approval mode
    if python3 -c "
import json
with open('${CONFIG_FILE}') as f:
    c = json.load(f)
assert c['exec']['approvals']['mode'] == 'always-prompt'
" 2>/dev/null; then
        pass "Config: exec approvals = always-prompt"
    else
        fail "Config: exec approvals not set to always-prompt"
    fi

    # Rate limiting
    if python3 -c "
import json
with open('${CONFIG_FILE}') as f:
    c = json.load(f)
assert c['gateway']['security']['rateLimiting']['enabled'] == True
" 2>/dev/null; then
        pass "Config: rate limiting enabled"
    else
        fail "Config: rate limiting not enabled"
    fi

    # Secret redaction
    if python3 -c "
import json
with open('${CONFIG_FILE}') as f:
    c = json.load(f)
assert c['logging']['redactSecrets'] == True
" 2>/dev/null; then
        pass "Config: secret redaction in logs enabled"
    else
        fail "Config: secret redaction not enabled"
    fi
else
    fail "Config file not found at ${CONFIG_FILE}"
fi

# =============================================================================
# Credential isolation
# =============================================================================
step "Credential Isolation"

ENV_FILE="${OPENCLAW_DIR}/.env"
if [[ -f "$ENV_FILE" ]]; then
    PERMS=$(stat -c '%a' "$ENV_FILE" 2>/dev/null || stat -f '%Lp' "$ENV_FILE" 2>/dev/null)
    if [[ "$PERMS" == "600" ]]; then
        pass ".env permissions: 600"
    else
        fail ".env permissions: ${PERMS} (should be 600)"
    fi
else
    fail ".env not found"
fi

# Check no secrets baked into image
SECRET_IN_IMAGE=$(docker history openclaw:local --no-trunc 2>/dev/null | grep -ciE 'key|token|secret|password' || true)
if [[ "$SECRET_IN_IMAGE" -eq 0 ]]; then
    pass "Docker image: no secrets in layer history"
else
    skip "Docker image: ${SECRET_IN_IMAGE} potential secret reference(s) in layer history (review manually)"
fi

# Config mount is read-only
CONFIG_MOUNT=$(docker inspect --format='{{json .Mounts}}' openclaw-gateway | python3 -c "
import sys, json
mounts = json.load(sys.stdin)
for m in mounts:
    if '.openclaw' in m.get('Source', '') and m.get('Type') == 'bind':
        if m.get('Mode', '') == 'ro' or m.get('RW', True) == False:
            print('ro')
        else:
            print('rw')
        break
else:
    print('missing')
" 2>/dev/null || echo "error")

if [[ "$CONFIG_MOUNT" == "ro" ]]; then
    pass "Config bind mount: read-only"
elif [[ "$CONFIG_MOUNT" == "rw" ]]; then
    fail "Config bind mount: writable (should be :ro)"
else
    skip "Could not determine config mount mode"
fi

# =============================================================================
# Telegram channel security
# =============================================================================
step "Telegram Channel"

if [[ -f "$CONFIG_FILE" ]]; then
    # Check Telegram channel exists
    if python3 -c "
import json
with open('${CONFIG_FILE}') as f:
    c = json.load(f)
assert c['channels']['telegram']['enabled'] == True
" 2>/dev/null; then
        pass "Telegram channel: enabled"
    else
        skip "Telegram channel: not enabled in config"
    fi

    # Check allowedUsers is set (not empty)
    ALLOWED=$(python3 -c "
import json
with open('${CONFIG_FILE}') as f:
    c = json.load(f)
users = c['channels']['telegram'].get('allowedUsers', [])
print(len(users))
" 2>/dev/null || echo "0")

    if [[ "$ALLOWED" -gt 0 ]]; then
        pass "Telegram: allowedUsers restricted (${ALLOWED} user(s))"
    else
        skip "Telegram: allowedUsers is empty -- anyone can message your bot!"
        echo -e "    Run: ${CYAN}./pair-telegram.sh --chat-id${NC} to lock it down"
    fi

    # Check rate limit
    if python3 -c "
import json
with open('${CONFIG_FILE}') as f:
    c = json.load(f)
assert c['channels']['telegram']['rateLimit']['maxMessagesPerMinute'] <= 60
" 2>/dev/null; then
        pass "Telegram: rate limit configured"
    else
        skip "Telegram: no rate limit set"
    fi
fi

# =============================================================================
# Summary
# =============================================================================
echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN} Results: ${GREEN}${PASS} passed${NC}, ${RED}${FAIL} failed${NC}, ${YELLOW}${WARN} warnings${NC}"
echo -e "${CYAN}============================================${NC}"

if [[ "$FAIL" -gt 0 ]]; then
    echo ""
    err "FIX the ${FAIL} failure(s) above before using in production."
    exit 1
elif [[ "$WARN" -gt 0 ]]; then
    echo ""
    warn "Review the ${WARN} warning(s) above. They may be acceptable."
    exit 0
else
    echo ""
    log "All checks passed. Stage 2 deployment is secure."
    exit 0
fi
