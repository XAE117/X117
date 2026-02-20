"""
Notion Database View Configurations.

Defines the filtered, sorted, and grouped views for each LifeOS
database. These are applied via the Notion API after database creation
to give each database ready-to-use views out of the box.

Each view config maps to a Notion database view with:
- View type (table, board, calendar, gallery, list, timeline)
- Filters (show/hide specific items)
- Sorts (ordering)
- Property visibility (which columns to show)

Usage:
    from lifeos.notion.views import get_all_views
    views = get_all_views()
    for db_name, db_views in views.items():
        for view in db_views:
            sync.create_view(database_ids[db_name], view)
"""


def get_tasks_views():
    """Views for the Master Tasks database."""
    return [
        {
            "name": "Next Actions",
            "type": "table",
            "filter": {
                "property": "Status",
                "status": {"equals": "Next Action"},
            },
            "sorts": [
                {"property": "Priority", "direction": "ascending"},
                {"property": "Due Date", "direction": "ascending"},
            ],
            "visible_properties": [
                "Title", "Priority", "Energy Level", "Context",
                "Due Date", "Project", "Area",
            ],
        },
        {
            "name": "GTD Board",
            "type": "board",
            "group_by": "Status",
            "visible_properties": [
                "Title", "Priority", "Due Date", "Project",
            ],
        },
        {
            "name": "Today's Focus",
            "type": "list",
            "filter": {
                "or": [
                    {
                        "property": "Do Date",
                        "date": {"equals": "today"},
                    },
                    {
                        "property": "Due Date",
                        "date": {"on_or_before": "today"},
                    },
                ]
            },
            "sorts": [
                {"property": "Priority", "direction": "ascending"},
            ],
            "visible_properties": [
                "Title", "Priority", "Status", "Energy Level",
                "Context", "Project",
            ],
        },
        {
            "name": "Overdue",
            "type": "table",
            "filter": {
                "and": [
                    {
                        "property": "Due Date",
                        "date": {"before": "today"},
                    },
                    {
                        "property": "Status",
                        "status": {"does_not_equal": "Done"},
                    },
                    {
                        "property": "Status",
                        "status": {"does_not_equal": "Archived"},
                    },
                ]
            },
            "sorts": [
                {"property": "Due Date", "direction": "ascending"},
            ],
        },
        {
            "name": "Waiting For",
            "type": "table",
            "filter": {
                "property": "Status",
                "status": {"equals": "Waiting"},
            },
            "visible_properties": [
                "Title", "Waiting For", "Delegated To", "Due Date", "Project",
            ],
        },
        {
            "name": "Someday / Maybe",
            "type": "list",
            "filter": {
                "property": "Status",
                "status": {"equals": "Someday"},
            },
        },
        {
            "name": "By Context",
            "type": "board",
            "group_by": "Context",
            "filter": {
                "and": [
                    {
                        "property": "Status",
                        "status": {"does_not_equal": "Done"},
                    },
                    {
                        "property": "Status",
                        "status": {"does_not_equal": "Archived"},
                    },
                ]
            },
        },
        {
            "name": "By Energy",
            "type": "board",
            "group_by": "Energy Level",
            "filter": {
                "property": "Status",
                "status": {"equals": "Next Action"},
            },
        },
        {
            "name": "Calendar",
            "type": "calendar",
            "calendar_by": "Due Date",
        },
        {
            "name": "Completed",
            "type": "table",
            "filter": {
                "property": "Status",
                "status": {"equals": "Done"},
            },
            "sorts": [
                {"property": "Due Date", "direction": "descending"},
            ],
        },
    ]


def get_projects_views():
    """Views for the Projects database."""
    return [
        {
            "name": "Active Projects",
            "type": "board",
            "group_by": "Status",
            "filter": {
                "and": [
                    {
                        "property": "Status",
                        "status": {"does_not_equal": "Archived"},
                    },
                    {
                        "property": "Status",
                        "status": {"does_not_equal": "Completed"},
                    },
                ]
            },
            "visible_properties": [
                "Name", "Priority", "Area", "Due Date",
            ],
        },
        {
            "name": "By Area",
            "type": "board",
            "group_by": "Area",
        },
        {
            "name": "By Priority",
            "type": "table",
            "sorts": [
                {"property": "Priority", "direction": "ascending"},
                {"property": "Due Date", "direction": "ascending"},
            ],
            "filter": {
                "property": "Status",
                "status": {"does_not_equal": "Archived"},
            },
        },
        {
            "name": "Timeline",
            "type": "timeline",
            "timeline_by": "Due Date",
        },
        {
            "name": "PARA View",
            "type": "board",
            "group_by": "PARA Category",
        },
    ]


def get_goals_views():
    """Views for the Goals database."""
    return [
        {
            "name": "Active Goals",
            "type": "board",
            "group_by": "Status",
            "filter": {
                "and": [
                    {
                        "property": "Status",
                        "status": {"does_not_equal": "Achieved"},
                    },
                    {
                        "property": "Status",
                        "status": {"does_not_equal": "Abandoned"},
                    },
                ]
            },
        },
        {
            "name": "By Area",
            "type": "board",
            "group_by": "Area",
        },
        {
            "name": "At Risk",
            "type": "table",
            "filter": {
                "property": "Status",
                "status": {"equals": "At Risk"},
            },
        },
        {
            "name": "Timeline",
            "type": "timeline",
            "timeline_by": "Target Date",
        },
    ]


def get_inbox_views():
    """Views for the Inbox database."""
    return [
        {
            "name": "Unprocessed",
            "type": "list",
            "filter": {
                "property": "Processed",
                "checkbox": {"equals": False},
            },
            "sorts": [
                {"timestamp": "created_time", "direction": "descending"},
            ],
        },
        {
            "name": "By Type",
            "type": "board",
            "group_by": "Type",
            "filter": {
                "property": "Processed",
                "checkbox": {"equals": False},
            },
        },
    ]


def get_habits_views():
    """Views for the Habits database."""
    return [
        {
            "name": "Active Habits",
            "type": "table",
            "filter": {
                "property": "Active",
                "checkbox": {"equals": True},
            },
            "visible_properties": [
                "Name", "Frequency", "Current Streak", "Longest Streak",
                "Target Count", "Area",
            ],
        },
        {
            "name": "By Area",
            "type": "board",
            "group_by": "Area",
            "filter": {
                "property": "Active",
                "checkbox": {"equals": True},
            },
        },
        {
            "name": "By Frequency",
            "type": "board",
            "group_by": "Frequency",
        },
    ]


def get_habit_logs_views():
    """Views for the Habit Logs database."""
    return [
        {
            "name": "Recent Logs",
            "type": "table",
            "sorts": [
                {"property": "Date", "direction": "descending"},
            ],
            "visible_properties": [
                "Log Entry", "Habit", "Date", "Count", "Notes",
            ],
        },
        {
            "name": "Calendar",
            "type": "calendar",
            "calendar_by": "Date",
        },
        {
            "name": "By Habit",
            "type": "board",
            "group_by": "Habit",
        },
    ]


def get_journal_views():
    """Views for the Daily Journal database."""
    return [
        {
            "name": "Timeline",
            "type": "list",
            "sorts": [
                {"timestamp": "created_time", "direction": "descending"},
            ],
        },
        {
            "name": "Calendar",
            "type": "calendar",
            "calendar_by": "Date",
        },
        {
            "name": "By Mood",
            "type": "board",
            "group_by": "Mood",
        },
    ]


def get_finance_accounts_views():
    """Views for the Finance Accounts database."""
    return [
        {
            "name": "All Accounts",
            "type": "table",
            "filter": {
                "property": "Active",
                "checkbox": {"equals": True},
            },
            "visible_properties": [
                "Name", "Type", "Balance", "Currency",
            ],
        },
        {
            "name": "By Type",
            "type": "board",
            "group_by": "Type",
        },
    ]


def get_finance_transactions_views():
    """Views for the Finance Transactions database."""
    return [
        {
            "name": "Recent Transactions",
            "type": "table",
            "sorts": [
                {"property": "Date", "direction": "descending"},
            ],
            "visible_properties": [
                "Description", "Type", "Category", "Amount", "Date", "Account",
            ],
        },
        {
            "name": "By Category",
            "type": "board",
            "group_by": "Category",
        },
        {
            "name": "Income",
            "type": "table",
            "filter": {
                "property": "Type",
                "select": {"equals": "Income"},
            },
            "sorts": [
                {"property": "Date", "direction": "descending"},
            ],
        },
        {
            "name": "Expenses",
            "type": "table",
            "filter": {
                "property": "Type",
                "select": {"equals": "Expense"},
            },
            "sorts": [
                {"property": "Date", "direction": "descending"},
            ],
        },
        {
            "name": "Recurring",
            "type": "table",
            "filter": {
                "property": "Is Recurring",
                "checkbox": {"equals": True},
            },
        },
        {
            "name": "Calendar",
            "type": "calendar",
            "calendar_by": "Date",
        },
    ]


def get_finance_budgets_views():
    """Views for the Finance Budgets database."""
    return [
        {
            "name": "This Month",
            "type": "table",
            "visible_properties": [
                "Category", "Monthly Limit", "Spent", "Remaining", "Pct Used",
            ],
        },
    ]


def get_workouts_views():
    """Views for the Workouts database."""
    return [
        {
            "name": "Recent Workouts",
            "type": "table",
            "sorts": [
                {"property": "Date", "direction": "descending"},
            ],
            "visible_properties": [
                "Name", "Date", "Type", "Duration (min)", "Calories",
                "Intensity", "Rating",
            ],
        },
        {
            "name": "By Type",
            "type": "board",
            "group_by": "Type",
        },
        {
            "name": "Calendar",
            "type": "calendar",
            "calendar_by": "Date",
        },
    ]


def get_body_metrics_views():
    """Views for the Body Metrics database."""
    return [
        {
            "name": "Timeline",
            "type": "table",
            "sorts": [
                {"timestamp": "created_time", "direction": "descending"},
            ],
            "visible_properties": [
                "Date", "Weight", "Body Fat %", "Sleep (hrs)",
                "Steps", "Resting HR",
            ],
        },
    ]


def get_meals_views():
    """Views for the Meals database."""
    return [
        {
            "name": "Today",
            "type": "list",
            "filter": {
                "property": "Date",
                "date": {"equals": "today"},
            },
            "sorts": [
                {"property": "Meal Type", "direction": "ascending"},
            ],
        },
        {
            "name": "By Meal Type",
            "type": "board",
            "group_by": "Meal Type",
        },
        {
            "name": "Calendar",
            "type": "calendar",
            "calendar_by": "Date",
        },
    ]


def get_notes_views():
    """Views for the Notes database."""
    return [
        {
            "name": "All Notes",
            "type": "table",
            "sorts": [
                {"timestamp": "last_edited_time", "direction": "descending"},
            ],
            "visible_properties": [
                "Title", "Type", "PARA Category", "Tags", "Starred",
                "Area", "Project",
            ],
        },
        {
            "name": "Starred",
            "type": "list",
            "filter": {
                "property": "Starred",
                "checkbox": {"equals": True},
            },
        },
        {
            "name": "By PARA",
            "type": "board",
            "group_by": "PARA Category",
        },
        {
            "name": "By Type",
            "type": "board",
            "group_by": "Type",
        },
    ]


def get_reading_views():
    """Views for the Reading Tracker database."""
    return [
        {
            "name": "Reading Board",
            "type": "board",
            "group_by": "Status",
            "visible_properties": [
                "Title", "Author", "Type", "Current Page", "Total Pages",
            ],
        },
        {
            "name": "Currently Reading",
            "type": "gallery",
            "filter": {
                "property": "Status",
                "status": {"equals": "Reading"},
            },
        },
        {
            "name": "To Read Queue",
            "type": "list",
            "filter": {
                "property": "Status",
                "status": {"equals": "To Read"},
            },
        },
        {
            "name": "Completed",
            "type": "table",
            "filter": {
                "property": "Status",
                "status": {"equals": "Completed"},
            },
            "sorts": [
                {"property": "Finish Date", "direction": "descending"},
            ],
            "visible_properties": [
                "Title", "Author", "Rating", "Finish Date",
            ],
        },
        {
            "name": "By Type",
            "type": "board",
            "group_by": "Type",
        },
    ]


def get_weekly_reviews_views():
    """Views for the Weekly Reviews database."""
    return [
        {
            "name": "All Reviews",
            "type": "table",
            "sorts": [
                {"property": "Date", "direction": "descending"},
            ],
            "visible_properties": [
                "Review", "Date", "Week Number", "Rating",
                "Inbox Cleared", "Projects Reviewed",
            ],
        },
    ]


def get_pomodoro_views():
    """Views for the Pomodoro Sessions database."""
    return [
        {
            "name": "Today's Sessions",
            "type": "table",
            "filter": {
                "property": "Date",
                "date": {"equals": "today"},
            },
            "visible_properties": [
                "Session", "Task", "Duration (min)", "Type", "Completed",
            ],
        },
        {
            "name": "Calendar",
            "type": "calendar",
            "calendar_by": "Date",
        },
    ]


def get_all_views():
    """Get all view configurations keyed by database name."""
    return {
        'tasks': get_tasks_views(),
        'projects': get_projects_views(),
        'goals': get_goals_views(),
        'inbox': get_inbox_views(),
        'habits': get_habits_views(),
        'habit_logs': get_habit_logs_views(),
        'journal': get_journal_views(),
        'finance_accounts': get_finance_accounts_views(),
        'finance_transactions': get_finance_transactions_views(),
        'finance_budgets': get_finance_budgets_views(),
        'workouts': get_workouts_views(),
        'body_metrics': get_body_metrics_views(),
        'meals': get_meals_views(),
        'notes': get_notes_views(),
        'reading': get_reading_views(),
        'weekly_reviews': get_weekly_reviews_views(),
        'pomodoro': get_pomodoro_views(),
    }
