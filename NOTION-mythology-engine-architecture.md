# Notion Workspace Design: The Mythology Engine

A media-tracking + creative-research system for a filmmaker / writer / musician /
researcher whose consumption habits are raw material for original work — every
film, book, game, or podcast is a potential vein of theme, style, or creator
lineage worth mining for projects like ATMOM and BiRD/Plērōma. The brief, in one
sentence: **a frictionless intake system that quietly turns "what I watched" into
"what I'm drawing from."**

Influences synthesized:
- **Marie Poulin** — capture should be nearly free; organize on review, not at intake
- **August Bradley** — the database is a relational hub, not a list; relations and
  rollups turn "I watched X" into "X feeds project Y, shares a creator with Z, sits
  in theme cluster W"
- **Thomas Frank** — the dashboard is a decision-support tool used weekly ("what do
  I watch next," "what's feeding this scene"), not an archive you remember to open

---

## Round 1 — The "complete" architecture (every requirement, taken literally)

### Databases (6)
1. **Media Log** — every piece of media: Film, TV, Book, Documentary, Game, Podcast
2. **Creators** — directors / authors / musicians / showrunners / developers / hosts
3. **Themes** — recurring motifs (doubling, cosmic indifference, institutional
   dread, transformation, memory/archive…)
4. **Creative Threads** — ATMOM, BiRD, future music or film projects
5. **Personal Canon** — the works that define taste
6. **Recommendation Queue** — what to consume next

### Media Log properties
Title · Type (select) · Status (Queue/In Progress/Finished/Abandoned/Revisiting) ·
My Rating (1–5) · Date Finished · Format Notes (catch-all text) · Recommended By ·
Mood/Energy tag · relations to Creators, Themes, Creative Threads, Personal Canon

### Relations / Rollups
Two-way relations between Media Log and each of Creators / Themes / Creative
Threads. Rollups: work-count and average-rating on Creators and Themes; "everything
tagged as research" rollup on each Creative Thread.

### Formulas
- `Canon Candidate` — flags items rated ≥4 and finished
- `Days Since Finished`
- `Cross-Pollination Score` — count(Themes) × count(Creative Threads)

### Views & Dashboard
~6 views per database (By Type, In Progress, Queue by Mood, Canon, Feeds
ATMOM/BiRD, By Creator, By Theme, This Year…) feeding a dashboard with a
quick-add button, "currently consuming" gallery, "feeds ATMOM / feeds BiRD / pure
pleasure" columns, a recommendation queue, and a theme cluster map.

---

## Self-critique

This is a textbook over-built system. Five problems, in order of severity:

1. **Six databases is five too many for one person.** Every relation is a tax.
   Logging one film now means deciding whether it's Canon (separate DB?), tagging
   Creators, Themes, Creative Threads, *and* possibly adding it to a Recommendation
   Queue. That's not frictionless — that's a part-time librarian job. "Canon" isn't
   a different *kind* of thing than a logged film; it's a property an item earns.

2. **Recommendation Queue duplicates Status.** "Queue" already exists as a status
   on Media Log. A second database for "things to watch next" creates two places
   that can disagree about whether something's already been logged — a textbook
   single-source-of-truth violation.

3. **"Recommendation intelligence" is over-promised.** Notion has no model of
   taste; it cannot infer "you'll love *Annihilation* because you loved *Under the
   Skin*." What it *can* do is make existing patterns visible — a director's
   unwatched backlog, a theme's depth in your ratings — so *you* spot the
   recommendation. `Cross-Pollination Score` is decorative: it multiplies two
   counts into a number with no interpretive meaning. That's complexity dressed up
   as intelligence.

4. **The catch-all "Format Notes" field will rot.** A field that means "runtime"
   for a film and "page count" for a book and "episode count" for a podcast has no
   stable identity — nobody reliably fills in a field whose meaning shifts based on
   another field's value. Either commit to per-type properties (more clutter) or
   don't pretend to capture it.

5. **~36 views across six databases is a maintenance liability, not a feature.**
   Every view is something that silently breaks when a property gets renamed. View
   count is the enemy of "low maintenance," not evidence of thoroughness.

The *instinct* behind all six databases is correct — the user genuinely needs to
see "what's feeding ATMOM," "what's my taste in directors," "what themes recur."
But a single relational database with well-aimed views answers all of those
questions without inventing a new object type for each one.

---

## Round 2 — Simplified redesign

**Three databases. One dashboard. Everything else is a view.**

### 1. Media Log — the only place anything gets logged
| Property | Type | Why |
|---|---|---|
| Name | Title | — |
| Type | Select: Film · TV · Documentary · Book · Game · Podcast | the one required category |
| Status | Select: Queue · In Progress · Finished · Abandoned | drives every "what's next" view |
| Rating | Select: ⭐️ 1–5 | a select, not a number — forces a deliberate choice instead of a silent 0 |
| Finished On | Date | powers "this year" and recency views |
| Note | Rich text (one field, freeform) | runtime, page count, why it mattered, who recommended it — one flexible field beats five rigid ones a person won't reliably fill in |
| Creator | Relation → Creators | — |
| Threads | Relation → Threads | carries themes, projects, *and* canon — see below |

Seven properties. Everything else is inferred from these.

### 2. Creators
Name · **Role** (multi-select: Director · Author · Musician · Showrunner ·
Developer · Host — people cross roles, e.g. Kaufman writes *and* directs) · Note ·
rollups for **Logged Works** (count) and **Avg Rating**.

This single database does most of the heavy lifting for "creator exploration":
open any creator's page and see every logged work, your rating pattern, and your
own notes on them — in one place, with zero extra tagging effort beyond the one
relation on Media Log.

### 3. Threads — replaces Themes + Creative Threads + Personal Canon
The actual simplification, and the part worth defending: **a theme, a project, and
a canon collection are the same kind of object** — each is a *lens* you view media
through, not a different category of thing. Splitting them into three databases
just because their names differ triples the maintenance surface for no functional
gain.

Name · **Kind** (select: Theme · Project · Canon) · Note (what this lens is, what
you're looking for when you tag into it) · rollup for **Tagged Works**.

Examples of entries: *Cosmic horror* (Theme) · *ATMOM* (Project) · *Doubling/twins*
(Theme) · *BiRD* (Project) · *Personal Canon — Top Tier* (Canon).

Tagging *Annihilation* into "Doubling/twins," "ATMOM," and "Personal Canon — Top
Tier" is one relation field, filled three times, in one motion — not three database
entries maintained in three separate places.

### Formulas — exactly one
```
Canon Flag = if(prop("Rating") ≥ 4 and prop("Status") = "Finished", "🏛️", "")
```
Surfaces canon-worthy work at a glance without manually filing every four-star film
into a "Canon" thread — while leaving the deliberate act of curating into *Personal
Canon — Top Tier* available for the handful of works that earn an actual write-up.

`Cross-Pollination Score` and `Days Since Finished` are cut entirely: neither
answers a question the user will actually ask on a Tuesday night picking what to
watch.

### Views — four, total, across the whole system
1. **Up Next** — `Status = Queue`, grouped by Type, sorted by date added. The only
   view needed at the actual moment of choosing.
2. **Feeds the Work** — `Threads` relation includes any entry where `Kind =
   Project`, grouped by Thread. Answers "what have I been absorbing that's shaping
   this project."
3. **The Canon** — `Rating ≥ 4 and Status = Finished`, grouped by Type. Taste, made
   visible.
4. **Open Loops** (on Creators) — `Logged Works ≥ 2 and Avg Rating ≥ 4`. The
   closest thing to an honest recommendation engine Notion can offer: *"you clearly
   love this person's work — what else have they made that you haven't seen?"*

### Dashboard — one page, four blocks, nothing nested
1. **Quick-add button** — creates a Media Log entry pre-filled with `Status =
   Queue`. The entire "frictionless tracking" requirement lives here: logging
   something costs one click and a title.
2. **Up Next** (linked view) — what to consume tonight
3. **Feeds the Work** (linked view) — what's shaping ATMOM/BiRD right now, for
   when you sit down to write or storyboard
4. **The Canon** and **Open Loops**, side by side — taste made visible, and the
   nearest honest thing to "what should I watch next based on what I already love"

---

## Why Round 2 is more elegant

- **3 databases, not 6** — half the relation-tax, half the places to file something wrong
- **7 properties on the core database, not 10+** — each one answers a real question
- **1 formula, not 3** — and it does genuine interpretive work (surfacing canon)
  rather than performing intelligence it doesn't have
- **4 views, not ~36** — each maps to an actual weekly moment (choosing what to
  watch, sitting down to write, checking your own taste), not to "things a database
  could theoretically display"
- **Themes + Projects + Canon collapsed into one "Threads" database** — because
  structurally they're the same object (a lens), and treating them as different
  triples the upkeep for zero functional gain
- **Honest about "recommendation intelligence"** — instead of a fake-smart formula,
  the design leans on the one thing relational databases are genuinely good at:
  making the user's *own* patterns visible to them. "Open Loops" doesn't predict
  taste; it reveals gaps in creators already proven to be loved. That's sharper and
  more honest than a number pretending to know what you'll like next.

This is Poulin, Bradley, and Frank in one motion: Bradley's relational hub-and-spoke
thinking, sized down to what one person can actually maintain (Poulin's
low-friction-capture, organize-on-review), surfaced through views built around real
decision moments rather than data completeness (Frank's usability lens). The result
should feel less like a database and more like a mirror that quietly shows the user
what they're drawn to — which, for someone whose work is turning influences into new
myths, is the whole point.
