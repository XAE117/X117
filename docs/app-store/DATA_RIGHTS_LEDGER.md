# SIXPM iOS Data Rights and Attribution Ledger

Status definitions:

- `approved`: a documented usage basis, allowed fields, required attribution, and freshness/persistence policy are recorded; catalog tooling may include only those declared fields.
- `pending`: an unresolved source or usage question; catalog tooling must reject it.
- `disabled`: deliberately excluded from iOS, whether or not it remains in the legacy web product.

No entry is approved merely because a web scraper currently returns data. Evidence links and exact terms are added during Phase 2 after current official-source review.

| Provider / source class | Current iOS state | Permitted iOS fields today | Required decision before approval |
| --- | --- | --- | --- |
| SIXPM first-party editorial records | pending | none until per-record provenance exists | Record author, source evidence, verification date, and permitted facts for each entry. |
| AMC developer API | pending | none | Confirm the agreement permits the planned catalog, attribution, caching, external links, and free App Store distribution. |
| TMDB API / imagery | pending | none | Confirm permitted non-commercial/mobile use and exact attribution; otherwise disable enrichment. |
| Google Places / Google Maps content | disabled | none | Do not persist or display Google-derived place content in the iOS catalog or on a non-Google map. A future approved use would need its own compliant design. |
| Eater, Infatuation, Resy, Thrillist, Michelin, and other editorial lists | pending | none | Establish whether independently verified factual listing data can be used, with source-specific terms and attribution. |
| Venue official sites and venue calendars | pending | none | Document each venue's permitted use, facts versus copyrighted copy/images, refresh policy, and attribution. |
| Songkick, DICE, Eventbrite, ticketing/event aggregators | pending | none | Confirm API/content license and required attribution; otherwise use only provider links where separately cleared. |
| OpenStreetMap, CARTO, Leaflet | disabled for embedded iOS maps | none | V1 uses Apple Maps external directions only; revisit only with proper licensing and attribution architecture. |
| Vercel | pending catalog transport | none | Verify configured transport, cache behavior, public legal URLs, and catalog integrity controls; no third-party content clearance is implied. |

## Native catalog rules

1. `pending` and `disabled` records fail catalog generation, rather than being filtered only in a view.
2. Every accepted record carries provider IDs, attribution requirements, fetched/verified timestamps, and a schema version.
3. Remote feeds must be signed or integrity-checked before the app treats them as current.
4. A stale but previously verified catalog may be shown with its timestamp; an invalid catalog is rejected.
5. Provider metadata is never a substitute for a public legal/support disclosure.
