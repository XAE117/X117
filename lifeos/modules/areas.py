"""
Areas Module - Life Pillars (PARA Method).

Areas represent the top-level "Pillars" of life: Career, Health, Finances,
Relationships, etc. They are the broadest organizational unit in the
hub-and-spoke architecture. Every Goal, Project, Task, Habit, and Note
can be linked to an Area for holistic life alignment.

Areas are persistent - unlike Projects, they don't have a completion date.
They represent ongoing responsibilities and domains of life.
"""

from ..config import DEFAULT_AREAS


class AreasModule:
    """Manages life areas/pillars - the top of the PARA hierarchy."""

    def __init__(self, db):
        self.db = db

    def create(self, name, description=None, icon='📋', color='#6B7280', sort_order=0):
        """Create a new life area."""
        return self.db.execute(
            """INSERT INTO areas (name, description, icon, color, sort_order)
               VALUES (?, ?, ?, ?, ?)""",
            (name, description, icon, color, sort_order)
        )

    def get(self, area_id):
        """Get an area by ID."""
        result = self.db.execute("SELECT * FROM areas WHERE id = ?", (area_id,))
        return result[0] if result else None

    def get_all(self, active_only=True):
        """Get all areas, optionally filtering to active only."""
        if active_only:
            return self.db.execute(
                "SELECT * FROM areas WHERE is_active = 1 ORDER BY sort_order, name"
            )
        return self.db.execute("SELECT * FROM areas ORDER BY sort_order, name")

    def update(self, area_id, **kwargs):
        """Update area properties."""
        if not kwargs:
            return
        set_clause = ', '.join(f"{k} = ?" for k in kwargs)
        values = list(kwargs.values()) + [area_id]
        self.db.execute(f"UPDATE areas SET {set_clause} WHERE id = ?", values)

    def deactivate(self, area_id):
        """Deactivate an area (soft delete)."""
        self.update(area_id, is_active=0)

    def activate(self, area_id):
        """Reactivate a deactivated area."""
        self.update(area_id, is_active=1)

    def delete(self, area_id):
        """Permanently delete an area."""
        self.db.execute("DELETE FROM areas WHERE id = ?", (area_id,))

    def seed_defaults(self):
        """Seed the database with default life areas."""
        icons = ['💼', '💪', '💰', '❤️', '📚', '🏠', '🎮', '🧘']
        for i, area_name in enumerate(DEFAULT_AREAS):
            existing = self.db.execute(
                "SELECT id FROM areas WHERE name = ?", (area_name,)
            )
            if not existing:
                icon = icons[i] if i < len(icons) else '📋'
                self.create(area_name, icon=icon, sort_order=i)

    def get_dashboard(self, area_id):
        """
        Get a comprehensive dashboard view for an area.

        Returns the area info along with counts and summaries of related
        goals, projects, tasks, habits, and notes.
        """
        area = self.get(area_id)
        if not area:
            return None

        goals = self.db.execute(
            "SELECT * FROM goals WHERE area_id = ? AND status NOT IN ('achieved', 'abandoned')",
            (area_id,)
        )
        projects = self.db.execute(
            "SELECT * FROM projects WHERE area_id = ? AND status NOT IN ('completed', 'archived')",
            (area_id,)
        )
        active_tasks = self.db.count(
            'tasks', "area_id = ? AND status NOT IN ('done', 'archived')", (area_id,)
        )
        habits = self.db.execute(
            "SELECT * FROM habits WHERE area_id = ? AND is_active = 1",
            (area_id,)
        )
        notes_count = self.db.count('notes', 'area_id = ?', (area_id,))

        return {
            'area': area,
            'goals': goals,
            'projects': projects,
            'active_task_count': active_tasks,
            'habits': habits,
            'notes_count': notes_count,
        }

    def get_overview(self):
        """
        Get the Life Dashboard Overview - progress across all areas.

        This is the top-level "Life Dashboard Overview Bar" showing
        how each area is doing.
        """
        areas = self.get_all()
        overview = []
        for area in areas:
            total_goals = self.db.count('goals', 'area_id = ?', (area['id'],))
            achieved_goals = self.db.count(
                'goals', "area_id = ? AND status = 'achieved'", (area['id'],)
            )
            active_projects = self.db.count(
                'projects',
                "area_id = ? AND status NOT IN ('completed', 'archived')",
                (area['id'],)
            )
            active_tasks = self.db.count(
                'tasks',
                "area_id = ? AND status NOT IN ('done', 'archived')",
                (area['id'],)
            )

            overview.append({
                'area': area,
                'total_goals': total_goals,
                'achieved_goals': achieved_goals,
                'active_projects': active_projects,
                'active_tasks': active_tasks,
            })

        return overview

    def search(self, query):
        """Search areas by name or description."""
        return self.db.execute(
            """SELECT * FROM areas
               WHERE (name LIKE ? OR description LIKE ?)
               ORDER BY sort_order, name""",
            (f'%{query}%', f'%{query}%')
        )
