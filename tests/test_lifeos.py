"""
Tests for the LifeOS framework.

Validates the core functionality of all modules including:
- Database schema creation
- CRUD operations for all entities
- Relational integrity (Areas -> Goals -> Projects -> Tasks)
- Formula calculations (progress bars, streaks)
- Automation engine (recurring tasks, auto-archive, status propagation)
"""

import os
import sys
import unittest
import tempfile
from datetime import date, timedelta

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from lifeos.core import LifeOS
from lifeos.formulas import (
    progress_bar, colored_progress_bar, calculate_streak,
    calculate_longest_streak, overdue_indicator, time_progress,
    savings_rate, budget_health,
)


class TestLifeOSSetup(unittest.TestCase):
    """Test LifeOS initialization and setup."""

    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
        self.tmp.close()
        self.os = LifeOS(db_path=self.tmp.name)

    def tearDown(self):
        os.unlink(self.tmp.name)

    def test_initialization(self):
        """LifeOS initializes without errors."""
        self.assertIsNotNone(self.os.db)
        self.assertIsNotNone(self.os.tasks)
        self.assertIsNotNone(self.os.inbox)

    def test_setup_creates_default_areas(self):
        """Setup seeds default life areas."""
        self.os.setup()
        areas = self.os.areas.get_all()
        self.assertEqual(len(areas), 8)
        area_names = [a['name'] for a in areas]
        self.assertIn('Career & Work', area_names)
        self.assertIn('Health & Fitness', area_names)

    def test_setup_idempotent(self):
        """Running setup twice doesn't duplicate areas."""
        self.os.setup()
        self.os.setup()
        areas = self.os.areas.get_all()
        self.assertEqual(len(areas), 8)


class TestInbox(unittest.TestCase):
    """Test the Inbox module."""

    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
        self.tmp.close()
        self.os = LifeOS(db_path=self.tmp.name)

    def tearDown(self):
        os.unlink(self.tmp.name)

    def test_capture(self):
        """Items can be captured to inbox."""
        item_id = self.os.inbox.capture("Buy groceries", type='task')
        self.assertIsNotNone(item_id)
        self.assertEqual(self.os.inbox.count_unprocessed(), 1)

    def test_capture_batch(self):
        """Multiple items can be captured at once."""
        items = [
            {'content': 'Item 1', 'type': 'thought'},
            {'content': 'Item 2', 'type': 'task'},
            {'content': 'Item 3', 'type': 'idea'},
        ]
        self.os.inbox.capture_batch(items)
        self.assertEqual(self.os.inbox.count_unprocessed(), 3)

    def test_process_inbox_item(self):
        """Inbox items can be marked as processed."""
        item_id = self.os.inbox.capture("Test item")
        self.os.inbox.process(item_id, 'tasks', 1)
        self.assertEqual(self.os.inbox.count_unprocessed(), 0)

    def test_dismiss_inbox_item(self):
        """Inbox items can be dismissed."""
        item_id = self.os.inbox.capture("Dismiss me")
        self.os.inbox.dismiss(item_id)
        self.assertEqual(self.os.inbox.count_unprocessed(), 0)

    def test_triage_to_task(self):
        """Inbox items can be triaged to tasks."""
        item_id = self.os.inbox.capture("Important task")
        task_id = self.os.inbox.triage_to_task(item_id, self.os.tasks)
        self.assertEqual(self.os.inbox.count_unprocessed(), 0)
        task = self.os.tasks.get(task_id)
        self.assertEqual(task['title'], 'Important task')


class TestTasks(unittest.TestCase):
    """Test the Master Tasks module."""

    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
        self.tmp.close()
        self.os = LifeOS(db_path=self.tmp.name)

    def tearDown(self):
        os.unlink(self.tmp.name)

    def test_create_task(self):
        """Tasks can be created with all properties."""
        task_id = self.os.tasks.create(
            "Write report", description="Q4 report",
            priority='high', context='@work',
            due_date=date.today().isoformat()
        )
        task = self.os.tasks.get(task_id)
        self.assertEqual(task['title'], 'Write report')
        self.assertEqual(task['priority'], 'high')
        self.assertEqual(task['status'], 'inbox')

    def test_complete_task(self):
        """Tasks can be completed."""
        task_id = self.os.tasks.create("Test task")
        self.os.tasks.complete(task_id)
        task = self.os.tasks.get(task_id)
        self.assertEqual(task['status'], 'done')

    def test_recurring_task(self):
        """Recurring tasks reset after completion."""
        task_id = self.os.tasks.create(
            "Weekly review",
            status='next_action',
            is_recurring=True,
            recur_interval=7,
            recur_unit='days',
            due_date=date.today().isoformat()
        )
        self.os.tasks.complete(task_id)
        task = self.os.tasks.get(task_id)
        self.assertEqual(task['status'], 'next_action')
        self.assertNotEqual(task['due_date'], date.today().isoformat())

    def test_gtd_views(self):
        """GTD views correctly filter tasks."""
        self.os.tasks.create("Inbox item", status='inbox')
        self.os.tasks.create("Next action", status='next_action')
        self.os.tasks.create("Waiting task", status='waiting')
        self.os.tasks.create("Someday item", status='someday')

        self.assertEqual(len(self.os.tasks.get_inbox()), 1)
        self.assertEqual(len(self.os.tasks.get_next_actions()), 1)
        self.assertEqual(len(self.os.tasks.get_waiting_for()), 1)
        self.assertEqual(len(self.os.tasks.get_someday_maybe()), 1)

    def test_overdue_detection(self):
        """Overdue tasks are correctly identified."""
        yesterday = (date.today() - timedelta(days=1)).isoformat()
        self.os.tasks.create("Overdue task", status='next_action', due_date=yesterday)
        overdue = self.os.tasks.get_overdue()
        self.assertEqual(len(overdue), 1)

    def test_task_search(self):
        """Tasks can be searched by title."""
        self.os.tasks.create("Write report")
        self.os.tasks.create("Read book")
        results = self.os.tasks.search("report")
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['title'], 'Write report')


class TestProjects(unittest.TestCase):
    """Test the Projects module."""

    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
        self.tmp.close()
        self.os = LifeOS(db_path=self.tmp.name)
        self.os.setup()

    def tearDown(self):
        os.unlink(self.tmp.name)

    def test_create_project(self):
        """Projects can be created."""
        areas = self.os.areas.get_all()
        project_id = self.os.projects.create(
            "Launch website", area_id=areas[0]['id'],
            priority='high'
        )
        project = self.os.projects.get(project_id)
        self.assertEqual(project['name'], 'Launch website')

    def test_project_progress(self):
        """Project progress is calculated from task rollup."""
        project_id = self.os.projects.create("Test project")
        self.os.tasks.create("Task 1", project_id=project_id, status='done')
        self.os.tasks.create("Task 2", project_id=project_id, status='next_action')

        progress = self.os.projects.get_progress(project_id)
        self.assertEqual(progress['total_tasks'], 2)
        self.assertEqual(progress['completed_tasks'], 1)
        self.assertEqual(progress['progress_pct'], 50.0)

    def test_auto_complete(self):
        """Projects auto-complete when all tasks are done."""
        project_id = self.os.projects.create("Small project", status='in_progress')
        t1 = self.os.tasks.create("Only task", project_id=project_id)
        self.os.tasks.complete(t1)

        auto = self.os.projects.check_auto_complete(project_id)
        self.assertTrue(auto)

        project = self.os.projects.get(project_id)
        self.assertEqual(project['status'], 'completed')


class TestGoals(unittest.TestCase):
    """Test the Goals module."""

    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
        self.tmp.close()
        self.os = LifeOS(db_path=self.tmp.name)
        self.os.setup()

    def tearDown(self):
        os.unlink(self.tmp.name)

    def test_create_goal(self):
        """Goals can be created with targets."""
        areas = self.os.areas.get_all()
        goal_id = self.os.goals.create(
            "Read 24 books",
            area_id=areas[0]['id'],
            target_value=24,
            unit='books',
            target_date='2026-12-31'
        )
        goal = self.os.goals.get(goal_id)
        self.assertEqual(goal['title'], 'Read 24 books')
        self.assertEqual(goal['target_value'], 24)

    def test_goal_progress(self):
        """Goal progress is calculated correctly."""
        goal_id = self.os.goals.create("Test goal", target_value=100)
        self.os.goals.update_progress(goal_id, 50)

        progress = self.os.goals.get_progress(goal_id)
        self.assertEqual(progress['value_progress'], 50.0)

    def test_goal_auto_achieve(self):
        """Goals auto-achieve when target is met."""
        goal_id = self.os.goals.create("Small goal", target_value=10)
        self.os.goals.update_progress(goal_id, 10)

        goal = self.os.goals.get(goal_id)
        self.assertEqual(goal['status'], 'achieved')

    def test_goal_increment(self):
        """Goal progress can be incremented."""
        goal_id = self.os.goals.create("Count goal", target_value=5)
        self.os.goals.increment_progress(goal_id, 2)
        self.os.goals.increment_progress(goal_id, 1)

        goal = self.os.goals.get(goal_id)
        self.assertEqual(goal['current_value'], 3)


class TestHabits(unittest.TestCase):
    """Test the Habits module."""

    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
        self.tmp.close()
        self.os = LifeOS(db_path=self.tmp.name)

    def tearDown(self):
        os.unlink(self.tmp.name)

    def test_create_habit(self):
        """Habits can be created."""
        habit_id = self.os.habits.create("Meditate", frequency='daily')
        habit = self.os.habits.get(habit_id)
        self.assertEqual(habit['name'], 'Meditate')

    def test_log_habit(self):
        """Habits can be logged."""
        habit_id = self.os.habits.create("Exercise")
        self.os.habits.log_today(habit_id)
        self.assertTrue(self.os.habits.is_logged_today(habit_id))

    def test_streak_calculation(self):
        """Streaks are calculated correctly."""
        habit_id = self.os.habits.create("Read")
        today = date.today()

        # Log for 5 consecutive days
        for i in range(5):
            log_date = (today - timedelta(days=i)).isoformat()
            self.os.habits.log(habit_id, log_date)

        streak = self.os.habits.get_current_streak(habit_id)
        self.assertEqual(streak, 5)

    def test_completion_rate(self):
        """Completion rate is calculated correctly."""
        habit_id = self.os.habits.create("Water")
        today = date.today()

        # Log for 15 out of last 30 days
        for i in range(0, 30, 2):
            log_date = (today - timedelta(days=i)).isoformat()
            self.os.habits.log(habit_id, log_date)

        rate = self.os.habits.get_completion_rate(habit_id, 30)
        self.assertEqual(rate, 50.0)


class TestFormulas(unittest.TestCase):
    """Test the formula engine."""

    def test_progress_bar(self):
        """Progress bars render correctly."""
        bar = progress_bar(50, 100, width=10)
        self.assertIn('50%', bar)
        self.assertEqual(len(bar.split()[0]), 10)

    def test_progress_bar_zero(self):
        """Zero progress renders correctly."""
        bar = progress_bar(0, 100, width=10)
        self.assertIn('0%', bar)

    def test_progress_bar_full(self):
        """Full progress renders correctly."""
        bar = progress_bar(100, 100, width=10)
        self.assertIn('100%', bar)

    def test_streak_calculation(self):
        """Streak calculation works with date strings."""
        today = date.today()
        dates = [(today - timedelta(days=i)).isoformat() for i in range(10)]
        streak = calculate_streak(dates)
        self.assertEqual(streak, 10)

    def test_streak_with_gap(self):
        """Streak breaks on gaps."""
        today = date.today()
        # Gap on day 3
        dates = [
            today.isoformat(),
            (today - timedelta(days=1)).isoformat(),
            (today - timedelta(days=2)).isoformat(),
            # skip day 3
            (today - timedelta(days=4)).isoformat(),
        ]
        streak = calculate_streak(dates)
        self.assertEqual(streak, 3)

    def test_longest_streak(self):
        """Longest streak is found correctly."""
        today = date.today()
        dates = [
            # First streak of 3
            (today - timedelta(days=10)).isoformat(),
            (today - timedelta(days=9)).isoformat(),
            (today - timedelta(days=8)).isoformat(),
            # Gap
            # Second streak of 5
            (today - timedelta(days=5)).isoformat(),
            (today - timedelta(days=4)).isoformat(),
            (today - timedelta(days=3)).isoformat(),
            (today - timedelta(days=2)).isoformat(),
            (today - timedelta(days=1)).isoformat(),
        ]
        longest = calculate_longest_streak(dates)
        self.assertEqual(longest, 5)

    def test_overdue_indicator(self):
        """Overdue indicator detects past-due items."""
        yesterday = (date.today() - timedelta(days=1)).isoformat()
        is_overdue, days, display = overdue_indicator(yesterday)
        self.assertTrue(is_overdue)
        self.assertEqual(days, 1)
        self.assertIn('overdue', display)

    def test_savings_rate(self):
        """Savings rate calculation."""
        rate = savings_rate(5000, 3000)
        self.assertEqual(rate, 40.0)

    def test_budget_health(self):
        """Budget health indicators."""
        pct, status, _ = budget_health(1000, 500)
        self.assertEqual(pct, 50.0)
        self.assertEqual(status, 'healthy')

        pct, status, _ = budget_health(1000, 900)
        self.assertEqual(status, 'warning')

        pct, status, _ = budget_health(1000, 1200)
        self.assertEqual(status, 'over')


class TestAutomations(unittest.TestCase):
    """Test the automation engine."""

    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
        self.tmp.close()
        self.os = LifeOS(db_path=self.tmp.name)
        self.os.setup()

    def tearDown(self):
        os.unlink(self.tmp.name)

    def test_status_propagation(self):
        """Status propagation auto-completes projects."""
        project_id = self.os.projects.create("Test", status='in_progress')
        t1 = self.os.tasks.create("T1", project_id=project_id)
        t2 = self.os.tasks.create("T2", project_id=project_id)

        self.os.tasks.complete(t1)
        self.os.tasks.complete(t2)

        result = self.os.automations.propagate_status()
        self.assertEqual(result['projects_completed'], 1)

        project = self.os.projects.get(project_id)
        self.assertEqual(project['status'], 'completed')

    def test_overdue_detection(self):
        """Overdue detection finds overdue items."""
        yesterday = (date.today() - timedelta(days=1)).isoformat()
        self.os.tasks.create("Overdue", status='next_action', due_date=yesterday)

        result = self.os.automations.detect_overdue()
        self.assertEqual(result['overdue_tasks'], 1)

    def test_weekly_review_prep(self):
        """Weekly review preparation generates correct data."""
        self.os.tasks.create("Inbox item", status='inbox')
        self.os.tasks.create("Next action", status='next_action')

        review = self.os.automations.prepare_weekly_review()
        self.assertIn('inbox_count', review)
        self.assertIn('next_actions', review)
        self.assertEqual(review['next_actions'], 1)

    def test_reminder_generation(self):
        """Reminders are generated for relevant items."""
        tomorrow = (date.today() + timedelta(days=1)).isoformat()
        self.os.tasks.create("Due soon", status='next_action', due_date=tomorrow)

        reminders = self.os.automations.generate_reminders()
        self.assertTrue(len(reminders) > 0)
        self.assertEqual(reminders[0]['type'], 'due_soon')


class TestHierarchy(unittest.TestCase):
    """Test the full Area -> Goal -> Project -> Task hierarchy."""

    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
        self.tmp.close()
        self.os = LifeOS(db_path=self.tmp.name)
        self.os.setup()

    def tearDown(self):
        os.unlink(self.tmp.name)

    def test_full_hierarchy(self):
        """Complete hierarchy works with proper relations."""
        # Create area
        areas = self.os.areas.get_all()
        career_area = next(a for a in areas if a['name'] == 'Career & Work')

        # Create goal
        goal_id = self.os.goals.create(
            "Get promotion",
            area_id=career_area['id'],
            target_value=1, unit='promotion'
        )

        # Create project
        project_id = self.os.projects.create(
            "Complete certification",
            area_id=career_area['id'],
            goal_id=goal_id,
            status='in_progress'
        )

        # Create tasks
        t1 = self.os.tasks.create("Study chapter 1", project_id=project_id,
                                   area_id=career_area['id'], goal_id=goal_id)
        t2 = self.os.tasks.create("Study chapter 2", project_id=project_id,
                                   area_id=career_area['id'], goal_id=goal_id)
        t3 = self.os.tasks.create("Take exam", project_id=project_id,
                                   area_id=career_area['id'], goal_id=goal_id)

        # Verify hierarchy
        project_tasks = self.os.tasks.get_by_project(project_id)
        self.assertEqual(len(project_tasks), 3)

        area_tasks = self.os.tasks.get_by_area(career_area['id'])
        self.assertEqual(len(area_tasks), 3)

        goal_projects = self.os.projects.get_by_goal(goal_id)
        self.assertEqual(len(goal_projects), 1)

        # Progress flows correctly
        progress = self.os.projects.get_progress(project_id)
        self.assertEqual(progress['progress_pct'], 0)

        self.os.tasks.complete(t1)
        progress = self.os.projects.get_progress(project_id)
        self.assertAlmostEqual(progress['progress_pct'], 33.3, places=0)

        # Area dashboard shows correct counts
        dashboard = self.os.areas.get_dashboard(career_area['id'])
        self.assertEqual(dashboard['active_task_count'], 2)  # 2 remaining

    def test_global_search(self):
        """Global search finds items across modules."""
        self.os.tasks.create("Write quarterly report")
        self.os.projects.create("Quarterly planning")
        self.os.knowledge.create_note("Report template", content="Quarterly format")

        results = self.os.search("quarterly")
        total = sum(len(v) for v in results.values())
        self.assertEqual(total, 3)


class TestKnowledge(unittest.TestCase):
    """Test the Knowledge/Second Brain module."""

    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
        self.tmp.close()
        self.os = LifeOS(db_path=self.tmp.name)

    def tearDown(self):
        os.unlink(self.tmp.name)

    def test_create_note(self):
        """Notes can be created."""
        note_id = self.os.knowledge.create_note(
            "Meeting Notes", content="Discussion about Q4 targets",
            type='meeting'
        )
        note = self.os.knowledge.get_note(note_id)
        self.assertEqual(note['title'], 'Meeting Notes')
        self.assertEqual(note['type'], 'meeting')

    def test_reading_tracker(self):
        """Reading list tracks books and progress."""
        reading_id = self.os.knowledge.add_reading(
            "Atomic Habits", author="James Clear",
            type='book', total_pages=320
        )

        self.os.knowledge.update_reading_progress(reading_id, 100)
        progress = self.os.knowledge.get_reading_progress(reading_id)
        self.assertAlmostEqual(progress, 31.2, places=0)

    def test_reading_auto_complete(self):
        """Reading items auto-complete at total pages."""
        reading_id = self.os.knowledge.add_reading(
            "Short Book", total_pages=100
        )
        self.os.knowledge.update_reading_progress(reading_id, 100)
        item = self.os.knowledge.get_reading(reading_id)
        self.assertEqual(item['status'], 'completed')

    def test_highlights(self):
        """Highlights can be added to reading items."""
        reading_id = self.os.knowledge.add_reading("Test Book")
        self.os.knowledge.add_highlight(
            reading_id, "Key insight here", page_number=42
        )
        highlights = self.os.knowledge.get_highlights(reading_id)
        self.assertEqual(len(highlights), 1)


class TestDashboard(unittest.TestCase):
    """Test dashboard rendering."""

    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
        self.tmp.close()
        self.os = LifeOS(db_path=self.tmp.name)
        self.os.setup()

    def tearDown(self):
        os.unlink(self.tmp.name)

    def test_home_renders(self):
        """Home dashboard renders without errors."""
        output = self.os.dashboard.render_home()
        self.assertIn('LIFE OPERATING SYSTEM', output)
        self.assertIn('TODAY\'S FOCUS', output)

    def test_inbox_renders(self):
        """Inbox view renders without errors."""
        self.os.inbox.capture("Test item")
        output = self.os.dashboard.render_inbox()
        self.assertIn('INBOX', output)
        self.assertIn('Test item', output)

    def test_projects_render(self):
        """Projects view renders without errors."""
        output = self.os.dashboard.render_projects()
        self.assertIn('PROJECTS', output)

    def test_weekly_review_renders(self):
        """Weekly review renders without errors."""
        output = self.os.dashboard.render_weekly_review()
        self.assertIn('WEEKLY REVIEW', output)
        self.assertIn('GTD Review Checklist', output)


if __name__ == '__main__':
    unittest.main()
