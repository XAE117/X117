"""
Notion API Sync Layer.

Provides bidirectional synchronization between the local SQLite
LifeOS database and a Notion workspace. Uses the Notion API v1
to create databases, manage pages, and sync data.

Requires:
    - A Notion integration token (API key)
    - The notion-client Python library (pip install notion-client)

This module can be used standalone or integrated with the MCP server
for Claude-assisted Notion workspace management.
"""

import json
from datetime import datetime, date

# Notion client import is deferred to avoid hard dependency
_notion_client = None


def _get_client(api_key):
    """Lazy-load the notion-client library."""
    global _notion_client
    if _notion_client is None:
        try:
            from notion_client import Client
            _notion_client = Client
        except ImportError:
            raise ImportError(
                "notion-client is required for Notion sync. "
                "Install it with: pip install notion-client"
            )
    return _notion_client(auth=api_key)


class NotionSync:
    """Bidirectional sync between local LifeOS and Notion workspace."""

    def __init__(self, api_key, db):
        self.client = _get_client(api_key)
        self.db = db
        self.database_ids = {}
        self._notion_id_map = {}  # local_id -> notion_page_id

    # ========================================================================
    # Workspace Setup
    # ========================================================================

    def setup_workspace(self, parent_page_id):
        """
        Create the complete LifeOS database structure in Notion.

        Creates all 18 databases with proper schemas, then wires up
        relation properties between them, and adds formula properties.

        Args:
            parent_page_id: The Notion page ID to create databases under.

        Returns:
            Dict mapping database names to their Notion IDs.
        """
        from .schemas import get_all_schemas, get_relation_mappings
        from .formulas import get_formulas_for_database

        print("Creating LifeOS databases in Notion...")
        schemas = get_all_schemas(parent_page_id)

        # Phase 1: Create all databases
        for name, schema in schemas.items():
            print(f"  Creating {name}...")
            response = self.client.databases.create(**schema)
            self.database_ids[name] = response['id']

        # Phase 2: Add relation properties
        print("Wiring up relations...")
        relations = get_relation_mappings()
        for rel in relations:
            source_id = self.database_ids.get(rel['source'])
            target_id = self.database_ids.get(rel['target'])
            if source_id and target_id:
                self._add_relation(source_id, rel['property_name'], target_id)

        # Phase 3: Add formula properties
        print("Adding formula properties...")
        for db_name, db_id in self.database_ids.items():
            formulas = get_formulas_for_database(db_name)
            if formulas:
                self._add_properties(db_id, formulas)

        print(f"Created {len(self.database_ids)} databases.")
        return self.database_ids

    def setup_dashboards(self, parent_page_id):
        """
        Create dashboard pages with linked database views.

        Args:
            parent_page_id: The Notion page ID to create dashboards under.

        Returns:
            Dict mapping dashboard names to their page IDs.
        """
        from .templates import get_all_dashboard_configs

        dashboard_ids = {}
        configs = get_all_dashboard_configs()

        for name, config in configs.items():
            print(f"  Creating {config['title']} dashboard...")
            blocks = config['builder'](self.database_ids)
            page = self.client.pages.create(
                parent={"page_id": parent_page_id},
                icon={"type": "emoji", "emoji": config['icon']},
                properties={
                    "title": [{"text": {"content": config['title']}}],
                },
                children=blocks,
            )
            dashboard_ids[name] = page['id']

        return dashboard_ids

    def _add_relation(self, database_id, property_name, related_db_id):
        """Add a relation property to a Notion database."""
        self.client.databases.update(
            database_id=database_id,
            properties={
                property_name: {
                    "relation": {
                        "database_id": related_db_id,
                        "single_property": {},
                    }
                }
            },
        )

    def _add_properties(self, database_id, properties):
        """Add properties to a Notion database."""
        self.client.databases.update(
            database_id=database_id,
            properties=properties,
        )

    # ========================================================================
    # Push Operations (Local -> Notion)
    # ========================================================================

    def push_areas(self):
        """Push all local areas to Notion."""
        db_id = self._require_db('areas')
        areas = self.db.execute("SELECT * FROM areas WHERE is_active = 1")
        count = 0
        for area in areas:
            page = self._create_notion_page(db_id, {
                "Name": _title(area['name']),
                "Area Description": _rich_text(area.get('description', '')),
                "Icon Emoji": _rich_text(area.get('icon', '')),
                "Sort Order": _number(area.get('sort_order', 0)),
            })
            self._map_id('areas', area['id'], page['id'])
            count += 1
        return count

    def push_goals(self):
        """Push local goals to Notion."""
        db_id = self._require_db('goals')
        goals = self.db.execute(
            "SELECT * FROM goals WHERE status NOT IN ('abandoned')"
        )
        count = 0
        for goal in goals:
            props = {
                "Title": _title(goal['title']),
                "Description": _rich_text(goal.get('description', '')),
                "Status": _status(self._map_goal_status(goal['status'])),
                "Target Value": _number(goal.get('target_value')),
                "Current Value": _number(goal.get('current_value', 0)),
                "Unit": _rich_text(goal.get('unit', '')),
            }
            if goal.get('start_date'):
                props["Start Date"] = _date(goal['start_date'])
            if goal.get('target_date'):
                props["Target Date"] = _date(goal['target_date'])

            # Link to area
            area_notion_id = self._get_notion_id('areas', goal.get('area_id'))
            if area_notion_id:
                props["Area"] = _relation([area_notion_id])

            page = self._create_notion_page(db_id, props)
            self._map_id('goals', goal['id'], page['id'])
            count += 1
        return count

    def push_projects(self):
        """Push local projects to Notion."""
        db_id = self._require_db('projects')
        projects = self.db.execute(
            "SELECT * FROM projects WHERE status != 'archived'"
        )
        count = 0
        for project in projects:
            props = {
                "Name": _title(project['name']),
                "Description": _rich_text(project.get('description', '')),
                "Status": _status(self._map_project_status(project['status'])),
                "Priority": _select(project.get('priority', 'medium').capitalize()),
                "PARA Category": _select(project.get('para_category', 'Projects')),
            }
            if project.get('start_date'):
                props["Start Date"] = _date(project['start_date'])
            if project.get('due_date'):
                props["Due Date"] = _date(project['due_date'])
            if project.get('completed_date'):
                props["Completed Date"] = _date(project['completed_date'])

            # Relations
            area_id = self._get_notion_id('areas', project.get('area_id'))
            if area_id:
                props["Area"] = _relation([area_id])
            goal_id = self._get_notion_id('goals', project.get('goal_id'))
            if goal_id:
                props["Goal"] = _relation([goal_id])

            page = self._create_notion_page(db_id, props)
            self._map_id('projects', project['id'], page['id'])
            count += 1
        return count

    def push_tasks(self, status_filter=None):
        """Push local tasks to Notion."""
        db_id = self._require_db('tasks')
        sql = "SELECT * FROM tasks WHERE status != 'archived'"
        params = []
        if status_filter:
            sql += " AND status = ?"
            params.append(status_filter)

        tasks = self.db.execute(sql, params)
        count = 0
        for task in tasks:
            props = {
                "Title": _title(task['title']),
                "Status": _status(self._map_task_status(task['status'])),
                "Priority": _select(task.get('priority', 'medium').capitalize()),
                "Is Recurring": _checkbox(bool(task.get('is_recurring'))),
            }
            if task.get('description'):
                props["Description"] = _rich_text(task['description'])
            if task.get('due_date'):
                props["Due Date"] = _date(task['due_date'])
            if task.get('do_date'):
                props["Do Date"] = _date(task['do_date'])
            if task.get('context'):
                props["Context"] = _select(task['context'])
            if task.get('energy_level'):
                props["Energy Level"] = _select(task['energy_level'].capitalize())
            if task.get('estimated_minutes'):
                props["Estimated Minutes"] = _number(task['estimated_minutes'])
            if task.get('actual_minutes'):
                props["Actual Minutes"] = _number(task['actual_minutes'])
            if task.get('waiting_for'):
                props["Waiting For"] = _rich_text(task['waiting_for'])
            if task.get('delegated_to'):
                props["Delegated To"] = _rich_text(task['delegated_to'])
            if task.get('recur_interval'):
                props["Recur Interval"] = _number(task['recur_interval'])
            if task.get('recur_unit'):
                props["Recur Unit"] = _select(task['recur_unit'])

            # Relations
            project_id = self._get_notion_id('projects', task.get('project_id'))
            if project_id:
                props["Project"] = _relation([project_id])
            area_id = self._get_notion_id('areas', task.get('area_id'))
            if area_id:
                props["Area"] = _relation([area_id])
            goal_id = self._get_notion_id('goals', task.get('goal_id'))
            if goal_id:
                props["Goal"] = _relation([goal_id])

            page = self._create_notion_page(db_id, props)
            self._map_id('tasks', task['id'], page['id'])
            count += 1
        return count

    def push_inbox(self):
        """Push unprocessed inbox items to Notion."""
        db_id = self._require_db('inbox')
        items = self.db.execute("SELECT * FROM inbox WHERE is_processed = 0")
        count = 0
        for item in items:
            self._create_notion_page(db_id, {
                "Content": _title(item['content']),
                "Type": _select((item.get('type') or 'thought').capitalize()),
                "Source": _rich_text(item.get('source', '')),
                "Context": _rich_text(item.get('context', '')),
                "Processed": _checkbox(False),
            })
            count += 1
        return count

    def push_habits(self):
        """Push habits to Notion."""
        db_id = self._require_db('habits')
        habits = self.db.execute("SELECT * FROM habits")
        count = 0
        for habit in habits:
            # Calculate streaks
            logs = self.db.execute(
                "SELECT log_date FROM habit_logs WHERE habit_id = ? ORDER BY log_date DESC",
                (habit['id'],)
            )
            dates = [l['log_date'] for l in logs]
            from ..formulas import calculate_streak, calculate_longest_streak
            current_streak = calculate_streak(dates)
            longest_streak = calculate_longest_streak(dates)

            props = {
                "Name": _title(habit['name']),
                "Description": _rich_text(habit.get('description', '')),
                "Frequency": _select((habit.get('frequency') or 'daily').capitalize()),
                "Target Count": _number(habit.get('target_count', 1)),
                "Current Streak": _number(current_streak),
                "Longest Streak": _number(longest_streak),
                "Active": _checkbox(bool(habit.get('is_active', True))),
            }

            area_id = self._get_notion_id('areas', habit.get('area_id'))
            if area_id:
                props["Area"] = _relation([area_id])

            page = self._create_notion_page(db_id, props)
            self._map_id('habits', habit['id'], page['id'])
            count += 1
        return count

    def push_habit_logs(self, days=30):
        """Push recent habit logs to Notion."""
        db_id = self._require_db('habit_logs')
        cutoff = (date.today() - __import__('datetime').timedelta(days=days)).isoformat()
        logs = self.db.execute(
            """SELECT hl.*, h.name as habit_name
               FROM habit_logs hl
               JOIN habits h ON h.id = hl.habit_id
               WHERE hl.log_date >= ?
               ORDER BY hl.log_date DESC""",
            (cutoff,)
        )
        count = 0
        for log in logs:
            props = {
                "Log Entry": _title(f"{log['habit_name']} - {log['log_date']}"),
                "Date": _date(log['log_date']),
                "Count": _number(log.get('count', 1)),
                "Notes": _rich_text(log.get('notes', '')),
            }

            habit_notion_id = self._get_notion_id('habits', log['habit_id'])
            if habit_notion_id:
                props["Habit"] = _relation([habit_notion_id])

            self._create_notion_page(db_id, props)
            count += 1
        return count

    def push_journal(self, days=30):
        """Push journal entries to Notion."""
        db_id = self._require_db('journal')
        cutoff = (date.today() - __import__('datetime').timedelta(days=days)).isoformat()
        entries = self.db.execute(
            "SELECT * FROM journal_entries WHERE entry_date >= ? ORDER BY entry_date DESC",
            (cutoff,)
        )
        count = 0
        for entry in entries:
            mood_map = {
                1: "1 - Terrible", 2: "2", 3: "3", 4: "4",
                5: "5 - Neutral", 6: "6", 7: "7", 8: "8",
                9: "9", 10: "10 - Amazing",
            }
            props = {
                "Date": _title(entry['entry_date']),
                "Energy": _number(entry.get('energy')),
                "Gratitude": _rich_text(entry.get('gratitude', '')),
                "Morning Intention": _rich_text(entry.get('morning_intention', '')),
                "Daily Highlights": _rich_text(entry.get('daily_highlights', '')),
                "Evening Reflection": _rich_text(entry.get('evening_reflection', '')),
                "Lessons Learned": _rich_text(entry.get('lessons_learned', '')),
                "Tomorrow Priorities": _rich_text(entry.get('tomorrow_priorities', '')),
            }
            if entry.get('mood'):
                mood_label = mood_map.get(entry['mood'], str(entry['mood']))
                props["Mood"] = _select(mood_label)

            self._create_notion_page(db_id, props)
            count += 1
        return count

    def push_finance_accounts(self):
        """Push finance accounts to Notion."""
        db_id = self._require_db('finance_accounts')
        accounts = self.db.execute("SELECT * FROM finance_accounts WHERE is_active = 1")
        count = 0
        for acct in accounts:
            type_map = {
                'checking': 'Checking', 'savings': 'Savings',
                'credit_card': 'Credit Card', 'investment': 'Investment',
                'cash': 'Cash', 'other': 'Other',
            }
            page = self._create_notion_page(db_id, {
                "Name": _title(acct['name']),
                "Type": _select(type_map.get(acct['type'], 'Other')),
                "Balance": _number(acct.get('balance', 0)),
                "Currency": _select(acct.get('currency', 'USD')),
                "Active": _checkbox(True),
            })
            self._map_id('finance_accounts', acct['id'], page['id'])
            count += 1
        return count

    def push_finance_transactions(self, days=90):
        """Push recent finance transactions to Notion."""
        db_id = self._require_db('finance_transactions')
        cutoff = (date.today() - __import__('datetime').timedelta(days=days)).isoformat()
        txns = self.db.execute(
            """SELECT * FROM finance_transactions
               WHERE transaction_date >= ?
               ORDER BY transaction_date DESC""",
            (cutoff,)
        )
        count = 0
        for txn in txns:
            props = {
                "Description": _title(txn.get('description') or txn['category']),
                "Type": _select(txn['type'].capitalize()),
                "Category": _select(txn['category'].capitalize()),
                "Amount": _number(txn['amount']),
                "Date": _date(txn['transaction_date']),
                "Is Recurring": _checkbox(bool(txn.get('is_recurring'))),
            }

            acct_id = self._get_notion_id('finance_accounts', txn.get('account_id'))
            if acct_id:
                props["Account"] = _relation([acct_id])

            if txn.get('tags'):
                props["Tags"] = _multi_select(txn['tags'].split(','))

            self._create_notion_page(db_id, props)
            count += 1
        return count

    def push_finance_budgets(self):
        """Push finance budgets to Notion."""
        db_id = self._require_db('finance_budgets')
        budgets = self.db.execute("SELECT * FROM finance_budgets")
        count = 0
        for budget in budgets:
            self._create_notion_page(db_id, {
                "Category": _title(budget['category']),
                "Monthly Limit": _number(budget['monthly_limit']),
                "Spent": _number(budget.get('spent_amount', 0) if 'spent_amount' in budget else 0),
                "Period": _rich_text(budget.get('year_month', '')),
            })
            count += 1
        return count

    def push_workouts(self, days=30):
        """Push recent workouts to Notion."""
        db_id = self._require_db('workouts')
        cutoff = (date.today() - __import__('datetime').timedelta(days=days)).isoformat()
        workouts = self.db.execute(
            "SELECT * FROM workouts WHERE workout_date >= ? ORDER BY workout_date DESC",
            (cutoff,)
        )
        count = 0
        for w in workouts:
            # Get exercises for this workout
            exercises = self.db.execute(
                "SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY sort_order",
                (w['id'],)
            )
            exercise_text = '\n'.join(
                f"{e['exercise_name']}: {e.get('sets', '')}x{e.get('reps', '')} @ {e.get('weight', '')}{e.get('weight_unit', 'lbs')}"
                for e in exercises
            ) if exercises else ''

            props = {
                "Name": _title(w.get('name') or w['type']),
                "Date": _date(w['workout_date']),
                "Type": _select(w['type'].capitalize()),
                "Exercises": _rich_text(exercise_text),
                "Notes": _rich_text(w.get('notes', '')),
            }
            if w.get('duration_minutes'):
                props["Duration (min)"] = _number(w['duration_minutes'])
            if w.get('calories_burned'):
                props["Calories"] = _number(w['calories_burned'])
            if w.get('intensity'):
                props["Intensity"] = _select(w['intensity'].capitalize())
            if w.get('rating'):
                rating_stars = '⭐' * w['rating']
                props["Rating"] = _select(rating_stars)

            self._create_notion_page(db_id, props)
            count += 1
        return count

    def push_body_metrics(self, days=30):
        """Push recent body metrics to Notion."""
        db_id = self._require_db('body_metrics')
        cutoff = (date.today() - __import__('datetime').timedelta(days=days)).isoformat()
        metrics = self.db.execute(
            "SELECT * FROM body_metrics WHERE metric_date >= ? ORDER BY metric_date DESC",
            (cutoff,)
        )
        count = 0
        for m in metrics:
            props = {
                "Date": _title(m['metric_date']),
                "Notes": _rich_text(m.get('notes', '')),
            }
            if m.get('weight'):
                props["Weight"] = _number(m['weight'])
            if m.get('weight_unit'):
                props["Weight Unit"] = _select(m['weight_unit'])
            if m.get('body_fat_pct'):
                props["Body Fat %"] = _number(m['body_fat_pct'] / 100)
            if m.get('sleep_hours'):
                props["Sleep (hrs)"] = _number(m['sleep_hours'])
            if m.get('water_oz'):
                props["Water (oz)"] = _number(m['water_oz'])
            if m.get('steps'):
                props["Steps"] = _number(m['steps'])
            if m.get('resting_heart_rate'):
                props["Resting HR"] = _number(m['resting_heart_rate'])

            self._create_notion_page(db_id, props)
            count += 1
        return count

    def push_meals(self, days=7):
        """Push recent meals to Notion."""
        db_id = self._require_db('meals')
        cutoff = (date.today() - __import__('datetime').timedelta(days=days)).isoformat()
        meals = self.db.execute(
            "SELECT * FROM meals WHERE meal_date >= ? ORDER BY meal_date DESC",
            (cutoff,)
        )
        count = 0
        for meal in meals:
            props = {
                "Name": _title(meal['name']),
                "Date": _date(meal['meal_date']),
                "Meal Type": _select(meal['meal_type'].capitalize()),
                "Notes": _rich_text(meal.get('notes', '')),
            }
            if meal.get('calories'):
                props["Calories"] = _number(meal['calories'])
            if meal.get('protein_g'):
                props["Protein (g)"] = _number(meal['protein_g'])
            if meal.get('carbs_g'):
                props["Carbs (g)"] = _number(meal['carbs_g'])
            if meal.get('fat_g'):
                props["Fat (g)"] = _number(meal['fat_g'])

            self._create_notion_page(db_id, props)
            count += 1
        return count

    def push_notes(self):
        """Push notes to Notion."""
        db_id = self._require_db('notes')
        notes = self.db.execute("SELECT * FROM notes ORDER BY updated_at DESC LIMIT 100")
        count = 0
        for note in notes:
            type_map = {
                'note': 'Note', 'meeting': 'Meeting', 'idea': 'Idea',
                'reference': 'Reference', 'web_clip': 'Web Clip',
                'template': 'Template',
            }
            props = {
                "Title": _title(note['title']),
                "Type": _select(type_map.get(note.get('type', 'note'), 'Note')),
                "PARA Category": _select(note.get('para_category', 'Resources')),
                "Starred": _checkbox(bool(note.get('is_starred'))),
            }
            if note.get('source_url'):
                props["Source URL"] = _url(note['source_url'])
            if note.get('tags'):
                props["Tags"] = _multi_select(note['tags'].split(','))

            # Relations
            area_id = self._get_notion_id('areas', note.get('area_id'))
            if area_id:
                props["Area"] = _relation([area_id])
            project_id = self._get_notion_id('projects', note.get('project_id'))
            if project_id:
                props["Project"] = _relation([project_id])

            # Note content goes in the page body
            page = self._create_notion_page(db_id, props)

            if note.get('content'):
                self._append_page_content(page['id'], note['content'])

            self._map_id('notes', note['id'], page['id'])
            count += 1
        return count

    def push_reading(self):
        """Push reading list to Notion."""
        db_id = self._require_db('reading')
        items = self.db.execute("SELECT * FROM reading_list ORDER BY updated_at DESC")
        count = 0
        for item in items:
            status_map = {
                'to_read': 'To Read', 'reading': 'Reading',
                'completed': 'Completed', 'abandoned': 'Abandoned',
            }
            type_map = {
                'book': 'Book', 'article': 'Article', 'video': 'Video',
                'podcast': 'Podcast', 'course': 'Course', 'paper': 'Paper',
            }
            props = {
                "Title": _title(item['title']),
                "Author": _rich_text(item.get('author', '')),
                "Type": _select(type_map.get(item.get('type', 'book'), 'Book')),
                "Status": _status(status_map.get(item.get('status', 'to_read'), 'To Read')),
                "Summary": _rich_text(item.get('summary', '')),
                "Key Insights": _rich_text(item.get('key_insights', '')),
            }
            if item.get('total_pages'):
                props["Total Pages"] = _number(item['total_pages'])
            if item.get('current_page'):
                props["Current Page"] = _number(item['current_page'])
            if item.get('source_url'):
                props["Source URL"] = _url(item['source_url'])
            if item.get('start_date'):
                props["Start Date"] = _date(item['start_date'])
            if item.get('finish_date'):
                props["Finish Date"] = _date(item['finish_date'])
            if item.get('rating'):
                props["Rating"] = _select('⭐' * item['rating'])

            area_id = self._get_notion_id('areas', item.get('area_id'))
            if area_id:
                props["Area"] = _relation([area_id])

            page = self._create_notion_page(db_id, props)
            self._map_id('reading', item['id'], page['id'])

            # Push highlights as page content
            highlights = self.db.execute(
                "SELECT * FROM reading_highlights WHERE reading_id = ? ORDER BY page_number",
                (item['id'],)
            )
            if highlights:
                content = '\n\n'.join(
                    f'> {h["highlight"]}'
                    + (f' (p.{h["page_number"]})' if h.get('page_number') else '')
                    + (f'\n{h["note"]}' if h.get('note') else '')
                    for h in highlights
                )
                self._append_page_content(page['id'], content)

            count += 1
        return count

    def push_weekly_reviews(self):
        """Push weekly reviews to Notion."""
        db_id = self._require_db('weekly_reviews')
        reviews = self.db.execute(
            "SELECT * FROM weekly_reviews ORDER BY review_date DESC"
        )
        count = 0
        for r in reviews:
            props = {
                "Review": _title(f"Week {r.get('week_number', '')} - {r['review_date']}"),
                "Week Number": _number(r.get('week_number')),
                "Date": _date(r['review_date']),
                "Wins": _rich_text(r.get('wins', '')),
                "Challenges": _rich_text(r.get('challenges', '')),
                "Lessons": _rich_text(r.get('lessons', '')),
                "Next Week Priorities": _rich_text(r.get('next_week_priorities', '')),
                "Inbox Cleared": _checkbox(bool(r.get('inbox_cleared'))),
                "Projects Reviewed": _checkbox(bool(r.get('projects_reviewed'))),
                "Goals Reviewed": _checkbox(bool(r.get('goals_reviewed'))),
                "Habits Reviewed": _checkbox(bool(r.get('habits_reviewed'))),
            }
            if r.get('overall_rating'):
                props["Rating"] = _select(str(r['overall_rating']))

            self._create_notion_page(db_id, props)
            count += 1
        return count

    def push_all(self):
        """
        Push all local data to Notion in dependency order.

        Returns a summary dict with counts of items pushed per module.
        """
        summary = {}
        # Push in dependency order (parent tables first)
        push_order = [
            ('areas', self.push_areas),
            ('goals', self.push_goals),
            ('projects', self.push_projects),
            ('tasks', self.push_tasks),
            ('inbox', self.push_inbox),
            ('habits', self.push_habits),
            ('habit_logs', lambda: self.push_habit_logs()),
            ('journal', lambda: self.push_journal()),
            ('finance_accounts', self.push_finance_accounts),
            ('finance_transactions', lambda: self.push_finance_transactions()),
            ('finance_budgets', self.push_finance_budgets),
            ('workouts', lambda: self.push_workouts()),
            ('body_metrics', lambda: self.push_body_metrics()),
            ('meals', lambda: self.push_meals()),
            ('notes', self.push_notes),
            ('reading', self.push_reading),
            ('weekly_reviews', self.push_weekly_reviews),
        ]

        for name, push_fn in push_order:
            if name in self.database_ids:
                print(f"  Pushing {name}...")
                try:
                    summary[name] = push_fn()
                except Exception as e:
                    summary[name] = f"Error: {e}"
                    print(f"    Error pushing {name}: {e}")

        return summary

    # ========================================================================
    # Pull Operations (Notion -> Local)
    # ========================================================================

    def pull_tasks(self):
        """Pull tasks from Notion to local database."""
        db_id = self._require_db('tasks')
        results = self._query_database(db_id)
        pulled = 0
        for page in results:
            props = page['properties']
            title = self._extract_title(props.get('Title', {}))
            if not title:
                continue

            status = self._extract_status(props.get('Status', {}))
            priority = self._extract_select(props.get('Priority', {}))
            due_date = self._extract_date(props.get('Due Date', {}))
            do_date = self._extract_date(props.get('Do Date', {}))
            context = self._extract_select(props.get('Context', {}))
            energy = self._extract_select(props.get('Energy Level', {}))
            description = self._extract_rich_text(props.get('Description', {}))
            is_recurring = self._extract_checkbox(props.get('Is Recurring', {}))
            waiting_for = self._extract_rich_text(props.get('Waiting For', {}))
            delegated_to = self._extract_rich_text(props.get('Delegated To', {}))
            est_minutes = self._extract_number(props.get('Estimated Minutes', {}))

            existing = self.db.execute(
                "SELECT id FROM tasks WHERE title = ?", (title,)
            )

            if existing:
                self.db.execute(
                    """UPDATE tasks SET status = ?, priority = ?, due_date = ?,
                       do_date = ?, context = ?, energy_level = ?,
                       description = ?, is_recurring = ?, waiting_for = ?,
                       delegated_to = ?, estimated_minutes = ?
                       WHERE id = ?""",
                    (status, priority or 'medium', due_date, do_date,
                     context, energy or 'medium', description,
                     int(is_recurring), waiting_for, delegated_to,
                     est_minutes, existing[0]['id'])
                )
            else:
                self.db.execute(
                    """INSERT INTO tasks (title, status, priority, due_date,
                       do_date, context, energy_level, description,
                       is_recurring, waiting_for, delegated_to, estimated_minutes)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (title, status or 'inbox', priority or 'medium',
                     due_date, do_date, context, energy or 'medium',
                     description, int(is_recurring), waiting_for,
                     delegated_to, est_minutes)
                )
            pulled += 1
        return pulled

    def pull_projects(self):
        """Pull projects from Notion to local database."""
        db_id = self._require_db('projects')
        results = self._query_database(db_id)
        pulled = 0
        for page in results:
            props = page['properties']
            name = self._extract_title(props.get('Name', {}))
            if not name:
                continue

            status = self._extract_status(props.get('Status', {}))
            priority = self._extract_select(props.get('Priority', {}))
            para = self._extract_select(props.get('PARA Category', {}))
            start_date = self._extract_date(props.get('Start Date', {}))
            due_date = self._extract_date(props.get('Due Date', {}))

            existing = self.db.execute(
                "SELECT id FROM projects WHERE name = ?", (name,)
            )

            if existing:
                self.db.execute(
                    """UPDATE projects SET status = ?, priority = ?,
                       para_category = ?, start_date = ?, due_date = ?
                       WHERE id = ?""",
                    (status or 'not_started', priority or 'medium',
                     para or 'Projects', start_date, due_date,
                     existing[0]['id'])
                )
            else:
                self.db.execute(
                    """INSERT INTO projects (name, status, priority,
                       para_category, start_date, due_date)
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    (name, status or 'not_started', priority or 'medium',
                     para or 'Projects', start_date, due_date)
                )
            pulled += 1
        return pulled

    def pull_goals(self):
        """Pull goals from Notion to local database."""
        db_id = self._require_db('goals')
        results = self._query_database(db_id)
        pulled = 0
        for page in results:
            props = page['properties']
            title = self._extract_title(props.get('Title', {}))
            if not title:
                continue

            status = self._extract_status(props.get('Status', {}))
            target_value = self._extract_number(props.get('Target Value', {}))
            current_value = self._extract_number(props.get('Current Value', {}))
            unit = self._extract_rich_text(props.get('Unit', {}))
            start_date = self._extract_date(props.get('Start Date', {}))
            target_date = self._extract_date(props.get('Target Date', {}))

            existing = self.db.execute(
                "SELECT id FROM goals WHERE title = ?", (title,)
            )

            if existing:
                self.db.execute(
                    """UPDATE goals SET status = ?, target_value = ?,
                       current_value = ?, unit = ?, start_date = ?,
                       target_date = ? WHERE id = ?""",
                    (status or 'not_started', target_value, current_value or 0,
                     unit, start_date, target_date, existing[0]['id'])
                )
            else:
                self.db.execute(
                    """INSERT INTO goals (title, status, target_value,
                       current_value, unit, start_date, target_date)
                       VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    (title, status or 'not_started', target_value,
                     current_value or 0, unit, start_date, target_date)
                )
            pulled += 1
        return pulled

    def pull_inbox(self):
        """Pull inbox items from Notion to local database."""
        db_id = self._require_db('inbox')
        results = self._query_database(db_id, filter={
            "property": "Processed",
            "checkbox": {"equals": False},
        })
        pulled = 0
        for page in results:
            props = page['properties']
            content = self._extract_title(props.get('Content', {}))
            if not content:
                continue

            item_type = (self._extract_select(props.get('Type', {})) or 'thought').lower()

            existing = self.db.execute(
                "SELECT id FROM inbox WHERE content = ? AND is_processed = 0",
                (content,)
            )
            if not existing:
                self.db.execute(
                    "INSERT INTO inbox (content, type) VALUES (?, ?)",
                    (content, item_type)
                )
                pulled += 1
        return pulled

    def pull_habits(self):
        """Pull habits from Notion to local database."""
        db_id = self._require_db('habits')
        results = self._query_database(db_id)
        pulled = 0
        for page in results:
            props = page['properties']
            name = self._extract_title(props.get('Name', {}))
            if not name:
                continue

            frequency = (self._extract_select(props.get('Frequency', {})) or 'daily').lower()
            target = self._extract_number(props.get('Target Count', {})) or 1
            active = self._extract_checkbox(props.get('Active', {}))

            existing = self.db.execute(
                "SELECT id FROM habits WHERE name = ?", (name,)
            )

            if existing:
                self.db.execute(
                    """UPDATE habits SET frequency = ?, target_count = ?,
                       is_active = ? WHERE id = ?""",
                    (frequency, target, int(active), existing[0]['id'])
                )
            else:
                self.db.execute(
                    """INSERT INTO habits (name, frequency, target_count, is_active)
                       VALUES (?, ?, ?, ?)""",
                    (name, frequency, target, int(active))
                )
            pulled += 1
        return pulled

    def pull_journal(self):
        """Pull journal entries from Notion to local database."""
        db_id = self._require_db('journal')
        results = self._query_database(db_id)
        pulled = 0
        for page in results:
            props = page['properties']
            entry_date = self._extract_title(props.get('Date', {}))
            if not entry_date:
                continue

            mood_raw = self._extract_select(props.get('Mood', {}))
            mood = None
            if mood_raw:
                try:
                    mood = int(mood_raw.split(' ')[0].replace('-', '').strip())
                except ValueError:
                    pass

            energy = self._extract_number(props.get('Energy', {}))
            gratitude = self._extract_rich_text(props.get('Gratitude', {}))
            intention = self._extract_rich_text(props.get('Morning Intention', {}))
            highlights = self._extract_rich_text(props.get('Daily Highlights', {}))
            reflection = self._extract_rich_text(props.get('Evening Reflection', {}))
            lessons = self._extract_rich_text(props.get('Lessons Learned', {}))
            tomorrow = self._extract_rich_text(props.get('Tomorrow Priorities', {}))

            existing = self.db.execute(
                "SELECT id FROM journal_entries WHERE entry_date = ?", (entry_date,)
            )

            if existing:
                self.db.execute(
                    """UPDATE journal_entries SET mood = ?, energy = ?,
                       gratitude = ?, morning_intention = ?,
                       daily_highlights = ?, evening_reflection = ?,
                       lessons_learned = ?, tomorrow_priorities = ?
                       WHERE id = ?""",
                    (mood, energy, gratitude, intention, highlights,
                     reflection, lessons, tomorrow, existing[0]['id'])
                )
            else:
                self.db.execute(
                    """INSERT INTO journal_entries (entry_date, mood, energy,
                       gratitude, morning_intention, daily_highlights,
                       evening_reflection, lessons_learned, tomorrow_priorities)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (entry_date, mood, energy, gratitude, intention,
                     highlights, reflection, lessons, tomorrow)
                )
            pulled += 1
        return pulled

    def pull_reading(self):
        """Pull reading list from Notion to local database."""
        db_id = self._require_db('reading')
        results = self._query_database(db_id)
        pulled = 0
        for page in results:
            props = page['properties']
            title = self._extract_title(props.get('Title', {}))
            if not title:
                continue

            author = self._extract_rich_text(props.get('Author', {}))
            item_type = (self._extract_select(props.get('Type', {})) or 'book').lower()
            status = (self._extract_status(props.get('Status', {})) or 'to_read')
            total_pages = self._extract_number(props.get('Total Pages', {}))
            current_page = self._extract_number(props.get('Current Page', {}))
            source_url = self._extract_url(props.get('Source URL', {}))
            summary = self._extract_rich_text(props.get('Summary', {}))

            existing = self.db.execute(
                "SELECT id FROM reading_list WHERE title = ?", (title,)
            )

            if existing:
                self.db.execute(
                    """UPDATE reading_list SET author = ?, type = ?, status = ?,
                       total_pages = ?, current_page = ?, source_url = ?,
                       summary = ? WHERE id = ?""",
                    (author, item_type, status, total_pages,
                     current_page or 0, source_url, summary,
                     existing[0]['id'])
                )
            else:
                self.db.execute(
                    """INSERT INTO reading_list (title, author, type, status,
                       total_pages, current_page, source_url, summary)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    (title, author, item_type, status, total_pages,
                     current_page or 0, source_url, summary)
                )
            pulled += 1
        return pulled

    def pull_all(self):
        """Pull all data from Notion to local database."""
        summary = {}
        pull_order = [
            ('tasks', self.pull_tasks),
            ('projects', self.pull_projects),
            ('goals', self.pull_goals),
            ('inbox', self.pull_inbox),
            ('habits', self.pull_habits),
            ('journal', self.pull_journal),
            ('reading', self.pull_reading),
        ]

        for name, pull_fn in pull_order:
            if name in self.database_ids:
                print(f"  Pulling {name}...")
                try:
                    summary[name] = pull_fn()
                except Exception as e:
                    summary[name] = f"Error: {e}"
                    print(f"    Error pulling {name}: {e}")

        return summary

    # ========================================================================
    # ID Mapping
    # ========================================================================

    def _map_id(self, table, local_id, notion_id):
        """Store a mapping between local and Notion IDs."""
        if local_id is not None:
            self._notion_id_map[f"{table}:{local_id}"] = notion_id

    def _get_notion_id(self, table, local_id):
        """Get the Notion page ID for a local record."""
        if local_id is None:
            return None
        return self._notion_id_map.get(f"{table}:{local_id}")

    def _require_db(self, name):
        """Get a database ID or raise an error."""
        db_id = self.database_ids.get(name)
        if not db_id:
            raise ValueError(f"{name} database ID not configured")
        return db_id

    # ========================================================================
    # Notion API Helpers
    # ========================================================================

    def _create_notion_page(self, database_id, properties):
        """Create a page in a Notion database."""
        return self.client.pages.create(
            parent={"database_id": database_id},
            properties=properties,
        )

    def _append_page_content(self, page_id, text):
        """Append text content to a Notion page body."""
        # Split into chunks (Notion max 2000 chars per block)
        chunks = [text[i:i+2000] for i in range(0, len(text), 2000)]
        children = [
            {
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{"type": "text", "text": {"content": chunk}}]
                },
            }
            for chunk in chunks
        ]
        self.client.blocks.children.append(block_id=page_id, children=children)

    def _query_database(self, database_id, filter=None, sorts=None):
        """Query a Notion database and return all pages."""
        kwargs = {"database_id": database_id}
        if filter:
            kwargs["filter"] = filter
        if sorts:
            kwargs["sorts"] = sorts

        all_results = []
        has_more = True
        start_cursor = None

        while has_more:
            if start_cursor:
                kwargs["start_cursor"] = start_cursor
            response = self.client.databases.query(**kwargs)
            all_results.extend(response.get('results', []))
            has_more = response.get('has_more', False)
            start_cursor = response.get('next_cursor')

        return all_results

    # ========================================================================
    # Status Mappers
    # ========================================================================

    @staticmethod
    def _map_task_status(local_status):
        mapping = {
            'inbox': 'Inbox',
            'next_action': 'Next Action',
            'in_progress': 'In Progress',
            'waiting': 'Waiting',
            'someday': 'Someday',
            'done': 'Done',
            'archived': 'Archived',
        }
        return mapping.get(local_status, 'Inbox')

    @staticmethod
    def _map_project_status(local_status):
        mapping = {
            'not_started': 'Not Started',
            'in_progress': 'In Progress',
            'on_hold': 'On Hold',
            'completed': 'Completed',
            'archived': 'Archived',
        }
        return mapping.get(local_status, 'Not Started')

    @staticmethod
    def _map_goal_status(local_status):
        mapping = {
            'not_started': 'Not Started',
            'in_progress': 'In Progress',
            'on_track': 'On Track',
            'at_risk': 'At Risk',
            'achieved': 'Achieved',
            'abandoned': 'Abandoned',
        }
        return mapping.get(local_status, 'Not Started')

    # ========================================================================
    # Property Extractors
    # ========================================================================

    @staticmethod
    def _extract_title(prop):
        title_items = prop.get('title', [])
        return title_items[0]['plain_text'] if title_items else ''

    @staticmethod
    def _extract_status(prop):
        status = prop.get('status')
        if status:
            name = status.get('name', '')
            return name.lower().replace(' ', '_')
        return None

    @staticmethod
    def _extract_select(prop):
        select = prop.get('select')
        if select:
            return select.get('name', '')
        return None

    @staticmethod
    def _extract_rich_text(prop):
        items = prop.get('rich_text', [])
        return items[0]['plain_text'] if items else ''

    @staticmethod
    def _extract_date(prop):
        date_val = prop.get('date')
        if date_val:
            return date_val.get('start')
        return None

    @staticmethod
    def _extract_number(prop):
        return prop.get('number')

    @staticmethod
    def _extract_checkbox(prop):
        return prop.get('checkbox', False)

    @staticmethod
    def _extract_url(prop):
        return prop.get('url')

    # ========================================================================
    # Export
    # ========================================================================

    def export_schema_json(self, filepath):
        """Export the complete database schema as JSON for migration/backup."""
        from .schemas import get_all_schemas, get_relation_mappings

        export = {
            'version': '1.0.0',
            'generated_at': datetime.now().isoformat(),
            'schemas': get_all_schemas('PARENT_PAGE_ID_PLACEHOLDER'),
            'relations': get_relation_mappings(),
            'database_ids': self.database_ids,
            'id_map': self._notion_id_map,
        }

        with open(filepath, 'w') as f:
            json.dump(export, f, indent=2)

        return filepath

    def load_database_ids(self, ids_dict):
        """Load previously saved database IDs for reconnecting."""
        self.database_ids = ids_dict


# ============================================================================
# Notion Property Builders
# ============================================================================

def _title(text):
    return {"title": [{"text": {"content": text or ''}}]}

def _rich_text(text):
    return {"rich_text": [{"text": {"content": text or ''}}]}

def _select(name):
    return {"select": {"name": name}} if name else {"select": None}

def _multi_select(names):
    return {"multi_select": [{"name": n.strip()} for n in names if n.strip()]}

def _status(name):
    return {"status": {"name": name}}

def _number(value):
    return {"number": value}

def _checkbox(checked):
    return {"checkbox": checked}

def _date(date_str):
    return {"date": {"start": date_str}} if date_str else {"date": None}

def _url(url):
    return {"url": url}

def _relation(page_ids):
    return {"relation": [{"id": pid} for pid in page_ids if pid]}
