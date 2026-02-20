#!/usr/bin/env python3
"""
Fix Areas database: delete the broken one, recreate with correct properties,
and push area data.
"""
import json
import httpx

config = json.load(open('notion_config.json'))
api_key = config['api_key']
parent_page_id = config.get('parent_page_id', '30dc051d-73d2-8000-9fca-f1d78df5debf')
headers = {
    "Authorization": f"Bearer {api_key}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
}

old_areas_id = config['database_ids']['areas']

# Step 1: Check existing database with raw HTTP
print("Step 1: Checking existing Areas database with raw API...")
r = httpx.get(f"https://api.notion.com/v1/databases/{old_areas_id}", headers=headers)
data = r.json()
print(f"  Status: {r.status_code}")
print(f"  Keys: {list(data.keys())}")
has_props = 'properties' in data
if has_props:
    print(f"  Properties: {list(data['properties'].keys())}")
else:
    print("  No properties found - database is broken.")

# Step 2: Trash the broken database
print("\nStep 2: Trashing broken Areas database...")
r = httpx.patch(
    f"https://api.notion.com/v1/databases/{old_areas_id}",
    headers=headers,
    json={"in_trash": True},
)
print(f"  Status: {r.status_code}")

# Step 3: Create a new Areas database with correct properties
print("\nStep 3: Creating new Areas database...")
new_db = httpx.post(
    "https://api.notion.com/v1/databases",
    headers=headers,
    json={
        "parent": {"type": "page_id", "page_id": parent_page_id},
        "icon": {"type": "emoji", "emoji": "\U0001f3db\ufe0f"},
        "title": [{"type": "text", "text": {"content": "Areas"}}],
        "properties": {
            "Name": {"title": {}},
            "Area Description": {"rich_text": {}},
            "Icon Emoji": {"rich_text": {}},
            "Sort Order": {"number": {"format": "number"}},
        },
    },
).json()

new_areas_id = new_db.get('id')
print(f"  New database ID: {new_areas_id}")
if 'properties' in new_db:
    print(f"  Properties: {list(new_db['properties'].keys())}")
else:
    print(f"  WARNING: Still no properties. Full response:")
    print(json.dumps(new_db, indent=2, default=str))
    exit(1)

# Step 4: Update config with new database ID
config['database_ids']['areas'] = new_areas_id
with open('notion_config.json', 'w') as f:
    json.dump(config, f, indent=2)
print(f"\n  Updated notion_config.json with new areas ID")

# Step 5: Re-wire relations that point to areas
print("\nStep 4: Re-wiring relations to new Areas database...")
relation_targets = ['goals', 'projects', 'tasks', 'habits', 'notes', 'reading']
for db_name in relation_targets:
    db_id = config['database_ids'].get(db_name)
    if db_id:
        r = httpx.patch(
            f"https://api.notion.com/v1/databases/{db_id}",
            headers=headers,
            json={
                "properties": {
                    "Area": {
                        "relation": {
                            "database_id": new_areas_id,
                            "single_property": {},
                        }
                    }
                }
            },
        )
        status = "ok" if r.status_code == 200 else f"error {r.status_code}"
        print(f"  {db_name}: {status}")

# Step 6: Push areas
print("\nStep 5: Pushing areas data...")
from lifeos.core import LifeOS
from lifeos.notion.sync import NotionSync

life = LifeOS()
sync = NotionSync(api_key=api_key, db=life.db)
sync.load_database_ids(config['database_ids'])
count = sync.push_areas()
print(f"  Areas pushed: {count}")

print("\nDone! Areas database recreated and populated.")
