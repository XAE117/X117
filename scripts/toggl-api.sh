#!/usr/bin/env bash
# toggl-api.sh — Toggl Track API v9 wrapper
#
# Usage:
#   toggl-api.sh current                 Show running timer (JSON)
#   toggl-api.sh start [description]     Start a new timer
#   toggl-api.sh stop                    Stop the running timer
#   toggl-api.sh projects                List all projects (id<TAB>name)
#   toggl-api.sh entries [hours]         List entries from last N hours (default 24)
#
# Credentials are read from .env in the repo root, or from the environment.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ─── Load .env ────────────────────────────────────────────────────────────────
if [[ -f "$REPO_ROOT/.env" ]]; then
    # shellcheck source=/dev/null
    set -a
    source "$REPO_ROOT/.env"
    set +a
fi

TOGGL_API_TOKEN="${TOGGL_API_TOKEN:-}"
TOGGL_BASE_URL="https://api.track.toggl.com/api/v9"

if [[ -z "$TOGGL_API_TOKEN" ]]; then
    echo "Error: TOGGL_API_TOKEN not set. Copy .env.example to .env and fill it in." >&2
    exit 1
fi

# ─── HTTP helper ──────────────────────────────────────────────────────────────
_toggl_curl() {
    curl -s \
        -u "$TOGGL_API_TOKEN:api_token" \
        -H "Content-Type: application/json" \
        "$@"
}

# ─── Get default workspace ID ─────────────────────────────────────────────────
_workspace_id() {
    _toggl_curl "$TOGGL_BASE_URL/me" \
        | python3 -c "import sys, json; print(json.load(sys.stdin)['default_workspace_id'])"
}

# ─── Commands ─────────────────────────────────────────────────────────────────

cmd_current() {
    # Returns JSON of the running timer, or null if none
    _toggl_curl "$TOGGL_BASE_URL/me/time_entries/current"
}

cmd_start() {
    local description="${1:-Working}"
    local wid now
    wid=$(_workspace_id)
    now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    _toggl_curl -X POST "$TOGGL_BASE_URL/workspaces/$wid/time_entries" \
        -d "{
            \"description\": \"$description\",
            \"start\": \"$now\",
            \"created_with\": \"toggl-api.sh\",
            \"workspace_id\": $wid,
            \"duration\": -1
        }"
}

cmd_stop() {
    local entry_id wid
    local current
    current=$(cmd_current)

    entry_id=$(echo "$current" | python3 -c "
import sys, json
d = json.load(sys.stdin)
if d is None:
    print('')
else:
    print(d.get('id', ''))
")
    if [[ -z "$entry_id" ]]; then
        echo "No running timer to stop." >&2
        exit 1
    fi

    wid=$(echo "$current" | python3 -c "import sys, json; print(json.load(sys.stdin)['workspace_id'])")
    _toggl_curl -X PATCH "$TOGGL_BASE_URL/workspaces/$wid/time_entries/$entry_id/stop"
}

cmd_projects() {
    local wid
    wid=$(_workspace_id)
    _toggl_curl "$TOGGL_BASE_URL/workspaces/$wid/projects?active=true" \
        | python3 -c "
import sys, json
projects = json.load(sys.stdin)
if not projects:
    print('(no projects)')
    sys.exit(0)
for p in projects:
    print(f\"{p['id']}\t{p['name']}\")
"
}

cmd_entries() {
    local hours="${1:-24}"
    local since

    # GNU date vs BSD date (macOS)
    if date --version &>/dev/null 2>&1; then
        since=$(date -u -d "$hours hours ago" +"%Y-%m-%dT%H:%M:%SZ")
    else
        since=$(date -u -v-"${hours}H" +"%Y-%m-%dT%H:%M:%SZ")
    fi

    _toggl_curl "$TOGGL_BASE_URL/me/time_entries?start_date=$since"
}

# ─── Dispatch ─────────────────────────────────────────────────────────────────
case "${1:-help}" in
    current)  cmd_current ;;
    start)    cmd_start "${2:-Working}" ;;
    stop)     cmd_stop ;;
    projects) cmd_projects ;;
    entries)  cmd_entries "${2:-24}" ;;
    *)
        echo "Toggl API wrapper — Toggl Track v9"
        echo ""
        echo "Usage: toggl-api.sh <command> [args]"
        echo ""
        echo "Commands:"
        echo "  current                Show currently running timer (JSON)"
        echo "  start [description]    Start a new timer (default: 'Working')"
        echo "  stop                   Stop the running timer"
        echo "  projects               List all projects  (id<TAB>name)"
        echo "  entries [hours]        List raw entries from last N hours (default: 24)"
        ;;
esac
