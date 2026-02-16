#!/usr/bin/env python3
"""
LifeOS Habit Tracker - Track daily habits and build streaks.
"""

import sqlite3
import os
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
        CREATE TABLE IF NOT EXISTS habits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            frequency TEXT DEFAULT 'daily',
            target_per_period INTEGER DEFAULT 1,
            category TEXT,
            created_at TEXT NOT NULL,
            archived INTEGER DEFAULT 0
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS habit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            habit_id INTEGER NOT NULL,
            completed_date TEXT NOT NULL,
            value REAL DEFAULT 1,
            note TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (habit_id) REFERENCES habits (id) ON DELETE CASCADE,
            UNIQUE(habit_id, completed_date)
        )
    ''')

    conn.commit()
    conn.close()


def add_habit(name, description=None, frequency="daily", target=1, category=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute('''
        INSERT INTO habits (name, description, frequency, target_per_period, category, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (name, description, frequency, target, category, now))

    habit_id = cursor.lastrowid
    conn.commit()
    conn.close()
    print(f"\n+ Added habit: {name} (ID: {habit_id})")
    return habit_id


def log_habit(habit_id, date=None, value=1, note=None):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT name FROM habits WHERE id = ? AND archived = 0", (habit_id,))
    habit = cursor.fetchone()
    if not habit:
        print(f"\nHabit with ID {habit_id} not found.")
        conn.close()
        return

    if not date:
        date = datetime.now().strftime("%Y-%m-%d")

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    try:
        cursor.execute('''
            INSERT INTO habit_logs (habit_id, completed_date, value, note, created_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (habit_id, date, value, note, now))
        conn.commit()
        print(f"\n+ Logged '{habit['name']}' for {date}")
    except sqlite3.IntegrityError:
        print(f"\nAlready logged '{habit['name']}' for {date}.")
    finally:
        conn.close()


def get_streak(habit_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT completed_date FROM habit_logs
        WHERE habit_id = ?
        ORDER BY completed_date DESC
    ''', (habit_id,))

    dates = [row['completed_date'] for row in cursor.fetchall()]
    conn.close()

    if not dates:
        return 0

    streak = 0
    today = datetime.now().date()
    check_date = today

    for d in dates:
        log_date = datetime.strptime(d, "%Y-%m-%d").date()
        if log_date == check_date:
            streak += 1
            check_date -= timedelta(days=1)
        elif log_date == check_date - timedelta(days=1):
            check_date = log_date
            streak += 1
            check_date -= timedelta(days=1)
        else:
            break

    return streak


def get_completion_rate(habit_id, days=30):
    conn = get_db_connection()
    cursor = conn.cursor()

    start_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    cursor.execute('''
        SELECT COUNT(DISTINCT completed_date) as completed
        FROM habit_logs
        WHERE habit_id = ? AND completed_date >= ?
    ''', (habit_id, start_date))

    result = cursor.fetchone()
    conn.close()

    completed = result['completed'] if result else 0
    return (completed / days) * 100


def list_habits(show_archived=False):
    conn = get_db_connection()
    cursor = conn.cursor()

    if show_archived:
        cursor.execute("SELECT * FROM habits ORDER BY category, name")
    else:
        cursor.execute("SELECT * FROM habits WHERE archived = 0 ORDER BY category, name")

    habits = cursor.fetchall()
    conn.close()

    if not habits:
        print("\nNo habits found. Use 'add' to create one.")
        return

    today = datetime.now().strftime("%Y-%m-%d")

    print("\n" + "=" * 85)
    print(f"{'ID':<4} {'Habit':<25} {'Category':<12} {'Freq':<8} {'Streak':<8} {'30d %':<8} {'Today':<6}")
    print("=" * 85)

    for h in habits:
        streak = get_streak(h['id'])
        rate = get_completion_rate(h['id'])
        category = h['category'] or '-'

        conn2 = get_db_connection()
        c2 = conn2.cursor()
        c2.execute("SELECT id FROM habit_logs WHERE habit_id = ? AND completed_date = ?",
                    (h['id'], today))
        done_today = "Y" if c2.fetchone() else "-"
        conn2.close()

        print(f"{h['id']:<4} {h['name']:<25} {category:<12} {h['frequency']:<8} {streak:<8} {rate:>5.0f}%  {done_today:<6}")

    print("=" * 85)


def view_habit(habit_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM habits WHERE id = ?", (habit_id,))
    habit = cursor.fetchone()
    if not habit:
        print(f"\nHabit with ID {habit_id} not found.")
        conn.close()
        return

    streak = get_streak(habit_id)
    rate_7 = get_completion_rate(habit_id, 7)
    rate_30 = get_completion_rate(habit_id, 30)

    cursor.execute('''
        SELECT completed_date, value, note FROM habit_logs
        WHERE habit_id = ? ORDER BY completed_date DESC LIMIT 14
    ''', (habit_id,))
    recent = cursor.fetchall()

    cursor.execute("SELECT COUNT(*) as total FROM habit_logs WHERE habit_id = ?", (habit_id,))
    total = cursor.fetchone()['total']

    conn.close()

    print("\n" + "=" * 50)
    print(f"  HABIT: {habit['name']}")
    print("=" * 50)
    if habit['description']:
        print(f"  Description: {habit['description']}")
    print(f"  Category:    {habit['category'] or 'None'}")
    print(f"  Frequency:   {habit['frequency']}")
    print(f"  Target:      {habit['target_per_period']}x per {habit['frequency']}")
    print("-" * 50)
    print(f"  Current Streak: {streak} day{'s' if streak != 1 else ''}")
    print(f"  7-day rate:     {rate_7:.0f}%")
    print(f"  30-day rate:    {rate_30:.0f}%")
    print(f"  Total logs:     {total}")
    print("-" * 50)

    if recent:
        print("\n  RECENT ACTIVITY:")
        for log in recent:
            note = f" - {log['note']}" if log['note'] else ""
            print(f"  [{log['completed_date']}] value={log['value']}{note}")

    print("=" * 50)


def today_summary():
    conn = get_db_connection()
    cursor = conn.cursor()
    today = datetime.now().strftime("%Y-%m-%d")

    cursor.execute("SELECT * FROM habits WHERE archived = 0 ORDER BY category, name")
    habits = cursor.fetchall()

    if not habits:
        print("\nNo habits to track.")
        conn.close()
        return

    done = 0
    total = len(habits)

    print("\n" + "=" * 50)
    print(f"  TODAY'S HABITS - {today}")
    print("=" * 50)

    for h in habits:
        cursor.execute(
            "SELECT id FROM habit_logs WHERE habit_id = ? AND completed_date = ?",
            (h['id'], today))
        logged = cursor.fetchone()
        status = "[X]" if logged else "[ ]"
        if logged:
            done += 1
        streak = get_streak(h['id'])
        streak_str = f" ({streak}d streak)" if streak > 0 else ""
        print(f"  {status} {h['name']}{streak_str}")

    print("-" * 50)
    print(f"  Progress: {done}/{total} ({(done/total*100):.0f}%)")
    print("=" * 50)

    conn.close()


def delete_habit(habit_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT name FROM habits WHERE id = ?", (habit_id,))
    habit = cursor.fetchone()
    if not habit:
        print(f"\nHabit with ID {habit_id} not found.")
        conn.close()
        return

    cursor.execute("DELETE FROM habit_logs WHERE habit_id = ?", (habit_id,))
    cursor.execute("DELETE FROM habits WHERE id = ?", (habit_id,))
    conn.commit()
    conn.close()
    print(f"\n+ Deleted habit: {habit['name']}")


def archive_habit(habit_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT name FROM habits WHERE id = ?", (habit_id,))
    habit = cursor.fetchone()
    if not habit:
        print(f"\nHabit with ID {habit_id} not found.")
        conn.close()
        return

    cursor.execute("UPDATE habits SET archived = 1 WHERE id = ?", (habit_id,))
    conn.commit()
    conn.close()
    print(f"\n+ Archived habit: {habit['name']}")


def print_help():
    print("""
+---------------------------------------------------------------+
|                   HABIT TRACKER - HELP                        |
+---------------------------------------------------------------+
|  list              - List all active habits with stats        |
|  add               - Add a new habit (interactive)            |
|  log <id> [date]   - Log a habit completion                   |
|  view <id>         - View habit details and history           |
|  today             - Show today's habit checklist             |
|  delete <id>       - Delete a habit and all logs              |
|  archive <id>      - Archive a habit (hide from list)         |
|  help              - Show this help message                   |
|  quit              - Exit habit tracker                       |
+---------------------------------------------------------------+
""")


def interactive_add():
    print("\n--- Add New Habit ---")
    name = input("Habit name: ").strip()
    if not name:
        print("Name is required.")
        return

    description = input("Description (optional): ").strip() or None
    frequency = input("Frequency (daily/weekly) [daily]: ").strip() or "daily"
    target = input("Target per period [1]: ").strip()
    target = int(target) if target else 1
    category = input("Category (health/productivity/learning/etc.): ").strip() or None

    add_habit(name, description, frequency, target, category)


def main():
    init_db()

    print("\n" + "=" * 50)
    print("       LIFEOS - HABIT TRACKER")
    print("       Build better habits, track streaks")
    print("=" * 50)
    print("  Type 'help' for commands or 'quit' to exit")
    print("=" * 50)

    while True:
        try:
            command = input("\nhabits> ").strip()
            if not command:
                continue

            parts = command.split(maxsplit=2)
            cmd = parts[0].lower()

            if cmd in ('quit', 'exit', 'q'):
                print("\nGoodbye!")
                break
            elif cmd == 'help':
                print_help()
            elif cmd == 'list':
                list_habits()
            elif cmd == 'add':
                interactive_add()
            elif cmd == 'log':
                if len(parts) < 2:
                    print("Usage: log <id> [date]")
                    continue
                try:
                    hid = int(parts[1])
                    date = parts[2] if len(parts) > 2 else None
                    note = None
                    if date is None:
                        note = input("Note (optional): ").strip() or None
                    log_habit(hid, date, note=note)
                except ValueError:
                    print("Invalid ID.")
            elif cmd == 'view':
                if len(parts) < 2:
                    print("Usage: view <id>")
                    continue
                try:
                    view_habit(int(parts[1]))
                except ValueError:
                    print("Invalid ID.")
            elif cmd == 'today':
                today_summary()
            elif cmd == 'delete':
                if len(parts) < 2:
                    print("Usage: delete <id>")
                    continue
                try:
                    hid = int(parts[1])
                    confirm = input(f"Delete habit {hid} and all logs? (yes/no): ")
                    if confirm.lower() == 'yes':
                        delete_habit(hid)
                except ValueError:
                    print("Invalid ID.")
            elif cmd == 'archive':
                if len(parts) < 2:
                    print("Usage: archive <id>")
                    continue
                try:
                    archive_habit(int(parts[1]))
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
