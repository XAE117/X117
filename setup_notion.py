#!/usr/bin/env python3
"""
LifeOS Notion Setup Wizard.

Interactive script that sets up the complete LifeOS workspace in
your Notion account. Creates all databases, wires relations,
adds formula properties, builds dashboard pages, and optionally
pushes existing local data.

Usage:
    python setup_notion.py

Requirements:
    pip install notion-client

Before running:
    1. Go to notion.so/my-integrations and create an integration
    2. Copy the API key (starts with secret_)
    3. Create a blank page in Notion for the LifeOS workspace
    4. Share that page with your integration (... -> Connections)
    5. Copy the page ID from the URL (32-char hex after page title)
"""

import sys
import json
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def main():
    print()
    print("=" * 60)
    print("  LifeOS Notion Setup Wizard")
    print("  Build your Life Operating System in Notion")
    print("=" * 60)
    print()

    # Check dependencies
    try:
        from notion_client import Client
    except ImportError:
        print("ERROR: notion-client is not installed.")
        print("Run: pip install notion-client")
        sys.exit(1)

    # Get API key
    api_key = os.environ.get('NOTION_API_KEY', '')
    if not api_key:
        print("Enter your Notion integration API key")
        print("(Create one at notion.so/my-integrations)")
        api_key = input("API Key: ").strip()

    if not api_key.startswith('secret_') and not api_key.startswith('ntn_'):
        print("WARNING: API key doesn't look like a Notion key.")
        confirm = input("Continue anyway? (y/n): ").strip().lower()
        if confirm != 'y':
            sys.exit(1)

    # Test connection
    print("\nTesting Notion connection...")
    try:
        client = Client(auth=api_key)
        me = client.users.me()
        print(f"Connected as: {me.get('name', 'Unknown')}")
    except Exception as e:
        print(f"ERROR: Could not connect to Notion: {e}")
        sys.exit(1)

    # Get parent page ID
    print("\nEnter the Notion page ID where LifeOS should be created.")
    print("(The 32-character hex string from the page URL)")
    print("Example: https://notion.so/My-Page-abc123def456... -> abc123def456...")
    parent_page_id = input("Page ID: ").strip()

    # Clean up page ID (remove hyphens, extract from URL if needed)
    parent_page_id = parent_page_id.replace('-', '')
    if '/' in parent_page_id:
        parent_page_id = parent_page_id.split('/')[-1].split('?')[0]
    if len(parent_page_id) > 32:
        parent_page_id = parent_page_id[-32:]

    # Format as UUID
    if len(parent_page_id) == 32 and '-' not in parent_page_id:
        parent_page_id = (
            f"{parent_page_id[:8]}-{parent_page_id[8:12]}-"
            f"{parent_page_id[12:16]}-{parent_page_id[16:20]}-"
            f"{parent_page_id[20:]}"
        )

    print(f"\nFormatted page ID: {parent_page_id}")

    # Confirm
    print("\nThis will create the following in your Notion workspace:")
    print("  Databases (18):")
    print("    Core:      Areas, Goals, Projects, Master Tasks, Inbox")
    print("    Lifestyle: Habits, Habit Logs, Daily Journal")
    print("    Finance:   Accounts, Transactions, Budgets")
    print("    Fitness:   Workouts, Body Metrics, Meals")
    print("    Knowledge: Notes, Reading Tracker")
    print("    System:    Weekly Reviews, Pomodoro Sessions")
    print()
    print("  Dashboards (6):")
    print("    Command Center, Weekly Review, Life Areas,")
    print("    Finance, Fitness, Knowledge Hub")
    print()

    confirm = input("Proceed? (y/n): ").strip().lower()
    if confirm != 'y':
        print("Aborted.")
        sys.exit(0)

    # Initialize LifeOS
    from lifeos.core import LifeOS
    from lifeos.notion.sync import NotionSync

    print("\nInitializing LifeOS...")
    life = LifeOS()
    life.setup()

    print("Creating Notion workspace...")
    sync = NotionSync(api_key=api_key, db=life.db)

    # Phase 1: Create databases
    try:
        database_ids = sync.setup_workspace(parent_page_id)
    except Exception as e:
        print(f"\nERROR creating databases: {e}")
        print("Make sure you've shared the page with your integration.")
        sys.exit(1)

    # Phase 2: Create dashboards
    print("\nCreating dashboard pages...")
    try:
        dashboard_ids = sync.setup_dashboards(parent_page_id)
        print(f"Created {len(dashboard_ids)} dashboards.")
    except Exception as e:
        print(f"WARNING: Dashboard creation failed: {e}")
        print("You can create dashboards manually later.")
        dashboard_ids = {}

    # Phase 3: Push initial data
    print()
    push = input("Push existing local data to Notion? (y/n): ").strip().lower()
    if push == 'y':
        print("\nPushing data to Notion...")
        summary = sync.push_all()
        print("\nPush summary:")
        for name, count in summary.items():
            print(f"  {name}: {count}")

    # Save configuration
    config_path = os.path.join(os.path.dirname(__file__), 'notion_config.json')
    config = {
        'api_key': api_key,
        'parent_page_id': parent_page_id,
        'database_ids': database_ids,
        'dashboard_ids': dashboard_ids,
    }
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)
    print(f"\nConfiguration saved to: {config_path}")

    # Also save to LifeOS config
    life.config.notion_api_key = api_key
    life.config.notion_workspace_id = parent_page_id
    life.config.save()

    # Export schema
    schema_path = os.path.join(os.path.dirname(__file__), 'notion_schema_export.json')
    sync.export_schema_json(schema_path)
    print(f"Schema exported to: {schema_path}")

    print()
    print("=" * 60)
    print("  Setup Complete!")
    print("=" * 60)
    print()
    print("Your LifeOS workspace is ready in Notion.")
    print()
    print("Next steps:")
    print("  1. Open Notion and find your LifeOS page")
    print("  2. Start with the Command Center dashboard")
    print("  3. Customize views and add your own data")
    print()
    print("To sync data later:")
    print("  from lifeos.core import LifeOS")
    print("  from lifeos.notion.sync import NotionSync")
    print("  import json")
    print()
    print("  life = LifeOS()")
    print("  config = json.load(open('notion_config.json'))")
    print("  sync = NotionSync(api_key=config['api_key'], db=life.db)")
    print("  sync.load_database_ids(config['database_ids'])")
    print("  sync.push_all()  # or sync.pull_all()")
    print()


if __name__ == '__main__':
    main()
