"""
CLI Dashboard - Interactive command center for the LifeOS.

Provides visual dashboard views and formatted output for the terminal,
serving as the primary interface for interacting with the LifeOS
without requiring a Notion workspace.

Designed with minimalist visual hierarchy following the specification's
UX principles: zero-friction interaction, clear visual anchors, and
mobile-friendly (narrow terminal) layouts.
"""

from datetime import date, timedelta

from .formulas import (
    progress_bar, colored_progress_bar, streak_display,
    overdue_indicator, rollup_area_health,
)


class Dashboard:
    """Renders CLI dashboard views for the LifeOS."""

    DIVIDER = '─' * 60
    DOUBLE_DIVIDER = '═' * 60

    def __init__(self, lifeos):
        """
        Initialize dashboard with a LifeOS instance.

        Args:
            lifeos: The main LifeOS orchestrator instance.
        """
        self.os = lifeos

    def render_home(self):
        """
        Render the main Life Dashboard Overview.

        Shows a high-level summary of all life areas with
        key metrics and action items.
        """
        lines = []
        lines.append(self.DOUBLE_DIVIDER)
        lines.append(self._center('LIFE OPERATING SYSTEM'))
        lines.append(self._center(date.today().strftime('%A, %B %d, %Y')))
        lines.append(self.DOUBLE_DIVIDER)

        # Quick stats bar
        task_stats = self.os.tasks.get_stats()
        inbox_count = self.os.inbox.count_unprocessed()
        lines.append('')
        lines.append(f"  📥 Inbox: {inbox_count}    "
                     f"⚡ Actions: {task_stats['next_actions']}    "
                     f"⏳ Waiting: {task_stats['waiting']}    "
                     f"⚠️  Overdue: {task_stats['overdue']}")
        lines.append('')
        lines.append(self.DIVIDER)

        # Today's focus
        lines.append('')
        lines.append('  📌 TODAY\'S FOCUS')
        lines.append('')
        today_tasks = self.os.tasks.get_today()
        if today_tasks:
            for task in today_tasks[:5]:
                priority_icon = self._priority_icon(task['priority'])
                status_icon = '☐' if task['status'] != 'done' else '☑'
                lines.append(f"    {status_icon} {priority_icon} {task['title']}")
        else:
            in_progress = self.os.tasks.get_in_progress()
            next_actions = self.os.tasks.get_next_actions()
            shown = (in_progress + next_actions)[:5]
            if shown:
                for task in shown:
                    priority_icon = self._priority_icon(task['priority'])
                    lines.append(f"    ☐ {priority_icon} {task['title']}")
            else:
                lines.append('    No tasks scheduled for today')

        lines.append('')
        lines.append(self.DIVIDER)

        # Life areas overview
        lines.append('')
        lines.append('  🏛️  LIFE AREAS')
        lines.append('')
        areas = self.os.areas.get_all()
        for area in areas:
            health = rollup_area_health(self.os.db, area['id'])
            active_count = health['active_task_count']
            lines.append(
                f"    {area['icon']} {area['name']:<25} "
                f"Tasks: {active_count:<4}"
            )

        lines.append('')
        lines.append(self.DIVIDER)

        # Active projects
        lines.append('')
        lines.append('  📁 ACTIVE PROJECTS')
        lines.append('')
        projects = self.os.projects.get_active()[:5]
        if projects:
            for project in projects:
                prog = self.os.projects.get_progress(project['id'])
                bar = progress_bar(prog['progress_pct'], width=15)
                lines.append(f"    {project['name']:<30} {bar}")
        else:
            lines.append('    No active projects')

        lines.append('')
        lines.append(self.DIVIDER)

        # Habits today
        lines.append('')
        lines.append('  🔄 HABITS TODAY')
        lines.append('')
        habit_status = self.os.habits.get_today_status()
        if habit_status:
            for hs in habit_status:
                habit = hs['habit']
                done = '✅' if hs['logged_today'] else '⬜'
                streak = hs['current_streak']
                streak_str = f" 🔥{streak}d" if streak > 0 else ''
                lines.append(f"    {done} {habit['icon']} {habit['name']}{streak_str}")
        else:
            lines.append('    No habits configured')

        lines.append('')
        lines.append(self.DOUBLE_DIVIDER)

        return '\n'.join(lines)

    def render_inbox(self):
        """Render the inbox view with unprocessed items."""
        lines = []
        lines.append(self.DIVIDER)
        lines.append('  📥 INBOX')
        lines.append(self.DIVIDER)

        items = self.os.inbox.get_unprocessed()
        if not items:
            lines.append('')
            lines.append('  Inbox is empty! 🎉')
        else:
            lines.append(f'  {len(items)} items to process')
            lines.append('')
            for item in items:
                type_icon = {
                    'thought': '💭', 'task': '✅', 'note': '📝',
                    'resource': '🔗', 'idea': '💡', 'reminder': '⏰',
                }.get(item['type'], '📋')
                lines.append(f"    [{item['id']:>3}] {type_icon} {item['content']}")
                if item['source']:
                    lines.append(f"         Source: {item['source']}")

        lines.append('')
        lines.append(self.DIVIDER)
        return '\n'.join(lines)

    def render_tasks(self, view='next_actions'):
        """Render task views based on GTD categories."""
        lines = []
        lines.append(self.DIVIDER)

        view_config = {
            'next_actions': ('⚡ NEXT ACTIONS', self.os.tasks.get_next_actions),
            'today': ('📌 TODAY', self.os.tasks.get_today),
            'in_progress': ('🔄 IN PROGRESS', self.os.tasks.get_in_progress),
            'waiting': ('⏳ WAITING FOR', self.os.tasks.get_waiting_for),
            'someday': ('💭 SOMEDAY / MAYBE', self.os.tasks.get_someday_maybe),
            'overdue': ('⚠️  OVERDUE', self.os.tasks.get_overdue),
        }

        title, getter = view_config.get(view, view_config['next_actions'])
        lines.append(f'  {title}')
        lines.append(self.DIVIDER)

        tasks = getter()
        if not tasks:
            lines.append('')
            lines.append('  No items in this view')
        else:
            lines.append(f'  {len(tasks)} items')
            lines.append('')
            for task in tasks:
                priority = self._priority_icon(task['priority'])
                due = ''
                if task['due_date']:
                    _, _, due_str = overdue_indicator(task['due_date'])
                    due = f" | {due_str}" if due_str else ''

                project_str = ''
                if task['project_id']:
                    project = self.os.projects.get(task['project_id'])
                    if project:
                        project_str = f" [{project['name']}]"

                context_str = f" @{task['context']}" if task['context'] else ''
                waiting_str = f" ← {task['waiting_for']}" if task.get('waiting_for') else ''

                lines.append(
                    f"    [{task['id']:>3}] {priority} {task['title']}"
                    f"{project_str}{context_str}{waiting_str}{due}"
                )

        lines.append('')
        lines.append(self.DIVIDER)
        return '\n'.join(lines)

    def render_projects(self):
        """Render the projects overview with progress bars."""
        lines = []
        lines.append(self.DIVIDER)
        lines.append('  📁 PROJECTS')
        lines.append(self.DIVIDER)

        projects_with_progress = self.os.projects.get_all_with_progress(
            status_filter=['not_started', 'in_progress', 'on_hold']
        )

        if not projects_with_progress:
            lines.append('')
            lines.append('  No active projects')
        else:
            lines.append(f'  {len(projects_with_progress)} active projects')
            lines.append('')
            for p in projects_with_progress:
                status_icon = {
                    'not_started': '⬜', 'in_progress': '🔵',
                    'on_hold': '🟡', 'completed': '✅',
                }.get(p['status'], '⬜')

                bar = progress_bar(p['progress_pct'], width=15)
                due = ''
                if p.get('due_date'):
                    _, _, due_str = overdue_indicator(p['due_date'])
                    due = f" | {due_str}"

                lines.append(f"    {status_icon} {p['name']:<25} {bar}{due}")
                lines.append(
                    f"       Tasks: {p['completed_tasks']}/{p['total_tasks']}"
                )

        lines.append('')
        lines.append(self.DIVIDER)
        return '\n'.join(lines)

    def render_goals(self):
        """Render the Rolling Goal Hub."""
        lines = []
        lines.append(self.DIVIDER)
        lines.append('  🎯 GOALS')
        lines.append(self.DIVIDER)

        hub = self.os.goals.get_rolling_hub()

        if not hub:
            lines.append('')
            lines.append('  No active goals')
        else:
            lines.append(f'  {len(hub)} active goals')
            lines.append('')
            for entry in hub:
                goal = entry['goal']
                progress = entry['progress']
                area = entry['area']

                status_icon = {
                    'not_started': '⬜', 'in_progress': '🔵',
                    'on_track': '🟢', 'at_risk': '🔴',
                }.get(goal['status'], '⬜')

                area_str = f" ({area['icon']} {area['name']})" if area else ''
                bar = progress_bar(progress['value_progress'], width=15)

                lines.append(f"    {status_icon} {goal['title']}{area_str}")
                lines.append(f"       {bar}")

                if goal['target_value']:
                    lines.append(
                        f"       {goal['current_value'] or 0}/{goal['target_value']} "
                        f"{goal['unit'] or ''}"
                    )
                if goal['target_date']:
                    _, _, due_str = overdue_indicator(goal['target_date'])
                    if due_str:
                        lines.append(f"       {due_str}")
                lines.append('')

        lines.append(self.DIVIDER)
        return '\n'.join(lines)

    def render_habits(self):
        """Render the habits overview with streaks."""
        lines = []
        lines.append(self.DIVIDER)
        lines.append('  🔄 HABITS')
        lines.append(self.DIVIDER)

        habits_data = self.os.habits.get_all_with_stats()

        if not habits_data:
            lines.append('')
            lines.append('  No habits configured')
        else:
            lines.append(f'  {len(habits_data)} habits tracked')
            lines.append('')
            for hd in habits_data:
                habit = hd['habit']
                done = '✅' if hd['logged_today'] else '⬜'
                streak_str = streak_display(hd['current_streak'], hd['longest_streak'])
                rate = hd['completion_rate_30d']

                lines.append(f"    {done} {habit['icon']} {habit['name']}")
                lines.append(f"       {streak_str} | 30d: {rate}%")

        lines.append('')
        lines.append(self.DIVIDER)
        return '\n'.join(lines)

    def render_finance(self):
        """Render the finance overview."""
        lines = []
        lines.append(self.DIVIDER)
        lines.append('  💰 FINANCE HUB')
        lines.append(self.DIVIDER)

        stats = self.os.finance.get_stats()
        lines.append('')
        lines.append(f"  Net Worth:      ${stats['net_worth']:,.2f}")
        lines.append(f"  Monthly Income: ${stats['monthly_income']:,.2f}")
        lines.append(f"  Monthly Spend:  ${stats['monthly_expenses']:,.2f}")
        lines.append(f"  Savings Rate:   {stats['savings_rate']}%")

        # Budget status
        budget_status = self.os.finance.get_budget_status()
        if budget_status:
            lines.append('')
            lines.append('  Budget Status:')
            for b in budget_status:
                bar = progress_bar(b['pct_used'], width=10)
                lines.append(f"    {b['category']:<15} {bar} (${b['remaining']:,.0f} left)")

        lines.append('')
        lines.append(self.DIVIDER)
        return '\n'.join(lines)

    def render_weekly_review(self):
        """Render the weekly review preparation dashboard."""
        lines = []
        lines.append(self.DOUBLE_DIVIDER)
        lines.append(self._center('WEEKLY REVIEW'))
        lines.append(self._center(date.today().strftime('%B %d, %Y')))
        lines.append(self.DOUBLE_DIVIDER)

        review_data = self.os.automations.prepare_weekly_review()

        lines.append('')
        lines.append('  GTD Review Checklist:')
        lines.append('')
        lines.append(f"    ☐ Process Inbox ({review_data['inbox_count']} items)")
        lines.append(f"    ☐ Review Next Actions ({review_data['next_actions']} items)")
        lines.append(f"    ☐ Review Waiting For ({review_data['waiting_for']} items)")
        lines.append(f"    ☐ Review Active Projects ({review_data['active_projects']} projects)")
        lines.append(f"    ☐ Review Someday/Maybe ({review_data['someday_items']} items)")
        lines.append('')
        lines.append(self.DIVIDER)
        lines.append('')
        lines.append('  This Week\'s Stats:')
        lines.append(f"    ✅ Tasks Completed: {review_data['completed_this_week']}")
        lines.append(f"    ⚠️  Overdue Tasks: {review_data['overdue_tasks']}")
        lines.append(f"    🚧 Stalled Projects: {review_data['stalled_projects']}")
        lines.append(f"    🔴 At-Risk Goals: {review_data['at_risk_goals']}")

        lines.append('')
        lines.append(self.DOUBLE_DIVIDER)
        return '\n'.join(lines)

    def render_system_health(self):
        """Render system health and maintenance indicators."""
        lines = []
        lines.append(self.DIVIDER)
        lines.append('  🔧 SYSTEM HEALTH')
        lines.append(self.DIVIDER)

        inbox = self.os.inbox.count_unprocessed()
        overdue = self.os.tasks.get_stats()['overdue']
        archived = self.os.db.count('archive')

        lines.append('')
        lines.append(f"  Unprocessed Inbox: {inbox}")
        lines.append(f"  Overdue Tasks:     {overdue}")
        lines.append(f"  Archived Items:    {archived}")

        # Data counts
        lines.append('')
        lines.append('  Database Sizes:')
        tables = ['areas', 'goals', 'projects', 'tasks', 'habits',
                   'habit_logs', 'journal_entries', 'notes', 'reading_list',
                   'finance_transactions', 'workouts']
        for table in tables:
            count = self.os.db.count(table)
            lines.append(f"    {table:<25} {count:>6} rows")

        lines.append('')
        lines.append(self.DIVIDER)
        return '\n'.join(lines)

    # ========================================================================
    # Helper Methods
    # ========================================================================

    @staticmethod
    def _priority_icon(priority):
        """Get icon for priority level."""
        icons = {
            'critical': '🔴',
            'high': '🟠',
            'medium': '🟡',
            'low': '🔵',
            'none': '⚪',
        }
        return icons.get(priority, '⚪')

    @staticmethod
    def _center(text, width=60):
        """Center text within a given width."""
        return text.center(width)
