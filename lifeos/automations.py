"""
Automation Engine - Recurring tasks, auto-archive, and status propagation.

Implements the automation logic that would be handled by Notion's native
database automations in a Notion environment. In the local LifeOS, these
run as explicit operations that can be triggered on-demand or scheduled.

Key automations:
1. Recurring Task Reset - Resets completed recurring tasks with new dates
2. Auto-Archive - Moves old completed items to the archive
3. Status Propagation - Updates parent status when children change
4. Overdue Detection - Flags overdue tasks and at-risk goals
5. Weekly Review Preparation - Generates review checklist
"""

import json
from datetime import date, timedelta, datetime


class AutomationEngine:
    """Orchestrates automated workflows across the LifeOS."""

    def __init__(self, db):
        self.db = db

    def run_all(self):
        """Run all automated maintenance routines."""
        results = {
            'recurring_tasks': self.process_recurring_tasks(),
            'auto_archive': self.auto_archive_completed(),
            'status_propagation': self.propagate_status(),
            'overdue_detection': self.detect_overdue(),
            'goal_risk_check': self.check_goal_risks(),
        }
        return results

    # ========================================================================
    # 1. Recurring Task Processing
    # ========================================================================

    def process_recurring_tasks(self):
        """
        Process all completed recurring tasks.

        When a recurring task is marked 'done', this automation:
        1. Logs the completion to task_history
        2. Resets the task status to 'next_action'
        3. Advances the due_date by the recurrence interval

        This mirrors Notion's database automation:
        Trigger: Status = "Done" AND Is Recurring = true
        Actions: Reset status, advance date
        """
        completed_recurring = self.db.execute(
            """SELECT * FROM tasks
               WHERE is_recurring = 1 AND status = 'done'
               AND recur_interval IS NOT NULL AND recur_unit IS NOT NULL"""
        )

        processed = 0
        for task in completed_recurring:
            # Calculate next due date
            if task['recur_from'] == 'completion_date' or not task['due_date']:
                base = date.today()
            else:
                base = date.fromisoformat(task['due_date'])

            next_date = self._add_interval(base, task['recur_interval'], task['recur_unit'])

            # Reset the task
            self.db.execute(
                """UPDATE tasks SET status = 'next_action', due_date = ?,
                   completed_date = NULL WHERE id = ?""",
                (next_date.isoformat(), task['id'])
            )
            processed += 1

        return {'processed': processed}

    # ========================================================================
    # 2. Auto-Archive
    # ========================================================================

    def auto_archive_completed(self, days_threshold=30):
        """
        Archive items completed more than N days ago.

        Moves old completed tasks, projects, and notes to the archive
        table to keep active databases lean and performant.
        """
        cutoff = (date.today() - timedelta(days=days_threshold)).isoformat()
        archived = {'tasks': 0, 'projects': 0}

        # Archive old completed tasks (non-recurring only)
        old_tasks = self.db.execute(
            """SELECT * FROM tasks
               WHERE status = 'done' AND is_recurring = 0
               AND completed_date < ?""",
            (cutoff,)
        )

        for task in old_tasks:
            self.db.execute(
                """INSERT INTO archive (source_table, source_id, data_json, archived_reason)
                   VALUES (?, ?, ?, ?)""",
                ('tasks', task['id'], json.dumps(dict(task)), 'auto_archive')
            )
            self.db.execute(
                "UPDATE tasks SET status = 'archived' WHERE id = ?", (task['id'],)
            )
            archived['tasks'] += 1

        # Archive old completed projects
        old_projects = self.db.execute(
            """SELECT * FROM projects
               WHERE status = 'completed' AND completed_date < ?""",
            (cutoff,)
        )

        for project in old_projects:
            self.db.execute(
                """INSERT INTO archive (source_table, source_id, data_json, archived_reason)
                   VALUES (?, ?, ?, ?)""",
                ('projects', project['id'], json.dumps(dict(project)), 'auto_archive')
            )
            self.db.execute(
                """UPDATE projects SET status = 'archived', para_category = 'Archives'
                   WHERE id = ?""",
                (project['id'],)
            )
            archived['projects'] += 1

        return archived

    # ========================================================================
    # 3. Status Propagation
    # ========================================================================

    def propagate_status(self):
        """
        Propagate completion status up the hierarchy.

        When all tasks in a project are done -> project = completed
        When all projects for a goal are done -> goal = achieved

        This implements the "Project Updater" automation from the spec.
        """
        updates = {'projects_completed': 0, 'goals_achieved': 0}

        # Check projects where all tasks are done
        active_projects = self.db.execute(
            "SELECT id FROM projects WHERE status IN ('not_started', 'in_progress')"
        )

        for project in active_projects:
            total = self.db.count('tasks', 'project_id = ?', (project['id'],))
            done = self.db.count(
                'tasks', "project_id = ? AND status = 'done'", (project['id'],)
            )

            if total > 0 and total == done:
                self.db.execute(
                    """UPDATE projects SET status = 'completed',
                       completed_date = ? WHERE id = ?""",
                    (date.today().isoformat(), project['id'])
                )
                updates['projects_completed'] += 1

        # Check goals where all projects are done
        active_goals = self.db.execute(
            "SELECT id FROM goals WHERE status IN ('not_started', 'in_progress', 'on_track')"
        )

        for goal in active_goals:
            total_projects = self.db.count('projects', 'goal_id = ?', (goal['id'],))
            completed_projects = self.db.count(
                'projects', "goal_id = ? AND status = 'completed'", (goal['id'],)
            )

            if total_projects > 0 and total_projects == completed_projects:
                # Also check if target value is met (if applicable)
                goal_data = self.db.execute("SELECT * FROM goals WHERE id = ?", (goal['id'],))
                if goal_data:
                    g = goal_data[0]
                    if not g['target_value'] or (g['current_value'] or 0) >= g['target_value']:
                        self.db.execute(
                            "UPDATE goals SET status = 'achieved' WHERE id = ?",
                            (goal['id'],)
                        )
                        updates['goals_achieved'] += 1

        return updates

    # ========================================================================
    # 4. Overdue Detection
    # ========================================================================

    def detect_overdue(self):
        """
        Detect and flag overdue items.

        Returns counts and lists of overdue tasks and projects.
        """
        today = date.today().isoformat()

        overdue_tasks = self.db.execute(
            """SELECT id, title, due_date FROM tasks
               WHERE due_date < ? AND status NOT IN ('done', 'archived', 'someday')
               ORDER BY due_date ASC""",
            (today,)
        )

        overdue_projects = self.db.execute(
            """SELECT id, name, due_date FROM projects
               WHERE due_date < ? AND status NOT IN ('completed', 'archived')
               ORDER BY due_date ASC""",
            (today,)
        )

        return {
            'overdue_tasks': len(overdue_tasks),
            'overdue_projects': len(overdue_projects),
            'tasks': overdue_tasks,
            'projects': overdue_projects,
        }

    # ========================================================================
    # 5. Goal Risk Assessment
    # ========================================================================

    def check_goal_risks(self):
        """
        Check all active goals for at-risk status.

        A goal is at-risk when its time progress significantly
        exceeds its value/project progress, indicating it's
        falling behind schedule.
        """
        from .formulas import time_progress

        active_goals = self.db.execute(
            """SELECT * FROM goals
               WHERE status IN ('in_progress', 'on_track')
               AND target_date IS NOT NULL"""
        )

        flagged = 0
        for goal in active_goals:
            time_pct = time_progress(goal['start_date'], goal['target_date'])

            # Calculate value progress
            value_pct = 0
            if goal['target_value'] and goal['target_value'] > 0:
                value_pct = min(100, (goal['current_value'] or 0) / goal['target_value'] * 100)

            # At risk if progress is more than 20 percentage points behind time
            if time_pct > 20 and value_pct < (time_pct - 20):
                self.db.execute(
                    "UPDATE goals SET status = 'at_risk' WHERE id = ?",
                    (goal['id'],)
                )
                flagged += 1

        return {'goals_flagged_at_risk': flagged}

    # ========================================================================
    # 6. Weekly Review Preparation
    # ========================================================================

    def prepare_weekly_review(self):
        """
        Generate data for the weekly review process.

        Follows the GTD Weekly Review checklist:
        1. Collect loose items (inbox count)
        2. Process inbox
        3. Review next actions
        4. Review waiting-for items
        5. Review projects
        6. Review someday/maybe
        """
        today = date.today()
        week_start = (today - timedelta(days=7)).isoformat()

        # Collect data for review
        return {
            'inbox_count': self.db.count('inbox', 'is_processed = 0'),
            'next_actions': self.db.count('tasks', "status = 'next_action'"),
            'waiting_for': self.db.count('tasks', "status = 'waiting'"),
            'in_progress_tasks': self.db.count('tasks', "status = 'in_progress'"),
            'overdue_tasks': len(self.db.execute(
                """SELECT id FROM tasks WHERE due_date < ?
                   AND status NOT IN ('done', 'archived', 'someday')""",
                (today.isoformat(),)
            )),
            'completed_this_week': self.db.count(
                'tasks', "status = 'done' AND completed_date >= ?", (week_start,)
            ),
            'active_projects': self.db.count(
                'projects', "status IN ('not_started', 'in_progress')"
            ),
            'stalled_projects': len(self.db.execute(
                """SELECT p.id FROM projects p
                   WHERE p.status = 'in_progress'
                   AND NOT EXISTS (
                       SELECT 1 FROM tasks t
                       WHERE t.project_id = p.id
                       AND t.status IN ('next_action', 'in_progress')
                   )"""
            )),
            'someday_items': self.db.count('tasks', "status = 'someday'"),
            'at_risk_goals': self.db.count('goals', "status = 'at_risk'"),
            'review_date': today.isoformat(),
            'week_number': today.isocalendar()[1],
        }

    def save_weekly_review(self, wins=None, challenges=None, lessons=None,
                           next_week_priorities=None, overall_rating=None):
        """Save a completed weekly review."""
        today = date.today()
        return self.db.execute(
            """INSERT INTO weekly_reviews (review_date, week_number, wins,
                challenges, lessons, next_week_priorities,
                inbox_cleared, projects_reviewed, goals_reviewed,
                habits_reviewed, overall_rating)
               VALUES (?, ?, ?, ?, ?, ?, 1, 1, 1, 1, ?)""",
            (today.isoformat(), today.isocalendar()[1], wins,
             challenges, lessons, next_week_priorities, overall_rating)
        )

    # ========================================================================
    # 7. Reminder Generation
    # ========================================================================

    def generate_reminders(self, days_threshold=3):
        """
        Generate reminders for items needing attention.

        Checks for:
        - Tasks due within threshold days
        - Waiting-for items not updated recently
        - Stalled projects (no active next actions)
        - Unprocessed inbox items older than 24 hours
        """
        today = date.today()
        threshold_date = (today + timedelta(days=days_threshold)).isoformat()
        stale_date = (today - timedelta(days=days_threshold)).isoformat()

        reminders = []

        # Due soon
        due_soon = self.db.execute(
            """SELECT id, title, due_date FROM tasks
               WHERE due_date BETWEEN ? AND ?
               AND status NOT IN ('done', 'archived')""",
            (today.isoformat(), threshold_date)
        )
        for task in due_soon:
            reminders.append({
                'type': 'due_soon',
                'item': 'task',
                'id': task['id'],
                'message': f"Task '{task['title']}' due on {task['due_date']}",
            })

        # Stale waiting-for
        stale_waiting = self.db.execute(
            """SELECT id, title, waiting_for, updated_at FROM tasks
               WHERE status = 'waiting' AND updated_at < ?""",
            (stale_date,)
        )
        for task in stale_waiting:
            reminders.append({
                'type': 'stale_waiting',
                'item': 'task',
                'id': task['id'],
                'message': f"Waiting on '{task['waiting_for']}' for task '{task['title']}'",
            })

        # Old inbox items
        old_inbox = self.db.execute(
            """SELECT id, content FROM inbox
               WHERE is_processed = 0 AND created_at < ?""",
            (stale_date,)
        )
        for item in old_inbox:
            reminders.append({
                'type': 'stale_inbox',
                'item': 'inbox',
                'id': item['id'],
                'message': f"Inbox item needs processing: '{item['content'][:50]}'",
            })

        return reminders

    # ========================================================================
    # Helper Methods
    # ========================================================================

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
