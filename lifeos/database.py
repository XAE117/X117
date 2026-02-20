"""
Core database engine for LifeOS.

Implements the hub-and-spoke relational architecture using SQLite.
All master databases are defined here with their full relational schema,
enforcing the hierarchy: Areas -> Goals -> Projects -> Tasks.
"""

import sqlite3
import os
from datetime import datetime, date
from contextlib import contextmanager

from .config import DEFAULT_DB_PATH


class Database:
    """SQLite database engine with hub-and-spoke relational architecture."""

    def __init__(self, db_path=None):
        self.db_path = db_path or DEFAULT_DB_PATH
        self._ensure_directory()
        self._initialize()

    def _ensure_directory(self):
        """Ensure the database directory exists."""
        directory = os.path.dirname(os.path.abspath(self.db_path))
        os.makedirs(directory, exist_ok=True)

    @contextmanager
    def connection(self):
        """Context manager for database connections."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("PRAGMA journal_mode = WAL")
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def _initialize(self):
        """Create all tables if they don't exist."""
        with self.connection() as conn:
            conn.executescript(SCHEMA_SQL)

    def execute(self, sql, params=None):
        """Execute a single SQL statement and return results."""
        with self.connection() as conn:
            cursor = conn.execute(sql, params or ())
            if sql.strip().upper().startswith('SELECT'):
                return [dict(row) for row in cursor.fetchall()]
            return cursor.lastrowid

    def execute_many(self, sql, params_list):
        """Execute a SQL statement with multiple parameter sets."""
        with self.connection() as conn:
            conn.executemany(sql, params_list)

    def count(self, table, where=None, params=None):
        """Count rows in a table with optional WHERE clause."""
        sql = f"SELECT COUNT(*) as count FROM {table}"
        if where:
            sql += f" WHERE {where}"
        result = self.execute(sql, params)
        return result[0]['count'] if result else 0


# ============================================================================
# Complete Database Schema
# Hub-and-spoke architecture with relational integrity
# ============================================================================

SCHEMA_SQL = """
-- ============================================================================
-- AREAS (Life Pillars) - Top of hierarchy
-- Represents major life domains: Career, Health, Finances, etc.
-- ============================================================================
CREATE TABLE IF NOT EXISTS areas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT DEFAULT '📋',
    color TEXT DEFAULT '#6B7280',
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- GOALS - Connected to Areas
-- SMART goals with measurable targets and deadlines
-- ============================================================================
CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    area_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    target_value REAL,
    current_value REAL DEFAULT 0,
    unit TEXT,
    status TEXT DEFAULT 'not_started'
        CHECK(status IN ('not_started','in_progress','on_track','at_risk','achieved','abandoned')),
    start_date DATE,
    target_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL
);

-- ============================================================================
-- PROJECTS - Connected to Goals and Areas
-- Finite containers for work with defined outcomes
-- ============================================================================
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    area_id INTEGER,
    goal_id INTEGER,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'not_started'
        CHECK(status IN ('not_started','in_progress','on_hold','completed','archived')),
    priority TEXT DEFAULT 'medium'
        CHECK(priority IN ('critical','high','medium','low','none')),
    start_date DATE,
    due_date DATE,
    completed_date DATE,
    para_category TEXT DEFAULT 'Projects'
        CHECK(para_category IN ('Projects','Areas','Resources','Archives')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL,
    FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL
);

-- ============================================================================
-- MASTER TASKS - Core GTD task management
-- The primary execution engine of the LifeOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    area_id INTEGER,
    goal_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'inbox'
        CHECK(status IN ('inbox','next_action','waiting','someday','in_progress','done','archived')),
    priority TEXT DEFAULT 'medium'
        CHECK(priority IN ('critical','high','medium','low','none')),
    energy_level TEXT DEFAULT 'medium'
        CHECK(energy_level IN ('high','medium','low')),
    context TEXT,
    due_date DATE,
    do_date DATE,
    completed_date TIMESTAMP,
    estimated_minutes INTEGER,
    actual_minutes INTEGER,
    is_recurring INTEGER DEFAULT 0,
    recur_interval INTEGER,
    recur_unit TEXT CHECK(recur_unit IN ('days','weeks','months','years')),
    recur_from TEXT DEFAULT 'due_date'
        CHECK(recur_from IN ('due_date','completion_date')),
    waiting_for TEXT,
    delegated_to TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL,
    FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL
);

-- ============================================================================
-- INBOX - Frictionless capture for untriaged items
-- Zero-friction entry point for all new information
-- ============================================================================
CREATE TABLE IF NOT EXISTS inbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'thought'
        CHECK(type IN ('thought','task','note','resource','idea','reminder')),
    source TEXT,
    context TEXT,
    is_processed INTEGER DEFAULT 0,
    processed_to TEXT,
    processed_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- HABITS - Daily/weekly/monthly habit tracking
-- Button-based logging with streak calculation
-- ============================================================================
CREATE TABLE IF NOT EXISTS habits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    area_id INTEGER,
    name TEXT NOT NULL,
    description TEXT,
    frequency TEXT DEFAULT 'daily'
        CHECK(frequency IN ('daily','weekly','monthly')),
    target_count INTEGER DEFAULT 1,
    icon TEXT DEFAULT '✅',
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS habit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_id INTEGER NOT NULL,
    log_date DATE NOT NULL,
    count INTEGER DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
    UNIQUE(habit_id, log_date)
);

-- ============================================================================
-- DAILY JOURNAL - Prompted daily reflection entries
-- ============================================================================
CREATE TABLE IF NOT EXISTS journal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_date DATE NOT NULL UNIQUE,
    mood INTEGER CHECK(mood BETWEEN 1 AND 10),
    energy INTEGER CHECK(energy BETWEEN 1 AND 10),
    gratitude TEXT,
    morning_intention TEXT,
    daily_highlights TEXT,
    evening_reflection TEXT,
    lessons_learned TEXT,
    tomorrow_priorities TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- FINANCE HUB - Income, expenses, budgets, net worth
-- ============================================================================
CREATE TABLE IF NOT EXISTS finance_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL
        CHECK(type IN ('checking','savings','credit_card','investment','cash','other')),
    balance REAL DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS finance_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER,
    type TEXT NOT NULL CHECK(type IN ('income','expense','transfer')),
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    transaction_date DATE NOT NULL,
    is_recurring INTEGER DEFAULT 0,
    recur_interval INTEGER,
    recur_unit TEXT,
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES finance_accounts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS finance_budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    monthly_limit REAL NOT NULL,
    year_month TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category, year_month)
);

-- ============================================================================
-- FITNESS OS - Workout logs, exercises, body metrics
-- ============================================================================
CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_date DATE NOT NULL,
    type TEXT NOT NULL,
    name TEXT,
    duration_minutes INTEGER,
    calories_burned INTEGER,
    intensity TEXT CHECK(intensity IN ('low','moderate','high','max')),
    notes TEXT,
    rating INTEGER CHECK(rating BETWEEN 1 AND 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workout_exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_id INTEGER NOT NULL,
    exercise_name TEXT NOT NULL,
    sets INTEGER,
    reps INTEGER,
    weight REAL,
    weight_unit TEXT DEFAULT 'lbs',
    duration_seconds INTEGER,
    distance REAL,
    distance_unit TEXT DEFAULT 'miles',
    notes TEXT,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS body_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_date DATE NOT NULL,
    weight REAL,
    weight_unit TEXT DEFAULT 'lbs',
    body_fat_pct REAL,
    sleep_hours REAL,
    water_oz REAL,
    steps INTEGER,
    resting_heart_rate INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(metric_date)
);

-- ============================================================================
-- MEALS PLANNER - Nutrition tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS meals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meal_date DATE NOT NULL,
    meal_type TEXT NOT NULL
        CHECK(meal_type IN ('breakfast','lunch','dinner','snack')),
    name TEXT NOT NULL,
    calories INTEGER,
    protein_g REAL,
    carbs_g REAL,
    fat_g REAL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- KNOWLEDGE BASE - Second Brain / PARA Resources
-- ============================================================================
CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    area_id INTEGER,
    title TEXT NOT NULL,
    content TEXT,
    type TEXT DEFAULT 'note'
        CHECK(type IN ('note','meeting','idea','reference','web_clip','template')),
    source_url TEXT,
    para_category TEXT DEFAULT 'Resources'
        CHECK(para_category IN ('Projects','Areas','Resources','Archives')),
    tags TEXT,
    is_starred INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL
);

-- ============================================================================
-- READING TRACKER - Books, articles, courses
-- ============================================================================
CREATE TABLE IF NOT EXISTS reading_list (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    area_id INTEGER,
    title TEXT NOT NULL,
    author TEXT,
    type TEXT DEFAULT 'book'
        CHECK(type IN ('book','article','video','podcast','course','paper','web_clip','other')),
    status TEXT DEFAULT 'to_read'
        CHECK(status IN ('to_read','reading','completed','abandoned')),
    total_pages INTEGER,
    current_page INTEGER DEFAULT 0,
    rating INTEGER CHECK(rating BETWEEN 1 AND 5),
    start_date DATE,
    finish_date DATE,
    source_url TEXT,
    summary TEXT,
    key_insights TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS reading_highlights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reading_id INTEGER NOT NULL,
    highlight TEXT NOT NULL,
    page_number INTEGER,
    chapter TEXT,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reading_id) REFERENCES reading_list(id) ON DELETE CASCADE
);

-- ============================================================================
-- ARCHIVE - Long-term storage for completed/inactive items
-- ============================================================================
CREATE TABLE IF NOT EXISTS archive (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_table TEXT NOT NULL,
    source_id INTEGER NOT NULL,
    data_json TEXT NOT NULL,
    archived_reason TEXT,
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TASK HISTORY - Preserves completion records for recurring tasks
-- ============================================================================
CREATE TABLE IF NOT EXISTS task_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    completed_at TIMESTAMP NOT NULL,
    actual_minutes INTEGER,
    notes TEXT,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- ============================================================================
-- POMODORO SESSIONS - Deep work tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS pomodoro_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER,
    session_date DATE NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration_minutes INTEGER DEFAULT 25,
    type TEXT DEFAULT 'work' CHECK(type IN ('work','break','long_break')),
    completed INTEGER DEFAULT 0,
    notes TEXT,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
);

-- ============================================================================
-- WEEKLY REVIEWS - GTD review tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS weekly_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    review_date DATE NOT NULL,
    week_number INTEGER,
    wins TEXT,
    challenges TEXT,
    lessons TEXT,
    next_week_priorities TEXT,
    inbox_cleared INTEGER DEFAULT 0,
    projects_reviewed INTEGER DEFAULT 0,
    goals_reviewed INTEGER DEFAULT 0,
    habits_reviewed INTEGER DEFAULT 0,
    overall_rating INTEGER CHECK(overall_rating BETWEEN 1 AND 10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TAGS - Flexible tagging system
-- ============================================================================
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#6B7280',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS item_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tag_id INTEGER NOT NULL,
    item_type TEXT NOT NULL,
    item_id INTEGER NOT NULL,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE(tag_id, item_type, item_id)
);

-- ============================================================================
-- INDEXES for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_area ON tasks(area_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_do_date ON tasks(do_date);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_area ON projects(area_id);
CREATE INDEX IF NOT EXISTS idx_goals_area ON goals(area_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_inbox_processed ON inbox(is_processed);
CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON habit_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit ON habit_logs(habit_id);
CREATE INDEX IF NOT EXISTS idx_journal_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_finance_tx_date ON finance_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_finance_tx_category ON finance_transactions(category);
CREATE INDEX IF NOT EXISTS idx_notes_area ON notes(area_id);
CREATE INDEX IF NOT EXISTS idx_notes_project ON notes(project_id);
CREATE INDEX IF NOT EXISTS idx_reading_status ON reading_list(status);
CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(workout_date);
CREATE INDEX IF NOT EXISTS idx_body_metrics_date ON body_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_meals_date ON meals(meal_date);
CREATE INDEX IF NOT EXISTS idx_pomodoro_date ON pomodoro_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_item_tags ON item_tags(item_type, item_id);

-- ============================================================================
-- TRIGGERS for updated_at timestamps
-- ============================================================================
CREATE TRIGGER IF NOT EXISTS update_areas_timestamp
    AFTER UPDATE ON areas
    BEGIN UPDATE areas SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS update_goals_timestamp
    AFTER UPDATE ON goals
    BEGIN UPDATE goals SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS update_projects_timestamp
    AFTER UPDATE ON projects
    BEGIN UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS update_tasks_timestamp
    AFTER UPDATE ON tasks
    BEGIN UPDATE tasks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS update_habits_timestamp
    AFTER UPDATE ON habits
    BEGIN UPDATE habits SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS update_journal_timestamp
    AFTER UPDATE ON journal_entries
    BEGIN UPDATE journal_entries SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS update_notes_timestamp
    AFTER UPDATE ON notes
    BEGIN UPDATE notes SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS update_reading_timestamp
    AFTER UPDATE ON reading_list
    BEGIN UPDATE reading_list SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS update_accounts_timestamp
    AFTER UPDATE ON finance_accounts
    BEGIN UPDATE finance_accounts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;
"""
