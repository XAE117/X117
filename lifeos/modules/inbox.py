"""
Inbox Module - Frictionless capture for the LifeOS.

The Inbox is the primary entry point for all new information, designed to
prevent cognitive leakage by allowing the user to dump ideas, tasks, or
resources into a temporary holding area for later triage.

Follows GTD's "capture everything" principle: if it takes more than
10 seconds to log, the system has failed.
"""

from datetime import datetime


class InboxModule:
    """Manages the frictionless capture inbox."""

    def __init__(self, db):
        self.db = db

    def capture(self, content, type='thought', source=None, context=None):
        """
        Capture an item into the inbox with zero friction.

        Args:
            content: The raw text content to capture.
            type: One of 'thought', 'task', 'note', 'resource', 'idea', 'reminder'.
            source: Where this item came from (e.g., 'mobile', 'email', 'meeting').
            context: Additional context about the item.

        Returns:
            The ID of the newly created inbox item.
        """
        return self.db.execute(
            """INSERT INTO inbox (content, type, source, context)
               VALUES (?, ?, ?, ?)""",
            (content, type, source, context)
        )

    def capture_batch(self, items):
        """
        Capture multiple items at once for rapid brain dumps.

        Args:
            items: List of dicts with 'content' and optional 'type', 'source', 'context'.
        """
        for item in items:
            self.capture(
                content=item['content'],
                type=item.get('type', 'thought'),
                source=item.get('source'),
                context=item.get('context'),
            )

    def get_unprocessed(self, limit=None):
        """Get all unprocessed inbox items, newest first."""
        sql = """SELECT * FROM inbox WHERE is_processed = 0
                 ORDER BY created_at DESC"""
        if limit:
            sql += f" LIMIT {int(limit)}"
        return self.db.execute(sql)

    def get_all(self, include_processed=False):
        """Get all inbox items."""
        if include_processed:
            return self.db.execute("SELECT * FROM inbox ORDER BY created_at DESC")
        return self.get_unprocessed()

    def get_by_type(self, type):
        """Get unprocessed inbox items filtered by type."""
        return self.db.execute(
            """SELECT * FROM inbox WHERE is_processed = 0 AND type = ?
               ORDER BY created_at DESC""",
            (type,)
        )

    def process(self, inbox_id, target_table, target_id):
        """
        Mark an inbox item as processed and record where it was triaged to.

        Args:
            inbox_id: The inbox item ID.
            target_table: The table the item was moved to (e.g., 'tasks', 'notes').
            target_id: The ID of the created item in the target table.
        """
        self.db.execute(
            """UPDATE inbox SET is_processed = 1, processed_to = ?, processed_id = ?
               WHERE id = ?""",
            (target_table, target_id, inbox_id)
        )

    def dismiss(self, inbox_id):
        """Dismiss an inbox item without processing it."""
        self.db.execute(
            "UPDATE inbox SET is_processed = 1, processed_to = 'dismissed' WHERE id = ?",
            (inbox_id,)
        )

    def triage_to_task(self, inbox_id, task_module, **task_kwargs):
        """
        Triage an inbox item directly to a task.

        Args:
            inbox_id: The inbox item ID.
            task_module: Reference to the TasksModule for creating the task.
            **task_kwargs: Arguments to pass to task creation.

        Returns:
            The ID of the created task.
        """
        item = self.db.execute("SELECT * FROM inbox WHERE id = ?", (inbox_id,))
        if not item:
            raise ValueError(f"Inbox item {inbox_id} not found")

        item = item[0]
        if 'title' not in task_kwargs:
            task_kwargs['title'] = item['content']

        task_id = task_module.create(**task_kwargs)
        self.process(inbox_id, 'tasks', task_id)
        return task_id

    def triage_to_note(self, inbox_id, knowledge_module, **note_kwargs):
        """
        Triage an inbox item directly to a note in the knowledge base.

        Args:
            inbox_id: The inbox item ID.
            knowledge_module: Reference to the KnowledgeModule.
            **note_kwargs: Arguments to pass to note creation.

        Returns:
            The ID of the created note.
        """
        item = self.db.execute("SELECT * FROM inbox WHERE id = ?", (inbox_id,))
        if not item:
            raise ValueError(f"Inbox item {inbox_id} not found")

        item = item[0]
        if 'title' not in note_kwargs:
            note_kwargs['title'] = item['content'][:100]
        if 'content' not in note_kwargs:
            note_kwargs['content'] = item['content']

        note_id = knowledge_module.create_note(**note_kwargs)
        self.process(inbox_id, 'notes', note_id)
        return note_id

    def count_unprocessed(self):
        """Get count of unprocessed inbox items."""
        return self.db.count('inbox', 'is_processed = 0')

    def search(self, query):
        """Search inbox items by content."""
        return self.db.execute(
            """SELECT * FROM inbox WHERE content LIKE ?
               ORDER BY created_at DESC""",
            (f'%{query}%',)
        )

    def clear_processed(self):
        """Remove all processed items from the inbox."""
        self.db.execute("DELETE FROM inbox WHERE is_processed = 1")
