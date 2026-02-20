"""
Daily Journal Module - Prompted reflection entries.

Provides structured daily journaling with prompted entries for:
- Morning intentions
- Gratitude practice
- Daily highlights
- Evening reflection
- Lessons learned
- Tomorrow's priorities

Mood and energy tracking enable trend analysis over time.
"""

from datetime import date, timedelta


class JournalModule:
    """Manages daily journal entries with prompted reflection."""

    def __init__(self, db):
        self.db = db

    def create_entry(self, entry_date=None, mood=None, energy=None,
                     gratitude=None, morning_intention=None,
                     daily_highlights=None, evening_reflection=None,
                     lessons_learned=None, tomorrow_priorities=None):
        """Create or update a journal entry for a specific date."""
        if entry_date is None:
            entry_date = date.today().isoformat()

        existing = self.get_by_date(entry_date)
        if existing:
            return self.update(existing['id'],
                               mood=mood, energy=energy,
                               gratitude=gratitude,
                               morning_intention=morning_intention,
                               daily_highlights=daily_highlights,
                               evening_reflection=evening_reflection,
                               lessons_learned=lessons_learned,
                               tomorrow_priorities=tomorrow_priorities)

        return self.db.execute(
            """INSERT INTO journal_entries (entry_date, mood, energy, gratitude,
                morning_intention, daily_highlights, evening_reflection,
                lessons_learned, tomorrow_priorities)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (entry_date, mood, energy, gratitude, morning_intention,
             daily_highlights, evening_reflection, lessons_learned,
             tomorrow_priorities)
        )

    def get(self, entry_id):
        """Get a journal entry by ID."""
        result = self.db.execute(
            "SELECT * FROM journal_entries WHERE id = ?", (entry_id,)
        )
        return result[0] if result else None

    def get_by_date(self, entry_date):
        """Get a journal entry by date."""
        result = self.db.execute(
            "SELECT * FROM journal_entries WHERE entry_date = ?", (entry_date,)
        )
        return result[0] if result else None

    def get_today(self):
        """Get or create today's journal entry."""
        return self.get_by_date(date.today().isoformat())

    def update(self, entry_id, **kwargs):
        """Update journal entry fields (only updates non-None values)."""
        filtered = {k: v for k, v in kwargs.items() if v is not None}
        if not filtered:
            return entry_id
        set_clause = ', '.join(f"{k} = ?" for k in filtered)
        values = list(filtered.values()) + [entry_id]
        self.db.execute(
            f"UPDATE journal_entries SET {set_clause} WHERE id = ?", values
        )
        return entry_id

    def get_recent(self, days=7):
        """Get journal entries from the last N days."""
        start_date = (date.today() - timedelta(days=days)).isoformat()
        return self.db.execute(
            """SELECT * FROM journal_entries
               WHERE entry_date >= ?
               ORDER BY entry_date DESC""",
            (start_date,)
        )

    def get_range(self, start_date, end_date):
        """Get journal entries within a date range."""
        return self.db.execute(
            """SELECT * FROM journal_entries
               WHERE entry_date BETWEEN ? AND ?
               ORDER BY entry_date DESC""",
            (start_date, end_date)
        )

    def get_mood_trend(self, days=30):
        """
        Get mood and energy trends over the last N days.

        Returns a list of daily mood/energy values for charting.
        """
        start_date = (date.today() - timedelta(days=days)).isoformat()
        return self.db.execute(
            """SELECT entry_date, mood, energy
               FROM journal_entries
               WHERE entry_date >= ? AND (mood IS NOT NULL OR energy IS NOT NULL)
               ORDER BY entry_date ASC""",
            (start_date,)
        )

    def get_mood_average(self, days=30):
        """Get average mood and energy over a period."""
        start_date = (date.today() - timedelta(days=days)).isoformat()
        result = self.db.execute(
            """SELECT AVG(mood) as avg_mood, AVG(energy) as avg_energy,
                      COUNT(*) as entry_count
               FROM journal_entries
               WHERE entry_date >= ?""",
            (start_date,)
        )
        return result[0] if result else {'avg_mood': None, 'avg_energy': None, 'entry_count': 0}

    def get_streak(self):
        """Calculate the current journaling streak (consecutive days with entries)."""
        entries = self.db.execute(
            """SELECT DISTINCT entry_date FROM journal_entries
               ORDER BY entry_date DESC"""
        )

        if not entries:
            return 0

        entry_dates = {e['entry_date'] for e in entries}
        streak = 0
        check_date = date.today()

        if check_date.isoformat() not in entry_dates:
            check_date -= timedelta(days=1)
            if check_date.isoformat() not in entry_dates:
                return 0

        while check_date.isoformat() in entry_dates:
            streak += 1
            check_date -= timedelta(days=1)

        return streak

    def search(self, query):
        """Search journal entries across all text fields."""
        return self.db.execute(
            """SELECT * FROM journal_entries
               WHERE gratitude LIKE ?
               OR morning_intention LIKE ?
               OR daily_highlights LIKE ?
               OR evening_reflection LIKE ?
               OR lessons_learned LIKE ?
               OR tomorrow_priorities LIKE ?
               ORDER BY entry_date DESC""",
            tuple(f'%{query}%' for _ in range(6))
        )

    def delete(self, entry_id):
        """Delete a journal entry."""
        self.db.execute("DELETE FROM journal_entries WHERE id = ?", (entry_id,))

    def get_stats(self):
        """Get journaling statistics."""
        total = self.db.count('journal_entries')
        averages = self.get_mood_average()
        return {
            'total_entries': total,
            'current_streak': self.get_streak(),
            'avg_mood_30d': round(averages['avg_mood'], 1) if averages['avg_mood'] else None,
            'avg_energy_30d': round(averages['avg_energy'], 1) if averages['avg_energy'] else None,
        }
