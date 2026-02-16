# Dating Contact Tracker - Text Message Archive

## Project Overview
This is a personal text message / dating contact archive stored in a SQLite database (`contacts.db`).
The CLI tool `dating_tracker.py` manages the data interactively.

## Database Access
The database is at `contacts.db` in the project root. Query it directly with Python:

```python
import sqlite3
conn = sqlite3.connect("contacts.db")
conn.row_factory = sqlite3.Row
cursor = conn.cursor()
```

## Database Schema

**contacts** table:
- `id` INTEGER PRIMARY KEY
- `name` TEXT (contact's name)
- `platform` TEXT (Tinder, Bumble, Hinge, etc.)
- `phone` TEXT
- `first_contact_date` TEXT (YYYY-MM-DD)
- `last_contact_date` TEXT (YYYY-MM-DD)
- `status` TEXT (active, dating, ghosted, ended)
- `created_at` TEXT (ISO timestamp)
- `updated_at` TEXT (ISO timestamp)

**notes** table:
- `id` INTEGER PRIMARY KEY
- `contact_id` INTEGER (FK -> contacts.id, CASCADE delete)
- `note` TEXT (free-text notes, conversation summaries, message content)
- `created_at` TEXT (ISO timestamp)

## Common Queries

List all contacts:
```sql
SELECT * FROM contacts ORDER BY last_contact_date DESC;
```

Get a contact with their notes:
```sql
SELECT c.*, n.note, n.created_at as note_date
FROM contacts c LEFT JOIN notes n ON c.id = n.contact_id
WHERE c.id = ?
ORDER BY n.created_at DESC;
```

Search across everything:
```sql
SELECT DISTINCT c.* FROM contacts c
LEFT JOIN notes n ON c.id = n.contact_id
WHERE c.name LIKE '%term%' OR n.note LIKE '%term%';
```

## Tools

- `python3 dating_tracker.py` - Interactive CLI for managing contacts
- `python3 export_archive.py` - Export all data to JSON/text for sharing with Claude.ai
- `python3 mcp_server.py` - MCP server for live Claude access to the database

## Instructions for Claude
When the user asks about their contacts, messages, or archive:
1. Query `contacts.db` directly using Python/sqlite3
2. Present results in a readable format
3. You can run any SELECT query - the database is read-safe
4. To modify data, use the functions in `dating_tracker.py` or direct SQL
