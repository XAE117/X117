#!/usr/bin/env python3
"""
MCP (Model Context Protocol) server for the text message archive.

This exposes the contacts database as tools that Claude can call directly
during a conversation, enabling live queries without manual export.

Setup for Claude Desktop (~/Library/Application Support/Claude/claude_desktop_config.json):
{
  "mcpServers": {
    "text-archive": {
      "command": "python3",
      "args": ["/full/path/to/X117/mcp_server.py"]
    }
  }
}

Setup for Claude Code (~/.claude/settings.json or project .claude/settings.json):
{
  "mcpServers": {
    "text-archive": {
      "command": "python3",
      "args": ["/full/path/to/X117/mcp_server.py"]
    }
  }
}

Requires: pip install mcp
"""

import sqlite3
import json
import sys
from pathlib import Path

DB_PATH = Path(__file__).parent / "contacts.db"


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def handle_list_contacts(status=None, platform=None):
    """List all contacts, optionally filtered by status or platform."""
    conn = get_db()
    query = "SELECT * FROM contacts WHERE 1=1"
    params = []
    if status:
        query += " AND status = ?"
        params.append(status)
    if platform:
        query += " AND LOWER(platform) = LOWER(?)"
        params.append(platform)
    query += " ORDER BY last_contact_date DESC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def handle_get_contact(contact_id):
    """Get a contact with all their notes."""
    conn = get_db()
    contact = conn.execute("SELECT * FROM contacts WHERE id = ?", (contact_id,)).fetchone()
    if not contact:
        conn.close()
        return {"error": f"Contact {contact_id} not found"}
    result = dict(contact)
    notes = conn.execute(
        "SELECT note, created_at FROM notes WHERE contact_id = ? ORDER BY created_at ASC",
        (contact_id,)
    ).fetchall()
    result["notes"] = [dict(n) for n in notes]
    conn.close()
    return result


def handle_search(term):
    """Search contacts and notes for a term."""
    conn = get_db()
    rows = conn.execute("""
        SELECT DISTINCT c.* FROM contacts c
        LEFT JOIN notes n ON c.id = n.contact_id
        WHERE c.name LIKE ? OR c.phone LIKE ? OR n.note LIKE ?
        ORDER BY c.last_contact_date DESC
    """, (f"%{term}%", f"%{term}%", f"%{term}%")).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def handle_add_note(contact_id, note):
    """Add a note to a contact."""
    conn = get_db()
    from datetime import datetime
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    conn.execute("INSERT INTO notes (contact_id, note, created_at) VALUES (?, ?, ?)",
                 (contact_id, note, now))
    conn.commit()
    conn.close()
    return {"status": "ok", "message": f"Note added to contact {contact_id}"}


def handle_get_reminders():
    """Get contacts that haven't been reached out to in 3+ days."""
    conn = get_db()
    from datetime import datetime, timedelta
    cutoff = (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d")
    rows = conn.execute("""
        SELECT * FROM contacts
        WHERE status = 'active' AND (last_contact_date < ? OR last_contact_date IS NULL)
        ORDER BY last_contact_date ASC
    """, (cutoff,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def handle_run_query(sql):
    """Run a read-only SQL query against the database."""
    sql_stripped = sql.strip().upper()
    if not sql_stripped.startswith("SELECT"):
        return {"error": "Only SELECT queries are allowed"}
    conn = get_db()
    try:
        rows = conn.execute(sql).fetchall()
        conn.close()
        return [dict(r) for r in rows]
    except Exception as e:
        conn.close()
        return {"error": str(e)}


# MCP Protocol implementation (stdio JSON-RPC)
TOOLS = [
    {
        "name": "list_contacts",
        "description": "List all contacts in the text message archive. Optionally filter by status (active/dating/ghosted/ended) or platform (Tinder/Bumble/Hinge/etc).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "status": {"type": "string", "description": "Filter by status: active, dating, ghosted, ended"},
                "platform": {"type": "string", "description": "Filter by platform: Tinder, Bumble, Hinge, etc."}
            }
        }
    },
    {
        "name": "get_contact",
        "description": "Get detailed information about a specific contact including all their notes and message history.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "contact_id": {"type": "integer", "description": "The contact's ID number"}
            },
            "required": ["contact_id"]
        }
    },
    {
        "name": "search_archive",
        "description": "Search the text message archive for a term across contact names, phone numbers, and notes.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "term": {"type": "string", "description": "Search term"}
            },
            "required": ["term"]
        }
    },
    {
        "name": "add_note",
        "description": "Add a note or message record to a contact's history.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "contact_id": {"type": "integer", "description": "The contact's ID"},
                "note": {"type": "string", "description": "The note text to add"}
            },
            "required": ["contact_id", "note"]
        }
    },
    {
        "name": "get_reminders",
        "description": "Get contacts you haven't reached out to in 3+ days.",
        "inputSchema": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "run_query",
        "description": "Run a read-only SQL SELECT query against the contacts database.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "sql": {"type": "string", "description": "A SELECT SQL query"}
            },
            "required": ["sql"]
        }
    }
]


def process_request(request):
    method = request.get("method")
    req_id = request.get("id")
    params = request.get("params", {})

    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "serverInfo": {"name": "text-archive", "version": "1.0.0"},
                "capabilities": {"tools": {}}
            }
        }
    elif method == "notifications/initialized":
        return None  # notification, no response
    elif method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {"tools": TOOLS}
        }
    elif method == "tools/call":
        tool_name = params.get("name")
        args = params.get("arguments", {})

        try:
            if tool_name == "list_contacts":
                result = handle_list_contacts(args.get("status"), args.get("platform"))
            elif tool_name == "get_contact":
                result = handle_get_contact(args["contact_id"])
            elif tool_name == "search_archive":
                result = handle_search(args["term"])
            elif tool_name == "add_note":
                result = handle_add_note(args["contact_id"], args["note"])
            elif tool_name == "get_reminders":
                result = handle_get_reminders()
            elif tool_name == "run_query":
                result = handle_run_query(args["sql"])
            else:
                result = {"error": f"Unknown tool: {tool_name}"}

            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [{"type": "text", "text": json.dumps(result, indent=2)}]
                }
            }
        except Exception as e:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [{"type": "text", "text": json.dumps({"error": str(e)})}],
                    "isError": True
                }
            }

    return {
        "jsonrpc": "2.0",
        "id": req_id,
        "error": {"code": -32601, "message": f"Unknown method: {method}"}
    }


def main():
    """Run the MCP server over stdio."""
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        # Handle Content-Length header (MCP uses HTTP-like framing)
        if line.startswith("Content-Length:"):
            content_length = int(line.split(":")[1].strip())
            sys.stdin.readline()  # empty line
            body = sys.stdin.read(content_length)
        else:
            body = line

        try:
            request = json.loads(body)
        except json.JSONDecodeError:
            continue

        response = process_request(request)
        if response is None:
            continue

        response_str = json.dumps(response)
        sys.stdout.write(f"Content-Length: {len(response_str)}\r\n\r\n{response_str}")
        sys.stdout.flush()


if __name__ == "__main__":
    main()
