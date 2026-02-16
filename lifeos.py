#!/usr/bin/env python3
"""
LifeOS - Unified personal life management system.

Launch any LifeOS component or view a cross-system dashboard.
"""

import sqlite3
import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path

DB_PATH = Path(__file__).parent / "lifeos.db"
CONTACTS_DB = Path(__file__).parent / "contacts.db"
BASE_DIR = Path(__file__).parent


def get_db(path):
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn


def dashboard():
    """Show a unified dashboard across all LifeOS components."""
    today = datetime.now().strftime("%Y-%m-%d")
    now = datetime.now()
    week_ago = (now - timedelta(days=7)).strftime("%Y-%m-%d")

    print("\n" + "=" * 65)
    print(f"  LIFEOS DASHBOARD - {today}")
    print("=" * 65)

    # --- Dating Contacts ---
    try:
        conn = get_db(CONTACTS_DB)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as cnt FROM contacts WHERE status = 'active'")
        active_contacts = cursor.fetchone()['cnt']
        cursor.execute("SELECT COUNT(*) as cnt FROM contacts")
        total_contacts = cursor.fetchone()['cnt']

        three_days_ago = (now - timedelta(days=3)).strftime("%Y-%m-%d")
        cursor.execute("SELECT COUNT(*) as cnt FROM contacts WHERE status = 'active' AND (last_contact_date < ? OR last_contact_date IS NULL)", (three_days_ago,))
        reminders = cursor.fetchone()['cnt']
        conn.close()

        print(f"\n  DATING CONTACTS")
        print(f"    Active: {active_contacts}  |  Total: {total_contacts}  |  Need attention: {reminders}")
    except Exception:
        print(f"\n  DATING CONTACTS")
        print(f"    (no data yet - run dating_tracker.py)")

    # --- Habits ---
    try:
        conn = get_db(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as cnt FROM habits WHERE archived = 0")
        total_habits = cursor.fetchone()['cnt']
        cursor.execute("SELECT COUNT(DISTINCT habit_id) as cnt FROM habit_logs WHERE completed_date = ?", (today,))
        done_habits = cursor.fetchone()['cnt']
        conn.close()

        print(f"\n  HABITS")
        print(f"    Today: {done_habits}/{total_habits} completed")
    except Exception:
        print(f"\n  HABITS")
        print(f"    (no data yet - run habit_tracker.py)")

    # --- Fitness ---
    try:
        conn = get_db(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as cnt FROM workouts WHERE workout_date >= ?", (week_ago,))
        week_workouts = cursor.fetchone()['cnt']
        cursor.execute("SELECT weight FROM body_metrics WHERE weight IS NOT NULL ORDER BY metric_date DESC LIMIT 1")
        latest_wt = cursor.fetchone()
        conn.close()

        print(f"\n  FITNESS")
        wt_str = f"  |  Latest weight: {latest_wt['weight']} lbs" if latest_wt else ""
        print(f"    Workouts this week: {week_workouts}{wt_str}")
    except Exception:
        print(f"\n  FITNESS")
        print(f"    (no data yet - run fitness_tracker.py)")

    # --- Finance ---
    try:
        conn = get_db(DB_PATH)
        cursor = conn.cursor()
        month_start = f"{now.year}-{now.month:02d}-01"
        cursor.execute("SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type='income' AND transaction_date >= ?", (month_start,))
        income = cursor.fetchone()['total']
        cursor.execute("SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type='expense' AND transaction_date >= ?", (month_start,))
        expenses = cursor.fetchone()['total']
        conn.close()

        print(f"\n  FINANCES ({now.strftime('%B')})")
        print(f"    Income: +${income:.2f}  |  Expenses: -${expenses:.2f}  |  Net: ${income - expenses:+.2f}")
    except Exception:
        print(f"\n  FINANCES")
        print(f"    (no data yet - run finance_tracker.py)")

    # --- Journal ---
    try:
        conn = get_db(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as cnt FROM journal_entries WHERE entry_date = ?", (today,))
        today_entries = cursor.fetchone()['cnt']
        cursor.execute("SELECT AVG(mood) as avg_mood FROM journal_entries WHERE entry_date >= ? AND mood IS NOT NULL", (week_ago,))
        avg_mood = cursor.fetchone()['avg_mood']
        conn.close()

        mood_str = f"  |  7-day avg mood: {avg_mood:.1f}/10" if avg_mood else ""
        print(f"\n  JOURNAL")
        print(f"    Entries today: {today_entries}{mood_str}")
    except Exception:
        print(f"\n  JOURNAL")
        print(f"    (no data yet - run journal.py)")

    # --- Goals ---
    try:
        conn = get_db(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as cnt FROM goals WHERE status = 'active'")
        active_goals = cursor.fetchone()['cnt']
        cursor.execute("SELECT COUNT(*) as cnt FROM goals WHERE status = 'completed'")
        completed_goals = cursor.fetchone()['cnt']
        cursor.execute("SELECT title, progress, target_date FROM goals WHERE status = 'active' ORDER BY CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END LIMIT 3")
        top_goals = cursor.fetchall()
        conn.close()

        print(f"\n  GOALS")
        print(f"    Active: {active_goals}  |  Completed: {completed_goals}")
        for g in top_goals:
            due = ""
            if g['target_date']:
                remaining = (datetime.strptime(g['target_date'], "%Y-%m-%d") - now).days
                due = f" (due in {remaining}d)" if remaining >= 0 else f" (OVERDUE)"
            print(f"    - {g['title']}: {g['progress']}%{due}")
    except Exception:
        print(f"\n  GOALS")
        print(f"    (no data yet - run goal_tracker.py)")

    print("\n" + "=" * 65)


def launch_component(name):
    """Launch a LifeOS component by name."""
    components = {
        'dating': 'dating_tracker.py',
        'contacts': 'dating_tracker.py',
        'habits': 'habit_tracker.py',
        'fitness': 'fitness_tracker.py',
        'health': 'fitness_tracker.py',
        'finance': 'finance_tracker.py',
        'money': 'finance_tracker.py',
        'journal': 'journal.py',
        'diary': 'journal.py',
        'goals': 'goal_tracker.py',
        'export': 'export_archive.py',
    }

    script = components.get(name.lower())
    if not script:
        print(f"\nUnknown component: {name}")
        print(f"Available: {', '.join(sorted(set(components.values())))}")
        return

    script_path = BASE_DIR / script
    if not script_path.exists():
        print(f"\n{script} not found.")
        return

    print(f"\nLaunching {script}...")
    subprocess.run([sys.executable, str(script_path)])


def print_help():
    print("""
+===============================================================+
|                      LIFEOS - HELP                            |
+===============================================================+
|                                                               |
|  dashboard           - Show unified life dashboard            |
|                                                               |
|  LAUNCH A COMPONENT:                                          |
|  open dating         - Dating Contact Tracker                 |
|  open habits         - Habit Tracker                          |
|  open fitness        - Fitness & Health Tracker               |
|  open finance        - Finance Tracker                        |
|  open journal        - Journal / Diary                        |
|  open goals          - Goal Tracker                           |
|  open export         - Data Export Tool                       |
|                                                               |
|  QUICK ACTIONS:                                               |
|  Components can also be run directly:                         |
|    python3 dating_tracker.py                                  |
|    python3 habit_tracker.py                                   |
|    python3 fitness_tracker.py                                 |
|    python3 finance_tracker.py                                 |
|    python3 journal.py                                         |
|    python3 goal_tracker.py                                    |
|                                                               |
|  help                - Show this help message                 |
|  quit                - Exit LifeOS                            |
+===============================================================+
""")


def main():
    print("\n" + "=" * 55)
    print("""
    ╦   ╦╔═╗╔═╗╔═╗╔═╗
    ║   ║╠╣ ║╣ ║ ║╚═╗
    ╩═╝ ╩╚  ╚═╝╚═╝╚═╝
    """)
    print("  Your personal life operating system")
    print("=" * 55)
    print("  Type 'dashboard' for overview or 'help' for commands")
    print("=" * 55)

    while True:
        try:
            command = input("\nlifeos> ").strip()
            if not command:
                continue

            parts = command.split(maxsplit=1)
            cmd = parts[0].lower()

            if cmd in ('quit', 'exit', 'q'):
                print("\nGoodbye!")
                break
            elif cmd == 'help':
                print_help()
            elif cmd in ('dashboard', 'dash', 'd'):
                dashboard()
            elif cmd == 'open':
                if len(parts) < 2:
                    print("Usage: open <component>")
                    print("Components: dating, habits, fitness, finance, journal, goals")
                    continue
                launch_component(parts[1])
            else:
                # Try as component name directly
                components = ['dating', 'contacts', 'habits', 'fitness', 'health',
                              'finance', 'money', 'journal', 'diary', 'goals', 'export']
                if cmd in components:
                    launch_component(cmd)
                else:
                    print(f"Unknown command: {cmd}. Type 'help' for commands.")

        except KeyboardInterrupt:
            print("\n\nGoodbye!")
            break
        except Exception as e:
            print(f"Error: {e}")


if __name__ == "__main__":
    main()
