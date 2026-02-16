#!/usr/bin/env python3
"""
LifeOS Journal - Daily journaling with mood tracking and reflections.
"""

import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

DB_PATH = Path(__file__).parent / "lifeos.db"


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS journal_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entry_date TEXT NOT NULL,
            mood INTEGER CHECK(mood BETWEEN 1 AND 10),
            energy INTEGER CHECK(energy BETWEEN 1 AND 10),
            title TEXT,
            content TEXT NOT NULL,
            tags TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS gratitude (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entry_date TEXT NOT NULL,
            item TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    ''')

    conn.commit()
    conn.close()


def write_entry(content, title=None, mood=None, energy=None, tags=None, date=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")

    cursor.execute('''
        INSERT INTO journal_entries (entry_date, mood, energy, title, content, tags, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (date, mood, energy, title, content, tags, now, now))

    eid = cursor.lastrowid
    conn.commit()
    conn.close()
    print(f"\n+ Journal entry saved (ID: {eid})")
    return eid


def add_gratitude(items, date=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")

    for item in items:
        cursor.execute('''
            INSERT INTO gratitude (entry_date, item, created_at)
            VALUES (?, ?, ?)
        ''', (date, item.strip(), now))

    conn.commit()
    conn.close()
    print(f"\n+ Added {len(items)} gratitude item(s) for {date}")


def list_entries(days=30, tag=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    start = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")

    query = "SELECT * FROM journal_entries WHERE entry_date >= ?"
    params = [start]

    if tag:
        query += " AND tags LIKE ?"
        params.append(f"%{tag}%")

    query += " ORDER BY entry_date DESC"
    cursor.execute(query, params)
    entries = cursor.fetchall()
    conn.close()

    if not entries:
        print(f"\nNo journal entries in the last {days} days.")
        return

    print(f"\n{'=' * 75}")
    print(f"  JOURNAL ENTRIES - Last {days} days")
    print("=" * 75)

    for e in entries:
        title = e['title'] or "(untitled)"
        mood_str = f"mood:{e['mood']}/10" if e['mood'] else ""
        energy_str = f"energy:{e['energy']}/10" if e['energy'] else ""
        meta = "  ".join(filter(None, [mood_str, energy_str]))
        tags = f"  [{e['tags']}]" if e['tags'] else ""

        print(f"\n  [{e['entry_date']}] #{e['id']} - {title}")
        if meta:
            print(f"  {meta}")
        preview = e['content'][:100].replace('\n', ' ')
        if len(e['content']) > 100:
            preview += "..."
        print(f"  {preview}{tags}")

    print("\n" + "=" * 75)
    print(f"  {len(entries)} entries")


def view_entry(entry_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM journal_entries WHERE id = ?", (entry_id,))
    entry = cursor.fetchone()

    if not entry:
        print(f"\nEntry {entry_id} not found.")
        conn.close()
        return

    cursor.execute(
        "SELECT item FROM gratitude WHERE entry_date = ? ORDER BY id",
        (entry['entry_date'],))
    gratitude_items = cursor.fetchall()
    conn.close()

    print(f"\n{'=' * 60}")
    title = entry['title'] or "(untitled)"
    print(f"  {title}")
    print(f"  {entry['entry_date']}")
    print("=" * 60)

    if entry['mood']:
        print(f"  Mood:   {entry['mood']}/10")
    if entry['energy']:
        print(f"  Energy: {entry['energy']}/10")
    if entry['tags']:
        print(f"  Tags:   {entry['tags']}")

    print("-" * 60)
    for line in entry['content'].split('\n'):
        print(f"  {line}")

    if gratitude_items:
        print("-" * 60)
        print("  GRATEFUL FOR:")
        for g in gratitude_items:
            print(f"  - {g['item']}")

    print("=" * 60)


def view_date(date):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM journal_entries WHERE entry_date = ? ORDER BY created_at", (date,))
    entries = cursor.fetchall()

    cursor.execute("SELECT item FROM gratitude WHERE entry_date = ? ORDER BY id", (date,))
    gratitude_items = cursor.fetchall()

    conn.close()

    if not entries and not gratitude_items:
        print(f"\nNo entries for {date}.")
        return

    print(f"\n{'=' * 60}")
    print(f"  JOURNAL - {date}")
    print("=" * 60)

    for entry in entries:
        title = entry['title'] or "(untitled)"
        print(f"\n  --- {title} (#{entry['id']}) ---")
        if entry['mood']:
            print(f"  Mood: {entry['mood']}/10  Energy: {entry['energy'] or '-'}/10")
        for line in entry['content'].split('\n'):
            print(f"  {line}")

    if gratitude_items:
        print(f"\n  GRATEFUL FOR:")
        for g in gratitude_items:
            print(f"  - {g['item']}")

    print("\n" + "=" * 60)


def mood_trend(days=14):
    conn = get_db_connection()
    cursor = conn.cursor()
    start = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")

    cursor.execute('''
        SELECT entry_date, AVG(mood) as avg_mood, AVG(energy) as avg_energy
        FROM journal_entries
        WHERE entry_date >= ? AND mood IS NOT NULL
        GROUP BY entry_date
        ORDER BY entry_date
    ''', (start,))

    rows = cursor.fetchall()
    conn.close()

    if not rows:
        print(f"\nNo mood data in the last {days} days.")
        return

    print(f"\n{'=' * 55}")
    print(f"  MOOD TREND - Last {days} days")
    print("=" * 55)

    for r in rows:
        mood = r['avg_mood']
        energy = r['avg_energy']
        bar_m = "#" * int(mood)
        bar_e = "=" * int(energy) if energy else ""
        mood_line = f"  {r['entry_date']}  M:{mood:>4.1f} {bar_m}"
        if energy:
            mood_line += f"  E:{energy:>4.1f} {bar_e}"
        print(mood_line)

    cursor2 = get_db_connection().cursor()
    cursor2.execute('''
        SELECT AVG(mood) as avg_m, AVG(energy) as avg_e
        FROM journal_entries
        WHERE entry_date >= ? AND mood IS NOT NULL
    ''', (start,))
    avgs = cursor2.fetchone()
    cursor2.connection.close()

    print("-" * 55)
    avg_str = f"  Average mood: {avgs['avg_m']:.1f}/10"
    if avgs['avg_e']:
        avg_str += f"  |  Average energy: {avgs['avg_e']:.1f}/10"
    print(avg_str)
    print("=" * 55)


def search_journal(term):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT * FROM journal_entries
        WHERE content LIKE ? OR title LIKE ? OR tags LIKE ?
        ORDER BY entry_date DESC
    ''', (f"%{term}%", f"%{term}%", f"%{term}%"))

    entries = cursor.fetchall()
    conn.close()

    if not entries:
        print(f"\nNo entries matching '{term}'.")
        return

    print(f"\n  Search results for '{term}':")
    print("=" * 60)

    for e in entries:
        title = e['title'] or "(untitled)"
        preview = e['content'][:80].replace('\n', ' ')
        print(f"  [{e['entry_date']}] #{e['id']} - {title}")
        print(f"    {preview}...")

    print("=" * 60)
    print(f"  {len(entries)} result(s)")


def delete_entry(entry_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT title, entry_date FROM journal_entries WHERE id = ?", (entry_id,))
    entry = cursor.fetchone()
    if not entry:
        print(f"\nEntry {entry_id} not found.")
        conn.close()
        return

    cursor.execute("DELETE FROM journal_entries WHERE id = ?", (entry_id,))
    conn.commit()
    conn.close()
    print(f"\n+ Deleted entry #{entry_id}")


def print_help():
    print("""
+---------------------------------------------------------------+
|                    JOURNAL - HELP                             |
+---------------------------------------------------------------+
|  write              - Write a new journal entry               |
|  gratitude          - Log gratitude items for today            |
|  list [days] [tag]  - List recent entries (default 30 days)   |
|  view <id>          - View a journal entry                    |
|  date <YYYY-MM-DD>  - View all entries for a specific date    |
|  mood [days]        - Show mood/energy trend (default 14)     |
|  search <term>      - Search journal entries                  |
|  delete <id>        - Delete a journal entry                  |
|  help               - Show this help message                  |
|  quit               - Exit journal                            |
+---------------------------------------------------------------+
|  Mood/Energy scale: 1 (lowest) to 10 (highest)               |
+---------------------------------------------------------------+
""")


def interactive_write():
    print("\n--- Write Journal Entry ---")
    title = input("Title (optional): ").strip() or None
    date = input("Date (YYYY-MM-DD, Enter for today): ").strip() or None

    mood = input("Mood (1-10, Enter to skip): ").strip()
    mood = int(mood) if mood else None
    energy = input("Energy (1-10, Enter to skip): ").strip()
    energy = int(energy) if energy else None

    tags = input("Tags (comma-separated, optional): ").strip() or None

    print("\nWrite your entry (type END on a new line when done):")
    lines = []
    while True:
        line = input()
        if line.strip() == "END":
            break
        lines.append(line)

    content = "\n".join(lines)
    if not content.strip():
        print("Entry cannot be empty.")
        return

    write_entry(content, title, mood, energy, tags, date)


def interactive_gratitude():
    print("\n--- Gratitude Log ---")
    print("Enter things you're grateful for (one per line, type END when done):")

    items = []
    while True:
        item = input("  - ").strip()
        if item == "END" or item == "":
            break
        items.append(item)

    if items:
        add_gratitude(items)
    else:
        print("No items entered.")


def main():
    init_db()

    print("\n" + "=" * 50)
    print("       LIFEOS - JOURNAL")
    print("       Reflect, track mood, practice gratitude")
    print("=" * 50)
    print("  Type 'help' for commands or 'quit' to exit")
    print("=" * 50)

    while True:
        try:
            command = input("\njournal> ").strip()
            if not command:
                continue

            parts = command.split(maxsplit=2)
            cmd = parts[0].lower()

            if cmd in ('quit', 'exit', 'q'):
                print("\nGoodbye!")
                break
            elif cmd == 'help':
                print_help()
            elif cmd == 'write':
                interactive_write()
            elif cmd == 'gratitude':
                interactive_gratitude()
            elif cmd == 'list':
                days = 30
                tag = None
                if len(parts) > 1:
                    try:
                        days = int(parts[1])
                    except ValueError:
                        tag = parts[1]
                if len(parts) > 2:
                    tag = parts[2]
                list_entries(days, tag)
            elif cmd == 'view':
                if len(parts) < 2:
                    print("Usage: view <id>")
                    continue
                try:
                    view_entry(int(parts[1]))
                except ValueError:
                    print("Invalid ID.")
            elif cmd == 'date':
                if len(parts) < 2:
                    print("Usage: date <YYYY-MM-DD>")
                    continue
                view_date(parts[1])
            elif cmd == 'mood':
                days = int(parts[1]) if len(parts) > 1 else 14
                mood_trend(days)
            elif cmd == 'search':
                if len(parts) < 2:
                    print("Usage: search <term>")
                    continue
                search_journal(parts[1])
            elif cmd == 'delete':
                if len(parts) < 2:
                    print("Usage: delete <id>")
                    continue
                try:
                    eid = int(parts[1])
                    confirm = input(f"Delete entry {eid}? (yes/no): ")
                    if confirm.lower() == 'yes':
                        delete_entry(eid)
                except ValueError:
                    print("Invalid ID.")
            else:
                print(f"Unknown command: {cmd}. Type 'help' for commands.")

        except KeyboardInterrupt:
            print("\n\nGoodbye!")
            break
        except Exception as e:
            print(f"Error: {e}")


if __name__ == "__main__":
    main()
