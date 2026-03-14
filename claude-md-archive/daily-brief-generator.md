# Claude Code Prompt — Daily Brief Generator
**Notion Source:** `30cc051d-73d2-81c6-9574-e5a01695b54a`
**Notion URL:** https://www.notion.so/30cc051d73d281c69574e5a01695b54a
**Last synced:** 2026-03-14
**Sync method:** Claude Code full crawl

---

# Claude Code Prompt — Daily Brief Generator

*Phase: LifeOS Intelligence Layer | Generated: Feb 19, 2026*

---

## Context

James has a functioning LifeOS in Notion with the following live databases:

- **Contact CRM** (`collection://5db814ff-4334-4669-ab3c-35b44275f88b`) — contacts with Last Contact date, Ideal Cadence, Status
- **Weekly Page** (`309c051d-73d2-816f-a073-e70ab6adac4b`) — active missions, rituals, financial alerts
- **Claude Context Master** (`30bc051d-73d2-81d3-8d56-ffb659271e9b`) — source of truth for project statuses
- **Time Intelligence** (`306c051d-73d2-81fc-9037-cb24ec4d430d`) — Toggl-synced time log
The goal is a **Daily Brief** — a Notion page generated each morning that gives James a single place to start his day. He is autistic + ADHD. Initiation barriers are the enemy. The brief must be frictionless to open and immediately actionable.

---

## What to Build

### 1. Daily Brief Notion Template Page

Create a reusable Notion page template titled `📋 Daily Brief — [DATE]` with the following sections, auto-populated via script:

**Sections:**

```javascript
🔋 Energy Level (input at open): [ ] High  [ ] Medium  [ ] Low

📌 Top 3 Today
(3 tasks pulled from active projects — highest momentum, lowest resistance)

💬 Texts to Send
(contacts where: Status = Active, Ideal Cadence ≠ As Needed, days since Last Contact >= cadence threshold)

⚡ Quick Wins
(tasks < 15 min — sourced from weekly page Quick Wins section or manually entered)

📅 Today's Schedule
(pulled from Google Calendar API — today's events only)

💰 Financial Alerts
(any bills due today or within 3 days — from weekly financial section)

🌙 Evening Wrap
- [ ] Log Toggl hours
- [ ] Morning Inventory for tomorrow
- [ ] One thing I completed
- [ ] One thing I avoided (name it)
```

---

### 2. CLI Script: `daily-brief`

Build a Claude Code CLI script that:

1. **Reads** the Contact CRM — calculates overdue contacts based on Last Contact + cadence, filters out `As Needed` and `Dormant`
1. **Reads** the current Week page — pulls active missions sorted by % complete (highest first, as momentum is there)
1. **Reads** Google Calendar for today's events (requires Calendar API credentials already configured)
1. **Checks** financial alerts due within 3 days from the week page
1. **Creates** a new Notion page under the Time Intelligence section titled `📋 Daily Brief — [TODAY'S DATE]`
1. **Populates** all sections with live data
1. **Outputs** the Notion page URL to terminal so James can open it in one click
**Command:** `log brief` or `daily-brief`

---

### 3. Cadence Logic for Overdue Contacts

```python
cadence_days = {
    "Daily": 1,
    "Weekly": 7,
    "Biweekly": 14,
    "Monthly": 30,
    "Quarterly": 90,
    "As Needed": None  # skip entirely
}

# A contact is overdue if:
# today - last_contact_date >= cadence_days[cadence]
# AND status == "Active"
# AND cadence != "As Needed"
```

---

### 4. Top 3 Task Selection Logic

From active projects in Claude Context Master:

- Filter: Status = Active
- Sort by: % complete descending (momentum signal), then resistance ascending (low resistance first)
- Select top 3
- Display with next action note
---

### 5. Integration Points

| Data Source | Method | Notes |
| --- | --- | --- |
| Contact CRM | Notion API | Filter by Status=Active, exclude As Needed cadence |
| Week Page | Notion API fetch | Parse active missions + financial alerts |
| Google Calendar | GCal API | Today only, primary calendar |
| Toggl | Toggl API (already configured) | Hours logged today for evening wrap |
| Output | Notion API create page | Under Time Intelligence parent |

---

### 6. Stretch: Morning Trigger

Once the script works manually, configure it to run automatically at 7:00 AM via cron or launchd (macOS). The brief is waiting when James opens his laptop.

```bash
# crontab entry
0 7 * * * /path/to/daily-brief >> /tmp/daily-brief.log 2>&1
```

---

## Success Criteria

- James runs `log brief` and gets a Notion URL in under 5 seconds
- The page opens with real data — actual overdue contacts, actual projects, actual calendar events
- No manual copy-paste required
- The evening wrap section takes < 2 minutes to complete
- After 1 week of daily use, the system has replaced the need to ask Claude "what should I do today"
---

## Notes for Claude Code

- All Notion API keys and Toggl credentials are already configured in the environment
- Existing CLI tools for reference: `log`, `log checkin`, `toggl-sync`, `schedule`
- Follow the same pattern as existing tools for CLI argument parsing
- Write to `/weekly-time-report` pattern for Notion page creation
- James is autistic + ADHD — **the output must be scannable in 30 seconds**. No walls of text. Checkboxes. Short labels. Action-first language.
