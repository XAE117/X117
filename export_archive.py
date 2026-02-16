#!/usr/bin/env python3
"""
Export the contact/message archive to formats suitable for uploading to Claude.ai.

Usage:
    python3 export_archive.py              # Export as readable text (default)
    python3 export_archive.py --json       # Export as JSON
    python3 export_archive.py --markdown   # Export as Markdown
    python3 export_archive.py -o FILE      # Write to file instead of stdout
"""

import sqlite3
import json
import sys
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).parent / "contacts.db"


def get_all_data():
    """Fetch all contacts and their notes from the database."""
    if not DB_PATH.exists():
        print("Error: contacts.db not found. Run dating_tracker.py first to create it.", file=sys.stderr)
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM contacts ORDER BY last_contact_date DESC")
    contacts = [dict(row) for row in cursor.fetchall()]

    for contact in contacts:
        cursor.execute(
            "SELECT note, created_at FROM notes WHERE contact_id = ? ORDER BY created_at ASC",
            (contact["id"],)
        )
        contact["notes"] = [dict(row) for row in cursor.fetchall()]

    conn.close()
    return contacts


def export_json(contacts):
    """Export as JSON."""
    output = {
        "exported_at": datetime.now().isoformat(),
        "total_contacts": len(contacts),
        "contacts": contacts
    }
    return json.dumps(output, indent=2)


def export_text(contacts):
    """Export as readable plain text."""
    lines = []
    lines.append("=" * 60)
    lines.append("TEXT MESSAGE ARCHIVE EXPORT")
    lines.append(f"Exported: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    lines.append(f"Total contacts: {len(contacts)}")
    lines.append("=" * 60)

    for contact in contacts:
        lines.append("")
        lines.append("-" * 40)
        lines.append(f"Name: {contact['name']}")
        lines.append(f"Platform: {contact['platform'] or 'N/A'}")
        lines.append(f"Phone: {contact['phone'] or 'N/A'}")
        lines.append(f"Status: {contact['status']}")
        lines.append(f"First contact: {contact['first_contact_date']}")
        lines.append(f"Last contact: {contact['last_contact_date'] or 'N/A'}")

        if contact["notes"]:
            lines.append(f"Notes ({len(contact['notes'])}):")
            for note in contact["notes"]:
                lines.append(f"  [{note['created_at']}] {note['note']}")
        lines.append("-" * 40)

    return "\n".join(lines)


def export_markdown(contacts):
    """Export as Markdown suitable for Claude.ai Projects."""
    lines = []
    lines.append("# Text Message Archive")
    lines.append(f"*Exported: {datetime.now().strftime('%Y-%m-%d %H:%M')}*")
    lines.append(f"*Total contacts: {len(contacts)}*")
    lines.append("")

    for contact in contacts:
        lines.append(f"## {contact['name']}")
        lines.append(f"- **Platform:** {contact['platform'] or 'N/A'}")
        lines.append(f"- **Phone:** {contact['phone'] or 'N/A'}")
        lines.append(f"- **Status:** {contact['status']}")
        lines.append(f"- **First contact:** {contact['first_contact_date']}")
        lines.append(f"- **Last contact:** {contact['last_contact_date'] or 'N/A'}")

        if contact["notes"]:
            lines.append("")
            lines.append("### Notes")
            for note in contact["notes"]:
                lines.append(f"- **{note['created_at']}:** {note['note']}")

        lines.append("")

    return "\n".join(lines)


def main():
    args = sys.argv[1:]
    output_file = None

    # Parse -o flag
    if "-o" in args:
        idx = args.index("-o")
        if idx + 1 < len(args):
            output_file = args[idx + 1]
            args = [a for i, a in enumerate(args) if i != idx and i != idx + 1]

    contacts = get_all_data()

    if "--json" in args:
        result = export_json(contacts)
    elif "--markdown" in args:
        result = export_markdown(contacts)
    else:
        result = export_text(contacts)

    if output_file:
        Path(output_file).write_text(result)
        print(f"Exported {len(contacts)} contacts to {output_file}", file=sys.stderr)
    else:
        print(result)


if __name__ == "__main__":
    main()
