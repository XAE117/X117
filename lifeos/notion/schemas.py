"""
Notion Database Schema Definitions.

JSON-compatible schema definitions for creating the LifeOS databases
in a Notion workspace via the Notion API. These schemas define the
exact property types, options, and relations needed to replicate
the local LifeOS architecture in Notion.

Covers all 15 databases:
  Core: Areas, Goals, Projects, Tasks, Inbox
  Lifestyle: Habits, Habit Logs, Journal
  Finance: Accounts, Transactions, Budgets
  Fitness: Workouts, Body Metrics, Meals
  Knowledge: Notes, Reading Tracker

Usage:
    - Pass these schemas to the Notion API's "Create a database" endpoint
    - Use with the Notion MCP server for Claude-assisted setup
    - Reference for manual template creation in the Notion UI
"""


def get_areas_schema(parent_page_id):
    """Generate Notion API schema for the Areas (Life Pillars) database."""
    return {
        "parent": {"type": "page_id", "page_id": parent_page_id},
        "icon": {"type": "emoji", "emoji": "🏛️"},
        "title": [{"type": "text", "text": {"content": "Areas"}}],
        "properties": {
            "Name": {"title": {}},
            "Area Description": {"rich_text": {}},
            "Icon Emoji": {"rich_text": {}},
            "Sort Order": {"number": {"format": "number"}},
        },
    }


def get_goals_schema(parent_page_id):
    """Generate Notion API schema for the Goals database."""
    return {
        "parent": {"type": "page_id", "page_id": parent_page_id},
        "icon": {"type": "emoji", "emoji": "🎯"},
        "title": [{"type": "text", "text": {"content": "Goals"}}],
        "properties": {
            "Title": {"title": {}},
            "Description": {"rich_text": {}},
            "Status": {
                "status": {
                    "options": [
                        {"name": "Not Started", "color": "default"},
                        {"name": "In Progress", "color": "blue"},
                        {"name": "On Track", "color": "green"},
                        {"name": "At Risk", "color": "red"},
                        {"name": "Achieved", "color": "green"},
                        {"name": "Abandoned", "color": "gray"},
                    ],
                    "groups": [
                        {"name": "Planning", "option_names": ["Not Started"]},
                        {"name": "Active", "option_names": ["In Progress", "On Track", "At Risk"]},
                        {"name": "Done", "option_names": ["Achieved", "Abandoned"]},
                    ],
                }
            },
            "Target Value": {"number": {"format": "number"}},
            "Current Value": {"number": {"format": "number"}},
            "Unit": {"rich_text": {}},
            "Start Date": {"date": {}},
            "Target Date": {"date": {}},
            # Area relation added after all databases are created
        },
    }


def get_projects_schema(parent_page_id):
    """Generate Notion API schema for the Projects database."""
    return {
        "parent": {"type": "page_id", "page_id": parent_page_id},
        "icon": {"type": "emoji", "emoji": "📁"},
        "title": [{"type": "text", "text": {"content": "Projects"}}],
        "properties": {
            "Name": {"title": {}},
            "Description": {"rich_text": {}},
            "Status": {
                "status": {
                    "options": [
                        {"name": "Not Started", "color": "default"},
                        {"name": "In Progress", "color": "blue"},
                        {"name": "On Hold", "color": "yellow"},
                        {"name": "Completed", "color": "green"},
                        {"name": "Archived", "color": "gray"},
                    ],
                    "groups": [
                        {"name": "To Do", "option_names": ["Not Started"]},
                        {"name": "In Progress", "option_names": ["In Progress", "On Hold"]},
                        {"name": "Done", "option_names": ["Completed", "Archived"]},
                    ],
                }
            },
            "Priority": {
                "select": {
                    "options": [
                        {"name": "Critical", "color": "red"},
                        {"name": "High", "color": "orange"},
                        {"name": "Medium", "color": "yellow"},
                        {"name": "Low", "color": "blue"},
                        {"name": "None", "color": "gray"},
                    ]
                }
            },
            "PARA Category": {
                "select": {
                    "options": [
                        {"name": "Projects", "color": "blue"},
                        {"name": "Areas", "color": "green"},
                        {"name": "Resources", "color": "yellow"},
                        {"name": "Archives", "color": "gray"},
                    ]
                }
            },
            "Start Date": {"date": {}},
            "Due Date": {"date": {}},
            "Completed Date": {"date": {}},
            # Area, Goal relations added after creation
        },
    }


def get_tasks_schema(parent_page_id):
    """Generate Notion API schema for the Master Tasks database."""
    return {
        "parent": {"type": "page_id", "page_id": parent_page_id},
        "icon": {"type": "emoji", "emoji": "✅"},
        "title": [{"type": "text", "text": {"content": "Master Tasks"}}],
        "properties": {
            "Title": {"title": {}},
            "Description": {"rich_text": {}},
            "Status": {
                "status": {
                    "options": [
                        {"name": "Inbox", "color": "default"},
                        {"name": "Next Action", "color": "blue"},
                        {"name": "In Progress", "color": "blue"},
                        {"name": "Waiting", "color": "yellow"},
                        {"name": "Someday", "color": "purple"},
                        {"name": "Done", "color": "green"},
                        {"name": "Archived", "color": "gray"},
                    ],
                    "groups": [
                        {"name": "Capture", "option_names": ["Inbox"]},
                        {"name": "Active", "option_names": ["Next Action", "In Progress", "Waiting"]},
                        {"name": "Deferred", "option_names": ["Someday"]},
                        {"name": "Done", "option_names": ["Done", "Archived"]},
                    ],
                }
            },
            "Priority": {
                "select": {
                    "options": [
                        {"name": "Critical", "color": "red"},
                        {"name": "High", "color": "orange"},
                        {"name": "Medium", "color": "yellow"},
                        {"name": "Low", "color": "blue"},
                        {"name": "None", "color": "gray"},
                    ]
                }
            },
            "Energy Level": {
                "select": {
                    "options": [
                        {"name": "High", "color": "red"},
                        {"name": "Medium", "color": "yellow"},
                        {"name": "Low", "color": "green"},
                    ]
                }
            },
            "Context": {
                "select": {
                    "options": [
                        {"name": "@Work", "color": "blue"},
                        {"name": "@Home", "color": "green"},
                        {"name": "@Errands", "color": "orange"},
                        {"name": "@Computer", "color": "purple"},
                        {"name": "@Phone", "color": "pink"},
                        {"name": "@Anywhere", "color": "gray"},
                    ]
                }
            },
            "Due Date": {"date": {}},
            "Do Date": {"date": {}},
            "Estimated Minutes": {"number": {"format": "number"}},
            "Actual Minutes": {"number": {"format": "number"}},
            "Is Recurring": {"checkbox": {}},
            "Recur Interval": {"number": {"format": "number"}},
            "Recur Unit": {
                "select": {
                    "options": [
                        {"name": "days", "color": "default"},
                        {"name": "weeks", "color": "blue"},
                        {"name": "months", "color": "green"},
                        {"name": "years", "color": "purple"},
                    ]
                }
            },
            "Waiting For": {"rich_text": {}},
            "Delegated To": {"rich_text": {}},
            # Project, Area, Goal relations added after creation
        },
    }


def get_inbox_schema(parent_page_id):
    """Generate Notion API schema for the Inbox database."""
    return {
        "parent": {"type": "page_id", "page_id": parent_page_id},
        "icon": {"type": "emoji", "emoji": "📥"},
        "title": [{"type": "text", "text": {"content": "Inbox"}}],
        "properties": {
            "Content": {"title": {}},
            "Type": {
                "select": {
                    "options": [
                        {"name": "Thought", "color": "default"},
                        {"name": "Task", "color": "blue"},
                        {"name": "Note", "color": "green"},
                        {"name": "Resource", "color": "yellow"},
                        {"name": "Idea", "color": "purple"},
                        {"name": "Reminder", "color": "red"},
                    ]
                }
            },
            "Source": {"rich_text": {}},
            "Context": {"rich_text": {}},
            "Processed": {"checkbox": {}},
            "Processed To": {"rich_text": {}},
        },
    }


def get_habits_schema(parent_page_id):
    """Generate Notion API schema for the Habits database."""
    return {
        "parent": {"type": "page_id", "page_id": parent_page_id},
        "icon": {"type": "emoji", "emoji": "🔄"},
        "title": [{"type": "text", "text": {"content": "Habits"}}],
        "properties": {
            "Name": {"title": {}},
            "Description": {"rich_text": {}},
            "Frequency": {
                "select": {
                    "options": [
                        {"name": "Daily", "color": "blue"},
                        {"name": "Weekly", "color": "green"},
                        {"name": "Monthly", "color": "purple"},
                    ]
                }
            },
            "Target Count": {"number": {"format": "number"}},
            "Current Streak": {"number": {"format": "number"}},
            "Longest Streak": {"number": {"format": "number"}},
            "Active": {"checkbox": {}},
            # Area relation added after creation
        },
    }


def get_habit_logs_schema(parent_page_id):
    """Generate Notion API schema for the Habit Logs database."""
    return {
        "parent": {"type": "page_id", "page_id": parent_page_id},
        "icon": {"type": "emoji", "emoji": "📊"},
        "title": [{"type": "text", "text": {"content": "Habit Logs"}}],
        "properties": {
            "Log Entry": {"title": {}},
            "Date": {"date": {}},
            "Count": {"number": {"format": "number"}},
            "Notes": {"rich_text": {}},
            # Habit relation added after creation
        },
    }


def get_journal_schema(parent_page_id):
    """Generate Notion API schema for the Daily Journal database."""
    return {
        "parent": {"type": "page_id", "page_id": parent_page_id},
        "icon": {"type": "emoji", "emoji": "📔"},
        "title": [{"type": "text", "text": {"content": "Daily Journal"}}],
        "properties": {
            "Date": {"title": {}},
            "Mood": {
                "select": {
                    "options": [
                        {"name": "1 - Terrible", "color": "red"},
                        {"name": "2", "color": "red"},
                        {"name": "3", "color": "orange"},
                        {"name": "4", "color": "orange"},
                        {"name": "5 - Neutral", "color": "yellow"},
                        {"name": "6", "color": "yellow"},
                        {"name": "7", "color": "green"},
                        {"name": "8", "color": "green"},
                        {"name": "9", "color": "blue"},
                        {"name": "10 - Amazing", "color": "blue"},
                    ]
                }
            },
            "Energy": {"number": {"format": "number"}},
            "Gratitude": {"rich_text": {}},
            "Morning Intention": {"rich_text": {}},
            "Daily Highlights": {"rich_text": {}},
            "Evening Reflection": {"rich_text": {}},
            "Lessons Learned": {"rich_text": {}},
            "Tomorrow Priorities": {"rich_text": {}},
        },
    }


def get_finance_accounts_schema(parent_page_id):
    """Generate Notion API schema for the Finance Accounts database."""
    return {
        "parent": {"type": "page_id", "page_id": parent_page_id},
        "icon": {"type": "emoji", "emoji": "🏦"},
        "title": [{"type": "text", "text": {"content": "Finance Accounts"}}],
        "properties": {
            "Name": {"title": {}},
            "Type": {
                "select": {
                    "options": [
                        {"name": "Checking", "color": "blue"},
                        {"name": "Savings", "color": "green"},
                        {"name": "Credit Card", "color": "red"},
                        {"name": "Investment", "color": "purple"},
                        {"name": "Cash", "color": "yellow"},
                        {"name": "Other", "color": "gray"},
                    ]
                }
            },
            "Balance": {"number": {"format": "dollar"}},
            "Currency": {
                "select": {
                    "options": [
                        {"name": "USD", "color": "green"},
                        {"name": "EUR", "color": "blue"},
                        {"name": "GBP", "color": "purple"},
                    ]
                }
            },
            "Active": {"checkbox": {}},
        },
    }


def get_finance_transactions_schema(parent_page_id):
    """Generate Notion API schema for the Finance Transactions database."""
    return {
        "parent": {"type": "page_id", "page_id": parent_page_id},
        "icon": {"type": "emoji", "emoji": "💰"},
        "title": [{"type": "text", "text": {"content": "Finance Transactions"}}],
        "properties": {
            "Description": {"title": {}},
            "Type": {
                "select": {
                    "options": [
                        {"name": "Income", "color": "green"},
                        {"name": "Expense", "color": "red"},
                        {"name": "Transfer", "color": "blue"},
                    ]
                }
            },
            "Category": {
                "select": {
                    "options": [
                        {"name": "Housing", "color": "blue"},
                        {"name": "Food", "color": "green"},
                        {"name": "Transportation", "color": "orange"},
                        {"name": "Utilities", "color": "yellow"},
                        {"name": "Healthcare", "color": "red"},
                        {"name": "Entertainment", "color": "purple"},
                        {"name": "Education", "color": "blue"},
                        {"name": "Clothing", "color": "pink"},
                        {"name": "Subscriptions", "color": "purple"},
                        {"name": "Salary", "color": "green"},
                        {"name": "Freelance", "color": "green"},
                        {"name": "Investments", "color": "blue"},
                        {"name": "Savings", "color": "green"},
                        {"name": "Debt", "color": "red"},
                        {"name": "Gifts", "color": "pink"},
                        {"name": "Other", "color": "gray"},
                    ]
                }
            },
            "Amount": {"number": {"format": "dollar"}},
            "Date": {"date": {}},
            "Tags": {"multi_select": {"options": []}},
            "Is Recurring": {"checkbox": {}},
            # Account relation added after creation
        },
    }


def get_finance_budgets_schema(parent_page_id):
    """Generate Notion API schema for the Finance Budgets database."""
    return {
        "parent": {"type": "page_id", "page_id": parent_page_id},
        "icon": {"type": "emoji", "emoji": "📋"},
        "title": [{"type": "text", "text": {"content": "Finance Budgets"}}],
        "properties": {
            "Category": {"title": {}},
            "Monthly Limit": {"number": {"format": "dollar"}},
            "Spent": {"number": {"format": "dollar"}},
            "Period": {"rich_text": {}},
            "Remaining": {"formula": {
                "expression": 'prop("Monthly Limit") - prop("Spent")'
            }},
            "Pct Used": {"formula": {
                "expression": 'if(prop("Monthly Limit") > 0, round(prop("Spent") / prop("Monthly Limit") * 100), 0)'
            }},
        },
    }


def get_workouts_schema(parent_page_id):
    """Generate Notion API schema for the Workouts database."""
    return {
        "parent": {"type": "page_id", "page_id": parent_page_id},
        "icon": {"type": "emoji", "emoji": "🏋️"},
        "title": [{"type": "text", "text": {"content": "Workouts"}}],
        "properties": {
            "Name": {"title": {}},
            "Date": {"date": {}},
            "Type": {
                "select": {
                    "options": [
                        {"name": "Strength", "color": "red"},
                        {"name": "Cardio", "color": "orange"},
                        {"name": "Flexibility", "color": "green"},
                        {"name": "Sports", "color": "blue"},
                        {"name": "Walking", "color": "default"},
                        {"name": "Running", "color": "orange"},
                        {"name": "Cycling", "color": "yellow"},
                        {"name": "Swimming", "color": "blue"},
                        {"name": "Yoga", "color": "purple"},
                        {"name": "HIIT", "color": "red"},
                        {"name": "Other", "color": "gray"},
                    ]
                }
            },
            "Duration (min)": {"number": {"format": "number"}},
            "Calories": {"number": {"format": "number"}},
            "Intensity": {
                "select": {
                    "options": [
                        {"name": "Low", "color": "green"},
                        {"name": "Moderate", "color": "yellow"},
                        {"name": "High", "color": "orange"},
                        {"name": "Max", "color": "red"},
                    ]
                }
            },
            "Rating": {
                "select": {
                    "options": [
                        {"name": "⭐", "color": "gray"},
                        {"name": "⭐⭐", "color": "yellow"},
                        {"name": "⭐⭐⭐", "color": "yellow"},
                        {"name": "⭐⭐⭐⭐", "color": "green"},
                        {"name": "⭐⭐⭐⭐⭐", "color": "green"},
                    ]
                }
            },
            "Exercises": {"rich_text": {}},
            "Notes": {"rich_text": {}},
        },
    }


def get_body_metrics_schema(parent_page_id):
    """Generate Notion API schema for the Body Metrics database."""
    return {
        "parent": {"type": "page_id", "page_id": parent_page_id},
        "icon": {"type": "emoji", "emoji": "📈"},
        "title": [{"type": "text", "text": {"content": "Body Metrics"}}],
        "properties": {
            "Date": {"title": {}},
            "Weight": {"number": {"format": "number"}},
            "Weight Unit": {
                "select": {
                    "options": [
                        {"name": "lbs", "color": "blue"},
                        {"name": "kg", "color": "green"},
                    ]
                }
            },
            "Body Fat %": {"number": {"format": "percent"}},
            "Sleep (hrs)": {"number": {"format": "number"}},
            "Water (oz)": {"number": {"format": "number"}},
            "Steps": {"number": {"format": "number"}},
            "Resting HR": {"number": {"format": "number"}},
            "Notes": {"rich_text": {}},
        },
    }


def get_meals_schema(parent_page_id):
    """Generate Notion API schema for the Meals database."""
    return {
        "parent": {"type": "page_id", "page_id": parent_page_id},
        "icon": {"type": "emoji", "emoji": "🍽️"},
        "title": [{"type": "text", "text": {"content": "Meals"}}],
        "properties": {
            "Name": {"title": {}},
            "Date": {"date": {}},
            "Meal Type": {
                "select": {
                    "options": [
                        {"name": "Breakfast", "color": "yellow"},
                        {"name": "Lunch", "color": "green"},
                        {"name": "Dinner", "color": "blue"},
                        {"name": "Snack", "color": "purple"},
                    ]
                }
            },
            "Calories": {"number": {"format": "number"}},
            "Protein (g)": {"number": {"format": "number"}},
            "Carbs (g)": {"number": {"format": "number"}},
            "Fat (g)": {"number": {"format": "number"}},
            "Notes": {"rich_text": {}},
        },
    }


def get_notes_schema(parent_page_id):
    """Generate Notion API schema for the Notes/Knowledge Base database."""
    return {
        "parent": {"type": "page_id", "page_id": parent_page_id},
        "icon": {"type": "emoji", "emoji": "🧠"},
        "title": [{"type": "text", "text": {"content": "Notes"}}],
        "properties": {
            "Title": {"title": {}},
            "Type": {
                "select": {
                    "options": [
                        {"name": "Note", "color": "default"},
                        {"name": "Meeting", "color": "blue"},
                        {"name": "Idea", "color": "purple"},
                        {"name": "Reference", "color": "yellow"},
                        {"name": "Web Clip", "color": "orange"},
                        {"name": "Template", "color": "green"},
                    ]
                }
            },
            "PARA Category": {
                "select": {
                    "options": [
                        {"name": "Projects", "color": "blue"},
                        {"name": "Areas", "color": "green"},
                        {"name": "Resources", "color": "yellow"},
                        {"name": "Archives", "color": "gray"},
                    ]
                }
            },
            "Tags": {"multi_select": {"options": []}},
            "Starred": {"checkbox": {}},
            "Source URL": {"url": {}},
            # Area, Project relations added after creation
        },
    }


def get_reading_schema(parent_page_id):
    """Generate Notion API schema for the Reading Tracker database."""
    return {
        "parent": {"type": "page_id", "page_id": parent_page_id},
        "icon": {"type": "emoji", "emoji": "📚"},
        "title": [{"type": "text", "text": {"content": "Reading Tracker"}}],
        "properties": {
            "Title": {"title": {}},
            "Author": {"rich_text": {}},
            "Type": {
                "select": {
                    "options": [
                        {"name": "Book", "color": "blue"},
                        {"name": "Article", "color": "green"},
                        {"name": "Video", "color": "red"},
                        {"name": "Podcast", "color": "purple"},
                        {"name": "Course", "color": "orange"},
                        {"name": "Paper", "color": "yellow"},
                    ]
                }
            },
            "Status": {
                "status": {
                    "options": [
                        {"name": "To Read", "color": "default"},
                        {"name": "Reading", "color": "blue"},
                        {"name": "Completed", "color": "green"},
                        {"name": "Abandoned", "color": "gray"},
                    ],
                    "groups": [
                        {"name": "Queue", "option_names": ["To Read"]},
                        {"name": "Active", "option_names": ["Reading"]},
                        {"name": "Done", "option_names": ["Completed", "Abandoned"]},
                    ],
                }
            },
            "Total Pages": {"number": {"format": "number"}},
            "Current Page": {"number": {"format": "number"}},
            "Rating": {
                "select": {
                    "options": [
                        {"name": "⭐", "color": "gray"},
                        {"name": "⭐⭐", "color": "yellow"},
                        {"name": "⭐⭐⭐", "color": "yellow"},
                        {"name": "⭐⭐⭐⭐", "color": "green"},
                        {"name": "⭐⭐⭐⭐⭐", "color": "green"},
                    ]
                }
            },
            "Start Date": {"date": {}},
            "Finish Date": {"date": {}},
            "Source URL": {"url": {}},
            "Summary": {"rich_text": {}},
            "Key Insights": {"rich_text": {}},
            # Area relation added after creation
        },
    }


def get_weekly_reviews_schema(parent_page_id):
    """Generate Notion API schema for the Weekly Reviews database."""
    return {
        "parent": {"type": "page_id", "page_id": parent_page_id},
        "icon": {"type": "emoji", "emoji": "📝"},
        "title": [{"type": "text", "text": {"content": "Weekly Reviews"}}],
        "properties": {
            "Review": {"title": {}},
            "Week Number": {"number": {"format": "number"}},
            "Date": {"date": {}},
            "Wins": {"rich_text": {}},
            "Challenges": {"rich_text": {}},
            "Lessons": {"rich_text": {}},
            "Next Week Priorities": {"rich_text": {}},
            "Inbox Cleared": {"checkbox": {}},
            "Projects Reviewed": {"checkbox": {}},
            "Goals Reviewed": {"checkbox": {}},
            "Habits Reviewed": {"checkbox": {}},
            "Rating": {
                "select": {
                    "options": [
                        {"name": "1", "color": "red"},
                        {"name": "2", "color": "red"},
                        {"name": "3", "color": "orange"},
                        {"name": "4", "color": "orange"},
                        {"name": "5", "color": "yellow"},
                        {"name": "6", "color": "yellow"},
                        {"name": "7", "color": "green"},
                        {"name": "8", "color": "green"},
                        {"name": "9", "color": "blue"},
                        {"name": "10", "color": "blue"},
                    ]
                }
            },
        },
    }


def get_pomodoro_schema(parent_page_id):
    """Generate Notion API schema for the Pomodoro Sessions database."""
    return {
        "parent": {"type": "page_id", "page_id": parent_page_id},
        "icon": {"type": "emoji", "emoji": "🍅"},
        "title": [{"type": "text", "text": {"content": "Pomodoro Sessions"}}],
        "properties": {
            "Session": {"title": {}},
            "Date": {"date": {}},
            "Start Time": {"rich_text": {}},
            "Duration (min)": {"number": {"format": "number"}},
            "Type": {
                "select": {
                    "options": [
                        {"name": "Work", "color": "red"},
                        {"name": "Break", "color": "green"},
                        {"name": "Long Break", "color": "blue"},
                    ]
                }
            },
            "Completed": {"checkbox": {}},
            "Notes": {"rich_text": {}},
            # Task relation added after creation
        },
    }


def get_all_schemas(parent_page_id):
    """Get all database schemas for the complete LifeOS setup."""
    return {
        # Core
        'areas': get_areas_schema(parent_page_id),
        'goals': get_goals_schema(parent_page_id),
        'projects': get_projects_schema(parent_page_id),
        'tasks': get_tasks_schema(parent_page_id),
        'inbox': get_inbox_schema(parent_page_id),
        # Lifestyle
        'habits': get_habits_schema(parent_page_id),
        'habit_logs': get_habit_logs_schema(parent_page_id),
        'journal': get_journal_schema(parent_page_id),
        # Finance
        'finance_accounts': get_finance_accounts_schema(parent_page_id),
        'finance_transactions': get_finance_transactions_schema(parent_page_id),
        'finance_budgets': get_finance_budgets_schema(parent_page_id),
        # Fitness
        'workouts': get_workouts_schema(parent_page_id),
        'body_metrics': get_body_metrics_schema(parent_page_id),
        'meals': get_meals_schema(parent_page_id),
        # Knowledge
        'notes': get_notes_schema(parent_page_id),
        'reading': get_reading_schema(parent_page_id),
        # System
        'weekly_reviews': get_weekly_reviews_schema(parent_page_id),
        'pomodoro': get_pomodoro_schema(parent_page_id),
    }


def get_relation_mappings():
    """
    Get the relation properties that link databases together.

    These must be added after all databases are created, since
    they require database IDs.

    Returns a list of relation definitions to be applied.
    """
    return [
        # Goals -> Areas
        {
            'source': 'goals',
            'property_name': 'Area',
            'target': 'areas',
            'type': 'single',
        },
        # Projects -> Areas, Goals
        {
            'source': 'projects',
            'property_name': 'Area',
            'target': 'areas',
            'type': 'single',
        },
        {
            'source': 'projects',
            'property_name': 'Goal',
            'target': 'goals',
            'type': 'single',
        },
        # Tasks -> Projects, Areas, Goals
        {
            'source': 'tasks',
            'property_name': 'Project',
            'target': 'projects',
            'type': 'single',
        },
        {
            'source': 'tasks',
            'property_name': 'Area',
            'target': 'areas',
            'type': 'single',
        },
        {
            'source': 'tasks',
            'property_name': 'Goal',
            'target': 'goals',
            'type': 'single',
        },
        # Habits -> Areas
        {
            'source': 'habits',
            'property_name': 'Area',
            'target': 'areas',
            'type': 'single',
        },
        # Habit Logs -> Habits
        {
            'source': 'habit_logs',
            'property_name': 'Habit',
            'target': 'habits',
            'type': 'single',
        },
        # Finance Transactions -> Finance Accounts
        {
            'source': 'finance_transactions',
            'property_name': 'Account',
            'target': 'finance_accounts',
            'type': 'single',
        },
        # Notes -> Areas, Projects
        {
            'source': 'notes',
            'property_name': 'Area',
            'target': 'areas',
            'type': 'single',
        },
        {
            'source': 'notes',
            'property_name': 'Project',
            'target': 'projects',
            'type': 'single',
        },
        # Reading -> Areas
        {
            'source': 'reading',
            'property_name': 'Area',
            'target': 'areas',
            'type': 'single',
        },
        # Pomodoro -> Tasks
        {
            'source': 'pomodoro',
            'property_name': 'Task',
            'target': 'tasks',
            'type': 'single',
        },
    ]
