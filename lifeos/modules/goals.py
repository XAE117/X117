"""
Goals Module - SMART goal tracking with rolling goal hub.

Goals sit between Areas and Projects in the hierarchy:
    Area -> Goal -> Project -> Task

Each goal has:
- Measurable targets (target_value / current_value / unit)
- Timeline tracking (start_date / target_date)
- Status management with at-risk detection
- Progress rollup from linked projects

Goals provide the "why" behind projects and tasks, ensuring
daily execution aligns with long-term life aspirations.
"""

from datetime import date, datetime


class GoalsModule:
    """Manages SMART goals with progress tracking."""

    def __init__(self, db):
        self.db = db

    def create(self, title, area_id=None, description=None,
               target_value=None, unit=None, start_date=None,
               target_date=None, status='not_started'):
        """Create a new goal."""
        if start_date is None:
            start_date = date.today().isoformat()
        return self.db.execute(
            """INSERT INTO goals (title, area_id, description, target_value,
                unit, start_date, target_date, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (title, area_id, description, target_value, unit,
             start_date, target_date, status)
        )

    def get(self, goal_id):
        """Get a goal by ID."""
        result = self.db.execute("SELECT * FROM goals WHERE id = ?", (goal_id,))
        return result[0] if result else None

    def get_all(self, area_id=None, status_filter=None):
        """Get all goals with optional filters."""
        sql = "SELECT * FROM goals WHERE 1=1"
        params = []

        if area_id:
            sql += " AND area_id = ?"
            params.append(area_id)

        if status_filter:
            if isinstance(status_filter, list):
                placeholders = ','.join('?' * len(status_filter))
                sql += f" AND status IN ({placeholders})"
                params.extend(status_filter)
            else:
                sql += " AND status = ?"
                params.append(status_filter)

        sql += " ORDER BY target_date ASC, created_at DESC"
        return self.db.execute(sql, params)

    def get_active(self):
        """Get all active goals (not achieved or abandoned)."""
        return self.get_all(status_filter=['not_started', 'in_progress', 'on_track', 'at_risk'])

    def update(self, goal_id, **kwargs):
        """Update goal properties."""
        if not kwargs:
            return
        set_clause = ', '.join(f"{k} = ?" for k in kwargs)
        values = list(kwargs.values()) + [goal_id]
        self.db.execute(f"UPDATE goals SET {set_clause} WHERE id = ?", values)

    def update_progress(self, goal_id, current_value):
        """Update the current progress value of a goal."""
        goal = self.get(goal_id)
        if not goal:
            raise ValueError(f"Goal {goal_id} not found")

        updates = {'current_value': current_value}

        # Auto-achieve if target met
        if goal['target_value'] and current_value >= goal['target_value']:
            updates['status'] = 'achieved'
        elif goal['status'] == 'not_started':
            updates['status'] = 'in_progress'

        self.update(goal_id, **updates)

    def increment_progress(self, goal_id, amount=1):
        """Increment the current progress value by a given amount."""
        goal = self.get(goal_id)
        if not goal:
            raise ValueError(f"Goal {goal_id} not found")

        new_value = (goal['current_value'] or 0) + amount
        self.update_progress(goal_id, new_value)

    def delete(self, goal_id):
        """Delete a goal."""
        self.db.execute("DELETE FROM goals WHERE id = ?", (goal_id,))

    def get_progress(self, goal_id):
        """
        Calculate comprehensive goal progress.

        Combines the direct target progress with project-level rollup.
        """
        goal = self.get(goal_id)
        if not goal:
            return None

        # Direct value-based progress
        value_progress = 0
        if goal['target_value'] and goal['target_value'] > 0:
            value_progress = min(
                100, round((goal['current_value'] or 0) / goal['target_value'] * 100, 1)
            )

        # Project-based rollup
        projects = self.db.execute(
            "SELECT id FROM projects WHERE goal_id = ?", (goal_id,)
        )
        total_tasks = 0
        completed_tasks = 0
        for project in projects:
            total_tasks += self.db.count('tasks', 'project_id = ?', (project['id'],))
            completed_tasks += self.db.count(
                'tasks', "project_id = ? AND status = 'done'", (project['id'],)
            )

        project_progress = round(
            (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 1
        )

        # Time-based progress
        time_progress = 0
        if goal['start_date'] and goal['target_date']:
            start = date.fromisoformat(goal['start_date'])
            target = date.fromisoformat(goal['target_date'])
            total_days = (target - start).days
            elapsed_days = (date.today() - start).days
            if total_days > 0:
                time_progress = min(100, round(elapsed_days / total_days * 100, 1))

        return {
            'value_progress': value_progress,
            'project_progress': project_progress,
            'time_progress': time_progress,
            'total_projects': len(projects),
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks,
            'is_on_track': value_progress >= time_progress if goal['target_value'] else True,
        }

    def check_at_risk(self, goal_id):
        """
        Check if a goal is at risk based on time vs progress comparison.

        A goal is at-risk if time elapsed significantly exceeds progress made.
        """
        progress = self.get_progress(goal_id)
        if not progress:
            return False

        time_pct = progress['time_progress']
        value_pct = progress['value_progress']

        # At risk if progress is more than 20% behind time
        if time_pct > 0 and value_pct < (time_pct - 20):
            self.update(goal_id, status='at_risk')
            return True
        return False

    def get_rolling_hub(self):
        """
        Get the Rolling Goal Hub - a comprehensive view of all active goals
        with progress indicators for the Life Dashboard.
        """
        active_goals = self.get_active()
        hub = []
        for goal in active_goals:
            progress = self.get_progress(goal['id'])
            area = None
            if goal['area_id']:
                area_result = self.db.execute(
                    "SELECT name, icon FROM areas WHERE id = ?", (goal['area_id'],)
                )
                area = area_result[0] if area_result else None

            hub.append({
                'goal': goal,
                'area': area,
                'progress': progress,
            })
        return hub

    def search(self, query):
        """Search goals by title or description."""
        return self.db.execute(
            """SELECT * FROM goals
               WHERE (title LIKE ? OR description LIKE ?)
               ORDER BY target_date ASC""",
            (f'%{query}%', f'%{query}%')
        )

    def get_stats(self):
        """Get goal statistics."""
        return {
            'not_started': self.db.count('goals', "status = 'not_started'"),
            'in_progress': self.db.count('goals', "status = 'in_progress'"),
            'on_track': self.db.count('goals', "status = 'on_track'"),
            'at_risk': self.db.count('goals', "status = 'at_risk'"),
            'achieved': self.db.count('goals', "status = 'achieved'"),
            'abandoned': self.db.count('goals', "status = 'abandoned'"),
        }
