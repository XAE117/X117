#!/usr/bin/env python3
"""
Dating Contact Tracker - A CLI tool to track your dating contacts.
"""

import sqlite3
import os
from datetime import datetime, timedelta
from pathlib import Path

# Database file location
DB_PATH = Path(__file__).parent / "contacts.db"


def get_db_connection():
    """Create and return a database connection."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize the database with required tables."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            platform TEXT,
            phone TEXT,
            first_contact_date TEXT NOT NULL,
            last_contact_date TEXT,
            status TEXT DEFAULT 'active',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contact_id INTEGER NOT NULL,
            note TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE CASCADE
        )
    ''')

    conn.commit()
    conn.close()


def format_duration(start_date_str):
    """Calculate and format the duration since first contact."""
    start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
    now = datetime.now()
    delta = now - start_date

    days = delta.days
    if days == 0:
        return "Today"
    elif days == 1:
        return "1 day"
    elif days < 7:
        return f"{days} days"
    elif days < 30:
        weeks = days // 7
        return f"{weeks} week{'s' if weeks > 1 else ''}"
    elif days < 365:
        months = days // 30
        return f"{months} month{'s' if months > 1 else ''}"
    else:
        years = days // 365
        months = (days % 365) // 30
        if months > 0:
            return f"{years} year{'s' if years > 1 else ''}, {months} month{'s' if months > 1 else ''}"
        return f"{years} year{'s' if years > 1 else ''}"


def format_last_contact(last_date_str):
    """Format the last contact date with a human-readable description."""
    if not last_date_str:
        return "Never"

    last_date = datetime.strptime(last_date_str, "%Y-%m-%d")
    now = datetime.now()
    delta = now - last_date

    days = delta.days
    if days == 0:
        return "Today"
    elif days == 1:
        return "Yesterday"
    elif days < 7:
        return f"{days} days ago"
    elif days < 30:
        weeks = days // 7
        return f"{weeks} week{'s' if weeks > 1 else ''} ago"
    else:
        return f"{last_date_str} ({days} days ago)"


def add_contact(name, platform=None, phone=None, first_contact_date=None, status="active"):
    """Add a new contact to the database."""
    conn = get_db_connection()
    cursor = conn.cursor()

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    if not first_contact_date:
        first_contact_date = datetime.now().strftime("%Y-%m-%d")

    cursor.execute('''
        INSERT INTO contacts (name, platform, phone, first_contact_date, last_contact_date, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (name, platform, phone, first_contact_date, first_contact_date, status, now, now))

    contact_id = cursor.lastrowid
    conn.commit()
    conn.close()

    print(f"\n✓ Added contact: {name} (ID: {contact_id})")
    return contact_id


def list_contacts(status_filter=None, platform_filter=None):
    """List all contacts with optional filtering."""
    conn = get_db_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM contacts WHERE 1=1"
    params = []

    if status_filter:
        query += " AND status = ?"
        params.append(status_filter)

    if platform_filter:
        query += " AND platform = ?"
        params.append(platform_filter)

    query += " ORDER BY last_contact_date DESC"

    cursor.execute(query, params)
    contacts = cursor.fetchall()
    conn.close()

    if not contacts:
        print("\nNo contacts found.")
        return

    print("\n" + "=" * 80)
    print(f"{'ID':<4} {'Name':<20} {'Platform':<12} {'Talking For':<15} {'Last Contact':<15} {'Status':<10}")
    print("=" * 80)

    for contact in contacts:
        duration = format_duration(contact['first_contact_date'])
        last_contact = format_last_contact(contact['last_contact_date'])
        platform = contact['platform'] or '-'

        print(f"{contact['id']:<4} {contact['name']:<20} {platform:<12} {duration:<15} {last_contact:<15} {contact['status']:<10}")

    print("=" * 80)
    print(f"Total: {len(contacts)} contact(s)")


def view_contact(contact_id):
    """View detailed information about a specific contact."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM contacts WHERE id = ?", (contact_id,))
    contact = cursor.fetchone()

    if not contact:
        print(f"\nContact with ID {contact_id} not found.")
        conn.close()
        return

    cursor.execute("SELECT * FROM notes WHERE contact_id = ? ORDER BY created_at DESC", (contact_id,))
    notes = cursor.fetchall()
    conn.close()

    duration = format_duration(contact['first_contact_date'])
    last_contact = format_last_contact(contact['last_contact_date'])

    print("\n" + "=" * 60)
    print(f"  CONTACT DETAILS - ID: {contact['id']}")
    print("=" * 60)
    print(f"  Name:              {contact['name']}")
    print(f"  Platform:          {contact['platform'] or 'Not specified'}")
    print(f"  Phone:             {contact['phone'] or 'Not specified'}")
    print(f"  Status:            {contact['status']}")
    print("-" * 60)
    print(f"  First Contact:     {contact['first_contact_date']}")
    print(f"  Talking For:       {duration}")
    print(f"  Last Contact:      {last_contact}")
    print("=" * 60)

    if notes:
        print("\n  NOTES:")
        print("-" * 60)
        for note in notes:
            print(f"  [{note['created_at']}]")
            print(f"  {note['note']}")
            print()
    else:
        print("\n  No notes yet. Use 'note' command to add notes.")

    print("=" * 60)


def update_contact(contact_id, **kwargs):
    """Update contact information."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Check if contact exists
    cursor.execute("SELECT * FROM contacts WHERE id = ?", (contact_id,))
    if not cursor.fetchone():
        print(f"\nContact with ID {contact_id} not found.")
        conn.close()
        return

    updates = []
    params = []

    for field, value in kwargs.items():
        if value is not None:
            updates.append(f"{field} = ?")
            params.append(value)

    if not updates:
        print("\nNo updates provided.")
        conn.close()
        return

    updates.append("updated_at = ?")
    params.append(datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    params.append(contact_id)

    query = f"UPDATE contacts SET {', '.join(updates)} WHERE id = ?"
    cursor.execute(query, params)
    conn.commit()
    conn.close()

    print(f"\n✓ Contact {contact_id} updated successfully.")


def add_note(contact_id, note_text):
    """Add a note to a contact."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Check if contact exists
    cursor.execute("SELECT name FROM contacts WHERE id = ?", (contact_id,))
    contact = cursor.fetchone()
    if not contact:
        print(f"\nContact with ID {contact_id} not found.")
        conn.close()
        return

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute('''
        INSERT INTO notes (contact_id, note, created_at)
        VALUES (?, ?, ?)
    ''', (contact_id, note_text, now))

    conn.commit()
    conn.close()

    print(f"\n✓ Note added to {contact['name']}.")


def mark_contacted(contact_id, date=None):
    """Update the last contacted date for a contact."""
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")

    update_contact(contact_id, last_contact_date=date)
    print(f"  Last contact date set to: {date}")


def delete_contact(contact_id):
    """Delete a contact from the database."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT name FROM contacts WHERE id = ?", (contact_id,))
    contact = cursor.fetchone()

    if not contact:
        print(f"\nContact with ID {contact_id} not found.")
        conn.close()
        return

    cursor.execute("DELETE FROM notes WHERE contact_id = ?", (contact_id,))
    cursor.execute("DELETE FROM contacts WHERE id = ?", (contact_id,))
    conn.commit()
    conn.close()

    print(f"\n✓ Deleted contact: {contact['name']}")


def search_contacts(search_term):
    """Search contacts by name or notes."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT DISTINCT c.* FROM contacts c
        LEFT JOIN notes n ON c.id = n.contact_id
        WHERE c.name LIKE ? OR n.note LIKE ?
        ORDER BY c.last_contact_date DESC
    ''', (f"%{search_term}%", f"%{search_term}%"))

    contacts = cursor.fetchall()
    conn.close()

    if not contacts:
        print(f"\nNo contacts found matching '{search_term}'.")
        return

    print(f"\nSearch results for '{search_term}':")
    print("=" * 80)
    print(f"{'ID':<4} {'Name':<20} {'Platform':<12} {'Talking For':<15} {'Last Contact':<15} {'Status':<10}")
    print("=" * 80)

    for contact in contacts:
        duration = format_duration(contact['first_contact_date'])
        last_contact = format_last_contact(contact['last_contact_date'])
        platform = contact['platform'] or '-'

        print(f"{contact['id']:<4} {contact['name']:<20} {platform:<12} {duration:<15} {last_contact:<15} {contact['status']:<10}")

    print("=" * 80)


def show_reminders():
    """Show contacts that haven't been contacted recently."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Get contacts not contacted in the last 3 days
    three_days_ago = (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d")

    cursor.execute('''
        SELECT * FROM contacts
        WHERE status = 'active' AND (last_contact_date < ? OR last_contact_date IS NULL)
        ORDER BY last_contact_date ASC
    ''', (three_days_ago,))

    contacts = cursor.fetchall()
    conn.close()

    if not contacts:
        print("\n✓ All active contacts have been contacted recently!")
        return

    print("\n" + "=" * 60)
    print("  REMINDERS - Contacts to reach out to:")
    print("=" * 60)

    for contact in contacts:
        last_contact = format_last_contact(contact['last_contact_date'])
        platform = contact['platform'] or 'Unknown platform'
        print(f"  • {contact['name']} ({platform}) - Last contact: {last_contact}")

    print("=" * 60)


def interactive_add():
    """Interactive prompt to add a new contact."""
    print("\n--- Add New Contact ---")

    name = input("Name: ").strip()
    if not name:
        print("Name is required.")
        return

    platform = input("Platform (Tinder/Bumble/Hinge/etc.): ").strip() or None
    phone = input("Phone number (optional): ").strip() or None

    first_contact = input("First contact date (YYYY-MM-DD, or press Enter for today): ").strip()
    if not first_contact:
        first_contact = datetime.now().strftime("%Y-%m-%d")

    status = input("Status (active/dating/ghosted/ended) [active]: ").strip() or "active"

    contact_id = add_contact(name, platform, phone, first_contact, status)

    initial_note = input("Add an initial note? (Enter note or press Enter to skip): ").strip()
    if initial_note:
        add_note(contact_id, initial_note)


def interactive_update(contact_id):
    """Interactive prompt to update a contact."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM contacts WHERE id = ?", (contact_id,))
    contact = cursor.fetchone()
    conn.close()

    if not contact:
        print(f"\nContact with ID {contact_id} not found.")
        return

    print(f"\n--- Update Contact: {contact['name']} ---")
    print("(Press Enter to keep current value)")

    name = input(f"Name [{contact['name']}]: ").strip() or None
    platform = input(f"Platform [{contact['platform'] or 'None'}]: ").strip() or None
    phone = input(f"Phone [{contact['phone'] or 'None'}]: ").strip() or None
    status = input(f"Status [{contact['status']}]: ").strip() or None

    updates = {}
    if name:
        updates['name'] = name
    if platform:
        updates['platform'] = platform
    if phone:
        updates['phone'] = phone
    if status:
        updates['status'] = status

    if updates:
        update_contact(contact_id, **updates)
    else:
        print("\nNo changes made.")


def print_help():
    """Print help information."""
    help_text = """
╔══════════════════════════════════════════════════════════════════════════════╗
║                        DATING CONTACT TRACKER - HELP                         ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  COMMANDS:                                                                   ║
║                                                                              ║
║  list [status] [platform]  - List all contacts (optional filters)            ║
║  add                       - Add a new contact (interactive)                 ║
║  view <id>                 - View detailed contact info and notes            ║
║  update <id>               - Update contact information (interactive)        ║
║  delete <id>               - Delete a contact                                ║
║  note <id> <text>          - Add a note to a contact                         ║
║  contacted <id> [date]     - Mark contact as contacted (default: today)      ║
║  search <term>             - Search contacts by name or notes                ║
║  reminders                 - Show contacts to reach out to                   ║
║  help                      - Show this help message                          ║
║  quit                      - Exit the program                                ║
║                                                                              ║
║  STATUSES: active, dating, ghosted, ended                                    ║
║  PLATFORMS: Tinder, Bumble, Hinge, OkCupid, etc.                             ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""
    print(help_text)


def main():
    """Main function to run the interactive CLI."""
    init_db()

    print("\n" + "=" * 60)
    print("       DATING CONTACT TRACKER")
    print("       Track your dating connections")
    print("=" * 60)
    print("  Type 'help' for available commands or 'quit' to exit")
    print("=" * 60)

    while True:
        try:
            command = input("\n> ").strip().lower()

            if not command:
                continue

            parts = command.split(maxsplit=2)
            cmd = parts[0]

            if cmd in ('quit', 'exit', 'q'):
                print("\nGoodbye!")
                break

            elif cmd == 'help':
                print_help()

            elif cmd == 'list':
                status_filter = parts[1] if len(parts) > 1 else None
                platform_filter = parts[2] if len(parts) > 2 else None
                list_contacts(status_filter, platform_filter)

            elif cmd == 'add':
                interactive_add()

            elif cmd == 'view':
                if len(parts) < 2:
                    print("Usage: view <id>")
                    continue
                try:
                    contact_id = int(parts[1])
                    view_contact(contact_id)
                except ValueError:
                    print("Invalid ID. Please provide a number.")

            elif cmd == 'update':
                if len(parts) < 2:
                    print("Usage: update <id>")
                    continue
                try:
                    contact_id = int(parts[1])
                    interactive_update(contact_id)
                except ValueError:
                    print("Invalid ID. Please provide a number.")

            elif cmd == 'delete':
                if len(parts) < 2:
                    print("Usage: delete <id>")
                    continue
                try:
                    contact_id = int(parts[1])
                    confirm = input(f"Are you sure you want to delete contact {contact_id}? (yes/no): ")
                    if confirm.lower() == 'yes':
                        delete_contact(contact_id)
                    else:
                        print("Deletion cancelled.")
                except ValueError:
                    print("Invalid ID. Please provide a number.")

            elif cmd == 'note':
                if len(parts) < 3:
                    print("Usage: note <id> <note text>")
                    continue
                try:
                    contact_id = int(parts[1])
                    note_text = parts[2]
                    add_note(contact_id, note_text)
                except ValueError:
                    print("Invalid ID. Please provide a number.")

            elif cmd == 'contacted':
                if len(parts) < 2:
                    print("Usage: contacted <id> [date]")
                    continue
                try:
                    contact_id = int(parts[1])
                    date = parts[2] if len(parts) > 2 else None
                    mark_contacted(contact_id, date)
                except ValueError:
                    print("Invalid ID. Please provide a number.")

            elif cmd == 'search':
                if len(parts) < 2:
                    print("Usage: search <term>")
                    continue
                search_contacts(parts[1])

            elif cmd == 'reminders':
                show_reminders()

            else:
                print(f"Unknown command: {cmd}. Type 'help' for available commands.")

        except KeyboardInterrupt:
            print("\n\nGoodbye!")
            break
        except Exception as e:
            print(f"Error: {e}")


if __name__ == "__main__":
    main()
