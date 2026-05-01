#!/usr/bin/env python3
"""Regenerate the LifeOS Projects Shard from the Life Projects DB.

Reads rows from the Life Projects database, splits them into Active vs.
Paused/Backburner, and rewrites the Projects Shard page with two Notion
tables plus a "Last synced" line. Stdlib only.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from datetime import date
from pathlib import Path
from urllib import error, request

LIFE_PROJECTS_DB_ID = "d54d374dbf654e52955e22138623388c"
PROJECTS_SHARD_PAGE_ID = "353c051d-73d2-8156-8dd8-c9041f0849b1"
NOTION_VERSION = "2022-06-28"
NOTION_API = "https://api.notion.com/v1"

ACTIVE_STATUSES = {"Active", "In Progress", "In progress"}
PAUSED_STATUSES = {"Paused", "Backburner", "Back burner", "On Hold", "On hold"}

COLUMNS = ["Name", "Status", "Progress", "Energy Type", "Next Action"]
NEXT_ACTION_WORD_LIMIT = 12

LOG_PATH = Path.home() / "logs" / "notion_sync.log"


def load_token() -> str:
    token = os.environ.get("NOTION_TOKEN")
    if token:
        return token.strip()
    env_file = Path.home() / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            if key.strip() == "NOTION_TOKEN":
                return value.strip().strip('"').strip("'")
    raise SystemExit("NOTION_TOKEN not set in env or ~/.env")


class Notion:
    def __init__(self, token: str, dry_run: bool = False):
        self.token = token
        self.dry_run = dry_run

    def _request(self, method: str, path: str, body: dict | None = None) -> dict:
        url = f"{NOTION_API}{path}"
        data = json.dumps(body).encode() if body is not None else None
        req = request.Request(url, data=data, method=method)
        req.add_header("Authorization", f"Bearer {self.token}")
        req.add_header("Notion-Version", NOTION_VERSION)
        req.add_header("Content-Type", "application/json")
        try:
            with request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode())
        except error.HTTPError as e:
            detail = e.read().decode(errors="replace")
            raise RuntimeError(f"{method} {path} -> {e.code}: {detail}") from e

    def query_database(self, db_id: str) -> list[dict]:
        results: list[dict] = []
        cursor: str | None = None
        while True:
            body: dict = {"page_size": 100}
            if cursor:
                body["start_cursor"] = cursor
            payload = self._request("POST", f"/databases/{db_id}/query", body)
            results.extend(payload.get("results", []))
            if not payload.get("has_more"):
                break
            cursor = payload.get("next_cursor")
        return results

    def list_block_children(self, block_id: str) -> list[dict]:
        results: list[dict] = []
        cursor: str | None = None
        while True:
            qs = "?page_size=100" + (f"&start_cursor={cursor}" if cursor else "")
            payload = self._request("GET", f"/blocks/{block_id}/children{qs}")
            results.extend(payload.get("results", []))
            if not payload.get("has_more"):
                break
            cursor = payload.get("next_cursor")
        return results

    def archive_block(self, block_id: str) -> None:
        if self.dry_run:
            return
        self._request("PATCH", f"/blocks/{block_id}", {"archived": True})

    def append_children(self, block_id: str, children: list[dict]) -> None:
        if self.dry_run:
            return
        # Notion caps appends at 100 children per call.
        for i in range(0, len(children), 100):
            chunk = children[i : i + 100]
            self._request("PATCH", f"/blocks/{block_id}/children", {"children": chunk})


def plain_text(rich: list[dict] | None) -> str:
    if not rich:
        return ""
    return "".join(part.get("plain_text", "") for part in rich)


def extract_property(props: dict, name: str) -> str:
    prop = props.get(name)
    if not prop:
        return ""
    ptype = prop.get("type")
    if ptype == "title":
        return plain_text(prop.get("title"))
    if ptype == "rich_text":
        return plain_text(prop.get("rich_text"))
    if ptype == "select":
        sel = prop.get("select")
        return sel.get("name", "") if sel else ""
    if ptype == "status":
        st = prop.get("status")
        return st.get("name", "") if st else ""
    if ptype == "multi_select":
        return ", ".join(s.get("name", "") for s in prop.get("multi_select") or [])
    if ptype == "number":
        n = prop.get("number")
        return "" if n is None else str(n)
    if ptype == "date":
        d = prop.get("date")
        return d.get("start", "") if d else ""
    if ptype == "checkbox":
        return "✓" if prop.get("checkbox") else ""
    return ""


def truncate_words(text: str, limit: int) -> str:
    words = text.split()
    if len(words) <= limit:
        return text
    return " ".join(words[:limit]) + "…"


def progress_cell(raw: str) -> str:
    if not raw:
        return ""
    try:
        n = float(raw)
    except ValueError:
        return raw
    # Notion stores percent as 0–1 or 0–100 depending on schema; normalize.
    pct = n * 100 if 0 <= n <= 1 else n
    return f"{int(round(pct))}%"


def project_row(page: dict) -> dict:
    props = page.get("properties", {})
    name = extract_property(props, "Name")
    status = extract_property(props, "Status")
    progress = progress_cell(extract_property(props, "Progress (%)") or extract_property(props, "Progress"))
    energy = extract_property(props, "Energy Type")
    next_action = truncate_words(extract_property(props, "Next Action"), NEXT_ACTION_WORD_LIMIT)
    return {
        "Name": name,
        "Status": status,
        "Progress": progress,
        "Energy Type": energy,
        "Next Action": next_action,
    }


def rich(text: str) -> list[dict]:
    return [{"type": "text", "text": {"content": text}}] if text else []


def table_block(headers: list[str], rows: list[list[str]]) -> dict:
    body = [{"type": "table_row", "table_row": {"cells": [rich(h) for h in headers]}}]
    for row in rows:
        body.append({"type": "table_row", "table_row": {"cells": [rich(cell) for cell in row]}})
    return {
        "type": "table",
        "table": {
            "table_width": len(headers),
            "has_column_header": True,
            "has_row_header": False,
            "children": body,
        },
    }


def heading_block(text: str, level: int = 2) -> dict:
    key = f"heading_{level}"
    return {"type": key, key: {"rich_text": rich(text)}}


def paragraph_block(text: str) -> dict:
    return {"type": "paragraph", "paragraph": {"rich_text": rich(text)}}


def build_blocks(active: list[dict], paused: list[dict]) -> list[dict]:
    today = date.today().isoformat()
    blocks: list[dict] = [
        paragraph_block(f"Last synced: {today}"),
        heading_block(f"Active Projects ({len(active)})"),
    ]
    if active:
        blocks.append(table_block(COLUMNS, [[r[c] for c in COLUMNS] for r in active]))
    else:
        blocks.append(paragraph_block("No active projects."))
    blocks.append(heading_block(f"Paused / Backburner ({len(paused)})"))
    if paused:
        blocks.append(table_block(COLUMNS, [[r[c] for c in COLUMNS] for r in paused]))
    else:
        blocks.append(paragraph_block("No paused projects."))
    return blocks


def configure_logging(verbose: bool) -> None:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    handlers: list[logging.Handler] = [logging.FileHandler(LOG_PATH)]
    if verbose or sys.stdout.isatty():
        handlers.append(logging.StreamHandler(sys.stdout))
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        handlers=handlers,
        force=True,
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Regenerate the LifeOS Projects Shard.")
    parser.add_argument("--dry-run", action="store_true", help="Fetch and render, but do not write to Notion.")
    parser.add_argument("--verbose", action="store_true", help="Also log to stdout.")
    args = parser.parse_args(argv)

    configure_logging(args.verbose)
    log = logging.getLogger("notion_shard_sync")
    log.info("starting sync (dry_run=%s)", args.dry_run)

    try:
        token = load_token()
        notion = Notion(token, dry_run=args.dry_run)

        pages = notion.query_database(LIFE_PROJECTS_DB_ID)
        log.info("fetched %d projects", len(pages))

        active: list[dict] = []
        paused: list[dict] = []
        for page in pages:
            row = project_row(page)
            if row["Status"] in ACTIVE_STATUSES:
                active.append(row)
            elif row["Status"] in PAUSED_STATUSES:
                paused.append(row)
        active.sort(key=lambda r: r["Name"].lower())
        paused.sort(key=lambda r: r["Name"].lower())
        log.info("classified: %d active, %d paused", len(active), len(paused))

        existing = notion.list_block_children(PROJECTS_SHARD_PAGE_ID)
        log.info("archiving %d existing blocks", len(existing))
        for block in existing:
            notion.archive_block(block["id"])

        blocks = build_blocks(active, paused)
        notion.append_children(PROJECTS_SHARD_PAGE_ID, blocks)
        log.info("appended %d new blocks (dry_run=%s)", len(blocks), args.dry_run)
        log.info("sync complete")
        return 0
    except Exception as exc:
        log.exception("sync failed: %s", exc)
        return 1


if __name__ == "__main__":
    sys.exit(main())
