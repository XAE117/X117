"""
Notion Dashboard Page Templates.

Creates pre-built dashboard pages in the Notion workspace that embed
linked views of the LifeOS databases. These are the "home screens"
you open daily.

Templates:
    1. Command Center - Main daily dashboard
    2. Weekly Review - GTD weekly review template
    3. Life Areas Dashboard - Area health overview
    4. Finance Dashboard - Net worth and budget overview
    5. Fitness Dashboard - Workout and metrics overview
    6. Knowledge Hub - Notes and reading overview
"""


def get_command_center_blocks(database_ids):
    """
    Generate Notion blocks for the Command Center dashboard page.

    This is the main daily-driver page with:
    - Inbox count
    - Today's tasks
    - Active projects summary
    - Habits checklist
    - Quick capture button
    """
    blocks = [
        _heading1("🎛️ Command Center"),
        _callout("Your daily cockpit. Process inbox, execute tasks, track habits.", "🚀"),
        _divider(),
        _heading2("📥 Inbox"),
        _linked_database(database_ids.get('inbox'), "Unprocessed"),
        _divider(),
        _heading2("✅ Today's Focus"),
        _linked_database(database_ids.get('tasks'), "Today's Focus"),
        _divider(),
        _heading2("⚠️ Overdue"),
        _linked_database(database_ids.get('tasks'), "Overdue"),
        _divider(),
        _columns([
            [
                _heading3("📁 Active Projects"),
                _linked_database(database_ids.get('projects'), "Active Projects"),
            ],
            [
                _heading3("🔄 Habits"),
                _linked_database(database_ids.get('habits'), "Active Habits"),
            ],
        ]),
        _divider(),
        _heading2("🎯 Goals at a Glance"),
        _linked_database(database_ids.get('goals'), "Active Goals"),
    ]
    return blocks


def get_weekly_review_blocks(database_ids):
    """
    Generate Notion blocks for the Weekly Review template page.

    Follows the GTD weekly review checklist:
    1. Get Clear (collect, process, organize)
    2. Get Current (review actions, projects, goals)
    3. Get Creative (brainstorm, plan next week)
    """
    blocks = [
        _heading1("📝 Weekly Review"),
        _callout(
            "Complete this every week to stay on top of your life system. "
            "Block 60-90 minutes of uninterrupted time.",
            "📋"
        ),
        _divider(),

        # Phase 1: Get Clear
        _heading2("Phase 1: Get Clear"),
        _todo("Collect all loose papers, notes, and digital captures"),
        _todo("Process physical inbox to zero"),
        _todo("Process email inbox to zero"),
        _todo("Process LifeOS digital inbox:"),
        _linked_database(database_ids.get('inbox'), "Unprocessed"),
        _divider(),

        # Phase 2: Get Current
        _heading2("Phase 2: Get Current"),
        _heading3("Review Next Actions"),
        _linked_database(database_ids.get('tasks'), "Next Actions"),
        _heading3("Review Waiting For"),
        _linked_database(database_ids.get('tasks'), "Waiting For"),
        _heading3("Review Active Projects"),
        _linked_database(database_ids.get('projects'), "Active Projects"),
        _todo("Does each project have a clear next action?"),
        _todo("Are any projects stalled or no longer relevant?"),
        _heading3("Review Goals"),
        _linked_database(database_ids.get('goals'), "Active Goals"),
        _todo("Are goals on track? Update progress values."),
        _heading3("Review Someday/Maybe"),
        _linked_database(database_ids.get('tasks'), "Someday / Maybe"),
        _todo("Promote anything to active? Delete anything stale?"),
        _divider(),

        # Phase 3: Get Creative
        _heading2("Phase 3: Get Creative"),
        _heading3("Wins This Week"),
        _paragraph(""),
        _heading3("Challenges"),
        _paragraph(""),
        _heading3("Lessons Learned"),
        _paragraph(""),
        _heading3("Next Week Priorities"),
        _numbered_list([
            "Priority 1: ",
            "Priority 2: ",
            "Priority 3: ",
        ]),
        _heading3("Overall Rating (1-10)"),
        _paragraph(""),
        _divider(),

        # Save review
        _heading2("Save Review"),
        _linked_database(database_ids.get('weekly_reviews'), "All Reviews"),
    ]
    return blocks


def get_life_areas_blocks(database_ids):
    """
    Generate Notion blocks for the Life Areas Dashboard.

    Shows each life pillar with linked projects, goals, and habits.
    """
    blocks = [
        _heading1("🏛️ Life Areas Dashboard"),
        _callout(
            "Each area is a pillar of your life that needs ongoing attention. "
            "No deadlines - just continuous maintenance and improvement.",
            "🌟"
        ),
        _divider(),
        _linked_database(database_ids.get('areas'), "All Accounts"),
        _divider(),
        _heading2("📁 Projects by Area"),
        _linked_database(database_ids.get('projects'), "By Area"),
        _divider(),
        _heading2("🎯 Goals by Area"),
        _linked_database(database_ids.get('goals'), "By Area"),
        _divider(),
        _heading2("🔄 Habits by Area"),
        _linked_database(database_ids.get('habits'), "By Area"),
    ]
    return blocks


def get_finance_dashboard_blocks(database_ids):
    """
    Generate Notion blocks for the Finance Dashboard.
    """
    blocks = [
        _heading1("💰 Finance Dashboard"),
        _callout("Track your money. Net worth, budgets, and transactions.", "🏦"),
        _divider(),
        _heading2("🏦 Accounts"),
        _linked_database(database_ids.get('finance_accounts'), "All Accounts"),
        _divider(),
        _heading2("📋 Budgets"),
        _linked_database(database_ids.get('finance_budgets'), "This Month"),
        _divider(),
        _heading2("💳 Recent Transactions"),
        _linked_database(database_ids.get('finance_transactions'), "Recent Transactions"),
        _divider(),
        _columns([
            [
                _heading3("Income"),
                _linked_database(database_ids.get('finance_transactions'), "Income"),
            ],
            [
                _heading3("Expenses"),
                _linked_database(database_ids.get('finance_transactions'), "Expenses"),
            ],
        ]),
    ]
    return blocks


def get_fitness_dashboard_blocks(database_ids):
    """
    Generate Notion blocks for the Fitness Dashboard.
    """
    blocks = [
        _heading1("💪 Fitness Dashboard"),
        _callout("Physical optimization tracking. Workouts, metrics, nutrition.", "🏋️"),
        _divider(),
        _heading2("🏋️ Recent Workouts"),
        _linked_database(database_ids.get('workouts'), "Recent Workouts"),
        _divider(),
        _heading2("📈 Body Metrics"),
        _linked_database(database_ids.get('body_metrics'), "Timeline"),
        _divider(),
        _heading2("🍽️ Today's Meals"),
        _linked_database(database_ids.get('meals'), "Today"),
        _divider(),
        _heading2("Workout Calendar"),
        _linked_database(database_ids.get('workouts'), "Calendar"),
    ]
    return blocks


def get_knowledge_hub_blocks(database_ids):
    """
    Generate Notion blocks for the Knowledge Hub dashboard.
    """
    blocks = [
        _heading1("🧠 Knowledge Hub"),
        _callout("Your second brain. Notes, reading, and learning.", "📚"),
        _divider(),
        _columns([
            [
                _heading2("📝 Recent Notes"),
                _linked_database(database_ids.get('notes'), "All Notes"),
            ],
            [
                _heading2("📚 Reading"),
                _linked_database(database_ids.get('reading'), "Reading Board"),
            ],
        ]),
        _divider(),
        _heading2("⭐ Starred Notes"),
        _linked_database(database_ids.get('notes'), "Starred"),
        _divider(),
        _heading2("📖 Currently Reading"),
        _linked_database(database_ids.get('reading'), "Currently Reading"),
    ]
    return blocks


def get_all_dashboard_configs():
    """Get all dashboard template configurations."""
    return {
        'command_center': {
            'title': '🎛️ Command Center',
            'icon': '🎛️',
            'builder': get_command_center_blocks,
        },
        'weekly_review': {
            'title': '📝 Weekly Review',
            'icon': '📝',
            'builder': get_weekly_review_blocks,
        },
        'life_areas': {
            'title': '🏛️ Life Areas',
            'icon': '🏛️',
            'builder': get_life_areas_blocks,
        },
        'finance': {
            'title': '💰 Finance',
            'icon': '💰',
            'builder': get_finance_dashboard_blocks,
        },
        'fitness': {
            'title': '💪 Fitness',
            'icon': '💪',
            'builder': get_fitness_dashboard_blocks,
        },
        'knowledge': {
            'title': '🧠 Knowledge Hub',
            'icon': '🧠',
            'builder': get_knowledge_hub_blocks,
        },
    }


# ============================================================================
# Block Builder Helpers (Notion API block format)
# ============================================================================

def _heading1(text):
    return {
        "object": "block",
        "type": "heading_1",
        "heading_1": {
            "rich_text": [{"type": "text", "text": {"content": text}}]
        },
    }


def _heading2(text):
    return {
        "object": "block",
        "type": "heading_2",
        "heading_2": {
            "rich_text": [{"type": "text", "text": {"content": text}}]
        },
    }


def _heading3(text):
    return {
        "object": "block",
        "type": "heading_3",
        "heading_3": {
            "rich_text": [{"type": "text", "text": {"content": text}}]
        },
    }


def _paragraph(text):
    return {
        "object": "block",
        "type": "paragraph",
        "paragraph": {
            "rich_text": [{"type": "text", "text": {"content": text}}]
        },
    }


def _callout(text, icon="💡"):
    return {
        "object": "block",
        "type": "callout",
        "callout": {
            "rich_text": [{"type": "text", "text": {"content": text}}],
            "icon": {"type": "emoji", "emoji": icon},
        },
    }


def _divider():
    return {"object": "block", "type": "divider", "divider": {}}


def _todo(text, checked=False):
    return {
        "object": "block",
        "type": "to_do",
        "to_do": {
            "rich_text": [{"type": "text", "text": {"content": text}}],
            "checked": checked,
        },
    }


def _numbered_list(items):
    """Generate numbered list items (returns first item; rest appended)."""
    return {
        "object": "block",
        "type": "numbered_list_item",
        "numbered_list_item": {
            "rich_text": [{"type": "text", "text": {"content": items[0]}}],
        },
    }


def _linked_database(database_id, view_name=None):
    """
    Create a linked database block.

    Note: Notion API doesn't support creating linked database views
    with specific view filters in a single call. This creates the
    embed and the view must be selected manually or via automation.
    """
    if not database_id:
        return _paragraph(f"[Database not configured - set up via setup wizard]")
    return {
        "object": "block",
        "type": "link_to_page",
        "link_to_page": {
            "type": "database_id",
            "database_id": database_id,
        },
    }


def _columns(column_contents):
    """
    Create a column layout.

    Notion API columns require column_list > column > children structure.
    """
    columns = []
    for content_blocks in column_contents:
        columns.append({
            "object": "block",
            "type": "column",
            "column": {"children": content_blocks},
        })

    return {
        "object": "block",
        "type": "column_list",
        "column_list": {"children": columns},
    }
