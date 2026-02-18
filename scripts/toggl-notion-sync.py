#!/usr/bin/env python3
"""
toggl-notion-sync.py — Sync Toggl time entries into a Notion Time Log database.

Usage:
    python3 toggl-notion-sync.py                 # Sync (incremental from last run)
    python3 toggl-notion-sync.py --show-schema   # Print Notion DB schema and exit
    python3 toggl-notion-sync.py --hours 48      # Sync last N hours (overrides state)
    python3 toggl-notion-sync.py --full          # Full resync (ignore last_synced_at)
    python3 toggl-notion-sync.py --dry-run       # Show what would be pushed, no writes

Credentials are read from .env in the repo root (TOGGL_API_TOKEN, NOTION_TOKEN,
NOTION_DATABASE_ID).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FIRST RUN SETUP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Copy .env.example → .env and fill in your tokens
2. Run with --show-schema to see your Notion database fields
3. Adjust FIELD_MAP below to match your actual property names
4. Run --dry-run to verify the mapping looks correct
5. Run normally (or let cron handle it)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADJUSTING THE MAPPING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Edit FIELD_MAP to match your Notion property names (run --show-schema to see them).
Edit PROJECT_CATEGORY_MAP to translate Toggl project names to Notion select values.
If you add new Toggl projects, just add a row to PROJECT_CATEGORY_MAP.
Set any FIELD_MAP value to None to skip that field.
"""

import argparse
import base64
import json
import logging
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path

# ─── Paths ────────────────────────────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).parent.resolve()
REPO_ROOT = SCRIPT_DIR.parent
LOGS_DIR = REPO_ROOT / "logs"
DATA_DIR = REPO_ROOT / "data"
STATE_FILE = DATA_DIR / "sync_state.json"
LOG_FILE = LOGS_DIR / "toggl-sync.log"

# ─── Load .env ────────────────────────────────────────────────────────────────

def load_env():
    env_path = REPO_ROOT / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        val = val.strip().strip("\"'")
        os.environ.setdefault(key, val)

load_env()

TOGGL_API_TOKEN  = os.environ.get("TOGGL_API_TOKEN", "")
NOTION_TOKEN     = os.environ.get("NOTION_TOKEN", "")
NOTION_DB_ID     = os.environ.get("NOTION_DATABASE_ID", "96e32d57-2333-4910-ba0c-6ff331cba6bc")

# ─── Field Mapping ────────────────────────────────────────────────────────────
# Run --show-schema to see your Notion database's actual property names/types,
# then update these strings to match exactly (case-sensitive).

FIELD_MAP = {
    # REQUIRED — the page title property (type must be "title")
    "title":    "Name",

    # Date range covering start→stop of the entry (type: "date")
    "date":     "Date",

    # Duration in minutes (type: "number")
    "duration": "Duration",

    # Toggl project name as a select value (type: "select")
    "project":  "Project",

    # Toggl tags as multi-select values (type: "multi_select")
    "tags":     "Tags",

    # Toggl entry ID stored as text — used for deduplication (type: "rich_text")
    # If your database uses a different field for this, change the name.
    # If you don't have this field yet, add a "Toggl ID" rich_text property in Notion.
    "toggl_id": "Toggl ID",

    # Optional: a plain-text notes/description field (type: "rich_text").
    # Set to None to skip.
    "notes": None,
}

# Map Toggl project name → Notion select option value.
# If a project isn't listed here, the project name is used as-is.
# Add entries here when your Toggl project names differ from Notion select options.
#
# Example:
#   PROJECT_CATEGORY_MAP = {
#       "Client Work": "Work",
#       "Side Project": "Personal",
#       "Admin": "Admin",
#   }
PROJECT_CATEGORY_MAP: dict[str, str] = {}

# ─── Logging setup ────────────────────────────────────────────────────────────

def setup_logging(verbose: bool = False) -> logging.Logger:
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger("toggl-sync")
    logger.setLevel(logging.DEBUG if verbose else logging.INFO)

    fmt = logging.Formatter("%(asctime)s  %(levelname)-7s  %(message)s",
                             datefmt="%Y-%m-%d %H:%M:%S")

    # File handler — always full detail
    fh = logging.FileHandler(LOG_FILE)
    fh.setLevel(logging.DEBUG)
    fh.setFormatter(fmt)
    logger.addHandler(fh)

    # Console handler
    ch = logging.StreamHandler(sys.stdout)
    ch.setLevel(logging.DEBUG if verbose else logging.INFO)
    ch.setFormatter(fmt)
    logger.addHandler(ch)

    return logger

# ─── State (last_synced_at + seen Toggl IDs) ──────────────────────────────────

def load_state() -> dict:
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text())
        except Exception:
            pass
    return {"last_synced_at": None, "synced_toggl_ids": []}

def save_state(state: dict):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, indent=2))

# ─── Toggl API ────────────────────────────────────────────────────────────────

TOGGL_BASE = "https://api.track.toggl.com/api/v9"

def _toggl_auth_header() -> str:
    credentials = f"{TOGGL_API_TOKEN}:api_token"
    return "Basic " + base64.b64encode(credentials.encode()).decode()

def toggl_get(path: str, params: dict | None = None) -> object:
    url = TOGGL_BASE + path
    if params:
        url += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={
        "Authorization": _toggl_auth_header(),
        "Content-Type": "application/json",
    })
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        raise RuntimeError(f"Toggl GET {path} → HTTP {e.code}: {error_body}") from e

def toggl_workspace_id() -> int:
    me = toggl_get("/me")
    return me["default_workspace_id"]

def toggl_fetch_entries(since: datetime, wid: int | None = None) -> list[dict]:
    """
    Fetch all completed time entries since `since`.
    Handles Toggl v9 pagination by batching in 90-day windows if needed
    (Toggl v9 caps the date range at 3 months per call).
    """
    if wid is None:
        wid = toggl_workspace_id()

    now = datetime.now(timezone.utc)
    entries: list[dict] = []
    window_start = since
    MAX_WINDOW = timedelta(days=90)

    while window_start < now:
        window_end = min(window_start + MAX_WINDOW, now)
        batch = toggl_get("/me/time_entries", {
            "start_date": window_start.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "end_date":   window_end.strftime("%Y-%m-%dT%H:%M:%SZ"),
        })
        if batch:
            entries.extend(batch)
        window_start = window_end

    # Only completed entries: duration >= 0 and stop is set
    return [e for e in entries if e.get("duration", -1) >= 0 and e.get("stop")]

def toggl_project_map(wid: int) -> dict[int, str]:
    """Return {project_id: project_name} for the workspace."""
    try:
        projects = toggl_get(f"/workspaces/{wid}/projects", {"active": "true"})
        return {p["id"]: p["name"] for p in (projects or [])}
    except Exception:
        return {}

# ─── Notion API ───────────────────────────────────────────────────────────────

NOTION_BASE    = "https://api.notion.com/v1"
NOTION_VERSION = "2022-06-28"

def _notion_headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {NOTION_TOKEN}",
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
    }

def notion_request(method: str, path: str, body: dict | None = None) -> dict:
    url = NOTION_BASE + path
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=_notion_headers(), method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        raise RuntimeError(f"Notion {method} {path} → HTTP {e.code}: {error_body}") from e

def notion_get_schema() -> dict:
    return notion_request("GET", f"/databases/{NOTION_DB_ID}")

def notion_query_toggl_ids() -> set[str]:
    """
    Query the Notion database for all existing Toggl ID values.
    Used for deduplication. Handles pagination.
    """
    if not FIELD_MAP.get("toggl_id"):
        return set()

    toggl_id_field = FIELD_MAP["toggl_id"]
    seen: set[str] = set()
    cursor = None

    while True:
        body: dict = {
            "page_size": 100,
            "filter": {
                "property": toggl_id_field,
                "rich_text": {"is_not_empty": True},
            },
        }
        if cursor:
            body["start_cursor"] = cursor

        result = notion_request("POST", f"/databases/{NOTION_DB_ID}/query", body)

        for page in result.get("results", []):
            props = page.get("properties", {})
            prop = props.get(toggl_id_field, {})
            rt = prop.get("rich_text", [])
            if rt:
                seen.add(rt[0]["plain_text"])

        if not result.get("has_more"):
            break
        cursor = result.get("next_cursor")

    return seen

def notion_create_page(properties: dict) -> dict:
    return notion_request("POST", "/pages", {
        "parent": {"database_id": NOTION_DB_ID},
        "properties": properties,
    })

# ─── Entry → Notion properties ────────────────────────────────────────────────

def build_notion_properties(entry: dict, project_name: str | None) -> dict:
    """
    Convert a Toggl time entry dict into Notion page properties.
    Only includes fields whose FIELD_MAP key is not None.
    """
    props: dict = {}

    # Title
    title_field = FIELD_MAP.get("title")
    if title_field:
        description = entry.get("description") or "(no description)"
        props[title_field] = {
            "title": [{"text": {"content": description}}]
        }

    # Date range (start → stop)
    date_field = FIELD_MAP.get("date")
    if date_field and entry.get("start") and entry.get("stop"):
        props[date_field] = {
            "date": {
                "start": entry["start"],
                "end":   entry["stop"],
            }
        }

    # Duration in minutes
    dur_field = FIELD_MAP.get("duration")
    if dur_field and entry.get("duration") is not None:
        minutes = round(entry["duration"] / 60, 2)
        props[dur_field] = {"number": minutes}

    # Project → select
    proj_field = FIELD_MAP.get("project")
    if proj_field and project_name:
        notion_val = PROJECT_CATEGORY_MAP.get(project_name, project_name)
        props[proj_field] = {"select": {"name": notion_val}}

    # Tags → multi-select
    tags_field = FIELD_MAP.get("tags")
    if tags_field:
        tags = entry.get("tags") or []
        if tags:
            props[tags_field] = {
                "multi_select": [{"name": t} for t in tags]
            }

    # Toggl ID (for deduplication)
    tid_field = FIELD_MAP.get("toggl_id")
    if tid_field:
        props[tid_field] = {
            "rich_text": [{"text": {"content": str(entry["id"])}}]
        }

    # Optional notes field
    notes_field = FIELD_MAP.get("notes")
    if notes_field and entry.get("description"):
        props[notes_field] = {
            "rich_text": [{"text": {"content": entry["description"]}}]
        }

    return props

# ─── Schema display ───────────────────────────────────────────────────────────

def cmd_show_schema(logger: logging.Logger):
    """Fetch the Notion database schema and print it in a human-readable format."""
    logger.info("Fetching Notion database schema for ID: %s", NOTION_DB_ID)

    db = notion_get_schema()
    title = ""
    if db.get("title"):
        title = db["title"][0]["plain_text"] if db["title"] else "(untitled)"
    print(f"\nDatabase: {title}")
    print(f"ID:       {NOTION_DB_ID}")
    print(f"\n{'Property Name':<30} {'Type':<20} Notes")
    print("-" * 75)

    for name, prop in db.get("properties", {}).items():
        ptype = prop.get("type", "?")
        notes = ""
        if ptype == "select":
            opts = [o["name"] for o in prop.get("select", {}).get("options", [])]
            notes = "options: " + ", ".join(opts[:8])
            if len(opts) > 8:
                notes += f" (+{len(opts)-8} more)"
        elif ptype == "multi_select":
            opts = [o["name"] for o in prop.get("multi_select", {}).get("options", [])]
            notes = "options: " + ", ".join(opts[:8])
        elif ptype == "formula":
            notes = prop.get("formula", {}).get("expression", "")[:50]
        elif ptype == "relation":
            notes = "→ " + prop.get("relation", {}).get("database_id", "?")[:20]
        print(f"  {name:<28} {ptype:<20} {notes}")

    print("\n" + "=" * 75)
    print("NEXT STEP: Update FIELD_MAP in scripts/toggl-notion-sync.py")
    print("to match your actual property names above (case-sensitive).")
    print("Then run: python3 scripts/toggl-notion-sync.py --dry-run")
    print("=" * 75 + "\n")

# ─── Main sync ────────────────────────────────────────────────────────────────

def cmd_sync(args, logger: logging.Logger):
    state = load_state()
    run_ts = datetime.now(timezone.utc)

    # Determine fetch window
    if args.full:
        since = run_ts - timedelta(days=365)
        logger.info("Full resync mode — fetching up to 1 year of entries")
    elif args.hours:
        since = run_ts - timedelta(hours=args.hours)
        logger.info("Fetching last %d hours of entries", args.hours)
    elif state["last_synced_at"]:
        since = datetime.fromisoformat(state["last_synced_at"])
        logger.info("Incremental sync from last run: %s", state["last_synced_at"])
    else:
        since = run_ts - timedelta(hours=24)
        logger.info("No prior state — fetching last 24 hours")

    # Fetch Toggl data
    logger.info("Fetching Toggl entries since %s …", since.strftime("%Y-%m-%d %H:%M UTC"))
    wid = toggl_workspace_id()
    entries = toggl_fetch_entries(since, wid)
    logger.info("Found %d completed Toggl entries", len(entries))

    if not entries:
        logger.info("Nothing to sync.")
        _log_run_summary(run_ts, pushed=0, skipped=0, errors=0, logger=logger)
        state["last_synced_at"] = run_ts.isoformat()
        save_state(state)
        return

    # Fetch project names
    projects = toggl_project_map(wid)

    # Fetch existing Toggl IDs from Notion (deduplication)
    logger.info("Checking Notion for already-synced entry IDs …")
    already_synced = notion_query_toggl_ids()
    # Also use local state as a fast-path cache
    already_synced.update(str(tid) for tid in state.get("synced_toggl_ids", []))
    logger.info("  %d entries already in Notion", len(already_synced))

    pushed = 0
    skipped = 0
    errors = 0
    new_synced_ids: list[str] = []

    for entry in entries:
        entry_id = str(entry["id"])

        if entry_id in already_synced:
            skipped += 1
            logger.debug("Skip (already synced): Toggl ID %s — %s",
                         entry_id, entry.get("description", "(no description)"))
            continue

        project_name = projects.get(entry.get("project_id"), None)
        props = build_notion_properties(entry, project_name)

        desc = entry.get("description") or "(no description)"
        dur_min = round(entry.get("duration", 0) / 60, 1)

        if args.dry_run:
            logger.info("[DRY-RUN] Would push: %s  (%s min, project=%s)",
                        desc, dur_min, project_name or "none")
            pushed += 1
            continue

        try:
            notion_create_page(props)
            pushed += 1
            new_synced_ids.append(entry_id)
            logger.info("Pushed: %s  (%s min, project=%s, toggl_id=%s)",
                        desc, dur_min, project_name or "none", entry_id)
        except Exception as exc:
            errors += 1
            logger.error("FAILED to push Toggl ID %s (%s): %s", entry_id, desc, exc)
            # Continue — don't abort on a single failure

    _log_run_summary(run_ts, pushed=pushed, skipped=skipped, errors=errors, logger=logger)

    if not args.dry_run:
        # Persist state
        state["last_synced_at"] = run_ts.isoformat()
        existing_ids = set(str(x) for x in state.get("synced_toggl_ids", []))
        existing_ids.update(new_synced_ids)
        state["synced_toggl_ids"] = list(existing_ids)
        save_state(state)

def _log_run_summary(run_ts, pushed, skipped, errors, logger):
    logger.info(
        "Run complete at %s — pushed: %d, skipped: %d, errors: %d",
        run_ts.strftime("%Y-%m-%d %H:%M UTC"), pushed, skipped, errors,
    )
    if errors:
        logger.warning("%d entries failed to push — check log for details.", errors)

# ─── Cron installer ───────────────────────────────────────────────────────────

def cmd_install_cron(logger: logging.Logger):
    """
    Install a daily 2:00 AM cron job.
    Tries the user crontab first; falls back to /etc/cron.d/ (requires root).
    """
    import subprocess
    import shutil

    script_path = Path(__file__).resolve()
    python_bin = sys.executable
    log_path = LOG_FILE.resolve()

    # Ensure log directory exists so cron can write to it
    LOGS_DIR.mkdir(parents=True, exist_ok=True)

    # ── Option 1: user crontab ────────────────────────────────────────────────
    if shutil.which("crontab"):
        cron_line = (
            f"0 2 * * * {python_bin} {script_path} "
            f">> {log_path} 2>&1"
        )
        result = subprocess.run(["crontab", "-l"], capture_output=True, text=True)
        existing = result.stdout if result.returncode == 0 else ""

        if cron_line in existing:
            logger.info("Cron job already installed (user crontab).")
            print(f"\nExisting cron entry:\n  {cron_line}\n")
            return

        new_crontab = existing.rstrip("\n") + "\n" + cron_line + "\n"
        proc = subprocess.run(
            ["crontab", "-"], input=new_crontab, text=True, capture_output=True
        )
        if proc.returncode == 0:
            logger.info("Cron job installed via crontab: %s", cron_line)
            print(f"\nInstalled cron job:\n  {cron_line}\n")
            verify = subprocess.run(["crontab", "-l"], capture_output=True, text=True)
            if cron_line in verify.stdout:
                print("Verified — entry is active in crontab.")
            return
        logger.warning("crontab write failed (%s), trying /etc/cron.d/ …", proc.stderr)

    # ── Option 2: /etc/cron.d/ (system-wide, requires root) ──────────────────
    cron_d_file = Path("/etc/cron.d/toggl-notion-sync")
    user = os.environ.get("USER", "root")
    cron_content = (
        "# Toggl → Notion daily sync (installed by toggl-notion-sync.py)\n"
        f"0 2 * * * {user} {python_bin} {script_path} >> {log_path} 2>&1\n"
    )

    if cron_d_file.exists() and cron_d_file.read_text() == cron_content:
        logger.info("Cron job already installed at %s", cron_d_file)
        print(f"\nExisting entry at {cron_d_file}:\n  {cron_content.strip()}\n")
        return

    try:
        cron_d_file.write_text(cron_content)
        cron_d_file.chmod(0o644)
        logger.info("Cron job installed at %s", cron_d_file)
        print(f"\nInstalled cron job at {cron_d_file}:")
        print(f"  {cron_content.strip()}\n")
        print("Verified — file written successfully.")
    except PermissionError:
        logger.error(
            "Cannot write to /etc/cron.d/ — run as root or install manually:\n  %s",
            cron_content.strip(),
        )
        sys.exit(1)

# ─── Entry point ──────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Sync Toggl time entries to Notion Time Log database.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--show-schema",  action="store_true",
                        help="Print the Notion database schema and exit")
    parser.add_argument("--install-cron", action="store_true",
                        help="Install a daily 2 AM cron job and exit")
    parser.add_argument("--hours",   type=int, default=0,
                        help="Sync last N hours (overrides state)")
    parser.add_argument("--full",    action="store_true",
                        help="Full resync — ignore last_synced_at state")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would be pushed without writing to Notion")
    parser.add_argument("--verbose", "-v", action="store_true",
                        help="Enable debug logging")
    args = parser.parse_args()

    logger = setup_logging(verbose=args.verbose)

    if args.install_cron:
        cmd_install_cron(logger)
        return

    # Validate credentials (not needed for --install-cron)
    missing = []
    if not TOGGL_API_TOKEN:
        missing.append("TOGGL_API_TOKEN")
    if not NOTION_TOKEN:
        missing.append("NOTION_TOKEN")
    if missing:
        logger.error("Missing credentials: %s", ", ".join(missing))
        logger.error("Copy .env.example → .env and fill in your tokens.")
        sys.exit(1)

    try:
        if args.show_schema:
            cmd_show_schema(logger)
            return
        cmd_sync(args, logger)
    except RuntimeError as exc:
        logger.error("%s", exc)
        sys.exit(1)
    except KeyboardInterrupt:
        logger.info("Interrupted.")
        sys.exit(0)

if __name__ == "__main__":
    main()
