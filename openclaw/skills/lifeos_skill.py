#!/usr/bin/env python3
"""
LifeOS AgentSkill -- OpenClaw Tool Definitions

This module exposes all LifeOS database operations as callable tools
for the OpenClaw agent. Each tool:
  - Accepts JSON arguments via --args
  - Returns JSON to stdout
  - Connects to the appropriate SQLite database

Usage:
  python3 lifeos_skill.py --tool <tool_name> --args '{"key": "value"}'

Database paths (set via env vars or defaults):
  LIFEOS_DB  -> /data/lifeos.db
  CONTACTS_DB -> /data/contacts.db
"""

import argparse
import json
import os
import sqlite3
import sys
from datetime import date, datetime, timedelta


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

LIFEOS_DB = os.environ.get("LIFEOS_DB", "/data/lifeos.db")
CONTACTS_DB = os.environ.get("CONTACTS_DB", "/data/contacts.db")


def _conn(db_path):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _today():
    return date.today().isoformat()


def _now():
    return datetime.now().isoformat()


def _rows_to_dicts(rows):
    return [dict(r) for r in rows]


def _ok(data=None, message=None):
    out = {"ok": True}
    if data is not None:
        out["data"] = data
    if message:
        out["message"] = message
    return out


def _err(message):
    return {"ok": False, "error": message}


# ===================================================================
# HABITS
# ===================================================================

def habit_log(args):
    """Log a habit completion for today or a specific date."""
    habit_id = args["habit_id"]
    log_date = args.get("date", _today())
    value = args.get("value", 1)
    note = args.get("note")

    conn = _conn(LIFEOS_DB)
    habit = conn.execute("SELECT name FROM habits WHERE id = ? AND archived = 0", (habit_id,)).fetchone()
    if not habit:
        return _err(f"Habit {habit_id} not found or archived")

    try:
        conn.execute(
            "INSERT INTO habit_logs (habit_id, completed_date, value, note, created_at) VALUES (?, ?, ?, ?, ?)",
            (habit_id, log_date, value, note, _now())
        )
        conn.commit()
        return _ok(message=f"Logged '{habit['name']}' for {log_date}")
    except sqlite3.IntegrityError:
        return _err(f"'{habit['name']}' already logged for {log_date}")
    finally:
        conn.close()


def habit_list(args):
    """List all active habits with today's completion status and streaks."""
    conn = _conn(LIFEOS_DB)
    habits = conn.execute("SELECT * FROM habits WHERE archived = 0 ORDER BY category, name").fetchall()
    today = _today()
    result = []
    for h in habits:
        logged = conn.execute(
            "SELECT id FROM habit_logs WHERE habit_id = ? AND completed_date = ?",
            (h["id"], today)
        ).fetchone()
        streak = _calc_streak(conn, h["id"])
        result.append({
            "id": h["id"],
            "name": h["name"],
            "category": h["category"],
            "frequency": h["frequency"],
            "target": h["target_per_period"],
            "done_today": logged is not None,
            "streak": streak,
        })
    conn.close()
    return _ok(data=result)


def habit_detail(args):
    """View a specific habit with streak, completion rate, and recent activity."""
    habit_id = args["habit_id"]
    conn = _conn(LIFEOS_DB)
    h = conn.execute("SELECT * FROM habits WHERE id = ?", (habit_id,)).fetchone()
    if not h:
        return _err(f"Habit {habit_id} not found")

    streak = _calc_streak(conn, habit_id)
    rate_7 = _calc_rate(conn, habit_id, 7)
    rate_30 = _calc_rate(conn, habit_id, 30)
    recent = conn.execute(
        "SELECT completed_date, value, note FROM habit_logs WHERE habit_id = ? ORDER BY completed_date DESC LIMIT 14",
        (habit_id,)
    ).fetchall()
    total = conn.execute("SELECT COUNT(*) as cnt FROM habit_logs WHERE habit_id = ?", (habit_id,)).fetchone()["cnt"]
    conn.close()

    return _ok(data={
        **dict(h),
        "streak": streak,
        "rate_7d": rate_7,
        "rate_30d": rate_30,
        "total_logs": total,
        "recent": _rows_to_dicts(recent),
    })


def habit_add(args):
    """Create a new habit."""
    conn = _conn(LIFEOS_DB)
    cur = conn.execute(
        "INSERT INTO habits (name, description, frequency, target_per_period, category, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (args["name"], args.get("description"), args.get("frequency", "daily"),
         args.get("target", 1), args.get("category"), _now())
    )
    conn.commit()
    hid = cur.lastrowid
    conn.close()
    return _ok(data={"id": hid}, message=f"Created habit '{args['name']}' (id={hid})")


def habit_today(args):
    """Get today's habit completion summary."""
    conn = _conn(LIFEOS_DB)
    habits = conn.execute("SELECT * FROM habits WHERE archived = 0 ORDER BY category, name").fetchall()
    today = _today()
    done = 0
    total = len(habits)
    items = []
    for h in habits:
        logged = conn.execute(
            "SELECT id FROM habit_logs WHERE habit_id = ? AND completed_date = ?",
            (h["id"], today)
        ).fetchone()
        is_done = logged is not None
        if is_done:
            done += 1
        items.append({"id": h["id"], "name": h["name"], "done": is_done})
    conn.close()
    return _ok(data={"date": today, "completed": done, "total": total, "items": items})


def _calc_streak(conn, habit_id):
    rows = conn.execute(
        "SELECT completed_date FROM habit_logs WHERE habit_id = ? ORDER BY completed_date DESC",
        (habit_id,)
    ).fetchall()
    if not rows:
        return 0
    streak = 0
    check = date.today()
    dates = {r["completed_date"] for r in rows}
    if check.isoformat() not in dates:
        check -= timedelta(days=1)
    while check.isoformat() in dates:
        streak += 1
        check -= timedelta(days=1)
    return streak


def _calc_rate(conn, habit_id, days):
    since = (date.today() - timedelta(days=days)).isoformat()
    row = conn.execute(
        "SELECT COUNT(DISTINCT completed_date) as cnt FROM habit_logs WHERE habit_id = ? AND completed_date >= ?",
        (habit_id, since)
    ).fetchone()
    return round((row["cnt"] / days) * 100, 1) if days > 0 else 0


# ===================================================================
# FITNESS
# ===================================================================

def fitness_log_workout(args):
    """Log a workout with optional exercises."""
    conn = _conn(LIFEOS_DB)
    workout_date = args.get("date", _today())
    cur = conn.execute(
        "INSERT INTO workouts (workout_type, duration_minutes, calories_burned, intensity, notes, workout_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (args["type"], args.get("duration"), args.get("calories"), args.get("intensity", "moderate"),
         args.get("notes"), workout_date, _now())
    )
    wid = cur.lastrowid

    for ex in args.get("exercises", []):
        conn.execute(
            "INSERT INTO exercises (workout_id, name, sets, reps, weight, duration_seconds, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (wid, ex["name"], ex.get("sets"), ex.get("reps"), ex.get("weight"),
             ex.get("duration_seconds"), ex.get("notes"))
        )

    conn.commit()
    conn.close()
    return _ok(data={"workout_id": wid}, message=f"Logged {args['type']} workout (id={wid})")


def fitness_log_metrics(args):
    """Log body metrics (weight, body fat, sleep, water, etc.)."""
    metric_date = args.get("date", _today())
    conn = _conn(LIFEOS_DB)
    try:
        conn.execute(
            "INSERT INTO body_metrics (metric_date, weight, body_fat_pct, resting_hr, sleep_hours, water_oz, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (metric_date, args.get("weight"), args.get("body_fat"), args.get("resting_hr"),
             args.get("sleep"), args.get("water"), args.get("notes"), _now())
        )
    except sqlite3.IntegrityError:
        conn.execute(
            "UPDATE body_metrics SET weight = COALESCE(?, weight), body_fat_pct = COALESCE(?, body_fat_pct), "
            "resting_hr = COALESCE(?, resting_hr), sleep_hours = COALESCE(?, sleep_hours), "
            "water_oz = COALESCE(?, water_oz), notes = COALESCE(?, notes) WHERE metric_date = ?",
            (args.get("weight"), args.get("body_fat"), args.get("resting_hr"),
             args.get("sleep"), args.get("water"), args.get("notes"), metric_date)
        )
    conn.commit()
    conn.close()
    return _ok(message=f"Body metrics logged for {metric_date}")


def fitness_summary(args):
    """Weekly fitness summary: workout count, total duration/calories, avg metrics."""
    days = args.get("days", 7)
    since = (date.today() - timedelta(days=days)).isoformat()
    conn = _conn(LIFEOS_DB)
    w = conn.execute(
        "SELECT COUNT(*) as cnt, SUM(duration_minutes) as total_min, SUM(calories_burned) as total_cal "
        "FROM workouts WHERE workout_date >= ?", (since,)
    ).fetchone()
    m = conn.execute(
        "SELECT AVG(weight) as avg_wt, AVG(sleep_hours) as avg_sleep, AVG(water_oz) as avg_water "
        "FROM body_metrics WHERE metric_date >= ?", (since,)
    ).fetchone()
    conn.close()
    return _ok(data={
        "period_days": days,
        "workouts": w["cnt"] or 0,
        "total_duration_min": w["total_min"] or 0,
        "total_calories": w["total_cal"] or 0,
        "avg_weight": round(m["avg_wt"], 1) if m["avg_wt"] else None,
        "avg_sleep_hours": round(m["avg_sleep"], 1) if m["avg_sleep"] else None,
        "avg_water_oz": round(m["avg_water"], 1) if m["avg_water"] else None,
    })


def fitness_list_workouts(args):
    """List recent workouts."""
    days = args.get("days", 14)
    since = (date.today() - timedelta(days=days)).isoformat()
    conn = _conn(LIFEOS_DB)
    rows = conn.execute(
        "SELECT * FROM workouts WHERE workout_date >= ? ORDER BY workout_date DESC", (since,)
    ).fetchall()
    conn.close()
    return _ok(data=_rows_to_dicts(rows))


def fitness_get_metrics(args):
    """Get recent body metrics."""
    days = args.get("days", 30)
    since = (date.today() - timedelta(days=days)).isoformat()
    conn = _conn(LIFEOS_DB)
    rows = conn.execute(
        "SELECT * FROM body_metrics WHERE metric_date >= ? ORDER BY metric_date DESC", (since,)
    ).fetchall()
    conn.close()
    return _ok(data=_rows_to_dicts(rows))


# ===================================================================
# FINANCE
# ===================================================================

def finance_add_expense(args):
    """Record an expense."""
    conn = _conn(LIFEOS_DB)
    txn_date = args.get("date", _today())
    conn.execute(
        "INSERT INTO transactions (amount, type, category, description, account, transaction_date, created_at) VALUES (?, 'expense', ?, ?, ?, ?, ?)",
        (args["amount"], args["category"], args.get("description"), args.get("account", "default"), txn_date, _now())
    )
    conn.commit()
    conn.close()
    return _ok(message=f"Expense ${args['amount']:.2f} ({args['category']}) recorded for {txn_date}")


def finance_add_income(args):
    """Record income."""
    conn = _conn(LIFEOS_DB)
    txn_date = args.get("date", _today())
    conn.execute(
        "INSERT INTO transactions (amount, type, category, description, account, transaction_date, created_at) VALUES (?, 'income', ?, ?, ?, ?, ?)",
        (args["amount"], args["category"], args.get("description"), args.get("account", "default"), txn_date, _now())
    )
    conn.commit()
    conn.close()
    return _ok(message=f"Income ${args['amount']:.2f} ({args['category']}) recorded for {txn_date}")


def finance_budget_status(args):
    """Get current month's budget status for all categories."""
    conn = _conn(LIFEOS_DB)
    today = date.today()
    month_start = today.replace(day=1).isoformat()
    if today.month == 12:
        month_end = today.replace(year=today.year + 1, month=1, day=1).isoformat()
    else:
        month_end = today.replace(month=today.month + 1, day=1).isoformat()

    budgets = conn.execute("SELECT * FROM budgets ORDER BY category").fetchall()
    result = []
    for b in budgets:
        spent = conn.execute(
            "SELECT COALESCE(SUM(amount), 0) as spent FROM transactions "
            "WHERE type = 'expense' AND category = ? AND transaction_date >= ? AND transaction_date < ?",
            (b["category"], month_start, month_end)
        ).fetchone()["spent"]
        remaining = b["monthly_limit"] - spent
        pct = round((spent / b["monthly_limit"]) * 100, 1) if b["monthly_limit"] > 0 else 0
        result.append({
            "category": b["category"],
            "limit": b["monthly_limit"],
            "spent": round(spent, 2),
            "remaining": round(remaining, 2),
            "pct_used": pct,
            "status": "OVER" if remaining < 0 else "WARNING" if pct >= 80 else "OK",
        })
    conn.close()
    return _ok(data={"month": today.strftime("%Y-%m"), "budgets": result})


def finance_monthly_summary(args):
    """Monthly income/expense breakdown by category."""
    today = date.today()
    year = args.get("year", today.year)
    month = args.get("month", today.month)
    month_start = date(year, month, 1).isoformat()
    if month == 12:
        month_end = date(year + 1, 1, 1).isoformat()
    else:
        month_end = date(year, month + 1, 1).isoformat()

    conn = _conn(LIFEOS_DB)
    rows = conn.execute(
        "SELECT type, category, SUM(amount) as total, COUNT(*) as cnt "
        "FROM transactions WHERE transaction_date >= ? AND transaction_date < ? "
        "GROUP BY type, category ORDER BY type DESC, total DESC",
        (month_start, month_end)
    ).fetchall()
    conn.close()

    income_total = sum(r["total"] for r in rows if r["type"] == "income")
    expense_total = sum(r["total"] for r in rows if r["type"] == "expense")
    return _ok(data={
        "month": f"{year}-{month:02d}",
        "income_total": round(income_total, 2),
        "expense_total": round(expense_total, 2),
        "net": round(income_total - expense_total, 2),
        "categories": _rows_to_dicts(rows),
    })


def finance_list_transactions(args):
    """List recent transactions with optional filters."""
    days = args.get("days", 30)
    since = (date.today() - timedelta(days=days)).isoformat()
    conn = _conn(LIFEOS_DB)

    query = "SELECT * FROM transactions WHERE transaction_date >= ?"
    params = [since]
    if args.get("category"):
        query += " AND category = ?"
        params.append(args["category"])
    if args.get("type"):
        query += " AND type = ?"
        params.append(args["type"])
    query += " ORDER BY transaction_date DESC"

    rows = conn.execute(query, params).fetchall()
    conn.close()
    return _ok(data=_rows_to_dicts(rows))


# ===================================================================
# JOURNAL
# ===================================================================

def journal_write(args):
    """Write a journal entry."""
    conn = _conn(LIFEOS_DB)
    entry_date = args.get("date", _today())
    now = _now()
    tags = args.get("tags")
    if isinstance(tags, list):
        tags = ",".join(tags)

    cur = conn.execute(
        "INSERT INTO journal_entries (entry_date, mood, energy, title, content, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (entry_date, args.get("mood"), args.get("energy"), args.get("title"), args["content"], tags, now, now)
    )
    eid = cur.lastrowid
    conn.commit()
    conn.close()
    return _ok(data={"entry_id": eid}, message=f"Journal entry saved for {entry_date}")


def journal_gratitude(args):
    """Log gratitude items."""
    conn = _conn(LIFEOS_DB)
    entry_date = args.get("date", _today())
    now = _now()
    items = args["items"]
    for item in items:
        conn.execute(
            "INSERT INTO gratitude (entry_date, item, created_at) VALUES (?, ?, ?)",
            (entry_date, item, now)
        )
    conn.commit()
    conn.close()
    return _ok(message=f"Logged {len(items)} gratitude item(s) for {entry_date}")


def journal_mood_trend(args):
    """Get mood and energy trends."""
    days = args.get("days", 14)
    since = (date.today() - timedelta(days=days)).isoformat()
    conn = _conn(LIFEOS_DB)
    rows = conn.execute(
        "SELECT entry_date, AVG(mood) as avg_mood, AVG(energy) as avg_energy "
        "FROM journal_entries WHERE entry_date >= ? AND mood IS NOT NULL "
        "GROUP BY entry_date ORDER BY entry_date",
        (since,)
    ).fetchall()
    overall = conn.execute(
        "SELECT AVG(mood) as avg_m, AVG(energy) as avg_e FROM journal_entries WHERE entry_date >= ? AND mood IS NOT NULL",
        (since,)
    ).fetchone()
    conn.close()
    return _ok(data={
        "period_days": days,
        "trend": [{"date": r["entry_date"], "mood": round(r["avg_mood"], 1), "energy": round(r["avg_energy"], 1)} for r in rows],
        "avg_mood": round(overall["avg_m"], 1) if overall["avg_m"] else None,
        "avg_energy": round(overall["avg_e"], 1) if overall["avg_e"] else None,
    })


def journal_search(args):
    """Search journal entries by content, title, or tags."""
    term = f"%{args['term']}%"
    conn = _conn(LIFEOS_DB)
    rows = conn.execute(
        "SELECT id, entry_date, title, mood, energy, tags, substr(content, 1, 200) as preview "
        "FROM journal_entries WHERE content LIKE ? OR title LIKE ? OR tags LIKE ? "
        "ORDER BY entry_date DESC LIMIT 20",
        (term, term, term)
    ).fetchall()
    conn.close()
    return _ok(data=_rows_to_dicts(rows))


def journal_list(args):
    """List recent journal entries."""
    days = args.get("days", 30)
    since = (date.today() - timedelta(days=days)).isoformat()
    conn = _conn(LIFEOS_DB)

    query = "SELECT id, entry_date, title, mood, energy, tags FROM journal_entries WHERE entry_date >= ?"
    params = [since]
    if args.get("tag"):
        query += " AND tags LIKE ?"
        params.append(f"%{args['tag']}%")
    query += " ORDER BY entry_date DESC"

    rows = conn.execute(query, params).fetchall()

    # Also get gratitude items per date
    gratitude = {}
    g_rows = conn.execute(
        "SELECT entry_date, item FROM gratitude WHERE entry_date >= ? ORDER BY entry_date DESC", (since,)
    ).fetchall()
    for g in g_rows:
        gratitude.setdefault(g["entry_date"], []).append(g["item"])

    conn.close()
    return _ok(data={"entries": _rows_to_dicts(rows), "gratitude_by_date": gratitude})


# ===================================================================
# GOALS
# ===================================================================

def goal_list(args):
    """List goals with optional status/category filter."""
    conn = _conn(LIFEOS_DB)
    query = "SELECT * FROM goals WHERE 1=1"
    params = []
    if args.get("status"):
        query += " AND status = ?"
        params.append(args["status"])
    if args.get("category"):
        query += " AND category = ?"
        params.append(args["category"])
    query += " ORDER BY CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, updated_at DESC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return _ok(data=_rows_to_dicts(rows))


def goal_detail(args):
    """View a goal with milestones and recent updates."""
    goal_id = args["goal_id"]
    conn = _conn(LIFEOS_DB)
    g = conn.execute("SELECT * FROM goals WHERE id = ?", (goal_id,)).fetchone()
    if not g:
        return _err(f"Goal {goal_id} not found")

    milestones = conn.execute(
        "SELECT * FROM milestones WHERE goal_id = ? ORDER BY sort_order", (goal_id,)
    ).fetchall()
    updates = conn.execute(
        "SELECT * FROM goal_updates WHERE goal_id = ? ORDER BY created_at DESC LIMIT 10", (goal_id,)
    ).fetchall()
    conn.close()

    return _ok(data={
        **dict(g),
        "milestones": _rows_to_dicts(milestones),
        "recent_updates": _rows_to_dicts(updates),
    })


def goal_update_progress(args):
    """Update goal progress and optionally add a note."""
    goal_id = args["goal_id"]
    progress = args["progress"]
    note = args.get("note", "Progress updated")

    conn = _conn(LIFEOS_DB)
    g = conn.execute("SELECT title, progress FROM goals WHERE id = ?", (goal_id,)).fetchone()
    if not g:
        return _err(f"Goal {goal_id} not found")

    old_progress = g["progress"]
    now = _now()
    conn.execute("UPDATE goals SET progress = ?, updated_at = ? WHERE id = ?", (progress, now, goal_id))
    conn.execute(
        "INSERT INTO goal_updates (goal_id, update_text, old_progress, new_progress, created_at) VALUES (?, ?, ?, ?, ?)",
        (goal_id, note, old_progress, progress, now)
    )
    if progress >= 100:
        conn.execute("UPDATE goals SET status = 'completed', completed_at = ? WHERE id = ?", (now, goal_id))

    conn.commit()
    conn.close()
    msg = f"'{g['title']}' updated: {old_progress}% -> {progress}%"
    if progress >= 100:
        msg += " (COMPLETED!)"
    return _ok(message=msg)


def goal_complete_milestone(args):
    """Mark a milestone as completed and auto-update goal progress."""
    milestone_id = args["milestone_id"]
    conn = _conn(LIFEOS_DB)
    m = conn.execute(
        "SELECT m.*, g.title as goal_title, g.id as gid FROM milestones m JOIN goals g ON m.goal_id = g.id WHERE m.id = ?",
        (milestone_id,)
    ).fetchone()
    if not m:
        return _err(f"Milestone {milestone_id} not found")

    now = _now()
    conn.execute("UPDATE milestones SET completed = 1, completed_at = ? WHERE id = ?", (now, milestone_id))

    counts = conn.execute(
        "SELECT COUNT(*) as total, SUM(completed) as done FROM milestones WHERE goal_id = ?", (m["gid"],)
    ).fetchone()
    new_progress = round((counts["done"] / counts["total"]) * 100) if counts["total"] > 0 else 0
    conn.execute("UPDATE goals SET progress = ?, updated_at = ? WHERE id = ?", (new_progress, now, m["gid"]))
    conn.execute(
        "INSERT INTO goal_updates (goal_id, update_text, old_progress, new_progress, created_at) VALUES (?, ?, ?, ?, ?)",
        (m["gid"], f"Milestone '{m['title']}' completed", None, new_progress, now)
    )
    if new_progress >= 100:
        conn.execute("UPDATE goals SET status = 'completed', completed_at = ? WHERE id = ?", (now, m["gid"]))

    conn.commit()
    conn.close()
    msg = f"Milestone '{m['title']}' completed. '{m['goal_title']}' now at {new_progress}%"
    if new_progress >= 100:
        msg += " (GOAL COMPLETED!)"
    return _ok(message=msg)


def goal_add(args):
    """Create a new goal with optional milestones."""
    conn = _conn(LIFEOS_DB)
    now = _now()
    cur = conn.execute(
        "INSERT INTO goals (title, description, category, priority, target_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (args["title"], args.get("description"), args.get("category"),
         args.get("priority", "medium"), args.get("target_date"), now, now)
    )
    gid = cur.lastrowid

    for i, ms in enumerate(args.get("milestones", [])):
        conn.execute(
            "INSERT INTO milestones (goal_id, title, description, target_date, sort_order) VALUES (?, ?, ?, ?, ?)",
            (gid, ms["title"], ms.get("description"), ms.get("target_date"), i + 1)
        )

    conn.commit()
    conn.close()
    return _ok(data={"goal_id": gid}, message=f"Created goal '{args['title']}' (id={gid})")


# ===================================================================
# CONTACTS (dating tracker -- uses contacts.db)
# ===================================================================

def contacts_list(args):
    """List dating contacts with optional status/platform filter."""
    conn = _conn(CONTACTS_DB)
    query = "SELECT * FROM contacts WHERE 1=1"
    params = []
    if args.get("status"):
        query += " AND status = ?"
        params.append(args["status"])
    if args.get("platform"):
        query += " AND platform = ?"
        params.append(args["platform"])
    query += " ORDER BY last_contact_date DESC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return _ok(data=_rows_to_dicts(rows))


def contacts_view(args):
    """View a contact with all notes."""
    contact_id = args["contact_id"]
    conn = _conn(CONTACTS_DB)
    c = conn.execute("SELECT * FROM contacts WHERE id = ?", (contact_id,)).fetchone()
    if not c:
        return _err(f"Contact {contact_id} not found")
    notes = conn.execute(
        "SELECT * FROM notes WHERE contact_id = ? ORDER BY created_at DESC", (contact_id,)
    ).fetchall()
    conn.close()
    return _ok(data={**dict(c), "notes": _rows_to_dicts(notes)})


def contacts_add_note(args):
    """Add a note to a contact."""
    contact_id = args["contact_id"]
    conn = _conn(CONTACTS_DB)
    c = conn.execute("SELECT name FROM contacts WHERE id = ?", (contact_id,)).fetchone()
    if not c:
        return _err(f"Contact {contact_id} not found")
    conn.execute(
        "INSERT INTO notes (contact_id, note, created_at) VALUES (?, ?, ?)",
        (contact_id, args["note"], _now())
    )
    conn.commit()
    conn.close()
    return _ok(message=f"Note added for {c['name']}")


def contacts_mark_contacted(args):
    """Record that you contacted someone."""
    contact_id = args["contact_id"]
    contact_date = args.get("date", _today())
    conn = _conn(CONTACTS_DB)
    c = conn.execute("SELECT name FROM contacts WHERE id = ?", (contact_id,)).fetchone()
    if not c:
        return _err(f"Contact {contact_id} not found")
    conn.execute(
        "UPDATE contacts SET last_contact_date = ?, updated_at = ? WHERE id = ?",
        (contact_date, _now(), contact_id)
    )
    conn.commit()
    conn.close()
    return _ok(message=f"Marked {c['name']} as contacted on {contact_date}")


def contacts_reminders(args):
    """Show contacts you haven't reached out to in 3+ days."""
    threshold = (date.today() - timedelta(days=args.get("days", 3))).isoformat()
    conn = _conn(CONTACTS_DB)
    rows = conn.execute(
        "SELECT * FROM contacts WHERE status = 'active' AND (last_contact_date < ? OR last_contact_date IS NULL) ORDER BY last_contact_date ASC",
        (threshold,)
    ).fetchall()
    conn.close()
    return _ok(data=_rows_to_dicts(rows))


def contacts_search(args):
    """Search contacts by name or note content."""
    term = f"%{args['term']}%"
    conn = _conn(CONTACTS_DB)
    rows = conn.execute(
        "SELECT DISTINCT c.* FROM contacts c LEFT JOIN notes n ON c.id = n.contact_id "
        "WHERE c.name LIKE ? OR n.note LIKE ? ORDER BY c.last_contact_date DESC",
        (term, term)
    ).fetchall()
    conn.close()
    return _ok(data=_rows_to_dicts(rows))


def contacts_add(args):
    """Add a new dating contact."""
    conn = _conn(CONTACTS_DB)
    now = _now()
    first_date = args.get("first_contact_date", _today())
    cur = conn.execute(
        "INSERT INTO contacts (name, platform, phone, first_contact_date, last_contact_date, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (args["name"], args.get("platform"), args.get("phone"), first_date, first_date,
         args.get("status", "active"), now, now)
    )
    cid = cur.lastrowid

    if args.get("note"):
        conn.execute("INSERT INTO notes (contact_id, note, created_at) VALUES (?, ?, ?)", (cid, args["note"], now))

    conn.commit()
    conn.close()
    return _ok(data={"contact_id": cid}, message=f"Added contact '{args['name']}' (id={cid})")


def contacts_update_status(args):
    """Update a contact's status."""
    contact_id = args["contact_id"]
    status = args["status"]
    if status not in ("active", "dating", "ghosted", "ended"):
        return _err(f"Invalid status '{status}'. Use: active, dating, ghosted, ended")

    conn = _conn(CONTACTS_DB)
    c = conn.execute("SELECT name FROM contacts WHERE id = ?", (contact_id,)).fetchone()
    if not c:
        return _err(f"Contact {contact_id} not found")
    conn.execute("UPDATE contacts SET status = ?, updated_at = ? WHERE id = ?", (status, _now(), contact_id))
    conn.commit()
    conn.close()
    return _ok(message=f"Updated {c['name']} status to '{status}'")


# ===================================================================
# DASHBOARD -- cross-domain summary
# ===================================================================

def dashboard(args):
    """Get a full life dashboard: habits, fitness, finance, mood, goals, contacts."""
    conn_l = _conn(LIFEOS_DB)
    conn_c = _conn(CONTACTS_DB)
    today = _today()
    week_ago = (date.today() - timedelta(days=7)).isoformat()

    # Habits today
    habits = conn_l.execute("SELECT * FROM habits WHERE archived = 0", ()).fetchall()
    habits_done = 0
    for h in habits:
        if conn_l.execute("SELECT id FROM habit_logs WHERE habit_id = ? AND completed_date = ?", (h["id"], today)).fetchone():
            habits_done += 1

    # Workouts this week
    wk = conn_l.execute("SELECT COUNT(*) as cnt FROM workouts WHERE workout_date >= ?", (week_ago,)).fetchone()

    # Budget status (current month)
    month_start = date.today().replace(day=1).isoformat()
    expense_total = conn_l.execute(
        "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND transaction_date >= ?",
        (month_start,)
    ).fetchone()["total"]
    income_total = conn_l.execute(
        "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income' AND transaction_date >= ?",
        (month_start,)
    ).fetchone()["total"]

    # Mood (latest)
    latest_mood = conn_l.execute(
        "SELECT mood, energy, entry_date FROM journal_entries WHERE mood IS NOT NULL ORDER BY entry_date DESC LIMIT 1"
    ).fetchone()

    # Active goals
    active_goals = conn_l.execute("SELECT COUNT(*) as cnt FROM goals WHERE status = 'active'").fetchone()["cnt"]

    # Contact reminders
    threshold = (date.today() - timedelta(days=3)).isoformat()
    follow_ups = conn_c.execute(
        "SELECT COUNT(*) as cnt FROM contacts WHERE status = 'active' AND (last_contact_date < ? OR last_contact_date IS NULL)",
        (threshold,)
    ).fetchone()["cnt"]

    conn_l.close()
    conn_c.close()

    return _ok(data={
        "date": today,
        "habits": {"done": habits_done, "total": len(habits)},
        "fitness": {"workouts_this_week": wk["cnt"] or 0},
        "finance": {"month_income": round(income_total, 2), "month_expenses": round(expense_total, 2), "net": round(income_total - expense_total, 2)},
        "mood": {"mood": latest_mood["mood"], "energy": latest_mood["energy"], "date": latest_mood["entry_date"]} if latest_mood else None,
        "goals": {"active": active_goals},
        "contacts": {"need_follow_up": follow_ups},
    })


# ===================================================================
# Tool dispatch
# ===================================================================

TOOLS = {
    # Habits
    "habit_log": habit_log,
    "habit_list": habit_list,
    "habit_detail": habit_detail,
    "habit_add": habit_add,
    "habit_today": habit_today,
    # Fitness
    "fitness_log_workout": fitness_log_workout,
    "fitness_log_metrics": fitness_log_metrics,
    "fitness_summary": fitness_summary,
    "fitness_list_workouts": fitness_list_workouts,
    "fitness_get_metrics": fitness_get_metrics,
    # Finance
    "finance_add_expense": finance_add_expense,
    "finance_add_income": finance_add_income,
    "finance_budget_status": finance_budget_status,
    "finance_monthly_summary": finance_monthly_summary,
    "finance_list_transactions": finance_list_transactions,
    # Journal
    "journal_write": journal_write,
    "journal_gratitude": journal_gratitude,
    "journal_mood_trend": journal_mood_trend,
    "journal_search": journal_search,
    "journal_list": journal_list,
    # Goals
    "goal_list": goal_list,
    "goal_detail": goal_detail,
    "goal_update_progress": goal_update_progress,
    "goal_complete_milestone": goal_complete_milestone,
    "goal_add": goal_add,
    # Contacts
    "contacts_list": contacts_list,
    "contacts_view": contacts_view,
    "contacts_add_note": contacts_add_note,
    "contacts_mark_contacted": contacts_mark_contacted,
    "contacts_reminders": contacts_reminders,
    "contacts_search": contacts_search,
    "contacts_add": contacts_add,
    "contacts_update_status": contacts_update_status,
    # Dashboard
    "dashboard": dashboard,
}


def main():
    parser = argparse.ArgumentParser(description="LifeOS AgentSkill")
    parser.add_argument("--tool", required=True, choices=list(TOOLS.keys()), help="Tool to execute")
    parser.add_argument("--args", default="{}", help="JSON arguments")
    parsed = parser.parse_args()

    try:
        args = json.loads(parsed.args)
    except json.JSONDecodeError as e:
        print(json.dumps(_err(f"Invalid JSON args: {e}")))
        sys.exit(1)

    try:
        result = TOOLS[parsed.tool](args)
    except Exception as e:
        result = _err(f"Tool error: {type(e).__name__}: {e}")

    print(json.dumps(result, default=str))


if __name__ == "__main__":
    main()
