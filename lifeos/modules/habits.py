"""
Habits Module - Daily/weekly/monthly habit tracking with streaks.

Implements a button-based habit logging system designed for minimal
friction. Users can log habits with a single action, and the system
automatically calculates streaks, completion rates, and trends.

Habits are linked to Areas to show how daily routines contribute
to long-term life pillars.
"""

from datetime import date, timedelta
from collections import defaultdict


class HabitsModule:
    """Manages habits and their daily tracking logs."""

    def __init__(self, db):
        self.db = db

    def create(self, name, description=None, frequency='daily', target_count=1,
               area_id=None, icon='✅'):
        """Create a new habit to track."""
        return self.db.execute(
            """INSERT INTO habits (name, description, frequency, target_count,
                area_id, icon)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (name, description, frequency, target_count, area_id, icon)
        )

    def get(self, habit_id):
        """Get a habit by ID."""
        result = self.db.execute("SELECT * FROM habits WHERE id = ?", (habit_id,))
        return result[0] if result else None

    def get_all(self, active_only=True):
        """Get all habits."""
        if active_only:
            return self.db.execute(
                "SELECT * FROM habits WHERE is_active = 1 ORDER BY name"
            )
        return self.db.execute("SELECT * FROM habits ORDER BY is_active DESC, name")

    def get_by_area(self, area_id):
        """Get habits for a specific area."""
        return self.db.execute(
            "SELECT * FROM habits WHERE area_id = ? AND is_active = 1 ORDER BY name",
            (area_id,)
        )

    def update(self, habit_id, **kwargs):
        """Update habit properties."""
        if not kwargs:
            return
        set_clause = ', '.join(f"{k} = ?" for k in kwargs)
        values = list(kwargs.values()) + [habit_id]
        self.db.execute(f"UPDATE habits SET {set_clause} WHERE id = ?", values)

    def deactivate(self, habit_id):
        """Deactivate a habit without deleting its history."""
        self.update(habit_id, is_active=0)

    def delete(self, habit_id):
        """Delete a habit and all its logs."""
        self.db.execute("DELETE FROM habits WHERE id = ?", (habit_id,))

    # ========================================================================
    # Logging - Zero-friction habit completion
    # ========================================================================

    def log(self, habit_id, log_date=None, count=1, notes=None):
        """
        Log a habit completion for a specific date.

        If already logged for that date, increments the count.
        """
        if log_date is None:
            log_date = date.today().isoformat()

        existing = self.db.execute(
            "SELECT * FROM habit_logs WHERE habit_id = ? AND log_date = ?",
            (habit_id, log_date)
        )

        if existing:
            new_count = existing[0]['count'] + count
            self.db.execute(
                "UPDATE habit_logs SET count = ?, notes = COALESCE(?, notes) WHERE id = ?",
                (new_count, notes, existing[0]['id'])
            )
            return existing[0]['id']
        else:
            return self.db.execute(
                "INSERT INTO habit_logs (habit_id, log_date, count, notes) VALUES (?, ?, ?, ?)",
                (habit_id, log_date, count, notes)
            )

    def log_today(self, habit_id, notes=None):
        """Quick log for today - the primary button action."""
        return self.log(habit_id, date.today().isoformat(), notes=notes)

    def unlog(self, habit_id, log_date=None):
        """Remove a habit log for a specific date."""
        if log_date is None:
            log_date = date.today().isoformat()
        self.db.execute(
            "DELETE FROM habit_logs WHERE habit_id = ? AND log_date = ?",
            (habit_id, log_date)
        )

    def is_logged_today(self, habit_id):
        """Check if a habit was logged today."""
        today = date.today().isoformat()
        result = self.db.execute(
            "SELECT * FROM habit_logs WHERE habit_id = ? AND log_date = ?",
            (habit_id, today)
        )
        return bool(result)

    # ========================================================================
    # Streak Calculations
    # ========================================================================

    def get_current_streak(self, habit_id):
        """
        Calculate the current consecutive streak for a daily habit.

        Counts backwards from today, finding the longest unbroken
        chain of logged days.
        """
        habit = self.get(habit_id)
        if not habit:
            return 0

        logs = self.db.execute(
            """SELECT DISTINCT log_date FROM habit_logs
               WHERE habit_id = ?
               ORDER BY log_date DESC""",
            (habit_id,)
        )

        if not logs:
            return 0

        log_dates = {log['log_date'] for log in logs}
        streak = 0
        check_date = date.today()

        # Allow checking from today or yesterday (in case not yet logged today)
        if check_date.isoformat() not in log_dates:
            check_date -= timedelta(days=1)
            if check_date.isoformat() not in log_dates:
                return 0

        while check_date.isoformat() in log_dates:
            streak += 1
            check_date -= timedelta(days=1)

        return streak

    def get_longest_streak(self, habit_id):
        """Calculate the longest ever streak for a habit."""
        logs = self.db.execute(
            """SELECT DISTINCT log_date FROM habit_logs
               WHERE habit_id = ?
               ORDER BY log_date ASC""",
            (habit_id,)
        )

        if not logs:
            return 0

        log_dates = sorted([date.fromisoformat(log['log_date']) for log in logs])

        longest = 1
        current = 1
        for i in range(1, len(log_dates)):
            if (log_dates[i] - log_dates[i - 1]).days == 1:
                current += 1
                longest = max(longest, current)
            else:
                current = 1

        return longest

    def get_completion_rate(self, habit_id, days=30):
        """
        Calculate the completion rate for a habit over the last N days.

        Returns:
            Float between 0 and 100 representing the percentage of days
            the habit was completed.
        """
        start_date = (date.today() - timedelta(days=days)).isoformat()
        logged_days = self.db.count(
            'habit_logs',
            'habit_id = ? AND log_date >= ?',
            (habit_id, start_date)
        )
        return round((logged_days / days) * 100, 1) if days > 0 else 0

    # ========================================================================
    # Dashboard Views
    # ========================================================================

    def get_today_status(self):
        """
        Get today's habit status - the daily habit dashboard.

        Returns all active habits with their completion status for today.
        """
        habits = self.get_all()
        today = date.today().isoformat()
        status = []

        for habit in habits:
            log = self.db.execute(
                "SELECT * FROM habit_logs WHERE habit_id = ? AND log_date = ?",
                (habit['id'], today)
            )
            streak = self.get_current_streak(habit['id'])

            status.append({
                'habit': habit,
                'logged_today': bool(log),
                'today_count': log[0]['count'] if log else 0,
                'current_streak': streak,
            })

        return status

    def get_weekly_grid(self, habit_id, weeks=4):
        """
        Get a weekly grid view of habit completions.

        Returns a matrix of dates and their completion status,
        suitable for rendering a GitHub-style contribution grid.
        """
        start_date = date.today() - timedelta(weeks=weeks)
        logs = self.db.execute(
            """SELECT log_date, count FROM habit_logs
               WHERE habit_id = ? AND log_date >= ?
               ORDER BY log_date ASC""",
            (habit_id, start_date.isoformat())
        )

        log_map = {log['log_date']: log['count'] for log in logs}
        grid = []
        current = start_date

        while current <= date.today():
            grid.append({
                'date': current.isoformat(),
                'count': log_map.get(current.isoformat(), 0),
                'completed': current.isoformat() in log_map,
            })
            current += timedelta(days=1)

        return grid

    def get_all_with_stats(self):
        """Get all habits with their statistics for the habits overview."""
        habits = self.get_all()
        result = []
        for habit in habits:
            result.append({
                'habit': habit,
                'current_streak': self.get_current_streak(habit['id']),
                'longest_streak': self.get_longest_streak(habit['id']),
                'completion_rate_30d': self.get_completion_rate(habit['id'], 30),
                'completion_rate_7d': self.get_completion_rate(habit['id'], 7),
                'logged_today': self.is_logged_today(habit['id']),
            })
        return result

    def search(self, query):
        """Search habits by name or description."""
        return self.db.execute(
            "SELECT * FROM habits WHERE name LIKE ? OR description LIKE ?",
            (f'%{query}%', f'%{query}%')
        )
