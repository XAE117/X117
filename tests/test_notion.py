"""
Tests for the Notion integration layer.

Validates schema definitions, formula generation, view configurations,
template building, and sync layer logic (without hitting the Notion API).
"""

import os
import sys
import unittest
import tempfile

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from lifeos.notion.schemas import (
    get_all_schemas, get_relation_mappings,
    get_areas_schema, get_goals_schema, get_projects_schema,
    get_tasks_schema, get_inbox_schema, get_habits_schema,
    get_habit_logs_schema, get_journal_schema,
    get_finance_accounts_schema, get_finance_transactions_schema,
    get_finance_budgets_schema, get_workouts_schema,
    get_body_metrics_schema, get_meals_schema,
    get_notes_schema, get_reading_schema,
    get_weekly_reviews_schema, get_pomodoro_schema,
)
from lifeos.notion.views import get_all_views
from lifeos.notion.formulas import (
    ALL_FORMULAS, get_formulas_for_database,
    TASK_OVERDUE, PROJECT_PROGRESS_BAR, GOAL_PROGRESS,
    READING_PROGRESS, BUDGET_HEALTH, HABIT_STREAK_DISPLAY,
)
from lifeos.notion.templates import (
    get_all_dashboard_configs,
    get_command_center_blocks,
    get_weekly_review_blocks,
)


FAKE_PAGE_ID = "00000000-0000-0000-0000-000000000000"


class TestSchemas(unittest.TestCase):
    """Test Notion database schema definitions."""

    def test_all_schemas_returned(self):
        """get_all_schemas returns all 18 databases."""
        schemas = get_all_schemas(FAKE_PAGE_ID)
        expected = {
            'areas', 'goals', 'projects', 'tasks', 'inbox',
            'habits', 'habit_logs', 'journal',
            'finance_accounts', 'finance_transactions', 'finance_budgets',
            'workouts', 'body_metrics', 'meals',
            'notes', 'reading',
            'weekly_reviews', 'pomodoro',
        }
        self.assertEqual(set(schemas.keys()), expected)

    def test_each_schema_has_parent(self):
        """Every schema has a parent page ID."""
        schemas = get_all_schemas(FAKE_PAGE_ID)
        for name, schema in schemas.items():
            self.assertIn('parent', schema, f"{name} missing parent")
            self.assertEqual(schema['parent']['page_id'], FAKE_PAGE_ID)

    def test_each_schema_has_title(self):
        """Every schema has a title."""
        schemas = get_all_schemas(FAKE_PAGE_ID)
        for name, schema in schemas.items():
            self.assertIn('title', schema, f"{name} missing title")
            self.assertTrue(len(schema['title']) > 0)

    def test_each_schema_has_properties(self):
        """Every schema has at least one property."""
        schemas = get_all_schemas(FAKE_PAGE_ID)
        for name, schema in schemas.items():
            self.assertIn('properties', schema, f"{name} missing properties")
            self.assertTrue(len(schema['properties']) >= 1)

    def test_each_schema_has_icon(self):
        """Every schema has an emoji icon."""
        schemas = get_all_schemas(FAKE_PAGE_ID)
        for name, schema in schemas.items():
            self.assertIn('icon', schema, f"{name} missing icon")
            self.assertEqual(schema['icon']['type'], 'emoji')

    def test_tasks_schema_has_gtd_statuses(self):
        """Tasks schema includes all GTD status options."""
        schema = get_tasks_schema(FAKE_PAGE_ID)
        status_prop = schema['properties']['Status']
        status_names = [o['name'] for o in status_prop['status']['options']]
        self.assertIn('Inbox', status_names)
        self.assertIn('Next Action', status_names)
        self.assertIn('Waiting', status_names)
        self.assertIn('Someday', status_names)
        self.assertIn('Done', status_names)

    def test_tasks_schema_has_context_options(self):
        """Tasks schema includes context options."""
        schema = get_tasks_schema(FAKE_PAGE_ID)
        context_prop = schema['properties']['Context']
        context_names = [o['name'] for o in context_prop['select']['options']]
        self.assertIn('@Work', context_names)
        self.assertIn('@Home', context_names)

    def test_budgets_schema_has_formula_properties(self):
        """Budgets schema includes computed formula properties."""
        schema = get_finance_budgets_schema(FAKE_PAGE_ID)
        self.assertIn('Remaining', schema['properties'])
        self.assertIn('Pct Used', schema['properties'])
        self.assertIn('formula', schema['properties']['Remaining'])

    def test_workouts_has_activity_types(self):
        """Workouts schema has all major activity types."""
        schema = get_workouts_schema(FAKE_PAGE_ID)
        types = [o['name'] for o in schema['properties']['Type']['select']['options']]
        self.assertIn('Strength', types)
        self.assertIn('Cardio', types)
        self.assertIn('HIIT', types)
        self.assertIn('Yoga', types)


class TestRelations(unittest.TestCase):
    """Test relation mappings between databases."""

    def test_relations_exist(self):
        """Relation mappings are defined."""
        relations = get_relation_mappings()
        self.assertTrue(len(relations) > 0)

    def test_all_relations_have_required_fields(self):
        """Each relation has source, property_name, target, type."""
        relations = get_relation_mappings()
        for rel in relations:
            self.assertIn('source', rel)
            self.assertIn('property_name', rel)
            self.assertIn('target', rel)
            self.assertIn('type', rel)

    def test_tasks_linked_to_projects(self):
        """Tasks have a relation to Projects."""
        relations = get_relation_mappings()
        task_project = [r for r in relations
                        if r['source'] == 'tasks' and r['target'] == 'projects']
        self.assertEqual(len(task_project), 1)

    def test_goals_linked_to_areas(self):
        """Goals have a relation to Areas."""
        relations = get_relation_mappings()
        goal_area = [r for r in relations
                     if r['source'] == 'goals' and r['target'] == 'areas']
        self.assertEqual(len(goal_area), 1)

    def test_habit_logs_linked_to_habits(self):
        """Habit Logs have a relation to Habits."""
        relations = get_relation_mappings()
        hl_habits = [r for r in relations
                     if r['source'] == 'habit_logs' and r['target'] == 'habits']
        self.assertEqual(len(hl_habits), 1)

    def test_transactions_linked_to_accounts(self):
        """Finance Transactions link to Finance Accounts."""
        relations = get_relation_mappings()
        txn_acct = [r for r in relations
                    if r['source'] == 'finance_transactions' and r['target'] == 'finance_accounts']
        self.assertEqual(len(txn_acct), 1)

    def test_pomodoro_linked_to_tasks(self):
        """Pomodoro sessions link to Tasks."""
        relations = get_relation_mappings()
        pomo_task = [r for r in relations
                     if r['source'] == 'pomodoro' and r['target'] == 'tasks']
        self.assertEqual(len(pomo_task), 1)

    def test_relation_sources_are_valid_schemas(self):
        """All relation sources reference valid database names."""
        schemas = get_all_schemas(FAKE_PAGE_ID)
        relations = get_relation_mappings()
        for rel in relations:
            self.assertIn(rel['source'], schemas,
                          f"Relation source '{rel['source']}' not in schemas")
            self.assertIn(rel['target'], schemas,
                          f"Relation target '{rel['target']}' not in schemas")


class TestViews(unittest.TestCase):
    """Test Notion database view configurations."""

    def test_all_views_returned(self):
        """Views are defined for all databases."""
        views = get_all_views()
        schemas = get_all_schemas(FAKE_PAGE_ID)
        # Views should cover most schemas (areas doesn't need special views)
        self.assertTrue(len(views) >= 15)

    def test_each_view_has_name_and_type(self):
        """Every view has a name and type."""
        views = get_all_views()
        for db_name, db_views in views.items():
            for view in db_views:
                self.assertIn('name', view, f"{db_name} view missing name")
                self.assertIn('type', view, f"{db_name} view missing type")

    def test_valid_view_types(self):
        """All view types are valid Notion view types."""
        valid_types = {'table', 'board', 'calendar', 'gallery', 'list', 'timeline'}
        views = get_all_views()
        for db_name, db_views in views.items():
            for view in db_views:
                self.assertIn(view['type'], valid_types,
                              f"{db_name} has invalid view type: {view['type']}")

    def test_tasks_has_gtd_views(self):
        """Tasks database has GTD-specific views."""
        views = get_all_views()
        task_view_names = [v['name'] for v in views['tasks']]
        self.assertIn('Next Actions', task_view_names)
        self.assertIn('GTD Board', task_view_names)
        self.assertIn("Today's Focus", task_view_names)
        self.assertIn('Waiting For', task_view_names)
        self.assertIn('Someday / Maybe', task_view_names)

    def test_projects_has_board_views(self):
        """Projects has board views for status and area."""
        views = get_all_views()
        proj_view_names = [v['name'] for v in views['projects']]
        self.assertIn('Active Projects', proj_view_names)
        self.assertIn('By Area', proj_view_names)

    def test_reading_has_board_and_gallery(self):
        """Reading tracker has board and gallery views."""
        views = get_all_views()
        reading_types = [v['type'] for v in views['reading']]
        self.assertIn('board', reading_types)
        self.assertIn('gallery', reading_types)


class TestFormulas(unittest.TestCase):
    """Test Notion Formula 2.0 strings."""

    def test_all_formulas_indexed(self):
        """ALL_FORMULAS contains entries for key databases."""
        expected_dbs = {'tasks', 'projects', 'goals', 'habits', 'reading',
                        'finance_budgets', 'body_metrics', 'journal'}
        self.assertEqual(set(ALL_FORMULAS.keys()), expected_dbs)

    def test_formulas_are_strings(self):
        """All formula values are non-empty strings."""
        for db_name, formulas in ALL_FORMULAS.items():
            for prop_name, formula in formulas.items():
                self.assertIsInstance(formula, str,
                                     f"{db_name}.{prop_name} is not a string")
                self.assertTrue(len(formula) > 10,
                                f"{db_name}.{prop_name} is too short")

    def test_get_formulas_for_database(self):
        """get_formulas_for_database returns Notion property format."""
        formulas = get_formulas_for_database('tasks')
        self.assertIn('Urgency', formulas)
        self.assertIn('formula', formulas['Urgency'])
        self.assertIn('expression', formulas['Urgency']['formula'])

    def test_get_formulas_empty_for_unknown(self):
        """Unknown database returns empty dict."""
        formulas = get_formulas_for_database('nonexistent')
        self.assertEqual(formulas, {})

    def test_task_overdue_formula(self):
        """Task overdue formula references expected properties."""
        self.assertIn('Due Date', TASK_OVERDUE)
        self.assertIn('overdue', TASK_OVERDUE)
        self.assertIn('Due today', TASK_OVERDUE)

    def test_project_progress_formula(self):
        """Project progress formula uses Tasks rollup."""
        self.assertIn('Tasks', PROJECT_PROGRESS_BAR)
        self.assertIn('Done', PROJECT_PROGRESS_BAR)

    def test_goal_progress_formula(self):
        """Goal progress formula uses Target/Current Value."""
        self.assertIn('Target Value', GOAL_PROGRESS)
        self.assertIn('Current Value', GOAL_PROGRESS)

    def test_reading_progress_formula(self):
        """Reading progress formula uses page counts."""
        self.assertIn('Total Pages', READING_PROGRESS)
        self.assertIn('Current Page', READING_PROGRESS)

    def test_budget_health_formula(self):
        """Budget health formula uses limit and spent."""
        self.assertIn('Monthly Limit', BUDGET_HEALTH)
        self.assertIn('Spent', BUDGET_HEALTH)

    def test_streak_display_formula(self):
        """Streak display uses Current Streak property."""
        self.assertIn('Current Streak', HABIT_STREAK_DISPLAY)
        self.assertIn('Longest Streak', HABIT_STREAK_DISPLAY)


class TestTemplates(unittest.TestCase):
    """Test Notion dashboard page templates."""

    def test_all_dashboards_returned(self):
        """All 6 dashboards are configured."""
        configs = get_all_dashboard_configs()
        expected = {'command_center', 'weekly_review', 'life_areas',
                    'finance', 'fitness', 'knowledge'}
        self.assertEqual(set(configs.keys()), expected)

    def test_each_dashboard_has_required_fields(self):
        """Each dashboard config has title, icon, and builder."""
        configs = get_all_dashboard_configs()
        for name, config in configs.items():
            self.assertIn('title', config, f"{name} missing title")
            self.assertIn('icon', config, f"{name} missing icon")
            self.assertIn('builder', config, f"{name} missing builder")
            self.assertTrue(callable(config['builder']))

    def test_command_center_blocks(self):
        """Command center generates valid blocks."""
        fake_ids = {
            'inbox': 'fake-id-1', 'tasks': 'fake-id-2',
            'projects': 'fake-id-3', 'habits': 'fake-id-4',
            'goals': 'fake-id-5',
        }
        blocks = get_command_center_blocks(fake_ids)
        self.assertTrue(len(blocks) > 5)

        # Check block types
        block_types = [b.get('type') for b in blocks if isinstance(b, dict)]
        self.assertIn('heading_1', block_types)
        self.assertIn('callout', block_types)
        self.assertIn('divider', block_types)

    def test_weekly_review_blocks(self):
        """Weekly review generates valid blocks with GTD checklist."""
        fake_ids = {
            'inbox': 'fake-id-1', 'tasks': 'fake-id-2',
            'projects': 'fake-id-3', 'goals': 'fake-id-4',
            'weekly_reviews': 'fake-id-5',
        }
        blocks = get_weekly_review_blocks(fake_ids)
        self.assertTrue(len(blocks) > 10)

        # Should have to-do items for the review checklist
        block_types = [b.get('type') for b in blocks if isinstance(b, dict)]
        self.assertIn('to_do', block_types)

    def test_blocks_have_valid_structure(self):
        """All generated blocks have object and type fields."""
        configs = get_all_dashboard_configs()
        fake_ids = {
            'inbox': 'id', 'tasks': 'id', 'projects': 'id',
            'habits': 'id', 'goals': 'id', 'areas': 'id',
            'finance_accounts': 'id', 'finance_transactions': 'id',
            'finance_budgets': 'id', 'workouts': 'id',
            'body_metrics': 'id', 'meals': 'id',
            'notes': 'id', 'reading': 'id',
            'weekly_reviews': 'id',
        }
        for name, config in configs.items():
            blocks = config['builder'](fake_ids)
            for block in blocks:
                if isinstance(block, dict):
                    self.assertIn('type', block,
                                  f"{name} block missing type")


class TestSyncHelpers(unittest.TestCase):
    """Test sync layer helper functions (no API calls)."""

    def test_property_builders(self):
        """Property builder functions produce correct format."""
        from lifeos.notion.sync import (
            _title, _rich_text, _select, _multi_select,
            _status, _number, _checkbox, _date, _url, _relation,
        )

        self.assertEqual(_title("Hello"), {"title": [{"text": {"content": "Hello"}}]})
        self.assertEqual(_rich_text("World"), {"rich_text": [{"text": {"content": "World"}}]})
        self.assertEqual(_select("Option"), {"select": {"name": "Option"}})
        self.assertEqual(_status("Active"), {"status": {"name": "Active"}})
        self.assertEqual(_number(42), {"number": 42})
        self.assertEqual(_checkbox(True), {"checkbox": True})
        self.assertEqual(_date("2026-01-01"), {"date": {"start": "2026-01-01"}})
        self.assertEqual(_url("https://example.com"), {"url": "https://example.com"})
        self.assertEqual(_relation(["id1"]), {"relation": [{"id": "id1"}]})

    def test_multi_select_strips_whitespace(self):
        """Multi-select strips whitespace from option names."""
        from lifeos.notion.sync import _multi_select
        result = _multi_select([" tag1 ", "tag2", " "])
        self.assertEqual(result, {"multi_select": [{"name": "tag1"}, {"name": "tag2"}]})

    def test_title_handles_none(self):
        """Title builder handles None gracefully."""
        from lifeos.notion.sync import _title
        result = _title(None)
        self.assertEqual(result, {"title": [{"text": {"content": ""}}]})

    def test_status_mappers(self):
        """Status mapping functions produce correct Notion values."""
        from lifeos.notion.sync import NotionSync

        self.assertEqual(NotionSync._map_task_status('next_action'), 'Next Action')
        self.assertEqual(NotionSync._map_task_status('in_progress'), 'In Progress')
        self.assertEqual(NotionSync._map_task_status('unknown'), 'Inbox')

        self.assertEqual(NotionSync._map_project_status('not_started'), 'Not Started')
        self.assertEqual(NotionSync._map_project_status('completed'), 'Completed')

        self.assertEqual(NotionSync._map_goal_status('at_risk'), 'At Risk')
        self.assertEqual(NotionSync._map_goal_status('achieved'), 'Achieved')


if __name__ == '__main__':
    unittest.main()
