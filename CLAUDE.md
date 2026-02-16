# LifeOS - Claude Integration Reference

## Project Overview
LifeOS is a personal life management system with multiple CLI components, all backed by SQLite databases.

## Databases

### contacts.db (Dating Tracker)
```python
import sqlite3
conn = sqlite3.connect("contacts.db")
conn.row_factory = sqlite3.Row
```

**contacts** table:
- `id` INTEGER PRIMARY KEY
- `name` TEXT, `platform` TEXT, `phone` TEXT
- `first_contact_date` TEXT (YYYY-MM-DD), `last_contact_date` TEXT (YYYY-MM-DD)
- `status` TEXT (active, dating, ghosted, ended)
- `created_at` TEXT, `updated_at` TEXT

**notes** table:
- `id` INTEGER PRIMARY KEY
- `contact_id` INTEGER (FK -> contacts.id, CASCADE delete)
- `note` TEXT, `created_at` TEXT

### lifeos.db (All Other Components)
```python
conn = sqlite3.connect("lifeos.db")
conn.row_factory = sqlite3.Row
```

**habits** table:
- `id`, `name` TEXT, `description` TEXT, `frequency` TEXT (daily/weekly)
- `target_per_period` INTEGER, `category` TEXT, `archived` INTEGER, `created_at` TEXT

**habit_logs** table:
- `id`, `habit_id` INTEGER (FK), `completed_date` TEXT, `value` REAL, `note` TEXT, `created_at` TEXT
- UNIQUE(habit_id, completed_date)

**workouts** table:
- `id`, `workout_type` TEXT, `duration_minutes` INTEGER, `calories_burned` INTEGER
- `intensity` TEXT, `notes` TEXT, `workout_date` TEXT, `created_at` TEXT

**exercises** table:
- `id`, `workout_id` INTEGER (FK), `name` TEXT, `sets` INTEGER, `reps` INTEGER
- `weight` REAL, `duration_seconds` INTEGER, `notes` TEXT

**body_metrics** table:
- `id`, `metric_date` TEXT (UNIQUE), `weight` REAL, `body_fat_pct` REAL
- `resting_hr` INTEGER, `sleep_hours` REAL, `water_oz` REAL, `notes` TEXT, `created_at` TEXT

**transactions** table:
- `id`, `amount` REAL, `type` TEXT (income/expense), `category` TEXT
- `description` TEXT, `account` TEXT, `transaction_date` TEXT, `created_at` TEXT

**budgets** table:
- `id`, `category` TEXT (UNIQUE), `monthly_limit` REAL, `created_at` TEXT

**recurring** table:
- `id`, `amount` REAL, `type` TEXT, `category` TEXT, `description` TEXT
- `frequency` TEXT, `next_date` TEXT, `active` INTEGER, `created_at` TEXT

**journal_entries** table:
- `id`, `entry_date` TEXT, `mood` INTEGER (1-10), `energy` INTEGER (1-10)
- `title` TEXT, `content` TEXT, `tags` TEXT, `created_at` TEXT, `updated_at` TEXT

**gratitude** table:
- `id`, `entry_date` TEXT, `item` TEXT, `created_at` TEXT

**goals** table:
- `id`, `title` TEXT, `description` TEXT, `category` TEXT
- `priority` TEXT (low/medium/high/critical), `status` TEXT (active/paused/completed/abandoned)
- `target_date` TEXT, `progress` INTEGER (0-100), `created_at` TEXT, `updated_at` TEXT, `completed_at` TEXT

**milestones** table:
- `id`, `goal_id` INTEGER (FK), `title` TEXT, `description` TEXT
- `completed` INTEGER, `target_date` TEXT, `completed_at` TEXT, `sort_order` INTEGER

**goal_updates** table:
- `id`, `goal_id` INTEGER (FK), `update_text` TEXT
- `old_progress` INTEGER, `new_progress` INTEGER, `created_at` TEXT

## Tools
- `python3 lifeos.py` - Unified dashboard and launcher
- `python3 dating_tracker.py` - Dating contact management
- `python3 habit_tracker.py` - Habit tracking with streaks
- `python3 fitness_tracker.py` - Workout and health metrics
- `python3 finance_tracker.py` - Income, expenses, budgets
- `python3 journal.py` - Journaling with mood tracking
- `python3 goal_tracker.py` - Goals and milestones
- `python3 export_archive.py` - Export data for Claude.ai
- `python3 mcp_server.py` - MCP server for live Claude access

## Instructions for Claude
When the user asks about their life data:
1. Query the appropriate database directly using Python/sqlite3
2. `contacts.db` for dating data, `lifeos.db` for everything else
3. All databases are read-safe for SELECT queries
4. To modify data, use the functions in the respective Python modules or direct SQL
