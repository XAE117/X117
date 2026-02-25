# Project Memory

## Liza Transcript Directory (Notion)

This repo includes tooling for maintaining the **Liza Transcript Directory** — a Notion-based archive of text message transcripts between James and Liza, organized by week.

**Notion Page ID:** `2fec051d-73d2-81e7-aa7f-c66537ad064d`
**Notion API Token:** stored in `.env` as `NOTION_API_KEY`

### Page Structure

```
Liza Transcript Directory
├── Legend: 🔵 = James | ⚪ = Liza | 💗🔥❤️ = reactions | 🎙️ = voice message
├── Structure: One page per week. Full verbatim transcript from screenshots + appendices.
├── ───
├── 📅 Weekly Transcripts (table + child pages)
│   ├── Table (Week | Dates | Key Events)
│   ├── Week 1 — Jan 6–12 (Hinge Match)
│   ├── Week 2 — Jan 13–19 (Voice Messages)
│   ├── Week 3 — Jan 20–26 (iMessage & Date 1)
│   ├── Week 4 — Jan 27–Feb 2 (Date 2 & Morning After)
│   ├── Week 5 — Feb 2–8 (Nathan For You to Date 3)
│   ├── Week 6 — Feb 9–15 (Sunshine & The Substance)
│   ├── Week 7 — Feb 16–22 (Dinner at Her Place)
│   └── Week 8 — Feb 23–Mar 1 (current)
├── ───
├── 🧠 Analysis & Coaching
│   ├── Liza — Psychological Profile & Partner Intelligence (v2)
│   ├── Growth Log — Relationships & Communication
│   ├── Coaching Notes — Relationship Analysis (Feb 16, 2026)
│   ├── Coaching Notes — Feb 19, 2026 (First Sleepover)
│   └── Behavioral Data Log — Feb 19, 2026 (Post-Sleepover Deep Debrief)
├── ───
├── 📎 Reference
│   └── Appendices — Inside Jokes, Details & Timeline
├── ───
└── Last updated: [date]
```

### Key Notion Block IDs

| Item | Block ID |
|------|----------|
| Directory page | `2fec051d-73d2-81e7-aa7f-c66537ad064d` |
| Weekly table | `df9af339-45c5-4a83-a3b2-658682b720a7` |
| Week 8 page | `311c051d-73d2-8127-a9f2-ef0bc8f9b42e` |
| Appendices page | `2fec051d-73d2-81a3-8450-ee6ca4766a42` |
| Psych profile page | `30cc051d-73d2-81c0-aa96-f674ce22ee6d` |
| Growth log page | `30cc051d-73d2-81df-aae1-e9d5bdc1950d` |
| Last updated block | `691ac0f7-16dd-468d-ae54-8883a6d02e43` |

### Transcript Format

Each message is a paragraph block:
- **Bold** prefix: `🔵 James (TIME):` or `⚪ Liza (TIME):`
- Regular text: message content
- Reactions noted inline: `Loved "..."`, `Laughed at "..."`
- Voice messages: 🎙️ prefix
- Day breaks use `heading_2` blocks: `MONDAY, FEBRUARY 23`
- In-person session notes use bullet lists under headings

### Weekly Table Row Format

3 columns: `Week` | `Dates` | `Key Events`
Example: `Week 8` | `Feb 23–Mar 1` | `Music inspired by her. DATE 8: morning sex (trust milestone), coffee shop...`

### Update Workflow

When updating, typically:
1. Add new transcript messages to the current week's child page
2. Update the weekly table row with key events
3. Update appendices with new inside jokes / personal details
4. Update the "Last updated" date on the directory page
5. Optionally update analysis/coaching pages

### API Usage

```bash
# Read page
curl -s "https://api.notion.com/v1/pages/PAGE_ID" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2022-06-28"

# Read blocks (children)
curl -s "https://api.notion.com/v1/blocks/BLOCK_ID/children?page_size=100" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2022-06-28"

# Append blocks
curl -s -X PATCH "https://api.notion.com/v1/blocks/BLOCK_ID/children" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d '{"children": [...]}'
```

### Relationship Context (as of Feb 25, 2026)

- James & Liza matched on Hinge Jan 6, 2026
- Moved to iMessage Week 3, first date at L'Antica Pizzeria
- 8 dates so far, relationship escalating steadily
- Valentine's Day (Week 6) was inflection point — 16-hour date, mutual "I like you a lot"
- Week 7: first sleepover at her apartment
- Week 8 (current): morning intimacy milestone, James acknowledged being in love (not yet told to Liza)
- James away in mountains Feb 25 – Mar 4
- Liza: TV writer, ~30, hyper-independent, Scorpio, never had a real relationship before
- James: film editor/director/composer, ~40, in therapy, makes music
