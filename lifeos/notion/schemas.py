"""
Notion Database Schema Definitions.

JSON-compatible schema definitions for creating the LifeOS databases
in a Notion workspace via the Notion API. These schemas define the
exact property types, options, and relations needed to replicate
the local LifeOS architecture in Notion.

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
            "Description": {"rich_text": {}},
            "Icon": {"rich_text": {}},
            "Status": {
                "select": {
                    "options": [
                        {"name": "Active", "color": "green"},
                        {"name": "Inactive", "color": "gray"},
                    ]
                }
            },
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
            # Relations added after all databases are created
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


def get_finance_schema(parent_page_id):
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
                        {"name": "Salary", "color": "green"},
                        {"name": "Freelance", "color": "green"},
                        {"name": "Investments", "color": "blue"},
                        {"name": "Other", "color": "gray"},
                    ]
                }
            },
            "Amount": {"number": {"format": "dollar"}},
            "Date": {"date": {}},
            "Account": {"rich_text": {}},
            "Tags": {"multi_select": {"options": []}},
            "Is Recurring": {"checkbox": {}},
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
        },
    }


def get_all_schemas(parent_page_id):
    """Get all database schemas for the complete LifeOS setup."""
    return {
        'areas': get_areas_schema(parent_page_id),
        'goals': get_goals_schema(parent_page_id),
        'projects': get_projects_schema(parent_page_id),
        'tasks': get_tasks_schema(parent_page_id),
        'inbox': get_inbox_schema(parent_page_id),
        'habits': get_habits_schema(parent_page_id),
        'journal': get_journal_schema(parent_page_id),
        'finance': get_finance_schema(parent_page_id),
        'reading': get_reading_schema(parent_page_id),
    }


def get_relation_mappings():
    """
    Get the relation properties that link databases together.

    These must be added after all databases are created, since
    they require database IDs.

    Returns a list of relation definitions to be applied.
    """
    return [
        {
            'source': 'goals',
            'property_name': 'Area',
            'target': 'areas',
            'type': 'single',
        },
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
        {
            'source': 'habits',
            'property_name': 'Area',
            'target': 'areas',
            'type': 'single',
        },
        {
            'source': 'reading',
            'property_name': 'Area',
            'target': 'areas',
            'type': 'single',
        },
    ]
