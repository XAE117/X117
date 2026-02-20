#!/usr/bin/env python3
"""One-time fix: add missing properties to the Areas database in Notion."""
import json
from notion_client import Client

config = json.load(open('notion_config.json'))
client = Client(auth=config['api_key'])
areas_db_id = config['database_ids']['areas']

print("Adding missing properties to Areas database...")
client.databases.update(
    database_id=areas_db_id,
    properties={
        "Area Description": {"rich_text": {}},
        "Icon Emoji": {"rich_text": {}},
        "Sort Order": {"number": {"format": "number"}},
    },
)
print("Properties added.")

# Now push areas
from lifeos.core import LifeOS
from lifeos.notion.sync import NotionSync

life = LifeOS()
sync = NotionSync(api_key=config['api_key'], db=life.db)
sync.load_database_ids(config['database_ids'])
print(f"Areas pushed: {sync.push_areas()}")
