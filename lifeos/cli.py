"""
LifeOS CLI - Interactive command-line interface.

Provides an interactive terminal interface for managing the LifeOS.
Designed for zero-friction interaction with commands optimized for
common daily operations.

Usage:
    python -m lifeos.cli           # Start interactive mode
    python -m lifeos.cli dashboard # Show dashboard
    python -m lifeos.cli capture "Buy groceries"  # Quick capture
"""

import sys
import os
from datetime import date, datetime

from .core import LifeOS


def clear_screen():
    """Clear the terminal screen."""
    os.system('cls' if os.name == 'nt' else 'clear')


def print_help():
    """Print available commands."""
    help_text = """
╔══════════════════════════════════════════════════════════════╗
║                    LifeOS Commands                          ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  NAVIGATION                                                  ║
║    home / dashboard    Show the main dashboard               ║
║    inbox               Show unprocessed inbox items          ║
║    tasks [view]        Show tasks (next/today/overdue/       ║
║                        waiting/someday/in_progress)          ║
║    projects            Show active projects                  ║
║    goals               Show goals hub                        ║
║    habits              Show habits overview                  ║
║    finance             Show finance overview                 ║
║    review              Show weekly review prep               ║
║    health              Show system health                    ║
║                                                              ║
║  ACTIONS                                                     ║
║    c / capture <text>  Quick capture to inbox                ║
║    t / task <title>    Create a new task                     ║
║    h / habit <name>    Log a habit for today                 ║
║    j / journal         Open today's journal entry            ║
║                                                              ║
║  MANAGEMENT                                                  ║
║    done <task_id>      Complete a task                       ║
║    process <inbox_id>  Process an inbox item                 ║
║    search <query>      Search across all modules             ║
║    maintain            Run maintenance automations           ║
║    setup               Initialize with default areas         ║
║                                                              ║
║  SYSTEM                                                      ║
║    help                Show this help message                ║
║    quit / exit / q     Exit LifeOS                           ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
"""
    print(help_text)


class LifeOSCLI:
    """Interactive CLI for the LifeOS."""

    def __init__(self, db_path=None):
        self.os = LifeOS(db_path=db_path)
        self.running = True

    def run(self):
        """Start the interactive CLI loop."""
        print()
        print(self.os.dashboard.render_home())
        print()
        print("Type 'help' for available commands.")
        print()

        while self.running:
            try:
                user_input = input("lifeos> ").strip()
                if not user_input:
                    continue
                self.handle_command(user_input)
            except KeyboardInterrupt:
                print("\n\nGoodbye!")
                break
            except EOFError:
                break

    def handle_command(self, input_str):
        """Parse and execute a command."""
        parts = input_str.split(maxsplit=1)
        command = parts[0].lower()
        args = parts[1] if len(parts) > 1 else ''

        commands = {
            'home': self.cmd_home,
            'dashboard': self.cmd_home,
            'inbox': self.cmd_inbox,
            'tasks': self.cmd_tasks,
            'projects': self.cmd_projects,
            'goals': self.cmd_goals,
            'habits': self.cmd_habits,
            'finance': self.cmd_finance,
            'review': self.cmd_review,
            'health': self.cmd_health,
            'c': self.cmd_capture,
            'capture': self.cmd_capture,
            't': self.cmd_new_task,
            'task': self.cmd_new_task,
            'h': self.cmd_log_habit,
            'habit': self.cmd_log_habit,
            'j': self.cmd_journal,
            'journal': self.cmd_journal,
            'done': self.cmd_complete,
            'process': self.cmd_process,
            'search': self.cmd_search,
            'maintain': self.cmd_maintain,
            'setup': self.cmd_setup,
            'help': lambda _: print_help(),
            'quit': self.cmd_quit,
            'exit': self.cmd_quit,
            'q': self.cmd_quit,
        }

        handler = commands.get(command)
        if handler:
            try:
                handler(args)
            except Exception as e:
                print(f"\n  Error: {e}\n")
        else:
            print(f"\n  Unknown command: '{command}'. Type 'help' for options.\n")

    # ========================================================================
    # Navigation Commands
    # ========================================================================

    def cmd_home(self, args):
        """Show the main dashboard."""
        print()
        print(self.os.dashboard.render_home())

    def cmd_inbox(self, args):
        """Show inbox."""
        print()
        print(self.os.dashboard.render_inbox())

    def cmd_tasks(self, args):
        """Show tasks with optional view filter."""
        view = args.strip() if args else 'next_actions'
        valid_views = ['next_actions', 'next', 'today', 'overdue',
                       'waiting', 'someday', 'in_progress']
        if view == 'next':
            view = 'next_actions'
        if view not in valid_views:
            print(f"\n  Valid views: {', '.join(valid_views)}\n")
            return
        print()
        print(self.os.dashboard.render_tasks(view))

    def cmd_projects(self, args):
        """Show projects."""
        print()
        print(self.os.dashboard.render_projects())

    def cmd_goals(self, args):
        """Show goals."""
        print()
        print(self.os.dashboard.render_goals())

    def cmd_habits(self, args):
        """Show habits."""
        print()
        print(self.os.dashboard.render_habits())

    def cmd_finance(self, args):
        """Show finance overview."""
        print()
        print(self.os.dashboard.render_finance())

    def cmd_review(self, args):
        """Show weekly review."""
        print()
        print(self.os.dashboard.render_weekly_review())

    def cmd_health(self, args):
        """Show system health."""
        print()
        print(self.os.dashboard.render_system_health())

    # ========================================================================
    # Action Commands
    # ========================================================================

    def cmd_capture(self, args):
        """Quick capture to inbox."""
        if not args:
            print("\n  Usage: capture <text>\n")
            return
        self.os.quick_capture(args)
        count = self.os.inbox.count_unprocessed()
        print(f"\n  Captured to inbox ({count} items pending)\n")

    def cmd_new_task(self, args):
        """Create a new task."""
        if not args:
            print("\n  Usage: task <title>\n")
            return
        task_id = self.os.tasks.create(args, status='next_action')
        print(f"\n  Task #{task_id} created: {args}\n")

    def cmd_log_habit(self, args):
        """Log a habit for today."""
        if not args:
            # Show habits to pick from
            habits = self.os.habits.get_all()
            if not habits:
                print("\n  No habits configured. Create one first.\n")
                return
            print("\n  Active habits:")
            for h in habits:
                logged = '✅' if self.os.habits.is_logged_today(h['id']) else '⬜'
                print(f"    [{h['id']}] {logged} {h['icon']} {h['name']}")
            print("\n  Usage: habit <id or name>\n")
            return

        # Try to find habit by ID or name
        try:
            habit_id = int(args)
            habit = self.os.habits.get(habit_id)
        except ValueError:
            results = self.os.habits.search(args)
            habit = results[0] if results else None

        if not habit:
            print(f"\n  Habit not found: '{args}'\n")
            return

        self.os.habits.log_today(habit['id'])
        streak = self.os.habits.get_current_streak(habit['id'])
        print(f"\n  Logged: {habit['icon']} {habit['name']} (streak: {streak}d)\n")

    def cmd_journal(self, args):
        """Open today's journal entry."""
        entry = self.os.journal.get_today()
        today = date.today().isoformat()

        if entry:
            print(f"\n  Journal entry for {today}:")
            if entry.get('mood'):
                print(f"    Mood: {entry['mood']}/10")
            if entry.get('energy'):
                print(f"    Energy: {entry['energy']}/10")
            if entry.get('gratitude'):
                print(f"    Gratitude: {entry['gratitude']}")
            if entry.get('daily_highlights'):
                print(f"    Highlights: {entry['daily_highlights']}")
        else:
            print(f"\n  No journal entry for {today}")
            print("  Creating new entry...")

            mood = self._input_optional("  Mood (1-10): ", int)
            energy = self._input_optional("  Energy (1-10): ", int)
            gratitude = self._input_optional("  Gratitude: ")
            intention = self._input_optional("  Today's intention: ")

            self.os.journal.create_entry(
                mood=mood, energy=energy,
                gratitude=gratitude, morning_intention=intention,
            )
            streak = self.os.journal.get_streak()
            print(f"\n  Journal entry created (streak: {streak}d)\n")

    def cmd_complete(self, args):
        """Complete a task by ID."""
        if not args:
            print("\n  Usage: done <task_id>\n")
            return
        try:
            task_id = int(args)
        except ValueError:
            print("\n  Task ID must be a number\n")
            return

        task = self.os.tasks.get(task_id)
        if not task:
            print(f"\n  Task #{task_id} not found\n")
            return

        self.os.tasks.complete(task_id)
        print(f"\n  Completed: {task['title']}")

        # Check if project should auto-complete
        if task.get('project_id'):
            auto = self.os.projects.check_auto_complete(task['project_id'])
            if auto:
                project = self.os.projects.get(task['project_id'])
                print(f"  Project auto-completed: {project['name']}")

        print()

    def cmd_process(self, args):
        """Process an inbox item."""
        if not args:
            print("\n  Usage: process <inbox_id>\n")
            return
        try:
            inbox_id = int(args)
        except ValueError:
            print("\n  Inbox ID must be a number\n")
            return

        items = self.os.inbox.get_unprocessed()
        item = next((i for i in items if i['id'] == inbox_id), None)
        if not item:
            print(f"\n  Inbox item #{inbox_id} not found\n")
            return

        print(f"\n  Item: {item['content']}")
        print(f"  Type: {item['type']}")
        print()
        print("  Actions:")
        print("    1. Convert to task")
        print("    2. Convert to note")
        print("    3. Dismiss")
        print()

        choice = input("  Choice (1-3): ").strip()

        if choice == '1':
            task_id = self.os.inbox.triage_to_task(
                inbox_id, self.os.tasks, title=item['content']
            )
            print(f"\n  Created task #{task_id}\n")
        elif choice == '2':
            note_id = self.os.inbox.triage_to_note(
                inbox_id, self.os.knowledge,
                title=item['content'][:100], content=item['content']
            )
            print(f"\n  Created note #{note_id}\n")
        elif choice == '3':
            self.os.inbox.dismiss(inbox_id)
            print("\n  Item dismissed\n")
        else:
            print("\n  Invalid choice\n")

    def cmd_search(self, args):
        """Search across all modules."""
        if not args:
            print("\n  Usage: search <query>\n")
            return

        results = self.os.search(args)
        total = sum(len(v) for v in results.values())
        print(f"\n  Search results for '{args}': {total} matches\n")

        for category, items in results.items():
            if items:
                print(f"  {category.upper()} ({len(items)}):")
                for item in items[:5]:
                    name = (item.get('title') or item.get('name')
                            or item.get('content', ''))
                    if len(name) > 60:
                        name = name[:57] + '...'
                    print(f"    [{item.get('id', '?'):>3}] {name}")
                if len(items) > 5:
                    print(f"    ... and {len(items) - 5} more")
                print()

    def cmd_maintain(self, args):
        """Run maintenance automations."""
        print("\n  Running maintenance...")
        results = self.os.run_maintenance()
        print(f"  Recurring tasks processed: {results['recurring_tasks']['processed']}")
        print(f"  Tasks archived: {results['auto_archive']['tasks']}")
        print(f"  Projects archived: {results['auto_archive']['projects']}")
        print(f"  Projects auto-completed: {results['status_propagation']['projects_completed']}")
        print(f"  Goals auto-achieved: {results['status_propagation']['goals_achieved']}")
        print(f"  Overdue tasks: {results['overdue_detection']['overdue_tasks']}")
        print(f"  Goals flagged at-risk: {results['goal_risk_check']['goals_flagged_at_risk']}")
        print()

    def cmd_setup(self, args):
        """Initialize with default areas."""
        self.os.setup()
        areas = self.os.areas.get_all()
        print(f"\n  LifeOS initialized with {len(areas)} life areas:")
        for area in areas:
            print(f"    {area['icon']} {area['name']}")
        print()

    def cmd_quit(self, args):
        """Exit the CLI."""
        print("\n  Goodbye!\n")
        self.running = False

    # ========================================================================
    # Helpers
    # ========================================================================

    @staticmethod
    def _input_optional(prompt, cast=None):
        """Get optional input, returning None if empty."""
        value = input(prompt).strip()
        if not value:
            return None
        if cast:
            try:
                return cast(value)
            except (ValueError, TypeError):
                return None
        return value


def main():
    """Entry point for the CLI."""
    args = sys.argv[1:]

    cli = LifeOSCLI()

    if not args:
        # Interactive mode
        cli.run()
    else:
        # Single command mode
        command = ' '.join(args)
        cli.handle_command(command)


if __name__ == '__main__':
    main()
