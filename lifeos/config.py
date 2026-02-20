"""
Configuration management for the LifeOS framework.

Handles database paths, Notion API credentials, default settings,
and user preferences.
"""

import os
import json
from pathlib import Path

# Default database path
DEFAULT_DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'lifeos.db')

# PARA Categories
PARA_CATEGORIES = ['Projects', 'Areas', 'Resources', 'Archives']

# Task statuses following GTD methodology
TASK_STATUSES = ['inbox', 'next_action', 'waiting', 'someday', 'in_progress', 'done', 'archived']

# Priority levels
PRIORITY_LEVELS = ['critical', 'high', 'medium', 'low', 'none']

# Project statuses
PROJECT_STATUSES = ['not_started', 'in_progress', 'on_hold', 'completed', 'archived']

# Goal statuses
GOAL_STATUSES = ['not_started', 'in_progress', 'on_track', 'at_risk', 'achieved', 'abandoned']

# Habit frequencies
HABIT_FREQUENCIES = ['daily', 'weekly', 'monthly']

# Recurrence intervals
RECURRENCE_TYPES = ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']

# Default life areas/pillars
DEFAULT_AREAS = [
    'Career & Work',
    'Health & Fitness',
    'Finances',
    'Relationships',
    'Personal Growth',
    'Home & Environment',
    'Recreation & Fun',
    'Spirituality & Purpose',
]

# Finance categories
FINANCE_CATEGORIES = {
    'income': ['salary', 'freelance', 'investments', 'side_hustle', 'gifts', 'other'],
    'expense': [
        'housing', 'food', 'transportation', 'utilities', 'healthcare',
        'entertainment', 'education', 'clothing', 'subscriptions',
        'savings', 'debt', 'gifts', 'other',
    ],
}

# Fitness activity types
FITNESS_ACTIVITIES = [
    'strength', 'cardio', 'flexibility', 'sports', 'walking', 'running',
    'cycling', 'swimming', 'yoga', 'hiit', 'other',
]

# Knowledge resource types
RESOURCE_TYPES = ['book', 'article', 'video', 'podcast', 'course', 'paper', 'web_clip', 'other']

# Reading statuses
READING_STATUSES = ['to_read', 'reading', 'completed', 'abandoned']


class Config:
    """Configuration container for LifeOS settings."""

    def __init__(self, config_path=None):
        self.config_path = config_path or os.path.join(
            os.path.dirname(__file__), '..', 'lifeos_config.json'
        )
        self.db_path = DEFAULT_DB_PATH
        self.notion_api_key = None
        self.notion_workspace_id = None
        self.reminder_days_threshold = 3
        self.archive_after_days = 30
        self.weekly_review_day = 'sunday'
        self.pomodoro_work_minutes = 25
        self.pomodoro_break_minutes = 5
        self.pomodoro_long_break_minutes = 15
        self.pomodoro_rounds = 4
        self._load()

    def _load(self):
        """Load configuration from file if it exists."""
        path = Path(self.config_path)
        if path.exists():
            with open(path, 'r') as f:
                data = json.load(f)
            for key, value in data.items():
                if hasattr(self, key):
                    setattr(self, key, value)

    def save(self):
        """Save current configuration to file."""
        data = {
            'db_path': self.db_path,
            'notion_api_key': self.notion_api_key,
            'notion_workspace_id': self.notion_workspace_id,
            'reminder_days_threshold': self.reminder_days_threshold,
            'archive_after_days': self.archive_after_days,
            'weekly_review_day': self.weekly_review_day,
            'pomodoro_work_minutes': self.pomodoro_work_minutes,
            'pomodoro_break_minutes': self.pomodoro_break_minutes,
            'pomodoro_long_break_minutes': self.pomodoro_long_break_minutes,
            'pomodoro_rounds': self.pomodoro_rounds,
        }
        with open(self.config_path, 'w') as f:
            json.dump(data, f, indent=2)

    def to_dict(self):
        """Return configuration as dictionary."""
        return {k: v for k, v in self.__dict__.items() if not k.startswith('_')}
