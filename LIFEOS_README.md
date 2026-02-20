# LifeOS - Life Operating System Framework

A comprehensive Life Operating System built on **PARA** (Projects, Areas, Resources, Archives) and **GTD** (Getting Things Done) methodologies. This framework provides a hub-and-spoke relational architecture for managing all aspects of life through an integrated, action-oriented system.

## Architecture

```
Areas (Life Pillars)
  └── Goals (SMART targets)
        └── Projects (finite outcomes)
              └── Tasks (atomic actions)

Inbox ──► Triage ──► Master Databases ──► Archive

Knowledge Hub ──► Notes / Resources / Reading Tracker
```

### Hub-and-Spoke Design

The database uses a hub-and-spoke architecture where master databases act as the primary engines, and all views are contextual filters of these tables. A change in one area (completing a task) automatically updates the related project progress and life area health.

## Modules

| Module | Description | Key Features |
|--------|-------------|--------------|
| **Inbox** | Zero-friction capture | Quick capture, batch input, triage to tasks/notes |
| **Master Tasks** | GTD task management | Next Actions, Waiting For, Someday/Maybe, contexts, energy levels |
| **Projects** | Outcome containers | Progress rollups, auto-completion, PARA categorization |
| **Areas** | Life pillars | Health scoring, goal/project/task aggregation |
| **Goals** | SMART goal tracking | Value + project progress, at-risk detection, timeline tracking |
| **Habits** | Daily/weekly tracking | Streak calculation, completion rates, contribution grids |
| **Journal** | Prompted daily reflection | Mood/energy tracking, trends, gratitude practice |
| **Finance** | Wealth management | Accounts, transactions, budgets, net worth, spending trends |
| **Fitness** | Physical optimization | Workout logs, exercises, body metrics, nutrition |
| **Knowledge** | Second Brain | Notes, web clips, reading tracker, highlights |

## Quick Start

```python
from lifeos.core import LifeOS

# Initialize
os = LifeOS()
os.setup()  # Seeds default life areas

# Quick capture (< 10 seconds)
os.quick_capture("Read chapter 5 of Atomic Habits")
os.quick_capture("Call dentist to schedule appointment", type='task')

# Create tasks with GTD properties
os.tasks.create(
    "Write project proposal",
    priority='high',
    context='@work',
    energy_level='high',
    due_date='2026-03-01'
)

# Track habits
habit_id = os.habits.create("Meditate", frequency='daily', icon='🧘')
os.habits.log_today(habit_id)
print(f"Streak: {os.habits.get_current_streak(habit_id)} days")

# Dashboard
print(os.dashboard.render_home())
```

## CLI Usage

```bash
# Interactive mode
python -m lifeos.cli

# Single commands
python -m lifeos.cli capture "Buy groceries"
python -m lifeos.cli dashboard
python -m lifeos.cli tasks today
```

### CLI Commands

| Command | Description |
|---------|-------------|
| `home` / `dashboard` | Main life dashboard overview |
| `inbox` | View unprocessed inbox items |
| `tasks [view]` | Tasks by GTD view (next/today/overdue/waiting/someday) |
| `projects` | Active projects with progress bars |
| `goals` | Rolling Goal Hub |
| `habits` | Habits overview with streaks |
| `finance` | Finance hub with net worth and budgets |
| `review` | Weekly review preparation checklist |
| `c <text>` | Quick capture to inbox |
| `t <title>` | Create a new task |
| `h <name>` | Log a habit for today |
| `done <id>` | Complete a task |
| `search <query>` | Search across all modules |
| `maintain` | Run automated maintenance |

## Core Concepts

### PARA Method Integration
- **Projects**: Active work with defined outcomes and deadlines
- **Areas**: Ongoing life responsibilities (Career, Health, Finances, etc.)
- **Resources**: Reference material and knowledge base
- **Archives**: Completed or inactive items preserved for search

### GTD Methodology
- **Inbox**: Capture everything, process later
- **Next Actions**: The very next physical action for each project
- **Waiting For**: Items delegated or dependent on others
- **Someday/Maybe**: Deferred items for future consideration
- **Contexts**: Filter tasks by location/tool (@work, @home, @phone)
- **Weekly Review**: Systematic review of all open loops

### Automation Engine

The automation engine handles cross-module workflows:

| Automation | Trigger | Action |
|-----------|---------|--------|
| Recurring Tasks | Task completed | Reset status, advance due date |
| Auto-Archive | Item age > threshold | Move to archive table |
| Status Propagation | All tasks done | Auto-complete project |
| Goal Risk Detection | Time > progress | Flag goal as at-risk |
| Reminder Generation | Due dates approaching | Generate notifications |

### Formula Engine

Progress visualization mirroring Notion Formula 2.0:

```python
from lifeos.formulas import progress_bar, calculate_streak

# Text-based progress bars
print(progress_bar(75, 100))  # ███████████████░░░░░ 75%

# Streak calculations
dates = ['2026-02-18', '2026-02-19', '2026-02-20']
print(calculate_streak(dates))  # 3
```

## Notion Integration

The framework includes a complete Notion API sync layer for bidirectional synchronization:

```python
from lifeos.core import LifeOS
from lifeos.notion.sync import NotionSync

os = LifeOS()
sync = NotionSync(api_key="your-notion-api-key", db=os.db)

# Create complete LifeOS workspace in Notion
database_ids = sync.setup_workspace(parent_page_id="your-page-id")

# Push local data to Notion
sync.push_areas()
sync.push_projects()
sync.push_tasks()

# Pull from Notion
sync.pull_tasks()
```

### Notion Schema Generation

JSON-compatible schemas for all databases are available for direct API usage or MCP integration:

```python
from lifeos.notion.schemas import get_all_schemas, get_relation_mappings

schemas = get_all_schemas("parent-page-id")
relations = get_relation_mappings()
```

## Project Structure

```
lifeos/
├── __init__.py          # Package initialization
├── __main__.py          # python -m lifeos entry point
├── config.py            # Configuration management
├── core.py              # Main LifeOS orchestrator
├── database.py          # SQLite database engine & schema
├── formulas.py          # Progress bars, streaks, rollups
├── automations.py       # Recurring tasks, auto-archive, propagation
├── dashboard.py         # CLI dashboard renderer
├── cli.py               # Interactive command-line interface
├── modules/
│   ├── inbox.py         # Frictionless capture
│   ├── tasks.py         # GTD task management
│   ├── projects.py      # Project containers
│   ├── areas.py         # Life pillars
│   ├── goals.py         # SMART goal tracking
│   ├── habits.py        # Habit tracking with streaks
│   ├── journal.py       # Daily reflection
│   ├── finance.py       # Financial management
│   ├── fitness.py       # Workout & nutrition tracking
│   └── knowledge.py     # Second Brain & reading tracker
└── notion/
    ├── schemas.py        # Notion database schema definitions
    └── sync.py           # Notion API synchronization layer
tests/
└── test_lifeos.py        # Comprehensive test suite (48 tests)
```

## Database Schema

The SQLite database implements 20+ tables with full relational integrity:

- **Core**: areas, goals, projects, tasks, inbox
- **Lifestyle**: habits, habit_logs, journal_entries
- **Finance**: finance_accounts, finance_transactions, finance_budgets
- **Fitness**: workouts, workout_exercises, body_metrics, meals
- **Knowledge**: notes, reading_list, reading_highlights
- **System**: archive, task_history, pomodoro_sessions, weekly_reviews, tags, item_tags

All tables include proper indexes, foreign keys, and auto-updating timestamps via triggers.

## Testing

```bash
python -m unittest tests.test_lifeos -v
```

48 tests covering:
- Module CRUD operations
- Relational integrity (Area -> Goal -> Project -> Task)
- Formula calculations (progress bars, streaks, budgets)
- Automation workflows (recurring tasks, status propagation)
- Dashboard rendering
- Global search across all modules

## Requirements

- Python 3.6+
- No external dependencies for core functionality (uses built-in sqlite3)
- Optional: `notion-client` for Notion API sync (`pip install notion-client`)

## Design Principles

1. **Zero-friction capture**: If logging takes > 10 seconds, the system has failed
2. **Hub-and-spoke architecture**: One source of truth, many views
3. **Flat data hierarchy**: Avoid deeply nested relations (max 2 levels deep)
4. **Modular design**: Each module is independent but interconnected
5. **Maintenance-first**: Built-in automation prevents "productivity porn" burnout
