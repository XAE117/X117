# LifeOS

A personal life operating system -- a collection of CLI tools to manage every aspect of your life from the terminal.

## Quick Start

```bash
# Launch the unified dashboard
python3 lifeos.py

# Or run any component directly
python3 dating_tracker.py
python3 habit_tracker.py
python3 fitness_tracker.py
python3 finance_tracker.py
python3 journal.py
python3 goal_tracker.py
```

## Components

### Dating Contact Tracker (`dating_tracker.py`)
Track dating connections across platforms with notes, reminders, and status tracking.
- Manage contacts from Tinder, Bumble, Hinge, etc.
- Record conversation notes and important details
- Get reminders for contacts you haven't reached out to
- Filter by status (active, dating, ghosted, ended)

### Habit Tracker (`habit_tracker.py`)
Build better habits with daily tracking, streaks, and completion rates.
- Define daily or weekly habits with categories
- Log completions and view today's checklist
- Track current streaks and 30-day completion rates
- Archive old habits without losing history

### Fitness & Health Tracker (`fitness_tracker.py`)
Track workouts, exercises, and body metrics over time.
- Log workouts with type, duration, and intensity
- Record individual exercises with sets/reps/weight
- Track body metrics: weight, body fat, heart rate, sleep, hydration
- View weekly fitness summaries

### Finance Tracker (`finance_tracker.py`)
Track income, expenses, budgets, and recurring transactions.
- Record income and expenses by category
- Set monthly budgets with spending alerts
- Track recurring transactions (rent, subscriptions, salary)
- View monthly financial summaries with category breakdowns

### Journal (`journal.py`)
Daily journaling with mood/energy tracking and gratitude logging.
- Write free-form journal entries with titles and tags
- Track mood and energy levels (1-10 scale)
- Log daily gratitude items
- View mood trends over time and search past entries

### Goal Tracker (`goal_tracker.py`)
Set goals, define milestones, and track progress toward what matters.
- Create goals with categories, priorities, and target dates
- Break goals into milestones with auto-progress tracking
- Log progress updates with notes
- View overdue items and progress bars

### Unified Dashboard (`lifeos.py`)
A single entry point that shows a cross-system overview and launches components.
- View stats from all components at a glance
- Launch any component with `open <name>`
- See today's habits, this week's workouts, monthly finances, and more

## Claude Integration

LifeOS includes tools for AI-assisted analysis of your data:

- **CLAUDE.md** - Auto-loaded context for Claude Code sessions with DB schema and queries
- **export_archive.py** - Export data to text/JSON/markdown for uploading to Claude.ai
- **mcp_server.py** - MCP server for live database queries from Claude Desktop or Claude Code

## Data Storage

All data is stored locally in SQLite databases in the project directory:
- `contacts.db` - Dating contact tracker data
- `lifeos.db` - All other component data (habits, fitness, finance, journal, goals)

No cloud, no accounts, no external dependencies. Your data stays on your machine.

## Requirements

- Python 3.6+
- No external dependencies (uses built-in sqlite3)
- Optional: `pip install mcp` for the MCP server integration
