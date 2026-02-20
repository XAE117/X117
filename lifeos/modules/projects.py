"""
Projects Module - Finite outcome containers.

Projects are the primary unit of work in the PARA methodology. Unlike Areas,
Projects have a defined endpoint. They contain tasks and are linked to
Goals and Areas, forming the middle layer of the hierarchy:

    Area -> Goal -> Project -> Task

Projects track progress through task completion rollups, providing
real-time visibility into how much work remains.
"""

from datetime import date


class ProjectsModule:
    """Manages projects - finite containers for work."""

    def __init__(self, db):
        self.db = db

    def create(self, name, description=None, area_id=None, goal_id=None,
               status='not_started', priority='medium', start_date=None,
               due_date=None, para_category='Projects'):
        """Create a new project."""
        return self.db.execute(
            """INSERT INTO projects (name, description, area_id, goal_id,
                status, priority, start_date, due_date, para_category)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (name, description, area_id, goal_id, status, priority,
             start_date, due_date, para_category)
        )

    def get(self, project_id):
        """Get a project by ID."""
        result = self.db.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
        return result[0] if result else None

    def get_all(self, status_filter=None, area_id=None):
        """Get all projects with optional filters."""
        sql = "SELECT * FROM projects WHERE 1=1"
        params = []

        if status_filter:
            if isinstance(status_filter, list):
                placeholders = ','.join('?' * len(status_filter))
                sql += f" AND status IN ({placeholders})"
                params.extend(status_filter)
            else:
                sql += " AND status = ?"
                params.append(status_filter)

        if area_id:
            sql += " AND area_id = ?"
            params.append(area_id)

        sql += """ ORDER BY CASE status
                   WHEN 'in_progress' THEN 0 WHEN 'not_started' THEN 1
                   WHEN 'on_hold' THEN 2 WHEN 'completed' THEN 3
                   ELSE 4 END, due_date ASC"""
        return self.db.execute(sql, params)

    def get_active(self):
        """Get all active (non-completed, non-archived) projects."""
        return self.get_all(status_filter=['not_started', 'in_progress', 'on_hold'])

    def update(self, project_id, **kwargs):
        """Update project properties."""
        if not kwargs:
            return
        set_clause = ', '.join(f"{k} = ?" for k in kwargs)
        values = list(kwargs.values()) + [project_id]
        self.db.execute(f"UPDATE projects SET {set_clause} WHERE id = ?", values)

    def complete(self, project_id):
        """Mark a project as completed."""
        self.update(project_id,
                    status='completed',
                    completed_date=date.today().isoformat())

    def archive(self, project_id):
        """Archive a project, moving it to the PARA Archives category."""
        self.update(project_id,
                    status='archived',
                    para_category='Archives')

    def delete(self, project_id):
        """Delete a project and orphan its tasks."""
        self.db.execute("UPDATE tasks SET project_id = NULL WHERE project_id = ?", (project_id,))
        self.db.execute("DELETE FROM projects WHERE id = ?", (project_id,))

    def get_progress(self, project_id):
        """
        Calculate project completion progress based on task rollup.

        Returns:
            Dict with total_tasks, completed_tasks, and progress_pct.
            Progress = (completed_tasks / total_tasks) * 100
        """
        total = self.db.count('tasks', 'project_id = ?', (project_id,))
        completed = self.db.count(
            'tasks', "project_id = ? AND status = 'done'", (project_id,)
        )

        return {
            'total_tasks': total,
            'completed_tasks': completed,
            'progress_pct': round((completed / total * 100) if total > 0 else 0, 1),
        }

    def get_with_progress(self, project_id):
        """Get project details with progress information."""
        project = self.get(project_id)
        if not project:
            return None

        progress = self.get_progress(project_id)
        return {**project, **progress}

    def get_all_with_progress(self, status_filter=None, area_id=None):
        """Get all projects with their progress calculations."""
        projects = self.get_all(status_filter=status_filter, area_id=area_id)
        result = []
        for project in projects:
            progress = self.get_progress(project['id'])
            result.append({**project, **progress})
        return result

    def get_by_goal(self, goal_id):
        """Get all projects linked to a specific goal."""
        return self.db.execute(
            """SELECT * FROM projects WHERE goal_id = ?
               ORDER BY status, due_date ASC""",
            (goal_id,)
        )

    def get_overdue(self):
        """Get projects past their due date that aren't completed."""
        today = date.today().isoformat()
        return self.db.execute(
            """SELECT * FROM projects
               WHERE due_date < ? AND status NOT IN ('completed', 'archived')
               ORDER BY due_date ASC""",
            (today,)
        )

    def check_auto_complete(self, project_id):
        """
        Check if all tasks in a project are done and auto-complete if so.

        This implements the "Project Updater" automation from the spec:
        when all tasks in a project are marked done, the project
        automatically moves to completed status.
        """
        progress = self.get_progress(project_id)
        if progress['total_tasks'] > 0 and progress['progress_pct'] == 100.0:
            self.complete(project_id)
            return True
        return False

    def search(self, query):
        """Search projects by name or description."""
        return self.db.execute(
            """SELECT * FROM projects
               WHERE (name LIKE ? OR description LIKE ?)
               AND status != 'archived'
               ORDER BY created_at DESC""",
            (f'%{query}%', f'%{query}%')
        )

    def get_stats(self):
        """Get project statistics."""
        return {
            'not_started': self.db.count('projects', "status = 'not_started'"),
            'in_progress': self.db.count('projects', "status = 'in_progress'"),
            'on_hold': self.db.count('projects', "status = 'on_hold'"),
            'completed': self.db.count('projects', "status = 'completed'"),
            'archived': self.db.count('projects', "status = 'archived'"),
            'overdue': len(self.get_overdue()),
        }
