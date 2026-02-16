#!/usr/bin/env python3
"""
LifeOS Fitness & Health Tracker - Track workouts, weight, and health metrics.
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
        CREATE TABLE IF NOT EXISTS workouts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workout_type TEXT NOT NULL,
            duration_minutes INTEGER,
            calories_burned INTEGER,
            intensity TEXT DEFAULT 'moderate',
            notes TEXT,
            workout_date TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS exercises (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workout_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            sets INTEGER,
            reps INTEGER,
            weight REAL,
            duration_seconds INTEGER,
            notes TEXT,
            FOREIGN KEY (workout_id) REFERENCES workouts (id) ON DELETE CASCADE
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS body_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            metric_date TEXT NOT NULL,
            weight REAL,
            body_fat_pct REAL,
            resting_hr INTEGER,
            sleep_hours REAL,
            water_oz REAL,
            notes TEXT,
            created_at TEXT NOT NULL,
            UNIQUE(metric_date)
        )
    ''')

    conn.commit()
    conn.close()


def add_workout(workout_type, duration=None, calories=None, intensity="moderate", notes=None, date=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")

    cursor.execute('''
        INSERT INTO workouts (workout_type, duration_minutes, calories_burned, intensity, notes, workout_date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (workout_type, duration, calories, intensity, notes, date, now))

    wid = cursor.lastrowid
    conn.commit()
    conn.close()
    print(f"\n+ Logged workout: {workout_type} (ID: {wid})")
    return wid


def add_exercise(workout_id, name, sets=None, reps=None, weight=None, duration_sec=None, notes=None):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM workouts WHERE id = ?", (workout_id,))
    if not cursor.fetchone():
        print(f"\nWorkout {workout_id} not found.")
        conn.close()
        return

    cursor.execute('''
        INSERT INTO exercises (workout_id, name, sets, reps, weight, duration_seconds, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (workout_id, name, sets, reps, weight, duration_sec, notes))

    conn.commit()
    conn.close()
    print(f"  + Added exercise: {name}")


def log_metrics(weight=None, body_fat=None, resting_hr=None, sleep=None, water=None, notes=None, date=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")

    try:
        cursor.execute('''
            INSERT INTO body_metrics (metric_date, weight, body_fat_pct, resting_hr, sleep_hours, water_oz, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (date, weight, body_fat, resting_hr, sleep, water, notes, now))
        conn.commit()
        print(f"\n+ Logged metrics for {date}")
    except sqlite3.IntegrityError:
        cursor.execute('''
            UPDATE body_metrics SET
                weight = COALESCE(?, weight),
                body_fat_pct = COALESCE(?, body_fat_pct),
                resting_hr = COALESCE(?, resting_hr),
                sleep_hours = COALESCE(?, sleep_hours),
                water_oz = COALESCE(?, water_oz),
                notes = COALESCE(?, notes)
            WHERE metric_date = ?
        ''', (weight, body_fat, resting_hr, sleep, water, notes, date))
        conn.commit()
        print(f"\n+ Updated metrics for {date}")
    finally:
        conn.close()


def list_workouts(days=14):
    conn = get_db_connection()
    cursor = conn.cursor()
    start = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")

    cursor.execute('''
        SELECT * FROM workouts WHERE workout_date >= ? ORDER BY workout_date DESC
    ''', (start,))

    workouts = cursor.fetchall()
    conn.close()

    if not workouts:
        print(f"\nNo workouts in the last {days} days.")
        return

    print(f"\n{'=' * 80}")
    print(f"  WORKOUTS - Last {days} days")
    print(f"{'=' * 80}")
    print(f"{'ID':<5} {'Date':<12} {'Type':<15} {'Duration':<10} {'Intensity':<10} {'Calories':<10}")
    print("-" * 80)

    for w in workouts:
        dur = f"{w['duration_minutes']}min" if w['duration_minutes'] else "-"
        cal = str(w['calories_burned']) if w['calories_burned'] else "-"
        print(f"{w['id']:<5} {w['workout_date']:<12} {w['workout_type']:<15} {dur:<10} {w['intensity']:<10} {cal:<10}")

    print("=" * 80)
    print(f"Total: {len(workouts)} workout(s)")


def view_workout(workout_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM workouts WHERE id = ?", (workout_id,))
    workout = cursor.fetchone()
    if not workout:
        print(f"\nWorkout {workout_id} not found.")
        conn.close()
        return

    cursor.execute("SELECT * FROM exercises WHERE workout_id = ?", (workout_id,))
    exercises = cursor.fetchall()
    conn.close()

    print(f"\n{'=' * 50}")
    print(f"  WORKOUT #{workout['id']} - {workout['workout_date']}")
    print("=" * 50)
    print(f"  Type:      {workout['workout_type']}")
    print(f"  Duration:  {workout['duration_minutes'] or '-'} minutes")
    print(f"  Calories:  {workout['calories_burned'] or '-'}")
    print(f"  Intensity: {workout['intensity']}")
    if workout['notes']:
        print(f"  Notes:     {workout['notes']}")

    if exercises:
        print("-" * 50)
        print("  EXERCISES:")
        for ex in exercises:
            parts = [ex['name']]
            if ex['sets'] and ex['reps']:
                parts.append(f"{ex['sets']}x{ex['reps']}")
            if ex['weight']:
                parts.append(f"@ {ex['weight']}lbs")
            if ex['duration_seconds']:
                parts.append(f"{ex['duration_seconds']}s")
            print(f"  - {' '.join(parts)}")

    print("=" * 50)


def show_metrics(days=30):
    conn = get_db_connection()
    cursor = conn.cursor()
    start = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")

    cursor.execute('''
        SELECT * FROM body_metrics WHERE metric_date >= ? ORDER BY metric_date DESC
    ''', (start,))

    metrics = cursor.fetchall()
    conn.close()

    if not metrics:
        print(f"\nNo metrics in the last {days} days.")
        return

    print(f"\n{'=' * 80}")
    print(f"  BODY METRICS - Last {days} days")
    print("=" * 80)
    print(f"{'Date':<12} {'Weight':<10} {'BF%':<8} {'RHR':<6} {'Sleep':<8} {'Water':<8}")
    print("-" * 80)

    for m in metrics:
        wt = f"{m['weight']}" if m['weight'] else "-"
        bf = f"{m['body_fat_pct']}%" if m['body_fat_pct'] else "-"
        hr = str(m['resting_hr']) if m['resting_hr'] else "-"
        sl = f"{m['sleep_hours']}h" if m['sleep_hours'] else "-"
        wa = f"{m['water_oz']}oz" if m['water_oz'] else "-"
        print(f"{m['metric_date']:<12} {wt:<10} {bf:<8} {hr:<6} {sl:<8} {wa:<8}")

    print("=" * 80)


def weekly_summary():
    conn = get_db_connection()
    cursor = conn.cursor()
    week_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")

    cursor.execute("SELECT COUNT(*) as cnt, SUM(duration_minutes) as total_min, SUM(calories_burned) as total_cal FROM workouts WHERE workout_date >= ?", (week_ago,))
    w = cursor.fetchone()

    cursor.execute("SELECT AVG(weight) as avg_wt, AVG(sleep_hours) as avg_sleep, AVG(water_oz) as avg_water FROM body_metrics WHERE metric_date >= ?", (week_ago,))
    m = cursor.fetchone()

    conn.close()

    print(f"\n{'=' * 50}")
    print("  WEEKLY SUMMARY")
    print("=" * 50)
    print(f"  Workouts:       {w['cnt'] or 0}")
    print(f"  Total duration: {w['total_min'] or 0} min")
    print(f"  Total calories: {w['total_cal'] or 0}")
    print("-" * 50)
    if m['avg_wt']:
        print(f"  Avg weight:     {m['avg_wt']:.1f} lbs")
    if m['avg_sleep']:
        print(f"  Avg sleep:      {m['avg_sleep']:.1f} hrs")
    if m['avg_water']:
        print(f"  Avg water:      {m['avg_water']:.0f} oz")
    print("=" * 50)


def delete_workout(workout_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT workout_type, workout_date FROM workouts WHERE id = ?", (workout_id,))
    workout = cursor.fetchone()
    if not workout:
        print(f"\nWorkout {workout_id} not found.")
        conn.close()
        return

    cursor.execute("DELETE FROM exercises WHERE workout_id = ?", (workout_id,))
    cursor.execute("DELETE FROM workouts WHERE id = ?", (workout_id,))
    conn.commit()
    conn.close()
    print(f"\n+ Deleted workout: {workout['workout_type']} on {workout['workout_date']}")


def print_help():
    print("""
+---------------------------------------------------------------+
|               FITNESS & HEALTH TRACKER - HELP                 |
+---------------------------------------------------------------+
|  WORKOUTS:                                                    |
|  workout             - Log a new workout (interactive)        |
|  exercise <wk_id>    - Add exercise to a workout              |
|  workouts [days]     - List recent workouts (default 14)      |
|  view <id>           - View workout details                   |
|  delete <id>         - Delete a workout                       |
|                                                               |
|  BODY METRICS:                                                |
|  metrics             - Log today's body metrics               |
|  show [days]         - Show recent metrics (default 30)       |
|  summary             - Weekly fitness summary                 |
|                                                               |
|  help                - Show this help message                 |
|  quit                - Exit fitness tracker                   |
+---------------------------------------------------------------+
""")


def interactive_workout():
    print("\n--- Log Workout ---")
    wtype = input("Workout type (weights/cardio/yoga/sports/etc.): ").strip()
    if not wtype:
        print("Type is required.")
        return

    duration = input("Duration in minutes: ").strip()
    duration = int(duration) if duration else None
    calories = input("Calories burned (optional): ").strip()
    calories = int(calories) if calories else None
    intensity = input("Intensity (light/moderate/hard) [moderate]: ").strip() or "moderate"
    notes = input("Notes (optional): ").strip() or None
    date = input("Date (YYYY-MM-DD, Enter for today): ").strip() or None

    wid = add_workout(wtype, duration, calories, intensity, notes, date)

    while True:
        add_ex = input("\nAdd an exercise? (yes/no) [no]: ").strip().lower()
        if add_ex != 'yes':
            break
        ex_name = input("  Exercise name: ").strip()
        if not ex_name:
            break
        sets = input("  Sets: ").strip()
        sets = int(sets) if sets else None
        reps = input("  Reps: ").strip()
        reps = int(reps) if reps else None
        weight = input("  Weight (lbs): ").strip()
        weight = float(weight) if weight else None
        add_exercise(wid, ex_name, sets, reps, weight)


def interactive_metrics():
    print("\n--- Log Body Metrics ---")
    print("(Press Enter to skip any field)")

    weight = input("Weight (lbs): ").strip()
    weight = float(weight) if weight else None
    bf = input("Body fat %: ").strip()
    bf = float(bf) if bf else None
    hr = input("Resting heart rate (bpm): ").strip()
    hr = int(hr) if hr else None
    sleep = input("Hours slept last night: ").strip()
    sleep = float(sleep) if sleep else None
    water = input("Water intake (oz): ").strip()
    water = float(water) if water else None
    notes = input("Notes: ").strip() or None

    log_metrics(weight, bf, hr, sleep, water, notes)


def main():
    init_db()

    print("\n" + "=" * 50)
    print("       LIFEOS - FITNESS & HEALTH TRACKER")
    print("       Track workouts, metrics, and progress")
    print("=" * 50)
    print("  Type 'help' for commands or 'quit' to exit")
    print("=" * 50)

    while True:
        try:
            command = input("\nfitness> ").strip()
            if not command:
                continue

            parts = command.split(maxsplit=2)
            cmd = parts[0].lower()

            if cmd in ('quit', 'exit', 'q'):
                print("\nGoodbye!")
                break
            elif cmd == 'help':
                print_help()
            elif cmd == 'workout':
                interactive_workout()
            elif cmd == 'exercise':
                if len(parts) < 2:
                    print("Usage: exercise <workout_id>")
                    continue
                try:
                    wid = int(parts[1])
                    ex_name = input("  Exercise name: ").strip()
                    sets = input("  Sets: ").strip()
                    sets = int(sets) if sets else None
                    reps = input("  Reps: ").strip()
                    reps = int(reps) if reps else None
                    weight = input("  Weight (lbs): ").strip()
                    weight = float(weight) if weight else None
                    add_exercise(wid, ex_name, sets, reps, weight)
                except ValueError:
                    print("Invalid ID.")
            elif cmd == 'workouts':
                days = int(parts[1]) if len(parts) > 1 else 14
                list_workouts(days)
            elif cmd == 'view':
                if len(parts) < 2:
                    print("Usage: view <id>")
                    continue
                try:
                    view_workout(int(parts[1]))
                except ValueError:
                    print("Invalid ID.")
            elif cmd == 'delete':
                if len(parts) < 2:
                    print("Usage: delete <id>")
                    continue
                try:
                    wid = int(parts[1])
                    confirm = input(f"Delete workout {wid}? (yes/no): ")
                    if confirm.lower() == 'yes':
                        delete_workout(wid)
                except ValueError:
                    print("Invalid ID.")
            elif cmd == 'metrics':
                interactive_metrics()
            elif cmd == 'show':
                days = int(parts[1]) if len(parts) > 1 else 30
                show_metrics(days)
            elif cmd == 'summary':
                weekly_summary()
            else:
                print(f"Unknown command: {cmd}. Type 'help' for commands.")

        except KeyboardInterrupt:
            print("\n\nGoodbye!")
            break
        except Exception as e:
            print(f"Error: {e}")


if __name__ == "__main__":
    main()
