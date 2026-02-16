#!/usr/bin/env python3
"""
LifeOS Goal Tracker - Set goals, define milestones, and track progress.
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
        CREATE TABLE IF NOT EXISTS goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            category TEXT,
            priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'critical')),
            status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused', 'completed', 'abandoned')),
            target_date TEXT,
            progress INTEGER DEFAULT 0 CHECK(progress BETWEEN 0 AND 100),
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            completed_at TEXT
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS milestones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            goal_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            completed INTEGER DEFAULT 0,
            target_date TEXT,
            completed_at TEXT,
            sort_order INTEGER DEFAULT 0,
            FOREIGN KEY (goal_id) REFERENCES goals (id) ON DELETE CASCADE
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS goal_updates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            goal_id INTEGER NOT NULL,
            update_text TEXT NOT NULL,
            old_progress INTEGER,
            new_progress INTEGER,
            created_at TEXT NOT NULL,
            FOREIGN KEY (goal_id) REFERENCES goals (id) ON DELETE CASCADE
        )
    ''')

    conn.commit()
    conn.close()


def add_goal(title, description=None, category=None, priority="medium", target_date=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute('''
        INSERT INTO goals (title, description, category, priority, target_date, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (title, description, category, priority, target_date, now, now))

    gid = cursor.lastrowid
    conn.commit()
    conn.close()
    print(f"\n+ Added goal: {title} (ID: {gid})")
    return gid


def add_milestone(goal_id, title, description=None, target_date=None):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT title FROM goals WHERE id = ?", (goal_id,))
    goal = cursor.fetchone()
    if not goal:
        print(f"\nGoal {goal_id} not found.")
        conn.close()
        return

    cursor.execute("SELECT COALESCE(MAX(sort_order), 0) + 1 FROM milestones WHERE goal_id = ?", (goal_id,))
    order = cursor.fetchone()[0]

    cursor.execute('''
        INSERT INTO milestones (goal_id, title, description, target_date, sort_order)
        VALUES (?, ?, ?, ?, ?)
    ''', (goal_id, title, description, target_date, order))

    mid = cursor.lastrowid
    conn.commit()
    conn.close()
    print(f"  + Milestone added: {title} (#{mid})")
    return mid


def complete_milestone(milestone_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT m.*, g.title as goal_title, g.id as gid
        FROM milestones m JOIN goals g ON m.goal_id = g.id
        WHERE m.id = ?
    ''', (milestone_id,))
    ms = cursor.fetchone()
    if not ms:
        print(f"\nMilestone {milestone_id} not found.")
        conn.close()
        return

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("UPDATE milestones SET completed = 1, completed_at = ? WHERE id = ?",
                    (now, milestone_id))

    # Auto-update goal progress based on milestone completion
    cursor.execute('''
        SELECT COUNT(*) as total, SUM(completed) as done
        FROM milestones WHERE goal_id = ?
    ''', (ms['gid'],))
    counts = cursor.fetchone()
    if counts['total'] > 0:
        new_progress = int((counts['done'] / counts['total']) * 100)
        cursor.execute("UPDATE goals SET progress = ?, updated_at = ? WHERE id = ?",
                        (new_progress, now, ms['gid']))

    conn.commit()
    conn.close()
    print(f"\n+ Completed milestone: {ms['title']}")


def update_progress(goal_id, progress, note=None):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT title, progress FROM goals WHERE id = ?", (goal_id,))
    goal = cursor.fetchone()
    if not goal:
        print(f"\nGoal {goal_id} not found.")
        conn.close()
        return

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    old_progress = goal['progress']

    cursor.execute("UPDATE goals SET progress = ?, updated_at = ? WHERE id = ?",
                    (progress, now, goal_id))

    if progress >= 100:
        cursor.execute("UPDATE goals SET status = 'completed', completed_at = ? WHERE id = ?",
                        (now, goal_id))

    update_text = note or f"Progress updated from {old_progress}% to {progress}%"
    cursor.execute('''
        INSERT INTO goal_updates (goal_id, update_text, old_progress, new_progress, created_at)
        VALUES (?, ?, ?, ?, ?)
    ''', (goal_id, update_text, old_progress, progress, now))

    conn.commit()
    conn.close()
    print(f"\n+ {goal['title']}: {old_progress}% -> {progress}%")
    if progress >= 100:
        print("  Goal completed!")


def list_goals(status_filter=None, category_filter=None):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM goals WHERE 1=1"
    params = []

    if status_filter:
        query += " AND status = ?"
        params.append(status_filter)
    if category_filter:
        query += " AND category = ?"
        params.append(category_filter)

    query += " ORDER BY CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END, updated_at DESC"

    cursor.execute(query, params)
    goals = cursor.fetchall()
    conn.close()

    if not goals:
        print("\nNo goals found.")
        return

    print(f"\n{'=' * 85}")
    print(f"{'ID':<4} {'Goal':<30} {'Category':<12} {'Priority':<10} {'Progress':<12} {'Status':<10}")
    print("=" * 85)

    for g in goals:
        cat = g['category'] or '-'
        bar_len = g['progress'] // 5
        bar = "[" + "#" * bar_len + "-" * (20 - bar_len) + f"] {g['progress']}%"
        print(f"{g['id']:<4} {g['title'][:29]:<30} {cat:<12} {g['priority']:<10} {bar:<12} {g['status']:<10}")

    print("=" * 85)
    active = sum(1 for g in goals if g['status'] == 'active')
    completed = sum(1 for g in goals if g['status'] == 'completed')
    print(f"  Active: {active}  |  Completed: {completed}  |  Total: {len(goals)}")


def view_goal(goal_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM goals WHERE id = ?", (goal_id,))
    goal = cursor.fetchone()
    if not goal:
        print(f"\nGoal {goal_id} not found.")
        conn.close()
        return

    cursor.execute("SELECT * FROM milestones WHERE goal_id = ? ORDER BY sort_order", (goal_id,))
    milestones = cursor.fetchall()

    cursor.execute("SELECT * FROM goal_updates WHERE goal_id = ? ORDER BY created_at DESC LIMIT 10", (goal_id,))
    updates = cursor.fetchall()

    conn.close()

    print(f"\n{'=' * 55}")
    print(f"  GOAL: {goal['title']}")
    print("=" * 55)
    if goal['description']:
        print(f"  {goal['description']}")
    print(f"  Category: {goal['category'] or 'None'}")
    print(f"  Priority: {goal['priority']}")
    print(f"  Status:   {goal['status']}")
    if goal['target_date']:
        target = datetime.strptime(goal['target_date'], "%Y-%m-%d")
        remaining = (target - datetime.now()).days
        due_str = f"{goal['target_date']} ({remaining} days left)" if remaining >= 0 else f"{goal['target_date']} (OVERDUE by {abs(remaining)} days)"
        print(f"  Target:   {due_str}")

    bar_len = goal['progress'] // 5
    bar = "[" + "#" * bar_len + "-" * (20 - bar_len) + f"] {goal['progress']}%"
    print(f"  Progress: {bar}")

    if milestones:
        print("-" * 55)
        print("  MILESTONES:")
        for m in milestones:
            check = "[X]" if m['completed'] else "[ ]"
            due = f" (due: {m['target_date']})" if m['target_date'] else ""
            print(f"  {check} #{m['id']} {m['title']}{due}")

        total_ms = len(milestones)
        done_ms = sum(1 for m in milestones if m['completed'])
        print(f"  ({done_ms}/{total_ms} complete)")

    if updates:
        print("-" * 55)
        print("  RECENT UPDATES:")
        for u in updates:
            progress_str = ""
            if u['old_progress'] is not None and u['new_progress'] is not None:
                progress_str = f" [{u['old_progress']}% -> {u['new_progress']}%]"
            print(f"  [{u['created_at'][:10]}]{progress_str} {u['update_text']}")

    print("=" * 55)


def update_goal_status(goal_id, status):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT title FROM goals WHERE id = ?", (goal_id,))
    goal = cursor.fetchone()
    if not goal:
        print(f"\nGoal {goal_id} not found.")
        conn.close()
        return

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    completed_at = now if status == 'completed' else None

    cursor.execute("UPDATE goals SET status = ?, updated_at = ?, completed_at = COALESCE(?, completed_at) WHERE id = ?",
                    (status, now, completed_at, goal_id))

    if status == 'completed':
        cursor.execute("UPDATE goals SET progress = 100 WHERE id = ?", (goal_id,))

    conn.commit()
    conn.close()
    print(f"\n+ {goal['title']} -> {status}")


def delete_goal(goal_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT title FROM goals WHERE id = ?", (goal_id,))
    goal = cursor.fetchone()
    if not goal:
        print(f"\nGoal {goal_id} not found.")
        conn.close()
        return

    cursor.execute("DELETE FROM milestones WHERE goal_id = ?", (goal_id,))
    cursor.execute("DELETE FROM goal_updates WHERE goal_id = ?", (goal_id,))
    cursor.execute("DELETE FROM goals WHERE id = ?", (goal_id,))
    conn.commit()
    conn.close()
    print(f"\n+ Deleted goal: {goal['title']}")


def print_help():
    print("""
+---------------------------------------------------------------+
|                   GOAL TRACKER - HELP                         |
+---------------------------------------------------------------+
|  GOALS:                                                       |
|  add                   - Add a new goal (interactive)         |
|  list [status] [cat]   - List goals (filter by status/cat)    |
|  view <id>             - View goal details & milestones       |
|  progress <id> <pct>   - Update goal progress (0-100)         |
|  status <id> <status>  - Change goal status                   |
|  delete <id>           - Delete a goal                        |
|                                                               |
|  MILESTONES:                                                  |
|  milestone <goal_id>   - Add milestone to a goal              |
|  done <milestone_id>   - Complete a milestone                 |
|                                                               |
|  help                  - Show this help message               |
|  quit                  - Exit goal tracker                    |
+---------------------------------------------------------------+
|  Priorities: low, medium, high, critical                      |
|  Statuses: active, paused, completed, abandoned               |
+---------------------------------------------------------------+
""")


def interactive_add():
    print("\n--- Add New Goal ---")
    title = input("Goal title: ").strip()
    if not title:
        print("Title is required.")
        return

    description = input("Description (optional): ").strip() or None
    category = input("Category (career/health/finance/personal/learning/etc.): ").strip() or None
    priority = input("Priority (low/medium/high/critical) [medium]: ").strip() or "medium"
    target_date = input("Target date (YYYY-MM-DD, optional): ").strip() or None

    gid = add_goal(title, description, category, priority, target_date)

    while True:
        add_ms = input("\nAdd a milestone? (yes/no) [no]: ").strip().lower()
        if add_ms != 'yes':
            break
        ms_title = input("  Milestone title: ").strip()
        if not ms_title:
            break
        ms_date = input("  Target date (optional): ").strip() or None
        add_milestone(gid, ms_title, target_date=ms_date)


def interactive_milestone(goal_id):
    print(f"\n--- Add Milestone to Goal #{goal_id} ---")
    title = input("Milestone title: ").strip()
    if not title:
        print("Title is required.")
        return
    description = input("Description (optional): ").strip() or None
    target_date = input("Target date (optional): ").strip() or None
    add_milestone(goal_id, title, description, target_date)


def main():
    init_db()

    print("\n" + "=" * 50)
    print("       LIFEOS - GOAL TRACKER")
    print("       Set goals, track milestones, make progress")
    print("=" * 50)
    print("  Type 'help' for commands or 'quit' to exit")
    print("=" * 50)

    while True:
        try:
            command = input("\ngoals> ").strip()
            if not command:
                continue

            parts = command.split(maxsplit=2)
            cmd = parts[0].lower()

            if cmd in ('quit', 'exit', 'q'):
                print("\nGoodbye!")
                break
            elif cmd == 'help':
                print_help()
            elif cmd == 'add':
                interactive_add()
            elif cmd == 'list':
                status = parts[1] if len(parts) > 1 else None
                cat = parts[2] if len(parts) > 2 else None
                list_goals(status, cat)
            elif cmd == 'view':
                if len(parts) < 2:
                    print("Usage: view <id>")
                    continue
                try:
                    view_goal(int(parts[1]))
                except ValueError:
                    print("Invalid ID.")
            elif cmd == 'progress':
                if len(parts) < 3:
                    print("Usage: progress <id> <percentage>")
                    continue
                try:
                    gid = int(parts[1])
                    pct = int(parts[2])
                    note = input("Note (optional): ").strip() or None
                    update_progress(gid, pct, note)
                except ValueError:
                    print("Invalid input.")
            elif cmd == 'status':
                if len(parts) < 3:
                    print("Usage: status <id> <active|paused|completed|abandoned>")
                    continue
                try:
                    update_goal_status(int(parts[1]), parts[2])
                except ValueError:
                    print("Invalid ID.")
            elif cmd == 'milestone':
                if len(parts) < 2:
                    print("Usage: milestone <goal_id>")
                    continue
                try:
                    interactive_milestone(int(parts[1]))
                except ValueError:
                    print("Invalid ID.")
            elif cmd == 'done':
                if len(parts) < 2:
                    print("Usage: done <milestone_id>")
                    continue
                try:
                    complete_milestone(int(parts[1]))
                except ValueError:
                    print("Invalid ID.")
            elif cmd == 'delete':
                if len(parts) < 2:
                    print("Usage: delete <id>")
                    continue
                try:
                    gid = int(parts[1])
                    confirm = input(f"Delete goal {gid} and all milestones? (yes/no): ")
                    if confirm.lower() == 'yes':
                        delete_goal(gid)
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
