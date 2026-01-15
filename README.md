# Dating Contact Tracker

A simple CLI tool to track your dating connections from various platforms.

## Features

- Track contacts from any dating platform (Tinder, Bumble, Hinge, etc.)
- Record when you first started talking
- See how long you've been talking to each person
- Add notes about important details to remember
- Track last contact date with reminders
- Search through contacts and notes
- Filter by status (active, dating, ghosted, ended)

## Usage

```bash
python3 dating_tracker.py
```

### Commands

| Command | Description |
|---------|-------------|
| `list [status] [platform]` | List all contacts with optional filters |
| `add` | Add a new contact (interactive) |
| `view <id>` | View detailed contact info and notes |
| `update <id>` | Update contact information |
| `delete <id>` | Delete a contact |
| `note <id> <text>` | Add a note to a contact |
| `contacted <id> [date]` | Mark contact as contacted |
| `search <term>` | Search contacts by name or notes |
| `reminders` | Show contacts to reach out to |
| `help` | Show help message |
| `quit` | Exit the program |

### Example Session

```
> add
Name: Sarah
Platform (Tinder/Bumble/Hinge/etc.): Tinder
Phone number (optional): 555-1234
First contact date (YYYY-MM-DD, or press Enter for today): 2025-12-01
Status (active/dating/ghosted/ended) [active]: active
Add an initial note? Likes hiking and coffee

> list
ID   Name                 Platform     Talking For     Last Contact    Status
1    Sarah                Tinder       1 month         1 month ago     active

> note 1 Works as a nurse at the hospital downtown

> view 1
  CONTACT DETAILS - ID: 1
  Name:              Sarah
  Platform:          Tinder
  ...
  NOTES:
  [2025-01-15 10:30:00] Likes hiking and coffee
  [2025-01-15 10:35:00] Works as a nurse at the hospital downtown

> contacted 1
  Last contact date set to: 2025-01-15
```

## Requirements

- Python 3.6+
- No external dependencies (uses built-in sqlite3)

## Data Storage

All data is stored locally in a SQLite database file (`contacts.db`) in the same directory as the script.
