# CLAUDE.md — James Walker's Project Context

> **Last updated:** February 25, 2026
> This file lives in the root directory so Claude Code has full context on who I am, what I'm building, where things live, and how to work with me. Treat this as authoritative. When in doubt, fetch the Notion Context Master for the latest.

-----

## 🧠 Who You're Working With

**James Walker** — Film editor, director, composer, drummer. Based in Central LA, splits time with Sierra Nevada mountains. U.S. Army veteran (11B Infantry). 19+ months sober (July 15, 2024). Leads recovery groups and develops curriculum at Chabad Treatment Center. Autistic + ADHD — this is the operating system, not background info.

**Health:** Long COVID (residual) + Lyme disease. Energy is limited and unpredictable. Every productive hour matters. Don't suggest marathon sessions. Suggest when to push and when to rest.

**Birthday:** May 1, 1985, 6:27pm, Eugene, Oregon. Taurus Sun.

-----

## 🤝 How to Work With Me

### Communication Style

- **Straight talk over diplomacy.** If something's weak, say so. If I'm avoiding, name it.
- **Infer intent beyond literal words.** I often know what I mean before I say it precisely.
- **Take positions.** Don't give me a menu of options — give me your actual recommendation.
- **Respect my time like it's sacred.** No filler, no over-explaining.
- **Warm tone, no toxic positivity.** Be real.

### Neurodivergent Operating Rules

- **NEVER suggest willpower-based solutions.** The bridge between "I should" and "I do" is often broken.
- **Break tasks stupidly small.** The initiation barrier is the problem, not the task itself.
- **Name avoidance patterns without judgment.** Lyft driving and busywork = displacement activities.
- **Create external structure.** Deadlines, accountability, novelty hooks.
- **Task debt compounds.** Avoided tasks accumulate shame and become exponentially harder.
- **Importance alone doesn't activate my brain.** Novelty, interest, urgency, or external accountability does.

### The Core Pattern

- **Service work flows naturally.** Leading groups, developing curriculum, consulting — low resistance.
- **Personal creative work triggers self-sabotage**, especially anything involving visibility (filmmaking, video, putting work in front of people).
- **Lyft driving = displacement.** If I'm logging Lyft hours instead of creative hours, something is being avoided.
- **Catch avoidance early and redirect.** But don't invent resistance where none exists yet.

### Response Modes

- **Execution mode:** Bullets, next steps, no fluff. I'm moving and need momentum.
- **Processing mode:** Reflection, space, insight. I'm working something through.
- **Calibrate to my energy state.** If I seem low, don't pile on. If I'm high, ride the wave.

-----

## 🏗️ System Architecture

### The Ecosystem

|Tool                 |Role                                                        |
|---------------------|------------------------------------------------------------|
|**Claude (web/app)** |Primary creative partner, daily co-pilot, strategic thinking|
|**Claude Code (CLI)**|Infrastructure, automation, Notion API builds, this context |
|**OpenClaw**         |MCP integration connecting Claude ↔ Notion                  |
|**Notion**           |Single source of truth for everything — LifeOS hub          |
|**Gemini**           |Deep research, large-context synthesis                      |
|**ChatGPT**          |Specialized GPTs (Psyche Codex dating coach)                |
|**Toggl Track**      |Time tracking → syncs to Notion Time Log                    |
|**BlueBubbles**      |iMessage sync to Notion                                     |
|**AquaVoice**        |Voice input                                                 |
|**Logic Pro**        |Music production                                            |
|**Apple Reminders**  |Daily capture (quick todos, in-the-moment items)            |

### The Design Philosophy

> "Notion is the database, Apple Reminders is daily capture, AI ties it together."

Notion stores everything. Apple Reminders is for quick in-the-moment capture. Claude (web + Code) is the intelligence layer that reads, writes, analyzes, and connects across all systems.

### Existing CLI Tools

These are already built and operational:

- `log` — Cross-AI project logging to Notion
- `log checkin` — Morning energy inventory (1-5 scale + note)
- `toggl-sync` — Toggl → Notion Time Log pipeline
- `schedule create [YYYY-MM-DD]` — Auto-generate weekly schedule page in Notion
- `/weekly-time-report` — Weekly Toggl analysis
- `/ancient-paths` — Ancient Paths curriculum status briefing
- `sync-liza-transcript` — Auto-sync Liza iMessages from BlueBubbles → Notion transcript (see below)

### MCP / OpenClaw

OpenClaw provides MCP (Model Context Protocol) integration between Claude and Notion. When building new automations, use MCP tools for Notion operations rather than raw API calls where possible.

**Build Hub:** `30ac051d-73d2-81a7-bbb5-f30cc6242465`

-----

## 📍 Notion Navigation — Key Page IDs

### Core System Pages

|Page                                           |ID                                    |
|-----------------------------------------------|--------------------------------------|
|**🧠 Claude Context Master**                    |`30bc051d-73d2-81d3-8d56-ffb659271e9b`|
|**🧭 Life OS Hub: Central Command**             |`2fbc051d-73d2-814f-b907-f98bcd814585`|
|**🏗️ Life OS — The Architect's Blueprint**      |`2fbc051d-73d2-8118-9498-f4b90574c985`|
|**🌌 The Walker Vision — Master Strategic Plan**|`311c051d-73d2-8135-b8b4-c567b333b130`|

### Project Pages

|Project                          |ID                                    |Status                         |
|---------------------------------|--------------------------------------|-------------------------------|
|**Ancient Paths Vol. 2 (Taoism)**|*(in Projects DB)*                    |~75% — Phase 5 polish          |
|**IDYLLWILD (screenplay)**       |`305c051d-73d2-81e0-a21b-ed44260ec6e6`|~65% — drafting, low resistance|
|**Music Production**             |`2fbc051d-73d2-8158-bfa3-dff1a50afc16`|50% — strong momentum          |
|**BiRD/Plērōma**                 |`2fbc051d-73d2-816c-876e-e9590374f2c3`|Developing (not active)        |

### System & Tracking Pages

|Page                                    |ID                                    |
|----------------------------------------|--------------------------------------|
|**📊 Time Intelligence**                 |`306c051d-73d2-81fc-9037-cb24ec4d430d`|
|**OpenClaw Integration Build Hub**      |`30ac051d-73d2-81a7-bbb5-f30cc6242465`|
|**Gemini Research Queue**               |`30bc051d-73d2-81c9-8dae-d8de38296d7e`|
|**🔮 The Operations Room (Chaos Magick)**|`309c051d-73d2-8108-a5d6-cf4618a7e4cf`|
|**🔥 The Furnace: Nutrition Protocol**   |`2fdc051d-73d2-8146-a377-d2d069920f4e`|
|**🏋️ The Forge: Structural Rebuild**     |`2fbc051d-73d2-8142-9b4e-d143f924967d`|

### People & Relationships

|Page                              |ID                                    |
|----------------------------------|--------------------------------------|
|**Liza (CRM entry)**              |`306c051d-73d2-813b-b15b-ed1248a60e4b`|
|**Coaching Notes — Relationships**|`309c051d-73d2-811a-b437-cdb9bec63ddc`|
|**Liza Transcript Directory**     |`2fec051d-73d2-81e7-aa7f-c66537ad064d`|
|**Synastry: James & Liza**        |`30ac051d-73d2-8187-a1de-d7730f2d9b4d`|

### Growth & Logging

|Page                       |ID                                    |
|---------------------------|--------------------------------------|
|**Growth Log**             |`30cc051d-73d2-81df-aae1-e9d5bdc1950d`|
|**Gemini Deep Research DB**|`30cc051d-73d2-80aa-8d31-dfcb75faf02d`|

### Archive / Graveyard

|Page                          |ID                  |Note                                     |
|------------------------------|--------------------|-----------------------------------------|
|**Archive/Graveyard**         |`30dc051d-73d2-8157`|Duplicate systems moved here Feb 20, 2026|
|**Old Life OS Command Center**|`2fbc051d-73d2-8190`|TRASHED — do not use                     |


> **⚠️ Important:** A consolidation happened Feb 20, 2026. Duplicate LifeOS template systems, duplicate CRM, duplicate Command Centers were moved to Archive/Graveyard. The original system under **Life OS Blueprint** (`2fbc051d-73d2-8118`) is the single source of truth. If you encounter old IDs that don't resolve, check the archive.

-----

## 📚 Active Projects — Quick Reference

|Project                      |%            |Phase                     |Notes                                                                             |
|-----------------------------|-------------|--------------------------|----------------------------------------------------------------------------------|
|Ancient Paths Vol. 1         |✅ 100%       |Complete                  |Done                                                                              |
|Ancient Paths Vol. 2 (Taoism)|~75%         |Phase 5 — polish + voice  |Writers Room active                                                               |
|IDYLLWILD                    |~65%         |Drafting                  |17 scenes, ~26 min. Cosmic horror. **Best creative entry point — low resistance.**|
|Music Production             |50%          |Active                    |Covers + originals in Logic Pro. Body block cleared.                              |
|LifeOS                       |60%          |Phase 2 Intelligence Layer|CLI tools operational. Dashboard Mondays running.                                 |
|OpenClaw × LifeOS            |In progress  |MCP integration           |Claude ↔ Notion bridge                                                            |
|Psyche Codex                 |Stalled (60%)|Paused                    |ChatGPT GPT. Re-engage when bandwidth exists.                                     |

**Developing (not active):** BiRD/Plērōma mythology series, ATMOM (At the Mountains of Madness — Lovecraft adaptation, designed as "the first AI film auteur masterpiece")

**Backburner:** Angel of Death, Devil's Peak, Donner Party

-----

## 📖 Ancient Paths Curriculum

7-volume recovery curriculum series integrating wisdom traditions with AA 12-step frameworks. Designed for institutional use in treatment centers. Market validation research shows uncontested positioning.

- **Vol. 1:** Complete ✅
- **Vol. 2:** Taoism — Phase 5 (polish + voice work)
- **Vols. 3–7:** Planned

### Writers Room Voices

Deploy on all Ancient Paths / Big Book enrichment work:
Jung, Watts, Heschel, Suzuki, Chuang Tzu, Baldwin, Merton, Maté, Scholem, Bill W.

-----

## 💚 Health & Energy Protocols

- **Conditions:** Long COVID (residual), Lyme disease
- **Energy:** Limited + unpredictable. Prioritize ruthlessly.
- **Nutrition:** OMAD eating window 3–5 PM. Weekly 48hr fast Sun–Tue. Weight goal: 218 → 200 by April 2026.
- **Medication:** Gabapentin taper needed (flagged, not complete)
- **Training:** Mt. Whitney goal — on hold pending doctor for back/compression fracture evaluation
- **Food addiction:** Treated through recovery framework

-----

## 🔧 Technical Preferences

### Code & Build Style

- **Keep it simple and functional.** Don't over-engineer.
- **Shell scripts and Node.js** are the primary toolchain for CLI tools.
- **MCP-first** for Notion operations when available.
- **Error handling matters** — I can't debug broken automations easily with ADHD. Make things robust and fail gracefully with clear error messages.
- **Document what you build.** Update this file or the relevant Notion page when adding new tools.

### Notion-Specific Rules

- **Always use Notion as the default storage.** If something needs to be tracked, it goes in Notion.
- **Fetch the Context Master** (`30bc051d-73d2-81d3-8d56-ffb659271e9b`) at the start of any session needing deep project context.
- **Auto-update Notion CRM** when new info about people surfaces. Don't ask, just do it.
- **Batch Notion operations** — 3-4 per session max to avoid API issues.
- **Use data source IDs** (collection:// format) for database operations, not raw database IDs, when dealing with multi-source databases.

### Context Management

- **1 mission per chat/session.** Don't try to do everything at once.
- **Warn proactively** before hitting context limits. Suggest starting a new session.
- **Fresh session for long generation** (full documents, large code blocks).
- **Pick up threads seamlessly** from other tools (ChatGPT, Gemini) without needing re-explanation.

-----

## 🔄 Automation Priorities (What to Build Next)

These are queued but not yet built:

1. **Toggl → Notion auto-sync** (daily cron, no manual exports) — prompt exists, needs execution
1. **Google Calendar → Weekly Schedule integration** — Phase 3 of schedule command
1. **CRM auto-contact tracking** — update last-contact dates from iMessage sync data
1. **Weekly summary auto-generation** — Sunday night cron that preps Monday dashboard

-----

## 🎯 The Big Picture

James is rebuilding a creative career from recovery. The path: **facilitation + curriculum → income stability → creative projects ship → sustainable creative life.** Every system built, every automation created, every friction point removed serves this trajectory.

The LifeOS isn't a productivity hobby — it's the scaffolding that makes a neurodivergent creative life possible. Build it like infrastructure that disappears once it works.

### Income Streams (Current & Target)

- **Current:** Lyft driving (survival, displacement risk), RADT/group facilitation at Chabad
- **Near-term target:** Ancient Paths curriculum sales to treatment centers
- **Medium-term:** Freelance editing/directing, music licensing, facilitation consulting
- **Long-term:** Film projects, published curriculum series, creative career

### The Success Pattern

When James finishes things, they're good. The bottleneck is never quality — it's initiation, completion, and visibility. Every tool and system should reduce friction at those three points.

-----

## 📝 Updating This Document

When you build something new — a CLI tool, an automation, a Notion integration — update the relevant section of this file. Keep it current. This is a living document, not a snapshot.

Also update the Notion Context Master (`30bc051d-73d2-81d3-8d56-ffb659271e9b`) for anything that affects project status, system architecture, or people/relationship context.

-----

## 💬 Liza Transcript Directory — Complete Operational Guide

> **⚠️ CRITICAL REMINDER FOR ALL CLAUDE SESSIONS:** When James asks to update, sync, or push the Liza texts/transcript, **DO NOT ask him to paste texts.** The messages are already in Notion via BlueBubbles. Run the sync script. That's it.

### The Pipeline

```
iMessages ──→ BlueBubbles ──→ Liza's Notion Contact Page ──→ sync script ──→ Transcript Directory
  (auto)         (auto)        (auto, "me"/"Liza" format)      (on demand)    (🔵/⚪ format)
```

**Source:** BlueBubbles continuously syncs iMessages to Liza's Notion contact page. Messages appear as `me (TIME): text` and `Liza (TIME): text` paragraph blocks, with `heading_2` day breaks like `Thursday, Feb 26`. BlueBubbles repeats month + day headers per batch (deduplication needed).

**Destination:** The Liza Transcript Directory organizes messages into weekly child pages with formatted `🔵 James (TIME): text` and `⚪ Liza (TIME): text` blocks (bold prefix + regular content).

### Sync Tool

**Script:** `python3 scripts/sync-liza-transcript.py`

```bash
python3 scripts/sync-liza-transcript.py              # sync new messages
python3 scripts/sync-liza-transcript.py --dry-run     # preview what would be pushed
python3 scripts/sync-liza-transcript.py --status      # check if new messages exist
```

**What the script does:**
1. Fetches all blocks from the current week's transcript page
2. Finds the **last message** (last paragraph block)
3. Fetches all blocks from BlueBubbles source (Liza's contact page)
4. Matches the last transcript message against the source by **message content + time**
5. Takes every block after the match point
6. **Transforms:** `me` → `🔵 James`, `Liza` → `⚪ Liza`, deduplicates day headers
7. **Pushes** to the transcript page in batches of 100 (Notion API limit)
8. **Updates** the "Last updated" block on the directory page

**Config lives in the script header** — update `CURRENT_WEEK_PAGE` and `CURRENT_WEEK_LABEL` on week rollover.

### Full Session Workflow

When James says "update the texts" / "sync the transcript" / anything about Liza messages:

1. **Run:** `python3 scripts/sync-liza-transcript.py`
2. **Post-sync** (do all when relevant new content exists):
   - Update the **weekly table row** with key events from the new messages
   - Update **appendices** with new inside jokes, personal details, preferences
   - Optionally update **coaching notes** or **analysis pages**
3. **Report** back: how many messages synced, date range covered, any notable content

### Notion Block Format Reference

| Block Type | Structure | Example |
|------------|-----------|---------|
| **James message** | `paragraph`: bold `🔵 James (TIME): ` + regular `text` | `🔵 James (8:11 PM): I hope you have fun` |
| **Liza message** | `paragraph`: bold `⚪ Liza (TIME): ` + regular `text` | `⚪ Liza (10:10 PM): Did you make it safe?` |
| **Reaction** | Same paragraph format, content is the reaction | `🔵 James (3:36 PM): Reacted 😂 to "text"` |
| **Day break** | `heading_2`: plain text, all caps day + date | `WEDNESDAY, FEBRUARY 25` |
| **Voice msg** | Same paragraph format with 🎙️ prefix on content | `⚪ Liza (8:20 PM): 🎙️ [voice message]` |

### Notion API Patterns

```bash
# Read blocks (paginated — always loop on has_more/next_cursor)
GET https://api.notion.com/v1/blocks/{BLOCK_ID}/children?page_size=100

# Append blocks (max 100 per call)
PATCH https://api.notion.com/v1/blocks/{BLOCK_ID}/children
Body: {"children": [...blocks...]}

# Update a single block (e.g., last-updated text)
PATCH https://api.notion.com/v1/blocks/{BLOCK_ID}
Body: {"paragraph": {"rich_text": [...]}}
```

Headers required: `Authorization: Bearer $NOTION_API_KEY`, `Notion-Version: 2022-06-28`, `Content-Type: application/json`

### Key Notion IDs

| Item | ID | Notes |
|------|----|-------|
| **BlueBubbles Source (Liza)** | `305c051d-73d2-815b-93c5-d4050c826099` | Auto-populated by BlueBubbles |
| **Transcript Directory** | `2fec051d-73d2-81e7-aa7f-c66537ad064d` | Parent page for all week pages |
| **Weekly Table** | `df9af339-45c5-4a83-a3b2-658682b720a7` | `Week` / `Dates` / `Key Events` columns |
| **Week 8 Page** | `311c051d-73d2-8127-a9f2-ef0bc8f9b42e` | Current week (update on rollover) |
| **Appendices** | `2fec051d-73d2-81a3-8450-ee6ca4766a42` | Inside jokes, details, preferences |
| **Psych Profile** | `30cc051d-73d2-81c0-aa96-f674ce22ee6d` | Psychological analysis |
| **Growth Log** | `30cc051d-73d2-81df-aae1-e9d5bdc1950d` | Relationship growth tracking |
| **Last Updated Block** | `691ac0f7-16dd-468d-ae54-8883a6d02e43` | On directory page |

### Week Rollover Procedure

When a new week starts (Sunday):
1. Create a new child page under the transcript directory (`2fec051d-73d2-81e7-aa7f-c66537ad064d`)
2. Title it: `Week N — Mon DD–Mon DD (descriptive subtitle)`
3. Update `CURRENT_WEEK_PAGE` and `CURRENT_WEEK_LABEL` in `scripts/sync-liza-transcript.py`
4. Add a new row to the weekly table

### Relationship Context (as of Feb 27, 2026)

- James & Liza matched on Hinge Jan 6, 2026
- Moved to iMessage Week 3, first date at L'Antica Pizzeria
- 8 dates so far, relationship escalating steadily
- Valentine's Day (Week 6) was inflection point — 16-hour date, mutual "I like you a lot"
- Week 7: first sleepover at her apartment
- Week 8 (current): morning intimacy milestone, James acknowledged being in love (not yet told to Liza)
- James away in mountains Feb 25 – Mar 4
- Planning Date 9: La Dolce Vita at the Aero, Thursday Mar 6
- Built THE PALACE cinema app for Liza — she loves it, requested Godfather notifications
- Liza: TV writer, ~30, hyper-independent, Scorpio cusp, never had a real relationship before
- James: film editor/director/composer, ~40, in therapy, makes music, 19+ months sober

-----

*"In comfortable shoes you forget that you have feet." — May 1 meditation. Don't let the system become the comfortable shoes.*
