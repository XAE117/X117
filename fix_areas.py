#!/usr/bin/env python3
"""One-time fix: inspect and repair the Areas database in Notion."""
import json
from notion_client import Client

config = json.load(open('notion_config.json'))
client = Client(auth=config['api_key'])
areas_db_id = config['database_ids']['areas']

# Step 1: See what properties actually exist
print(f"Areas database ID: {areas_db_id}")
print("\nFetching current database schema...")
db = client.databases.retrieve(database_id=areas_db_id)
print("\nRaw response keys:", list(db.keys()))
print("Object type:", db.get('object'))
if 'properties' in db:
    print("\nExisting properties:")
    for name, prop in db['properties'].items():
        print(f"  '{name}' -> type: {prop['type']}")
else:
    print("\nNo 'properties' key! Full response:")
    print(json.dumps(db, indent=2, default=str))

# Step 2: Add missing properties
print("\nAdding missing properties...")
try:
    client.databases.update(
        database_id=areas_db_id,
        properties={
            "Area Description": {"rich_text": {}},
            "Icon Emoji": {"rich_text": {}},
            "Sort Order": {"number": {"format": "number"}},
        },
    )
    print("Update succeeded.")
except Exception as e:
    print(f"Update failed: {e}")

# Step 3: Check again
print("\nProperties after update:")
db2 = client.databases.retrieve(database_id=areas_db_id)
for name, prop in db2['properties'].items():
    print(f"  '{name}' -> type: {prop['type']}")

# Step 4: Try pushing areas using only properties that exist
print("\nAttempting to push areas with only existing properties...")
from lifeos.core import LifeOS
life = LifeOS()
areas = life.db.execute("SELECT * FROM areas WHERE is_active = 1")
existing_props = set(db2['properties'].keys())
print(f"Properties available: {existing_props}")

count = 0
for area in areas:
    props = {"Name": {"title": [{"text": {"content": area['name'] or ''}}]}}
    if "Area Description" in existing_props:
        props["Area Description"] = {"rich_text": [{"text": {"content": area.get('description', '') or ''}}]}
    if "Icon Emoji" in existing_props:
        props["Icon Emoji"] = {"rich_text": [{"text": {"content": area.get('icon', '') or ''}}]}
    if "Status" in existing_props:
        status_type = db2['properties']['Status']['type']
        if status_type == 'status':
            props["Status"] = {"status": {"name": "Active"}}
        elif status_type == 'select':
            props["Status"] = {"select": {"name": "Active"}}
    if "Sort Order" in existing_props:
        props["Sort Order"] = {"number": area.get('sort_order', 0)}

    try:
        client.pages.create(parent={"database_id": areas_db_id}, properties=props)
        count += 1
        print(f"  Pushed: {area['name']}")
    except Exception as e:
        print(f"  Failed '{area['name']}': {e}")

print(f"\nDone. Pushed {count} areas.")
