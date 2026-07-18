# SIXPM Product Review — July 17, 2026

## Product thesis

SIXPM should answer one question faster and more credibly than a general
listing app: **what can I actually do tonight?**

The product is not a smaller Yelp, Fandango, or concert calendar. Its edge is
turning three fragmented local catalogs into a short, feasible evening plan.
That makes trust, constraint handling, and decision speed more important than
raw inventory.

## Research synthesis

The review compared current planning and discovery patterns from:

- [The Nudge](https://www.nudgetext.com/the-nudge-app): save a complete plan,
  then mark the experience done
- [Beli](https://beliapp.com/beli-home): ranking, maps, and personalized
  recommendations make a large catalog usable
- [Santai](https://santai.app/): constrained one-choice decisions reduce
  browsing fatigue
- [The Infatuation](https://www.theinfatuation.com/los-angeles): explicit
  occasion, neighborhood, and editorial framing increase confidence

The resulting principle is **commitment before catalog**:

1. Lead with a few feasible choices.
2. Explain why each choice works.
3. Make changing the answer easy.
4. Keep exhaustive browsing available but secondary.

## What changed

### Decision and trust

- Replaced the catalog-first landing experience with two validated lineups and
  a few alternatives.
- Enforced an eight-mile maximum for generated plans.
- Excluded restaurants with missing coordinates or unknown/closed hours.
- Excluded already-started film and jazz events.
- Added real date-aware sharing and truthful empty states.
- Removed automatic notification permission prompts.

### Discovery

- Added universal film, jazz, and restaurant search.
- Grouped cinema results by film with venue/showtime choices.
- Added date, radius, format, price, neighborhood, open-now, and vibe controls
  where the data supports them.
- Made cinema and jazz maps operational.
- Added local saved lists and direct restaurant detail links.

### Accessibility and responsive design

- Converted disclosure cards to keyboard-operable semantic controls.
- Added expanded-state semantics, stable navigation, route titles, focusable
  controls, and sufficient muted-text contrast.
- Verified all primary routes at desktop and mobile breakpoints.

### Performance and resilience

- Split routes and large editorial datasets into on-demand chunks.
- Removed Leaflet from the global startup path and bundled it for map routes.
- Reduced the main JavaScript bundle to about 255 KB (82 KB gzip).
- Replaced unbounded timestamped service-worker caching with a bounded,
  same-origin, network-first strategy.
- Added install metadata, canonical metadata, structured data, robots, and a
  sitemap.

### Data pipeline

- Added Greater LA ingestion validation and hard planning-coverage checks.
- Added source-level restaurant scrape outcomes.
- Prevented a failed live restaurant scrape from rewriting stale data with a
  fresh timestamp.
- Added explicit secrets for AMC and Google Places to the scheduled workflow.

## Verification snapshot

- Unit tests: **45 passing**
- Desktop/mobile Playwright journeys: **36 passing**
- Accessibility Lighthouse score: **100**
- Best Practices Lighthouse score: **100**
- SEO Lighthouse score: **100**
- Performance Lighthouse score: **87**
- High-severity dependency findings: **0**

The initial-route bundle no longer includes the 428 KB biography dataset or
Leaflet. First Contentful Paint improved from roughly 2.9s to 1.4s in the local
Lighthouse comparison.

## Release gates

The software is release-ready when `npm run release:check` passes. The catalog
gate measures usable planning depth rather than rewarding raw inventory:

1. At least 90% of published restaurants must have coordinates.
2. At least 20 restaurants across 10 neighborhoods must have coordinates and
   hours, with eight open dinner options on every day of the coming week.
3. Tracked cinema sources with no future screenings must be restored or
   intentionally retired.
4. Every restaurant refresh must record source-level outcomes and pass the live
   source write gate.

The interface degrades safely: restaurants with coordinates but unknown hours
remain browsable but cannot enter a generated plan. Source-only names with no
location evidence are not published.

## Next product bets after launch

1. **Saved whole evenings** — save and share a complete lineup, then mark it
   done.
2. **Preference learning** — rank recommendations from saved/skipped/completed
   choices without hiding the underlying constraints.
3. **Freshness provenance** — expose source and checked-at details on individual
   listings when confidence is uncertain.
4. **Operational routing** — transit/drive-time estimates and reservation
   availability, only after source reliability is sufficient.
5. **Editorial cadence** — a small weekly “three nights worth leaving home for”
   module rather than more undifferentiated inventory.
