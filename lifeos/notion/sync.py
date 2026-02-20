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
from datetime import datetime

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

    def setup_workspace(self, parent_page_id):
        """
        Create the complete LifeOS database structure in Notion.

        This is the Phase 1 implementation from the Claude Code Plan:
        creates all databases with proper schemas and relations.

        Args:
            parent_page_id: The Notion page ID to create databases under.

        Returns:
            Dict mapping database names to their Notion IDs.
        """
        from .schemas import get_all_schemas, get_relation_mappings

        schemas = get_all_schemas(parent_page_id)

        # Create all databases
        for name, schema in schemas.items():
            response = self.client.databases.create(**schema)
            self.database_ids[name] = response['id']

        # Add relation properties
        relations = get_relation_mappings()
        for rel in relations:
            source_id = self.database_ids.get(rel['source'])
            target_id = self.database_ids.get(rel['target'])
            if source_id and target_id:
                self._add_relation(source_id, rel['property_name'], target_id)

        return self.database_ids

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

    # ========================================================================
    # Push Operations (Local -> Notion)
    # ========================================================================

    def push_areas(self):
        """Push all local areas to Notion."""
        db_id = self.database_ids.get('areas')
        if not db_id:
            raise ValueError("Areas database ID not configured")

        areas = self.db.execute("SELECT * FROM areas WHERE is_active = 1")
        for area in areas:
            self._create_notion_page(db_id, {
                "Name": {"title": [{"text": {"content": area['name']}}]},
                "Description": {"rich_text": [{"text": {"content": area['description'] or ''}}]},
                "Icon": {"rich_text": [{"text": {"content": area['icon'] or ''}}]},
                "Status": {"select": {"name": "Active"}},
            })

    def push_tasks(self, status_filter=None):
        """Push local tasks to Notion."""
        db_id = self.database_ids.get('tasks')
        if not db_id:
            raise ValueError("Tasks database ID not configured")

        sql = "SELECT * FROM tasks WHERE status != 'archived'"
        params = []
        if status_filter:
            sql += " AND status = ?"
            params.append(status_filter)

        tasks = self.db.execute(sql, params)
        for task in tasks:
            properties = {
                "Title": {"title": [{"text": {"content": task['title']}}]},
                "Status": {"status": {"name": self._map_task_status(task['status'])}},
                "Priority": {"select": {"name": task['priority'].capitalize()}},
            }

            if task['due_date']:
                properties["Due Date"] = {"date": {"start": task['due_date']}}
            if task['do_date']:
                properties["Do Date"] = {"date": {"start": task['do_date']}}
            if task['description']:
                properties["Description"] = {
                    "rich_text": [{"text": {"content": task['description']}}]
                }
            if task['context']:
                properties["Context"] = {"select": {"name": task['context']}}
            if task['estimated_minutes']:
                properties["Estimated Minutes"] = {"number": task['estimated_minutes']}

            properties["Is Recurring"] = {"checkbox": bool(task['is_recurring'])}

            self._create_notion_page(db_id, properties)

    def push_projects(self):
        """Push local projects to Notion."""
        db_id = self.database_ids.get('projects')
        if not db_id:
            raise ValueError("Projects database ID not configured")

        projects = self.db.execute(
            "SELECT * FROM projects WHERE status != 'archived'"
        )
        for project in projects:
            properties = {
                "Name": {"title": [{"text": {"content": project['name']}}]},
                "Status": {"status": {"name": self._map_project_status(project['status'])}},
                "Priority": {"select": {"name": project['priority'].capitalize()}},
                "PARA Category": {"select": {"name": project['para_category']}},
            }

            if project['start_date']:
                properties["Start Date"] = {"date": {"start": project['start_date']}}
            if project['due_date']:
                properties["Due Date"] = {"date": {"start": project['due_date']}}

            self._create_notion_page(db_id, properties)

    # ========================================================================
    # Pull Operations (Notion -> Local)
    # ========================================================================

    def pull_tasks(self):
        """Pull tasks from Notion to local database."""
        db_id = self.database_ids.get('tasks')
        if not db_id:
            raise ValueError("Tasks database ID not configured")

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

            existing = self.db.execute(
                "SELECT id FROM tasks WHERE title = ?", (title,)
            )

            if existing:
                self.db.execute(
                    """UPDATE tasks SET status = ?, priority = ?, due_date = ?
                       WHERE id = ?""",
                    (status, priority, due_date, existing[0]['id'])
                )
            else:
                self.db.execute(
                    """INSERT INTO tasks (title, status, priority, due_date)
                       VALUES (?, ?, ?, ?)""",
                    (title, status, priority, due_date)
                )
            pulled += 1

        return pulled

    # ========================================================================
    # Helper Methods
    # ========================================================================

    def _create_notion_page(self, database_id, properties):
        """Create a page in a Notion database."""
        return self.client.pages.create(
            parent={"database_id": database_id},
            properties=properties,
        )

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

    @staticmethod
    def _map_task_status(local_status):
        """Map local task status to Notion status name."""
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
        """Map local project status to Notion status name."""
        mapping = {
            'not_started': 'Not Started',
            'in_progress': 'In Progress',
            'on_hold': 'On Hold',
            'completed': 'Completed',
            'archived': 'Archived',
        }
        return mapping.get(local_status, 'Not Started')

    @staticmethod
    def _extract_title(prop):
        """Extract title text from a Notion title property."""
        title_items = prop.get('title', [])
        return title_items[0]['plain_text'] if title_items else ''

    @staticmethod
    def _extract_status(prop):
        """Extract status name from a Notion status property."""
        status = prop.get('status')
        if status:
            name = status.get('name', '')
            return name.lower().replace(' ', '_')
        return 'inbox'

    @staticmethod
    def _extract_select(prop):
        """Extract select value from a Notion select property."""
        select = prop.get('select')
        if select:
            return select.get('name', '').lower()
        return 'medium'

    @staticmethod
    def _extract_date(prop):
        """Extract date from a Notion date property."""
        date_val = prop.get('date')
        if date_val:
            return date_val.get('start')
        return None

    def export_schema_json(self, filepath):
        """Export the complete database schema as JSON for migration/backup."""
        from .schemas import get_all_schemas, get_relation_mappings

        export = {
            'version': '1.0.0',
            'generated_at': datetime.now().isoformat(),
            'schemas': get_all_schemas('PARENT_PAGE_ID_PLACEHOLDER'),
            'relations': get_relation_mappings(),
            'database_ids': self.database_ids,
        }

        with open(filepath, 'w') as f:
            json.dump(export, f, indent=2)

        return filepath
