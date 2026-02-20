"""
Formula Engine - Progress visualization, streak calculations, and rollups.

Mirrors Notion Formula 2.0 capabilities in Python, providing:
- Visual progress bars (text-based, for CLI and Notion property generation)
- Streak calculations for habits and journals
- Hierarchical rollups (Tasks -> Projects -> Goals -> Areas)
- Time-based health indicators (overdue detection, at-risk scoring)
- Financial metric computations
"""

from datetime import date, timedelta, datetime
import math


# ============================================================================
# Progress Bar Generation
# ============================================================================

def progress_bar(value, max_value=100, width=20, fill_char='█', empty_char='░'):
    """
    Generate a text-based progress bar.

    Equivalent to Notion's slice()-based progress bar formula:
        slice("████████████████████", 0, round(progress * 20))
        + slice("░░░░░░░░░░░░░░░░░░░░", 0, 20 - round(progress * 20))

    Args:
        value: Current value.
        max_value: Maximum value (default 100).
        width: Width of the bar in characters (default 20).
        fill_char: Character for filled portion.
        empty_char: Character for empty portion.

    Returns:
        Formatted string like "████████░░░░░░░░░░░░ 40%"
    """
    if max_value <= 0:
        pct = 0
    else:
        pct = min(100, max(0, (value / max_value) * 100))

    filled = round(pct / 100 * width)
    empty = width - filled
    bar = fill_char * filled + empty_char * empty
    return f"{bar} {pct:.0f}%"


def colored_progress_bar(value, max_value=100, width=20):
    """
    Generate a progress bar with color indicators.

    Uses Notion-style color semantics:
    - Red (< 25%): ▓
    - Yellow (25-75%): ▒
    - Green (> 75%): █
    """
    if max_value <= 0:
        pct = 0
    else:
        pct = min(100, max(0, (value / max_value) * 100))

    if pct < 25:
        fill_char = '▓'
        status = 'LOW'
    elif pct < 75:
        fill_char = '▒'
        status = 'MED'
    else:
        fill_char = '█'
        status = 'HIGH'

    filled = round(pct / 100 * width)
    empty = width - filled
    bar = fill_char * filled + '░' * empty
    return f"{bar} {pct:.0f}% [{status}]"


def mini_progress(value, max_value=100):
    """
    Generate a compact progress indicator using block characters.

    Uses unicode block elements for a compact representation:
    ⣀⣤⣶⣿ (braille-based density)
    """
    if max_value <= 0:
        pct = 0
    else:
        pct = min(100, max(0, (value / max_value) * 100))

    blocks = ['⬜', '🟥', '🟧', '🟨', '🟩']
    idx = min(4, int(pct / 25))
    return f"{blocks[idx]} {pct:.0f}%"


# ============================================================================
# Streak Calculations
# ============================================================================

def calculate_streak(dates):
    """
    Calculate current consecutive streak from a set of date strings.

    Args:
        dates: Iterable of ISO date strings (e.g., '2024-01-15').

    Returns:
        Integer count of consecutive days ending at today (or yesterday).
    """
    if not dates:
        return 0

    date_set = {d if isinstance(d, str) else d.isoformat() for d in dates}
    streak = 0
    check = date.today()

    # Allow today or yesterday as starting point
    if check.isoformat() not in date_set:
        check -= timedelta(days=1)
        if check.isoformat() not in date_set:
            return 0

    while check.isoformat() in date_set:
        streak += 1
        check -= timedelta(days=1)

    return streak


def calculate_longest_streak(dates):
    """
    Calculate the longest ever streak from a list of date strings.

    Args:
        dates: Iterable of ISO date strings.

    Returns:
        Integer count of the longest consecutive run.
    """
    if not dates:
        return 0

    sorted_dates = sorted(set(
        date.fromisoformat(d) if isinstance(d, str) else d for d in dates
    ))

    longest = 1
    current = 1
    for i in range(1, len(sorted_dates)):
        if (sorted_dates[i] - sorted_dates[i - 1]).days == 1:
            current += 1
            longest = max(longest, current)
        else:
            current = 1

    return longest


def streak_display(current, longest):
    """Format a streak for display with fire emoji scaling."""
    if current == 0:
        return "No active streak"
    fires = min(current // 7, 5)  # One fire per week, max 5
    fire_str = '🔥' * fires if fires > 0 else ''
    return f"{current}d streak {fire_str} (best: {longest}d)"


# ============================================================================
# Hierarchical Rollups
# ============================================================================

def rollup_project_progress(db, project_id):
    """
    Calculate project completion percentage from task rollup.

    Formula equivalent:
        progress = count(tasks.filter(status == 'done')) / count(tasks)
    """
    total = db.count('tasks', 'project_id = ?', (project_id,))
    done = db.count('tasks', "project_id = ? AND status = 'done'", (project_id,))
    return round((done / total * 100) if total > 0 else 0, 1)


def rollup_goal_progress(db, goal_id):
    """
    Calculate goal progress combining value-based and project-based metrics.

    Two-dimensional progress:
    1. Direct value: current_value / target_value
    2. Project rollup: average progress across linked projects
    """
    goal = db.execute("SELECT * FROM goals WHERE id = ?", (goal_id,))
    if not goal:
        return {'value_pct': 0, 'project_pct': 0, 'combined_pct': 0}

    goal = goal[0]

    # Value-based
    value_pct = 0
    if goal['target_value'] and goal['target_value'] > 0:
        value_pct = min(100, (goal['current_value'] or 0) / goal['target_value'] * 100)

    # Project-based
    projects = db.execute("SELECT id FROM projects WHERE goal_id = ?", (goal_id,))
    if projects:
        project_progress = [rollup_project_progress(db, p['id']) for p in projects]
        project_pct = sum(project_progress) / len(project_progress)
    else:
        project_pct = 0

    # Combined (weighted average if both exist)
    if goal['target_value'] and projects:
        combined = (value_pct * 0.6 + project_pct * 0.4)
    elif goal['target_value']:
        combined = value_pct
    else:
        combined = project_pct

    return {
        'value_pct': round(value_pct, 1),
        'project_pct': round(project_pct, 1),
        'combined_pct': round(combined, 1),
    }


def rollup_area_health(db, area_id):
    """
    Calculate overall health score for a life area.

    Aggregates:
    - Goal achievement rate
    - Project completion rate
    - Active task count (workload indicator)
    - Habit completion rate
    """
    # Goals
    total_goals = db.count('goals', 'area_id = ?', (area_id,))
    achieved_goals = db.count('goals', "area_id = ? AND status = 'achieved'", (area_id,))
    goal_rate = (achieved_goals / total_goals * 100) if total_goals > 0 else 0

    # Projects
    total_projects = db.count('projects', 'area_id = ?', (area_id,))
    completed_projects = db.count(
        'projects', "area_id = ? AND status = 'completed'", (area_id,)
    )
    project_rate = (completed_projects / total_projects * 100) if total_projects > 0 else 0

    # Tasks
    active_tasks = db.count(
        'tasks', "area_id = ? AND status NOT IN ('done', 'archived')", (area_id,)
    )

    return {
        'goal_achievement_rate': round(goal_rate, 1),
        'project_completion_rate': round(project_rate, 1),
        'active_task_count': active_tasks,
    }


# ============================================================================
# Time-Based Indicators
# ============================================================================

def days_until(target_date_str):
    """Calculate days until a target date."""
    if not target_date_str:
        return None
    target = date.fromisoformat(target_date_str)
    return (target - date.today()).days


def overdue_indicator(due_date_str):
    """
    Generate an overdue status indicator.

    Returns:
        Tuple of (is_overdue: bool, days_overdue: int, display: str)
    """
    if not due_date_str:
        return (False, 0, '')

    days = days_until(due_date_str)
    if days is None:
        return (False, 0, '')

    if days < 0:
        return (True, abs(days), f'⚠️ {abs(days)}d overdue')
    elif days == 0:
        return (False, 0, '📌 Due today')
    elif days <= 3:
        return (False, days, f'⏰ {days}d remaining')
    else:
        return (False, days, f'{days}d remaining')


def time_progress(start_date_str, end_date_str):
    """
    Calculate how much time has elapsed as a percentage.

    Used for goal at-risk detection: if time_progress >> value_progress,
    the goal is behind schedule.
    """
    if not start_date_str or not end_date_str:
        return 0

    start = date.fromisoformat(start_date_str)
    end = date.fromisoformat(end_date_str)
    total = (end - start).days
    elapsed = (date.today() - start).days

    if total <= 0:
        return 100
    return min(100, round(elapsed / total * 100, 1))


# ============================================================================
# Financial Formulas
# ============================================================================

def savings_rate(income, expenses):
    """Calculate savings rate as a percentage."""
    if income <= 0:
        return 0
    return round(((income - expenses) / income) * 100, 1)


def budget_health(budget_limit, spent):
    """
    Calculate budget health indicator.

    Returns:
        Tuple of (pct_used, status, display)
    """
    if budget_limit <= 0:
        return (0, 'unknown', '—')

    pct = round(spent / budget_limit * 100, 1)
    if pct > 100:
        return (pct, 'over', f'🔴 {pct}% (over budget)')
    elif pct > 80:
        return (pct, 'warning', f'🟡 {pct}% (near limit)')
    else:
        return (pct, 'healthy', f'🟢 {pct}%')


# ============================================================================
# Notion Formula 2.0 Generators
# ============================================================================

def generate_notion_progress_formula():
    """
    Generate a Notion Formula 2.0 string for progress bar display.

    This can be pasted directly into a Notion formula property.
    """
    return '''let(
    total, prop("Tasks").length(),
    done, prop("Tasks").filter(current.prop("Status").name == "Done").length(),
    progress, if(total > 0, done / total, 0),
    filled, round(progress * 20),
    slice("████████████████████", 0, filled)
    + slice("░░░░░░░░░░░░░░░░░░░░", 0, 20 - filled)
    + " " + format(round(progress * 100)) + "%"
)'''


def generate_notion_streak_formula():
    """Generate a Notion-compatible streak calculation concept."""
    return '''/* Streak calculation requires Notion automations or
   external processing - use the LifeOS automation engine
   to calculate streaks and write them back as a number property.

   Property: "Current Streak" (Number)
   Updated via: Database automation on habit_logs changes */'''


def generate_notion_overdue_formula():
    """Generate a Notion Formula 2.0 for overdue detection."""
    return '''let(
    due, prop("Due Date"),
    diff, dateBetween(due, now(), "days"),
    if(empty(due), "",
        if(diff < 0,
            "⚠️ " + format(abs(diff)) + "d overdue",
            if(diff == 0, "📌 Due today",
                if(diff <= 3, "⏰ " + format(diff) + "d left",
                    format(diff) + "d remaining"
                )
            )
        )
    )
)'''


def generate_notion_recurring_date_formula():
    """Generate a Notion Formula 2.0 for recurring task date advancement."""
    return '''/* Used in database automation "When Status = Done":
   Edit property "Due Date" to:

   prop("Due Date").dateAdd(
       prop("Recur Interval"),
       prop("Recur Unit")
   )

   Then reset Status to "Not Started" */'''
