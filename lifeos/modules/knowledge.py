"""
Knowledge Base Module - Second Brain / PARA Resources.

Implements the knowledge management layer of the LifeOS, organized
using the PARA method. Notes and resources are linked to Projects
and Areas, ensuring research surfaces when needed for active work.

Includes the Reading Tracker sub-system for books, articles,
courses, and other learning materials.
"""

from datetime import date


class KnowledgeModule:
    """Manages the Second Brain knowledge base and reading tracker."""

    def __init__(self, db):
        self.db = db

    # ========================================================================
    # Notes Management
    # ========================================================================

    def create_note(self, title, content=None, type='note', project_id=None,
                    area_id=None, source_url=None, para_category='Resources',
                    tags=None, is_starred=False):
        """Create a new note in the knowledge base."""
        return self.db.execute(
            """INSERT INTO notes (title, content, type, project_id, area_id,
                source_url, para_category, tags, is_starred)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (title, content, type, project_id, area_id, source_url,
             para_category, tags, int(is_starred))
        )

    def get_note(self, note_id):
        """Get a note by ID."""
        result = self.db.execute("SELECT * FROM notes WHERE id = ?", (note_id,))
        return result[0] if result else None

    def get_notes(self, project_id=None, area_id=None, type=None,
                  para_category=None, starred_only=False, limit=50):
        """Get notes with optional filters."""
        sql = "SELECT * FROM notes WHERE 1=1"
        params = []

        if project_id:
            sql += " AND project_id = ?"
            params.append(project_id)
        if area_id:
            sql += " AND area_id = ?"
            params.append(area_id)
        if type:
            sql += " AND type = ?"
            params.append(type)
        if para_category:
            sql += " AND para_category = ?"
            params.append(para_category)
        if starred_only:
            sql += " AND is_starred = 1"

        sql += " ORDER BY updated_at DESC"
        if limit:
            sql += f" LIMIT {int(limit)}"

        return self.db.execute(sql, params)

    def update_note(self, note_id, **kwargs):
        """Update note properties."""
        if not kwargs:
            return
        set_clause = ', '.join(f"{k} = ?" for k in kwargs)
        values = list(kwargs.values()) + [note_id]
        self.db.execute(f"UPDATE notes SET {set_clause} WHERE id = ?", values)

    def star_note(self, note_id):
        """Star/favorite a note."""
        self.update_note(note_id, is_starred=1)

    def unstar_note(self, note_id):
        """Unstar a note."""
        self.update_note(note_id, is_starred=0)

    def archive_note(self, note_id):
        """Move a note to the Archives PARA category."""
        self.update_note(note_id, para_category='Archives')

    def delete_note(self, note_id):
        """Delete a note."""
        self.db.execute("DELETE FROM notes WHERE id = ?", (note_id,))

    def search_notes(self, query):
        """Search notes by title, content, or tags."""
        return self.db.execute(
            """SELECT * FROM notes
               WHERE (title LIKE ? OR content LIKE ? OR tags LIKE ?)
               ORDER BY updated_at DESC""",
            (f'%{query}%', f'%{query}%', f'%{query}%')
        )

    def get_recent_notes(self, limit=10):
        """Get the most recently updated notes."""
        return self.db.execute(
            "SELECT * FROM notes ORDER BY updated_at DESC LIMIT ?", (limit,)
        )

    # ========================================================================
    # Reading Tracker
    # ========================================================================

    def add_reading(self, title, author=None, type='book', area_id=None,
                    total_pages=None, source_url=None, status='to_read'):
        """Add a new item to the reading list."""
        return self.db.execute(
            """INSERT INTO reading_list (title, author, type, area_id,
                total_pages, source_url, status)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (title, author, type, area_id, total_pages, source_url, status)
        )

    def get_reading(self, reading_id):
        """Get a reading item with its highlights."""
        result = self.db.execute(
            "SELECT * FROM reading_list WHERE id = ?", (reading_id,)
        )
        if not result:
            return None

        highlights = self.db.execute(
            """SELECT * FROM reading_highlights WHERE reading_id = ?
               ORDER BY page_number ASC, created_at ASC""",
            (reading_id,)
        )

        return {**result[0], 'highlights': highlights}

    def get_reading_list(self, status=None, type=None, limit=50):
        """Get reading list with optional filters."""
        sql = "SELECT * FROM reading_list WHERE 1=1"
        params = []

        if status:
            sql += " AND status = ?"
            params.append(status)
        if type:
            sql += " AND type = ?"
            params.append(type)

        sql += " ORDER BY CASE status WHEN 'reading' THEN 0 WHEN 'to_read' THEN 1 "
        sql += "WHEN 'completed' THEN 2 ELSE 3 END, updated_at DESC"
        if limit:
            sql += f" LIMIT {int(limit)}"

        return self.db.execute(sql, params)

    def update_reading(self, reading_id, **kwargs):
        """Update a reading item."""
        if not kwargs:
            return
        set_clause = ', '.join(f"{k} = ?" for k in kwargs)
        values = list(kwargs.values()) + [reading_id]
        self.db.execute(f"UPDATE reading_list SET {set_clause} WHERE id = ?", values)

    def update_reading_progress(self, reading_id, current_page):
        """Update reading progress and auto-detect status changes."""
        item = self.db.execute(
            "SELECT * FROM reading_list WHERE id = ?", (reading_id,)
        )
        if not item:
            raise ValueError(f"Reading item {reading_id} not found")

        item = item[0]
        updates = {'current_page': current_page}

        if item['status'] == 'to_read':
            updates['status'] = 'reading'
            updates['start_date'] = date.today().isoformat()

        if item['total_pages'] and current_page >= item['total_pages']:
            updates['status'] = 'completed'
            updates['finish_date'] = date.today().isoformat()

        self.update_reading(reading_id, **updates)

    def complete_reading(self, reading_id, rating=None, summary=None,
                         key_insights=None):
        """Mark a reading item as completed."""
        updates = {
            'status': 'completed',
            'finish_date': date.today().isoformat(),
        }
        if rating is not None:
            updates['rating'] = rating
        if summary is not None:
            updates['summary'] = summary
        if key_insights is not None:
            updates['key_insights'] = key_insights
        self.update_reading(reading_id, **updates)

    def add_highlight(self, reading_id, highlight, page_number=None,
                      chapter=None, note=None):
        """Add a highlight/annotation to a reading item."""
        return self.db.execute(
            """INSERT INTO reading_highlights (reading_id, highlight,
                page_number, chapter, note)
               VALUES (?, ?, ?, ?, ?)""",
            (reading_id, highlight, page_number, chapter, note)
        )

    def get_highlights(self, reading_id):
        """Get all highlights for a reading item."""
        return self.db.execute(
            """SELECT * FROM reading_highlights WHERE reading_id = ?
               ORDER BY page_number ASC, created_at ASC""",
            (reading_id,)
        )

    def delete_reading(self, reading_id):
        """Delete a reading item and its highlights."""
        self.db.execute("DELETE FROM reading_list WHERE id = ?", (reading_id,))

    def search_reading(self, query):
        """Search reading list by title, author, or summary."""
        return self.db.execute(
            """SELECT * FROM reading_list
               WHERE (title LIKE ? OR author LIKE ? OR summary LIKE ?
                      OR key_insights LIKE ?)
               ORDER BY updated_at DESC""",
            (f'%{query}%', f'%{query}%', f'%{query}%', f'%{query}%')
        )

    def get_reading_progress(self, reading_id):
        """Get reading progress as a percentage."""
        item = self.db.execute(
            "SELECT total_pages, current_page FROM reading_list WHERE id = ?",
            (reading_id,)
        )
        if not item or not item[0]['total_pages']:
            return 0
        return round(
            (item[0]['current_page'] or 0) / item[0]['total_pages'] * 100, 1
        )

    # ========================================================================
    # Statistics
    # ========================================================================

    def get_stats(self):
        """Get knowledge base statistics."""
        return {
            'total_notes': self.db.count('notes'),
            'starred_notes': self.db.count('notes', 'is_starred = 1'),
            'total_reading': self.db.count('reading_list'),
            'currently_reading': self.db.count('reading_list', "status = 'reading'"),
            'books_completed': self.db.count('reading_list', "status = 'completed'"),
            'to_read': self.db.count('reading_list', "status = 'to_read'"),
            'total_highlights': self.db.count('reading_highlights'),
        }
