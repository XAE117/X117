"""
Master Tasks Module - GTD-based task management.

Implements the Getting Things Done methodology with:
- Inbox capture -> Next Action classification
- Context-based filtering (@home, @work, @errands, etc.)
- Waiting For tracking with delegation
- Someday/Maybe list for deferred items
- Energy-level matching for optimal task selection
- Recurring task support with flexible recurrence logic
"""

from datetime import datetime, date, timedelta


class TasksModule:
    """Master task management following GTD principles."""

    def __init__(self, db):
        self.db = db

    def create(self, title, description=None, status='inbox', priority='medium',
               energy_level='medium', context=None, due_date=None, do_date=None,
               project_id=None, area_id=None, goal_id=None,
               estimated_minutes=None, is_recurring=False,
               recur_interval=None, recur_unit=None, recur_from='due_date',
               waiting_for=None, delegated_to=None):
        """Create a new task."""
        return self.db.execute(
            """INSERT INTO tasks (title, description, status, priority, energy_level,
                context, due_date, do_date, project_id, area_id, goal_id,
                estimated_minutes, is_recurring, recur_interval, recur_unit,
                recur_from, waiting_for, delegated_to)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (title, description, status, priority, energy_level, context,
             due_date, do_date, project_id, area_id, goal_id,
             estimated_minutes, int(is_recurring), recur_interval, recur_unit,
             recur_from, waiting_for, delegated_to)
        )

    def get(self, task_id):
        """Get a single task by ID."""
        result = self.db.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
        return result[0] if result else None

    def update(self, task_id, **kwargs):
        """Update task properties."""
        if not kwargs:
            return
        set_clause = ', '.join(f"{k} = ?" for k in kwargs)
        values = list(kwargs.values()) + [task_id]
        self.db.execute(f"UPDATE tasks SET {set_clause} WHERE id = ?", values)

    def complete(self, task_id, actual_minutes=None, notes=None):
        """
        Mark a task as done.

        If the task is recurring, logs completion to history and resets
        the task with a new due date based on recurrence settings.
        """
        task = self.get(task_id)
        if not task:
            raise ValueError(f"Task {task_id} not found")

        now = datetime.now().isoformat()

        # Log to task history
        self.db.execute(
            """INSERT INTO task_history (task_id, completed_at, actual_minutes, notes)
               VALUES (?, ?, ?, ?)""",
            (task_id, now, actual_minutes, notes)
        )

        if task['is_recurring'] and task['recur_interval'] and task['recur_unit']:
            # Recurring task: reset status and advance date
            self._advance_recurring_task(task, now)
        else:
            # Non-recurring: mark as done
            updates = {'status': 'done', 'completed_date': now}
            if actual_minutes is not None:
                updates['actual_minutes'] = actual_minutes
            self.update(task_id, **updates)

    def _advance_recurring_task(self, task, completion_time):
        """Reset a recurring task and calculate next due date."""
        interval = task['recur_interval']
        unit = task['recur_unit']

        if task['recur_from'] == 'completion_date' or not task['due_date']:
            base_date = date.today()
        else:
            base_date = date.fromisoformat(task['due_date'])

        next_date = self._add_interval(base_date, interval, unit)

        self.update(task['id'],
                    status='next_action',
                    due_date=next_date.isoformat(),
                    completed_date=None)

    @staticmethod
    def _add_interval(base_date, interval, unit):
        """Add a time interval to a date."""
        if unit == 'days':
            return base_date + timedelta(days=interval)
        elif unit == 'weeks':
            return base_date + timedelta(weeks=interval)
        elif unit == 'months':
            month = base_date.month + interval
            year = base_date.year + (month - 1) // 12
            month = (month - 1) % 12 + 1
            day = min(base_date.day, 28)
            return base_date.replace(year=year, month=month, day=day)
        elif unit == 'years':
            return base_date.replace(year=base_date.year + interval)
        return base_date

    def delete(self, task_id):
        """Delete a task."""
        self.db.execute("DELETE FROM tasks WHERE id = ?", (task_id,))

    # ========================================================================
    # GTD Views - Filtered queries for different GTD contexts
    # ========================================================================

    def get_inbox(self):
        """Get all tasks in the inbox (unclarified)."""
        return self.db.execute(
            "SELECT * FROM tasks WHERE status = 'inbox' ORDER BY created_at DESC"
        )

    def get_next_actions(self, context=None, energy_level=None):
        """
        Get actionable next actions, optionally filtered by context and energy.

        This is the primary "Daily Actions" view.
        """
        sql = "SELECT * FROM tasks WHERE status = 'next_action'"
        params = []

        if context:
            sql += " AND context = ?"
            params.append(context)
        if energy_level:
            sql += " AND energy_level = ?"
            params.append(energy_level)

        sql += " ORDER BY CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 "
        sql += "WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END, due_date ASC"
        return self.db.execute(sql, params)

    def get_waiting_for(self):
        """Get all tasks waiting on someone else."""
        return self.db.execute(
            """SELECT * FROM tasks WHERE status = 'waiting'
               ORDER BY updated_at ASC"""
        )

    def get_someday_maybe(self):
        """Get the Someday/Maybe list."""
        return self.db.execute(
            "SELECT * FROM tasks WHERE status = 'someday' ORDER BY created_at DESC"
        )

    def get_in_progress(self):
        """Get tasks currently being worked on."""
        return self.db.execute(
            """SELECT * FROM tasks WHERE status = 'in_progress'
               ORDER BY CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1
               WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END"""
        )

    def get_today(self):
        """Get tasks scheduled for today (by do_date or due today)."""
        today = date.today().isoformat()
        return self.db.execute(
            """SELECT * FROM tasks
               WHERE status NOT IN ('done', 'archived')
               AND (do_date = ? OR due_date = ?)
               ORDER BY CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1
               WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END""",
            (today, today)
        )

    def get_overdue(self):
        """Get tasks past their due date."""
        today = date.today().isoformat()
        return self.db.execute(
            """SELECT * FROM tasks
               WHERE status NOT IN ('done', 'archived', 'someday')
               AND due_date < ?
               ORDER BY due_date ASC""",
            (today,)
        )

    def get_upcoming(self, days=7):
        """Get tasks due within the next N days."""
        today = date.today()
        end_date = (today + timedelta(days=days)).isoformat()
        return self.db.execute(
            """SELECT * FROM tasks
               WHERE status NOT IN ('done', 'archived')
               AND due_date BETWEEN ? AND ?
               ORDER BY due_date ASC""",
            (today.isoformat(), end_date)
        )

    def get_by_project(self, project_id):
        """Get all tasks for a specific project."""
        return self.db.execute(
            """SELECT * FROM tasks WHERE project_id = ?
               ORDER BY CASE status WHEN 'in_progress' THEN 0 WHEN 'next_action' THEN 1
               WHEN 'inbox' THEN 2 WHEN 'waiting' THEN 3 WHEN 'done' THEN 4
               ELSE 5 END, due_date ASC""",
            (project_id,)
        )

    def get_by_area(self, area_id):
        """Get all tasks for a specific life area."""
        return self.db.execute(
            """SELECT * FROM tasks WHERE area_id = ?
               AND status NOT IN ('done', 'archived')
               ORDER BY due_date ASC""",
            (area_id,)
        )

    def get_completed(self, since=None):
        """Get completed tasks, optionally since a specific date."""
        if since:
            return self.db.execute(
                """SELECT * FROM tasks WHERE status = 'done' AND completed_date >= ?
                   ORDER BY completed_date DESC""",
                (since,)
            )
        return self.db.execute(
            "SELECT * FROM tasks WHERE status = 'done' ORDER BY completed_date DESC"
        )

    def search(self, query):
        """Full-text search across task titles and descriptions."""
        return self.db.execute(
            """SELECT * FROM tasks
               WHERE (title LIKE ? OR description LIKE ?)
               AND status != 'archived'
               ORDER BY created_at DESC""",
            (f'%{query}%', f'%{query}%')
        )

    def get_contexts(self):
        """Get all unique contexts in use."""
        results = self.db.execute(
            """SELECT DISTINCT context FROM tasks
               WHERE context IS NOT NULL AND status NOT IN ('done', 'archived')
               ORDER BY context"""
        )
        return [r['context'] for r in results]

    def bulk_update_status(self, task_ids, status):
        """Update status for multiple tasks at once."""
        placeholders = ','.join('?' * len(task_ids))
        self.db.execute(
            f"UPDATE tasks SET status = ? WHERE id IN ({placeholders})",
            [status] + list(task_ids)
        )

    def get_completion_history(self, task_id):
        """Get completion history for a recurring task."""
        return self.db.execute(
            """SELECT * FROM task_history WHERE task_id = ?
               ORDER BY completed_at DESC""",
            (task_id,)
        )

    def get_stats(self):
        """Get task statistics."""
        return {
            'inbox': self.db.count('tasks', "status = 'inbox'"),
            'next_actions': self.db.count('tasks', "status = 'next_action'"),
            'in_progress': self.db.count('tasks', "status = 'in_progress'"),
            'waiting': self.db.count('tasks', "status = 'waiting'"),
            'someday': self.db.count('tasks', "status = 'someday'"),
            'done': self.db.count('tasks', "status = 'done'"),
            'overdue': len(self.get_overdue()),
            'due_today': len(self.get_today()),
        }
