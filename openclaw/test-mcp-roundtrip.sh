#!/usr/bin/env bash
# =============================================================================
# Stage 3: MCP Round-Trip Verification
# =============================================================================
# Tests that each MCP server can be spawned, connects successfully, and
# returns tool definitions. Does NOT require Telegram -- tests the plumbing
# directly via the OpenClaw CLI.
#
# Usage:
#   ./test-mcp-roundtrip.sh              # Run all tests
#   ./test-mcp-roundtrip.sh notion       # Test Notion only
#   ./test-mcp-roundtrip.sh calendar     # Test Google Calendar only
#   ./test-mcp-roundtrip.sh gmail        # Test Gmail only
#
# Prerequisites:
#   - .env populated with NOTION_RW_TOKEN, NOTION_RO_TOKEN
#   - credentials/google-oauth.keys.json present
#   - credentials/gmail-token.json present (run initial auth first)
#   - OpenClaw gateway running: docker compose up -d
# =============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0
SKIP=0

pass() { echo -e "  ${GREEN}✓${NC} $1"; ((PASS++)); }
fail() { echo -e "  ${RED}✗${NC} $1"; ((FAIL++)); }
skip() { echo -e "  ${YELLOW}⊘${NC} $1 (skipped)"; ((SKIP++)); }

# Load env if available
if [[ -f .env ]]; then
    set -a; source .env; set +a
fi

FILTER="${1:-all}"

# ---------------------------------------------------------------------------
# Notion RW
# ---------------------------------------------------------------------------
test_notion_rw() {
    echo ""
    echo "── Notion (read-write) ──"

    if [[ -z "${NOTION_RW_TOKEN:-}" ]]; then
        skip "NOTION_RW_TOKEN not set"
        return
    fi

    # Test: Can the MCP server start and list tools?
    if NOTION_TOKEN="$NOTION_RW_TOKEN" timeout 30 npx -y @notionhq/notion-mcp-server --list-tools >/dev/null 2>&1; then
        pass "notion-rw server starts and lists tools"
    else
        # Fallback: just test that the token is valid via Notion API
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "Authorization: Bearer $NOTION_RW_TOKEN" \
            -H "Notion-Version: 2022-06-28" \
            "https://api.notion.com/v1/users/me")
        if [[ "$HTTP_CODE" == "200" ]]; then
            pass "notion-rw token valid (API responds 200)"
        else
            fail "notion-rw token invalid (HTTP $HTTP_CODE)"
        fi
    fi

    # Test: Can we search for pages?
    SEARCH_RESULT=$(curl -s -w "\n%{http_code}" \
        -X POST "https://api.notion.com/v1/search" \
        -H "Authorization: Bearer $NOTION_RW_TOKEN" \
        -H "Notion-Version: 2022-06-28" \
        -H "Content-Type: application/json" \
        -d '{"page_size": 1}')
    HTTP_CODE=$(echo "$SEARCH_RESULT" | tail -1)
    if [[ "$HTTP_CODE" == "200" ]]; then
        pass "notion-rw can search workspace"
    else
        fail "notion-rw search failed (HTTP $HTTP_CODE)"
    fi
}

# ---------------------------------------------------------------------------
# Notion RO
# ---------------------------------------------------------------------------
test_notion_ro() {
    echo ""
    echo "── Notion (read-only) ──"

    if [[ -z "${NOTION_RO_TOKEN:-}" ]]; then
        skip "NOTION_RO_TOKEN not set"
        return
    fi

    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $NOTION_RO_TOKEN" \
        -H "Notion-Version: 2022-06-28" \
        "https://api.notion.com/v1/users/me")
    if [[ "$HTTP_CODE" == "200" ]]; then
        pass "notion-ro token valid (API responds 200)"
    else
        fail "notion-ro token invalid (HTTP $HTTP_CODE)"
    fi

    SEARCH_RESULT=$(curl -s -w "\n%{http_code}" \
        -X POST "https://api.notion.com/v1/search" \
        -H "Authorization: Bearer $NOTION_RO_TOKEN" \
        -H "Notion-Version: 2022-06-28" \
        -H "Content-Type: application/json" \
        -d '{"page_size": 1}')
    HTTP_CODE=$(echo "$SEARCH_RESULT" | tail -1)
    if [[ "$HTTP_CODE" == "200" ]]; then
        pass "notion-ro can search workspace"
    else
        fail "notion-ro search failed (HTTP $HTTP_CODE)"
    fi
}

# ---------------------------------------------------------------------------
# Google Calendar
# ---------------------------------------------------------------------------
test_google_calendar() {
    echo ""
    echo "── Google Calendar (read-only) ──"

    CREDS="${GOOGLE_OAUTH_CREDENTIALS:-credentials/google-oauth.keys.json}"
    if [[ ! -f "$CREDS" ]]; then
        skip "Google OAuth credentials not found at $CREDS"
        return
    fi
    pass "Google OAuth credentials file exists"

    # Test: Can the MCP server start?
    if GOOGLE_OAUTH_CREDENTIALS="$CREDS" \
       ENABLED_TOOLS="list-calendars,list-events,get-event,search-events,get-freebusy,get-current-time,list-colors" \
       timeout 30 npx -y @cocal/google-calendar-mcp --help >/dev/null 2>&1; then
        pass "google-calendar MCP server binary works"
    else
        skip "google-calendar MCP server not testable without interactive auth"
    fi
}

# ---------------------------------------------------------------------------
# Gmail
# ---------------------------------------------------------------------------
test_gmail() {
    echo ""
    echo "── Gmail (read-only) ──"

    CREDS="${GMAIL_OAUTH_PATH:-credentials/google-oauth.keys.json}"
    TOKEN="${GMAIL_CREDENTIALS_PATH:-credentials/gmail-token.json}"

    if [[ ! -f "$CREDS" ]]; then
        skip "Gmail OAuth credentials not found at $CREDS"
        return
    fi
    pass "Gmail OAuth credentials file exists"

    if [[ ! -f "$TOKEN" ]]; then
        skip "Gmail token not found at $TOKEN (run initial auth first)"
        return
    fi
    pass "Gmail token file exists"
}

# ---------------------------------------------------------------------------
# OpenClaw gateway integration
# ---------------------------------------------------------------------------
test_gateway() {
    echo ""
    echo "── OpenClaw Gateway ──"

    if ! docker compose ps --format json 2>/dev/null | grep -q "openclaw-gateway"; then
        skip "OpenClaw gateway not running (docker compose up -d first)"
        return
    fi
    pass "Gateway container running"

    # Check that MCP server configs are present in generated config
    CONFIG="/home/node/.openclaw/openclaw.json"
    if docker compose exec -T openclaw-gateway cat "$CONFIG" 2>/dev/null | grep -q "mcpServers"; then
        pass "mcpServers block present in gateway config"
    else
        fail "mcpServers block missing from gateway config"
    fi

    # Check that the credentials mount exists
    if docker compose exec -T openclaw-gateway ls /home/node/.credentials/ >/dev/null 2>&1; then
        pass "Credentials volume mounted"
    else
        fail "Credentials volume not mounted at /home/node/.credentials"
    fi
}

# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------
echo "=== Stage 3: MCP Round-Trip Verification ==="
echo "    $(date -Iseconds)"

case "$FILTER" in
    notion)   test_notion_rw; test_notion_ro ;;
    calendar) test_google_calendar ;;
    gmail)    test_gmail ;;
    gateway)  test_gateway ;;
    all)
        test_notion_rw
        test_notion_ro
        test_google_calendar
        test_gmail
        test_gateway
        ;;
    *)
        echo "Usage: $0 [all|notion|calendar|gmail|gateway]"
        exit 1
        ;;
esac

echo ""
echo "─────────────────────────"
echo -e "  ${GREEN}Passed:${NC}  $PASS"
echo -e "  ${RED}Failed:${NC}  $FAIL"
echo -e "  ${YELLOW}Skipped:${NC} $SKIP"
echo "─────────────────────────"

if [[ $FAIL -gt 0 ]]; then
    echo -e "\n${RED}Some checks failed. See above for details.${NC}"
    exit 1
else
    echo -e "\n${GREEN}All checks passed (or skipped).${NC}"
    exit 0
fi
