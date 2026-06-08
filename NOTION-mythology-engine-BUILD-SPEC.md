# Mythology Engine — Notion Build Specification

Implementation-ready spec for the **approved 3-database architecture** (Media Log,
Creators, Threads). This document is a build sheet, not a design doc — every name,
type, option, and formula below is meant to be entered into Notion exactly as
written. Architecture is settled; this only makes it buildable.

> **Naming convention used here:** property names are written `Exactly As Typed`.
> Helper/mechanical properties that exist only to power rollups or formulas are
> tagged **(hidden)** — set them hidden in every view.

---

## 0. Build order (do this top to bottom)

1. Create the 3 databases empty: **Media Log**, **Creators**, **Threads**.
2. Add the non-relation properties to each (sections 1–3).
3. Create the two relations (section 4) — this auto-creates the synced properties.
4. Add the rollups (section 5).
5. Add the formulas (section 6).
6. Build the views (section 7).
7. Build the dashboard page (section 8).
8. Enter the seed data (section 9).

Relations before rollups before formulas — each depends on the one before it.

---

## 1. Database: Media Log
The only place anything is logged. One row = one piece of media.

| Property | Type | Config |
|---|---|---|
| `Name` | Title | — |
| `Type` | Select | options below |
| `Status` | Select | options below |
| `Rating` | Select | options below |
| `Finished On` | Date | date only, no time |
| `Note` | Text | freeform — runtime, page count, why it mattered |
| `Heard From` | Text | who/where the rec came from ("Mike", "NYT review", "Lynch podcast") |
| `Creator` | Relation | → Creators (defined in §4) |
| `Threads` | Relation | → Threads (defined in §4) |
| `Rating #` **(hidden)** | Formula | defined in §6 — powers averages |
| `Canon Flag` | Formula | defined in §6 |

**`Type` options** (in this order):
`Film` · `TV` · `Documentary` · `Book` · `Podcast` · `Game` · `Essay` · `Other`

**`Status` options** (in this order — this is the lifecycle, left to right):
`Heard About` · `Queue` · `In Progress` · `Finished` · `Abandoned`

**`Rating` options** (in this order):
`★` · `★★` · `★★★` · `★★★★` · `★★★★★`
*(pure-star labels keep the UI clean; the `Rating #` formula maps them to numbers
for averaging — see §6.)*

---

## 2. Database: Creators
One row = one person (director, author, musician, etc.). Roles are multi because
people cross them (Lynch writes *and* directs).

| Property | Type | Config |
|---|---|---|
| `Name` | Title | — |
| `Role` | Multi-select | options below |
| `Note` | Text | freeform |
| `Works` | Relation | auto-created by the Media Log `Creator` relation (§4) |
| `Logged Works` | Rollup | defined in §5 |
| `Avg Rating` | Rollup | defined in §5 |

**`Role` options:**
`Director` · `Writer` · `Author` · `Showrunner` · `Musician` · `Composer` ·
`Game Director` · `Host` · `Artist`

---

## 3. Database: Threads
The unifying database. One row = one lens you view media through. `Kind` is what
makes a row a theme vs. a mood vs. a project vs. a canon collection — there is no
separate database for any of those.

| Property | Type | Config |
|---|---|---|
| `Name` | Title | — |
| `Kind` | Select | options below |
| `Note` | Text | what this lens is / what you're looking for when you tag into it |
| `Tagged Media` | Relation | auto-created by the Media Log `Threads` relation (§4) |
| `Tagged Works` | Rollup | defined in §5 |

**`Kind` options** (in this order):
`Project` · `Canon` · `Theme` · `Mood`

---

## 4. Relations (create these exactly twice — both two-way)

**Relation A — Media Log ↔ Creators**
- On **Media Log**, create relation property `Creator` → target database **Creators**.
- Enable "Show on Creators" (two-way). Name the synced property on the Creators
  side `Works`.
- Limit: a piece of media has one primary `Creator` (set the relation to allow
  multiple if you want co-directors; default single is fine and cleaner).

**Relation B — Media Log ↔ Threads**
- On **Media Log**, create relation property `Threads` → target database **Threads**.
- Enable "Show on Threads" (two-way). Name the synced property on the Threads side
  `Tagged Media`.
- This relation is **multi** (a film carries many threads — its project, its
  themes, its moods, its canon tier — all at once).

---

## 5. Rollups (exact definitions)

**Creators → `Logged Works`**
- Relation: `Works`
- Property: `Name`
- Calculate: **Count all**

**Creators → `Avg Rating`**
- Relation: `Works`
- Property: `Rating #` (the hidden formula)
- Calculate: **Average**
- *(Because `Rating #` returns empty for unrated items, unrated works are excluded
  from the average rather than counted as zero — see §6.)*

**Threads → `Tagged Works`**
- Relation: `Tagged Media`
- Property: `Name`
- Calculate: **Count all**

---

## 6. Formulas (paste exactly — Notion formula 2.0 syntax)

**Media Log → `Rating #` (hidden, Number output)**
Maps the star select to a number, and returns *empty* for unrated items so they
don't corrupt averages.
```
if(empty(prop("Rating")), toNumber(""),
  if(prop("Rating") == "★★★★★", 5,
  if(prop("Rating") == "★★★★", 4,
  if(prop("Rating") == "★★★", 3,
  if(prop("Rating") == "★★", 2, 1)))))
```

**Media Log → `Canon Flag` (Text output)**
Auto-surfaces canon-worthy work: 4+ stars and finished.
```
if(prop("Rating #") >= 4 and prop("Status") == "Finished", "🏛️", "")
```

That is the complete formula set — two formulas, one of them purely mechanical.
No `Days Since Finished`, no `Cross-Pollination Score` (both cut in the approved
design as decorative).

---

## 7. Views (exact filters and sorts)

### Media Log views

**① All Media** *(master table — the safety net)*
- Layout: Table
- Filter: none
- Sort: `Finished On` ↓ (descending)
- Visible props: `Name`, `Type`, `Status`, `Rating`, `Canon Flag`, `Creator`, `Threads`

**② Inbox** *(where recommendations land)*
- Layout: Table
- Filter: `Status` is `Heard About`
- Sort: `Created time` ↓
- Visible props: `Name`, `Type`, `Heard From`, `Threads`
- *Purpose: the "preserve recommendations from conversations / critics / podcasts"
  requirement. Capture the mention here; promote to `Queue` when you commit.*

**③ Up Next** *(what to experience tonight)*
- Layout: Board, grouped by `Type`
- Filter: `Status` is `Queue`
- Sort (within group): `Created time` ↑
- Visible props: `Name`, `Rating`, `Heard From`

**④ The Canon** *(taste, made visible)*
- Layout: Board, grouped by `Type`
- Filter: `Canon Flag` is not empty
- Sort: `Rating #` ↓, then `Finished On` ↓
- Visible props: `Name`, `Rating`, `Creator`, `Threads`

**⑤ ATMOM Feed** and **⑥ BiRD Feed** *(Feeds the Work — one per active project)*
- Layout: Table (or Gallery)
- ⑤ Filter: `Threads` contains `ATMOM`
- ⑥ Filter: `Threads` contains `BiRD`
- Sort: `Rating #` ↓
- Visible props: `Name`, `Type`, `Rating`, `Threads`
- *Why two views instead of one grouped view: Notion relation filters can target a
  specific related page (`Threads contains ATMOM`) but cannot group by "related
  page where Kind = Project." Two linked views is the clean, buildable way to get
  per-project separation. **To add a future project:** duplicate one of these
  blocks on the dashboard and swap the filter to the new Project thread. No schema
  change.*

### Creators views

**⑦ Open Loops** *(the honest recommendation engine)*
- Layout: Table
- Filter: `Logged Works` ≥ `2` **AND** `Avg Rating` ≥ `4`
- Sort: `Avg Rating` ↓, then `Logged Works` ↓
- Visible props: `Name`, `Role`, `Logged Works`, `Avg Rating`
- *Purpose: surfaces creators you've repeatedly loved → open the row to see their
  `Works` and spot what you haven't experienced yet. Notion can't predict taste;
  this reveals the gap in taste you've already proven.*

**⑧ All Creators**
- Layout: Table
- Filter: none
- Sort: `Logged Works` ↓

### Threads views

**⑨ By Kind** *(the whole vocabulary at a glance)*
- Layout: Board, grouped by `Kind`
- Filter: none
- Sort (within group): `Tagged Works` ↓
- Visible props: `Name`, `Tagged Works`

---

## 8. Dashboard layout

One page titled **🜍 Mythology Engine**. Top to bottom, no nesting:

```
┌─────────────────────────────────────────────────────────────┐
│  🜍 MYTHOLOGY ENGINE                                          │
│                                                              │
│  [ + Log a Rec ]   [ + Add to Queue ]      ← Button blocks   │
│                                                              │
│  ── UP NEXT ───────────────────────────────                  │
│  (linked view ③ Up Next — board by Type)                     │
│                                                              │
│  ── FEEDS THE WORK ────────────────────────                  │
│  ┌─────────────────────┐  ┌─────────────────────┐            │
│  │ ATMOM Feed (view ⑤) │  │ BiRD Feed (view ⑥)  │  ← 2-col   │
│  └─────────────────────┘  └─────────────────────┘            │
│                                                              │
│  ── WHAT I LOVE ───────────────────────────                  │
│  ┌─────────────────────┐  ┌─────────────────────┐            │
│  │ The Canon (view ④)  │  │ Open Loops (view ⑦) │  ← 2-col   │
│  └─────────────────────┘  └─────────────────────┘            │
│                                                              │
│  ── INBOX ─────────────────────────────────                  │
│  (linked view ② Inbox — recent recommendations)              │
└─────────────────────────────────────────────────────────────┘
```

**Button block configs** (Notion Buttons):

`+ Log a Rec` — *captures a recommendation in one click, before you've committed.*
- Action: Add page to → **Media Log**
- Set `Status` = `Heard About`
- Then: Open the new page (so you can type the title + `Heard From`)

`+ Add to Queue` — *for something you've decided to experience.*
- Action: Add page to → **Media Log**
- Set `Status` = `Queue`
- Then: Open the new page

All five view blocks on the dashboard are **linked views** of the source databases
(Notion: `/Create linked view of database`), not new databases.

---

## 9. Day-one seed list

Enter this before using the system, so Canon / Feeds the Work / Open Loops have
real signal immediately.

### 9a. Threads — seed the full vocabulary first
*(Create these before the media, so the relations resolve as you tag.)*

**Projects** (`Kind = Project`):
`ATMOM` · `BiRD`

**Canon** (`Kind = Canon`):
`Personal Canon — Top Tier` · `Foundational Influences` · `Recurring Obsessions` ·
`Creative DNA`

**Themes** (`Kind = Theme`):
`Grief` · `Identity` · `Consciousness` · `Spirituality` · `Meaning` · `Death` ·
`Memory` · `Time` · `Fate` · `Redemption` · `Transformation` · `Myth` ·
`Folklore` · `Isolation` · `Mystery` · `Existentialism` · `Reality Breakdown` ·
`Cosmic Horror` · `Jungian Psychology` · `Polar Horror` · `Transcendence`

**Moods** (`Kind = Mood`):
`Melancholy` · `Dread` · `Dreamlike` · `Transcendent` · `Weird` · `Meditative` ·
`Haunting` · `Atmospheric` · `Reflective` · `Uncanny`

*(`Polar Horror` and `Transcendence` are added to Themes because the ATMOM/BiRD
influence sets reference them directly.)*

### 9b. Creators — seed those attached to the media below
`David Lynch` (Director, Writer) · `Damon Lindelof` (Showrunner, Writer) ·
`Fabrice Gobert` (Director) · `Jane Campion` (Director) ·
`Nic Pizzolatto` (Writer) · `Cary Joji Fukunaga` (Director) ·
`David Kajganich` (Showrunner) · `Baran bo Odar` (Director) ·
`Jantje Friese` (Writer) · `Andrei Tarkovsky` (Director) ·
`John Carpenter` (Director) · `H.P. Lovecraft` (Author) ·
`Ridley Scott` (Director) · `Ray McKinnon` (Showrunner) ·
`Brit Marling` (Writer) · `Zal Batmanglij` (Director) · `Kate Purdy` (Writer)

### 9c. Media Log — the calibration set
The 11 five-star anchors get `Status: Finished` + `Rating: ★★★★★`. The additional
ATMOM/BiRD influences get `Status: Finished` with **Rating left blank** (set it
yourself on review — these aren't fabricated 5-stars, they're cited influences).

| Name | Type | Status | Rating | Creator | Threads |
|---|---|---|---|---|---|
| The Leftovers | TV | Finished | ★★★★★ | Damon Lindelof | Personal Canon — Top Tier; BiRD; Grief; Spirituality; Melancholy; Transcendent |
| Les Revenants | TV | Finished | ★★★★★ | Fabrice Gobert | Personal Canon — Top Tier; BiRD; Grief; Death; Uncanny; Dreamlike |
| Top of the Lake | TV | Finished | ★★★★★ | Jane Campion | Personal Canon — Top Tier; Mystery; Atmospheric; Haunting |
| True Detective S1 | TV | Finished | ★★★★★ | Nic Pizzolatto | Personal Canon — Top Tier; Existentialism; Cosmic Horror; Dread |
| Twin Peaks | TV | Finished | ★★★★★ | David Lynch | Personal Canon — Top Tier; BiRD; Mystery; Weird; Dreamlike; Uncanny |
| Twin Peaks: The Return | TV | Finished | ★★★★★ | David Lynch | Personal Canon — Top Tier; BiRD; Reality Breakdown; Weird; Uncanny |
| The Terror | TV | Finished | ★★★★★ | David Kajganich | Personal Canon — Top Tier; ATMOM; Isolation; Polar Horror; Dread |
| Dark | TV | Finished | ★★★★★ | Baran bo Odar | Personal Canon — Top Tier; Time; Fate; Memory; Existentialism |
| Stalker | Film | Finished | ★★★★★ | Andrei Tarkovsky | Personal Canon — Top Tier; ATMOM; Meaning; Meditative; Atmospheric |
| Solaris | Film | Finished | ★★★★★ | Andrei Tarkovsky | Personal Canon — Top Tier; ATMOM; Memory; Grief; Consciousness; Meditative |
| The Thing | Film | Finished | ★★★★★ | John Carpenter | Personal Canon — Top Tier; ATMOM; Isolation; Dread; Polar Horror |
| At the Mountains of Madness | Book | Finished | *(blank)* | H.P. Lovecraft | ATMOM; Cosmic Horror; Polar Horror; Isolation |
| Alien | Film | Finished | *(blank)* | Ridley Scott | ATMOM; Isolation; Dread; Cosmic Horror |
| Rectify | TV | Finished | *(blank)* | Ray McKinnon | BiRD; Redemption; Grief; Meditative; Reflective |
| The OA | TV | Finished | *(blank)* | Brit Marling | BiRD; Consciousness; Transcendence; Spirituality; Identity |
| Undone | TV | Finished | *(blank)* | Kate Purdy | BiRD; Consciousness; Reality Breakdown; Identity; Dreamlike |

After seeding: **The Canon** shows 11 anchors, **ATMOM Feed** shows 6 influences,
**BiRD Feed** shows 6, **Open Loops** already flags David Lynch (2 works, avg 5.0)
and Andrei Tarkovsky (2 works, avg 5.0). The system is useful before you log
anything new — which is the entire point.

---

## Build checklist (one-glance verification)

- [ ] 3 databases created
- [ ] Media Log: 9 user props + 2 formulas, `Type`/`Status`/`Rating` options set
- [ ] Creators: 3 user props + `Works` relation + 2 rollups
- [ ] Threads: 3 user props + `Tagged Media` relation + 1 rollup, `Kind` options set
- [ ] Both relations are two-way with the synced props named `Works` / `Tagged Media`
- [ ] `Rating #` and `Canon Flag` formulas pasted; `Rating #` hidden everywhere
- [ ] 9 views built with the exact filters/sorts in §7
- [ ] Dashboard page with 2 buttons + 5 linked views
- [ ] Seed: 4 Project/Canon threads, 31 Theme/Mood threads, 17 creators, 16 media rows
