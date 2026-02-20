"""
LifeOS Core - The main orchestrator that ties all modules together.

Provides a unified interface to all LifeOS subsystems, manages the
database connection, and coordinates cross-module operations.

Usage:
    from lifeos.core import LifeOS

    os = LifeOS()           # Uses default database path
    os.setup()              # Initialize with default areas

    # Quick capture
    os.inbox.capture("Read chapter 5 of Atomic Habits")

    # Task management
    os.tasks.create("Write project proposal", priority='high')

    # Dashboard
    print(os.dashboard.render_home())
"""

from .database import Database
from .config import Config
from .modules.inbox import InboxModule
from .modules.tasks import TasksModule
from .modules.projects import ProjectsModule
from .modules.areas import AreasModule
from .modules.goals import GoalsModule
from .modules.habits import HabitsModule
from .modules.journal import JournalModule
from .modules.finance import FinanceModule
from .modules.fitness import FitnessModule
from .modules.knowledge import KnowledgeModule
from .automations import AutomationEngine
from .dashboard import Dashboard


class LifeOS:
    """
    Main orchestrator for the Life Operating System.

    Hub-and-spoke architecture:
    - Database is the central hub
    - Each module is a spoke with its own business logic
    - The Dashboard renders cross-module views
    - Automations handle cross-module workflows
    """

    def __init__(self, db_path=None, config_path=None):
        """
        Initialize the LifeOS with all modules.

        Args:
            db_path: Path to the SQLite database file.
            config_path: Path to the configuration JSON file.
        """
        self.config = Config(config_path)
        if db_path:
            self.config.db_path = db_path

        self.db = Database(self.config.db_path)

        # Initialize all modules (spokes)
        self.inbox = InboxModule(self.db)
        self.tasks = TasksModule(self.db)
        self.projects = ProjectsModule(self.db)
        self.areas = AreasModule(self.db)
        self.goals = GoalsModule(self.db)
        self.habits = HabitsModule(self.db)
        self.journal = JournalModule(self.db)
        self.finance = FinanceModule(self.db)
        self.fitness = FitnessModule(self.db)
        self.knowledge = KnowledgeModule(self.db)

        # Cross-module systems
        self.automations = AutomationEngine(self.db)
        self.dashboard = Dashboard(self)

    def setup(self):
        """
        Initialize the LifeOS with default data.

        Seeds default life areas and prepares the system for first use.
        """
        self.areas.seed_defaults()

    def quick_capture(self, content, type='thought'):
        """
        Shortcut for zero-friction inbox capture.

        This is the most common entry point for new information.
        Designed to be called in under 10 seconds.
        """
        return self.inbox.capture(content, type=type)

    def daily_review(self):
        """
        Get the daily review data - what to focus on today.

        Returns a dict with today's tasks, overdue items,
        habit status, and any reminders.
        """
        return {
            'today_tasks': self.tasks.get_today(),
            'overdue': self.tasks.get_overdue(),
            'in_progress': self.tasks.get_in_progress(),
            'next_actions': self.tasks.get_next_actions(),
            'habit_status': self.habits.get_today_status(),
            'inbox_count': self.inbox.count_unprocessed(),
            'reminders': self.automations.generate_reminders(),
        }

    def run_maintenance(self):
        """
        Run all automated maintenance routines.

        Should be run periodically (e.g., daily or at system startup).
        """
        return self.automations.run_all()

    def weekly_review(self):
        """Prepare and return data for the weekly review process."""
        return self.automations.prepare_weekly_review()

    def get_overview(self):
        """Get a comprehensive overview of the entire system."""
        return {
            'areas': self.areas.get_overview(),
            'task_stats': self.tasks.get_stats(),
            'project_stats': self.projects.get_stats(),
            'goal_stats': self.goals.get_stats(),
            'habit_count': len(self.habits.get_all()),
            'inbox_count': self.inbox.count_unprocessed(),
            'knowledge_stats': self.knowledge.get_stats(),
            'finance_stats': self.finance.get_stats(),
            'fitness_stats': self.fitness.get_stats(),
            'journal_stats': self.journal.get_stats(),
        }

    def search(self, query):
        """
        Global search across all modules.

        Returns categorized results from tasks, projects, notes,
        reading list, and inbox.
        """
        return {
            'tasks': self.tasks.search(query),
            'projects': self.projects.search(query),
            'notes': self.knowledge.search_notes(query),
            'reading': self.knowledge.search_reading(query),
            'inbox': self.inbox.search(query),
            'goals': self.goals.search(query),
            'areas': self.areas.search(query),
        }
