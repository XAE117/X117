# Mythology Engine — Clean Dashboard (Build Notes)

Presentation-layer dashboard built on top of the existing Mythology Engine
databases. No core architecture, properties, relations, or seed data were
modified — this is a purely additive view layer.

## 1. Clean Dashboard URL

https://app.notion.com/p/379c051d73d281a880abc84f99324d9f

Title: **Mythology Engine — Clean Dashboard**
Standalone page (workspace level) — file it wherever you like in the sidebar.

## 2. Source Dashboard URL

The original/source dashboard (left untouched, kept for reference):

https://app.notion.com/p/379c051d73d28196b2cec7f0b95c4488  (🜍 Mythology Engine)

## 3. Database URLs

| Database   | Database page                                              | Data source (collection)                          |
|------------|------------------------------------------------------------|---------------------------------------------------|
| Media Log  | https://app.notion.com/p/96f87771c9d340c38d2112da1ad40cd1  | collection://f79f6122-9b26-43b8-a640-3224ca7d071f |
| Creators   | https://app.notion.com/p/a3cb858d8cb0449e851c5bf360935058  | collection://ff43c81f-828e-4895-b639-c9149d3bc454 |
| Threads    | https://app.notion.com/p/e0be54c693404c1d9e9a109f1fd7abd1  | collection://822b131c-ad7a-46b5-a8b1-e2dd8890ca1e |

## 4. Current Architecture Summary

Three databases, related to each other:

- **Media Log** — the central log of works (TV, Film, Documentary, Book,
  Podcast, Game, Essay, Other). Key properties: `Name`, `Type`, `Status`
  (Heard About / Queue / In Progress / Finished / Abandoned), `Rating`
  (★–★★★★★), `Finished On`, `Heard From`, `Note`, plus relations
  `Creator` → Creators and `Threads` → Threads.
- **Creators** — directors, writers, authors, showrunners, musicians, etc.
  Related to Media Log via `Works`. Rollups: `Logged Works` (count),
  `Avg Rating` (average of Media Log `Rating #`).
- **Threads** — a single collapsed database for Projects, Canon, Themes, and
  Moods, distinguished by the `Kind` select. Related to Media Log via
  `Tagged Media`. This is where ATMOM, BiRD / Plērōma, "Personal Canon —
  Top Tier", and all theme/mood tags live.

The dashboard surfaces this data through six linked views (see §7).

## 5. Helper Properties Created

These live on the databases (not on the dashboard page) and exist purely to
make filters expressible. They are **hidden** in every user-facing view.

| Property      | Database  | Type    | Definition (intent)                                              |
|---------------|-----------|---------|------------------------------------------------------------------|
| `Rating #`    | Media Log | formula | Converts ★ string → number (★★★★★ = 5 … ★ = 1) for sorting/math. |
| `Thread Tags` | Media Log | rollup  | Pulls the related Threads' titles into a rollup.                 |
| `Thread Names`| Media Log | formula | `format(prop("Thread Tags"))` → text version of thread names.    |
| `Qualifies`   | Creators  | formula | Emits text "true"/"false": Logged Works ≥ 2 AND Avg Rating ≥ 4.  |

## 6. Why Those Helper Properties Exist

The Notion view DSL used to build these views has hard limitations that make
the requested filters/sorts impossible to express directly:

- **Relation-"contains" filters are silently dropped.** Filtering Media Log
  by `Threads contains "ATMOM"` (by name, URL, or UUID) produces an empty
  filter. Workaround: `Thread Tags` (rollup) → `Thread Names` (text formula
  via `format()`), then filter `Thread Names contains "ATMOM"` / `"BiRD"` /
  `"Personal Canon — Top Tier"` as plain text. (`join()` did NOT work for
  this — only `format()` produced matchable text.)
- **Rollups are typed as text, so numeric comparisons are rejected.**
  `Avg Rating >= 4` errors with "Operator '>=' is not supported for text
  properties." Workaround: the `Qualifies` formula does the numeric test
  internally and emits the text "true"/"false", which is filterable.
- **The star Rating is a select, not a number**, so it can't be sorted by
  magnitude or averaged. `Rating #` re-types it as a number for sorting and
  for the Creators `Avg Rating` rollup.

Note on the Personal Canon filter: `Canon Flag != ""` was found to silently
match *every* row (a DSL bug with `every` / `string_is_not` on formula
properties). The working form is an exact match `Canon Flag = "🏛️"`, which
is what the live view uses.

## 7. Verified Working Views

All six were tested against live data (row-by-row) before sign-off.

| Section / View      | Database  | Layout  | Filter                                                              | Sort                              | Verified result |
|---------------------|-----------|---------|--------------------------------------------------------------------|-----------------------------------|-----------------|
| **Tonight**         | Media Log | Gallery | `Status = Queue OR Status = Heard About`                            | `Rating #` desc                   | 0 rows now (all seed data is Finished); filter correct, will populate as new media is logged. |
| **ATMOM Feed**      | Media Log | Gallery | `Thread Names contains "ATMOM"`                                     | `Rating #` desc                   | Stalker, Solaris, Alien, At the Mountains of Madness, The Terror, The Thing. |
| **BiRD / Plērōma**  | Media Log | Gallery | `Thread Names contains "BiRD"`                                      | `Rating #` desc                   | Les Revenants, Twin Peaks, Twin Peaks: The Return, The Leftovers, The OA, Rectify, Undone. |
| **Personal Canon**  | Media Log | Gallery | `Canon Flag = "🏛️" OR Thread Names contains "Personal Canon — Top Tier"` | `Rating #` desc, `Finished On` desc | 12 canon-flagged works + Dark (tagged Top Tier but below 4★). |
| **Open Loops**      | Creators  | Table   | `Qualifies = "true"`                                                | `Avg Rating` desc, `Logged Works` desc | David Lynch, Andrei Tarkovsky. |
| **Inbox**           | Media Log | Table   | `Status = Heard About`                                              | (none)                            | 0 rows now (no items in Heard About yet); filter correct. |

Helper properties (`Rating #`, `Thread Tags`, `Thread Names`, `Qualifies`)
are hidden in all six views.

## 8. Known Manual Cleanup (Notion UI only — not doable via API)

1. **Delete the two diagnostic views.** While verifying the Canon Flag bug,
   two temporary table views were created on the **Media Log** database, both
   tabbed **"⚠️ DELETE ME — diagnostic view, safe to remove"**. There is no
   API method to delete a view, so remove both tabs manually. They touch no
   data and do not affect the clean dashboard.
2. **Optional: arrange sections into columns.** The Notion API cannot place
   inline database blocks side-by-side, so the six sections are stacked
   vertically. To get a side-by-side layout, drag the blocks into columns
   manually in the Notion UI.

## 9. Warnings

- **Do not delete the helper properties** (`Rating #`, `Thread Tags`,
  `Thread Names`, `Qualifies`) unless you are also rebuilding the filters
  that depend on them. Removing any of them silently breaks the ATMOM, BiRD,
  Personal Canon, Open Loops, and Tonight views (the filters/sorts have no
  native equivalent — see §6).
- **Do not redesign the architecture** (the three databases, their
  properties, relations, rollups, or seed data) without explicit permission.
  This dashboard is a presentation layer only and assumes the existing
  schema is stable.
