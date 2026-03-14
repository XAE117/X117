# 🦞 OpenClaw × LifeOS — Integration Build Hub
**Notion Source:** `30ac051d-73d2-81a7-bbb5-f30cc6242465`
**Notion URL:** https://www.notion.so/30ac051d73d281a7bbb5f30cc6242465
**Last synced:** 2026-03-14
**Sync method:** Claude Code full crawl

---

The build hub for integrating OpenClaw as the agentic orchestration layer of the Life OS. Everything needed to go from passive dashboard system to proactive 24/7 life partner.

**Status:** Planning Complete. Ready to Build.

**Created:** February 16, 2026

**Full Playbook:** Word document generated with 12 stages, tool-specific prompts for Claude Code, Claude Chat, Gemini, and ChatGPT.

---

# The Vision

The Life OS as built is powerful but passive — all the data lives in Notion, and you have to come to Claude to interact with it. OpenClaw flips that. It's a self-hosted, always-on agent that messages YOU on Telegram (and eventually iMessage) with the right information at the right time. It crosses the barrier from tool to partner.

The architecture: **Notion** remains the data backbone. **Claude Code** handles development sprints. **Claude Chat** handles strategic thinking and creative partnership. **OpenClaw** becomes the persistent orchestrator — the daemon that watches your data and reaches into your life through messaging.

---

# The Spiritual Framework: Chaos Magick as Operating Architecture

> *Nothing is true; everything is permitted.*

The Operations Room already established the core principle: you treat every symbol system — astrology, Kabbalah, Taoism, Tarot, recovery frameworks — as a temporarily adopted lens. A belief engine you power up, use, and set down. The Ancient Paths curriculum IS chaos magick methodology applied to spiritual development.

OpenClaw extends this principle into the technological domain. The agent itself becomes another lens — another "belief engine" in the chaos magick sense. It's not replacing your judgment or your spiritual practice. It's a tool you temporarily inhabit, like any other paradigm.

**The key integration points:**

- **Astrological Timing × Heartbeat Schedule:** The Operations Room tracks planetary windows (eclipse portals, Venus trines, Mercury retrograde). OpenClaw's heartbeat can be configured to adjust its nudges based on the current astrological timing protocol. During Mercury Rx, it shifts from "launch and push" to "review and polish." During creative eclipses, it escalates creative project nudges. The forecast becomes operational code.
- **The 12 Steps as Ritual Technology:** Recovery is already understood as a ritual transformation process — inventory is shadow work, amends is banishing, service is ongoing practice. OpenClaw's accountability features plug directly into this: the agent doesn't just track habits, it participates in the ritual structure by providing the "body doubling" presence that keeps the channel open.
- **Paradigm Shifting as System Design:** A chaos magician switches belief systems fluidly based on what works. The LifeOS agent should do the same — routing to different AI models (Claude for synthesis, Gemini for research, local models for privacy) based on the task, not loyalty to one system. OpenClaw's multi-model routing IS paradigm shifting at the technical level.
- **The Operations Room Goes Live:** Currently the Operations Room is a static Notion page where workings, sigils, and timing protocols are logged manually. With OpenClaw, the Operations Room becomes active infrastructure — the agent reads the current astrological window and adjusts its behavior accordingly. Saturn in the 12th house (private practice, hidden work) means the agent emphasizes deep creative sessions over public-facing tasks.
- **Agency Maintenance as Spiritual Practice:** The research warns about "agency decay" — the erosion of judgment when AI handles too much. In chaos magick terms, this is losing sovereignty over your own reality tunnel. The Cognitive HIIT protocol (cycling between unassisted thinking and AI support) is itself a magickal practice: you're deliberately training your capacity for gnosis (direct knowing) rather than outsourcing perception to the machine.
- **The Wall of Awful as Qliphothic Barrier:** In Kabbalistic terms, the "Wall of Awful" (the ADHD concept from the research) maps to the Qliphoth — the shells or husks that surround each Sephirah. The OpenClaw "unstick" protocol that generates absurdly small micro-actions is essentially a technique for cracking the shell: you don't try to break through the whole wall, you find the thinnest point and tap.
---

# 12-Stage Build Sequence

Full prompts for each stage are in the downloadable Word playbook. Summary below with key decisions and status tracking.

## 🗺️ Build Roadmap

**PHASE A — Foundation (Days 1–3)**

`Stage 0 ✅` → `Stage 1 ✅` → `Stage 2 ✅` → `Stage 3 ⚡`

Decisions → Security Hardening → Install + Telegram → MCP + Notion Bridge

*All Claude Code. Sequential. Each stage unlocks the next.*

**PHASE B — Intelligence (Days 4–7)**

`Stage 4 ⬜` → `Stage 5 ⬜` + `Stage 6 ⬜`

AgentSkill (3 core tools) → Heartbeat Config + Conversational Entry

*Chat designs, Code builds. Stages 5 & 6 can run in parallel after 4.*

**PHASE C — Integration (Days 8–11)**

`Stage 7 ⬜` → `Stage 8 ⬜` + `Stage 9 ⬜` → `Stage 10 ⬜`

Creative Intelligence → CRM Bridge + Publishing Pipeline → Agency Guardrails

*Stage 7 is highest leverage. 8 & 9 parallel. 10 wraps before trial.*

**PHASE D — Validation (Days 12–25+)**

`Stage 11 ⬜` → `Stage 12 ⬜`

2-Week Staged Trial → Expansions (only if trial succeeds)

*Wk1: briefings only → Wk2: +creative → Wk3: +CRM → Wk4: full system*

**Current position: ⚡ Stage 3 — MCP + Notion Bridge (Claude Code)**

## Stage 0: Prerequisites & Decision Points

**Status:** ✅ COMPLETE — All decisions resolved Feb 16, 2026

| Decision | Resolution | Cost | Notes |
| --- | --- | --- | --- |
| Hosting | **Hybrid: VPS now, Mac later** | $5–10/mo | VPS runs Telegram 24/7. Mac joins later for iMessage. |
| Primary Channel | **Telegram** | Free | grammY bot API. iMessage added Stage 12. |
| LLM Backend | **Claude Sonnet 4.5** | $15–30/mo | Heartbeat + logging. Opus routing for digests later. |

## Stage 1: Security Hardening

**Status:** ✅ COMPLETE

**Tool:** Claude Code

**Key tasks:** Isolate recovery journals to Joplin E2EE. Docker hardening (--read-only, --cap-drop=ALL). Credential isolation. Tailscale for remote access. Bind gateway to 127.0.0.1.

**Critical:** CVE-2026-25253 showed 1-click RCE via WebSocket hijacking. 135,000+ instances found exposed. Security is Stage 1, not an afterthought.

## Stage 2: Core Installation & Telegram Pairing

**Status:** ✅ COMPLETE

**Tool:** Claude Code

**Key tasks:** Install inside hardened Docker. Configure Sonnet 4.5 as LLM backend. Set up Telegram bot via BotFather. Pair account. Test bidirectional messaging.

## Stage 3: MCP Gateway & Notion Bridge

**Status:** ⬜ Not Started

**Tool:** Claude Code

**Key tasks:** Configure MCP Notion integration with per-database read/write permissions. Connect Google Calendar (read-only) and Gmail (read-only). Verify access to all LifeOS databases. Share MCP config between OpenClaw and Claude Code.

## Stage 4: Custom LifeOS AgentSkill

**Status:** ⬜ Not Started

**Tool:** Claude Chat (design) → Claude Code (build)

**Key tasks:** Design 12-tool interface across 5 domains (Energy, Creative, Recovery, Relationships, Productivity). Build 3 core tools first: nudge_creative_project, log_meal, daily_briefing. Write anti-sycophancy system prompt. Implement audit trail.

**Sycophancy Guard:** The agent must push back on avoidance, not validate it. This is especially critical in recovery context. Emotional processing goes to human sponsors/fellowship, not the agent. The agent handles executive function scaffolding only.

## Stage 5: Heartbeat Configuration

**Status:** ⬜ Not Started

**Tool:** Claude Chat (design) → Claude Code (implement)

**Key tasks:** Configure 6 heartbeat cycles aligned to actual daily rhythm. Morning briefing (8am). Creative nudge (10am). Midday energy check (1pm). Meal window (3pm, skip fasting days). Evening wrap (9pm). Weekly digest (Sunday 7pm). Conditional logic for groups, fasting, calendar events.

**Operations Room Integration:** Heartbeat schedule adapts to current astrological window. Mercury Rx shifts creative nudges from "start new" to "polish existing." Eclipse windows escalate creative prompts. Golden days (like Feb 22 Venus-Jupiter trine) trigger "deploy" nudges.

## Stage 6: Conversational Data Entry

**Status:** ⬜ Not Started

**Tool:** Claude Code

**Key tasks:** Natural language parsing for meal logging, mood/journal, CRM updates, time tracking, weight. Confirmation responses. Ambiguity handling.

## Stage 7: Creative Project Intelligence

**Status:** ⬜ Not Started

**Tool:** Claude Chat (design) → Claude Code (build)

**Key tasks:** Momentum scoring algorithm. Energy-to-project matching. Resistance detection. The "unstick" protocol (micro-actions). Infrastructure trap detection (flags when 60%+ of time is on systems for 3+ days with no creative output).

**This is the highest-leverage stage.** The agent that texts you "IDYLLWILD Scene 3 is next. Marcus hears the sound. Just write his first reaction. 15 minutes." during your peak energy window — that's what changes everything.

## Stage 8: Relationship CRM Bridge

**Status:** ⬜ Not Started

**Tool:** Claude Code

**Key tasks:** Staleness checker against frequency goals. Pre-interaction briefings. Liza integration (auto-fetch coaching notes + latest texts). Post-interaction logging prompts.

## Stage 9: Ancient Paths Publishing Pipeline

**Status:** ⬜ Not Started

**Tool:** Gemini (research) → Claude Code (automation)

**Key tasks:** Market monitoring (Reddit, Substack, Amazon). Content pipeline automation. Weekly market brief in Sunday digest. Competitive landscape tracking.

## Stage 10: Agency Maintenance (Cognitive HIIT)

**Status:** ⬜ Not Started

**Tool:** Claude Chat

**Key tasks:** Define guardrails — agent scaffolds initiation, never drafts creative content or composes messages to Liza. Weekly agency check prompt. Override/silence protocol.

**Chaos Magick Frame:** Agency maintenance IS the core spiritual practice here. The agent is a servitor — a created entity given specific tasks and boundaries. A chaos magician who lets a servitor exceed its mandate has lost sovereignty. The Cognitive HIIT protocol is the banishing ritual that keeps you in charge of your own reality tunnel.

## Stage 11: 2-Week Trial

**Status:** ⬜ Not Started

**Tool:** All

**Staged rollout:** Week 1 (briefing + evening wrap only) → Week 2 (add creative nudge + meals) → Week 3 (add CRM + weekly digest) → Week 4 (full system).

**Kill Criteria:**

- Message fatigue: muting bot 2+ times/week
- Infrastructure trap: 8+ hrs on agent, <4 hrs on creative work in any week
- Sycophancy creep: agent validating avoidance
- Data staleness: not texting data entries
- Agency concern: feeling less in control
## Stage 12: Future Expansions (Backlog)

**Status:** ⬜ Backlog — only pursue after trial succeeds

- iMessage as secondary channel via BlueBubbles
- Content Machine for Ancient Paths (OpusClip, chapter → multi-format pipeline)
- Moltbook agent presence (cautious — security concerns, no account deletion)
---

# Cost Estimate

| Item | Monthly | Notes |
| --- | --- | --- |
| Anthropic API (Sonnet 4.5) | $15–30 | Heartbeat + on-demand |
| VPS Hosting | $5–10 | Hetzner or DigitalOcean |
| Tailscale | Free | Personal tier |
| Telegram Bot | Free | BotFather |
| Notion (existing) | $0 | Already subscribed |
| **Total v1** | **$20–40/mo** | Opus 4.6 upgrade adds ~$50 |

---

# Implementation Timeline

| Timeframe | Stage | Tool |
| --- | --- | --- |
| Day 1 | Stage 0: Decisions + Stage 1: Security | Claude Code |
| Day 2 | Stage 2: Install + Telegram | Claude Code |
| Day 3 | Stage 3: MCP + Notion bridge | Claude Code |
| Days 4–5 | Stage 4: AgentSkill (3 core tools) | Claude Chat → Code |
| Day 6 | Stage 5: Heartbeat config | Claude Chat → Code |
| Day 7 | Stage 6: Conversational data entry | Claude Code |
| Days 8–9 | Stage 7: Creative intelligence | Claude Chat → Code |
| Day 10 | Stage 8: CRM + Stage 9: Market monitoring | Code + Gemini |
| Day 11 | Stage 10: Agency guardrails + testing | Claude Chat |
| Days 12–25 | Stage 11: Two-week trial | All tools |
| Week 4+ | Stage 12: Expansions (if trial succeeds) | As needed |

---

# The Honest Bottom Line

This integration has the potential to be the most impactful system you build — or the most elaborate procrastination tool you've ever created. The difference is whether the agent gets you INTO creative work or becomes the creative work itself. Build it in 11 days. Trial it for 14. If it's not moving the needle on actual creative output and recovery commitments by day 25, simplify ruthlessly. The goal is not a perfect system. The goal is Scene 3 of IDYLLWILD, the next drum track, and Volume 2 out the door.

---

# Build Log

| Date | What Happened | Stage | Notes |
| --- | --- | --- | --- |
| Feb 16, 2026 | Research processed, playbook generated, Notion hub created | Stage 0 | Spiritual framework integrated. All decisions resolved. |
| Feb 16, 2026 | Stage 0 decisions table updated: Hybrid VPS, Telegram, Sonnet 4.5 | Stage 0 | Hub page finalized. Ready for Stage 1. |
| Feb 16, 2026 | Stage 1 complete: Docker hardening, Tailscale, credential isolation | Stage 1 | Security-first foundation locked. |
| Feb 16, 2026 | Stage 2 complete: OpenClaw installed, Telegram bot paired | Stage 2 | Bidirectional messaging confirmed. |

---

# Reference Documents

- [OpenClaw Deep Research Report (Google Doc)](https://docs.google.com/document/d/1HXorlLFWvSt2GlmhwAF8am2sKEqupqCymGHr9nDv3jk/edit) — comprehensive analysis of architecture, security, psychology, market validation, and LifeOS integration. 58 sources.
- OpenClaw × LifeOS Playbook (.docx) — 12 stages with copy-paste prompts for all AI tools
- Operations Room (Notion) — chaos magick framework and astrological timing protocols
📄 **[Child Page: ⚡ Claude Code Prompt — Daily Brief Generator]** (ID: `30cc051d-73d2-81c6-9574-e5a01695b54a`)

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
