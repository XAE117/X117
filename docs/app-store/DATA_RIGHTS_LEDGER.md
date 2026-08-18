# SIXPM iOS Data Rights and Attribution Ledger

Status definitions:

- `approved`: a documented usage basis, allowed fields, required attribution, and freshness/persistence policy are recorded; catalog tooling may include only those declared fields.
- `pending`: an unresolved source or usage question; catalog tooling must reject it.
- `disabled`: deliberately excluded from iOS, whether or not it remains in the legacy web product.

No entry is approved merely because a web scraper currently returns data. This is an
implementation control ledger, not legal advice or a claim that a third party has
granted broader permission. The canonical machine-readable source is
[`config/ios-provider-policy.json`](../../config/ios-provider-policy.json); the
catalog builder and validator reject every source that is not `approved`.

| Provider / source class | Current iOS state | Permitted iOS fields today | Recorded basis and boundary |
| --- | --- | --- | --- |
| AMC Theatres catalog API | approved, limited | AMC theater identity, neighborhood, official URL, screening title/date/time/format/notes, and AMC link | [AMC's vendor guidance](https://developers.amctheatres.com/GettingStarted/NewVendorRequest) states developers may use catalog APIs to display AMC showtimes and associated movie data. The app excludes commerce, ticket purchase, non-AMC data, API keys, and all undeclared fields. Attribution: “Showtimes supplied by AMC Theatres.” Freshness maximum: 36 hours. |
| SIXPM first-party editorial restaurant records | approved, seed-only | The two existing `manualPick` records after Google URLs and provider-derived enrichment are removed: name, address, editorial copy, hours, and owner-maintained coordinates | Provenance is recorded in `public/restaurants-manual.json`; only records marked `locationProvenance: sixpm-editorial` are emitted. This is intentionally a two-record starter set, not clearance for scraped restaurant editorial data. Attribution: “Curated by SIXPM.” |
| TMDB API / imagery | disabled | none | [TMDB's FAQ](https://developer.themoviedb.org/docs/faq) supplies attribution guidance for free non-commercial API use, but V1 keeps `VITE_IOS_TMDB_ENRICHMENT` off until the release usage basis is explicitly cleared. No TMDB text, IDs, images, credits, or metadata may enter the iOS feed. |
| Google Places / Google Maps content | disabled | none | [Places policies](https://developers.google.com/maps/documentation/places/web-service/policies) impose attribution, map-display, and caching restrictions. Legacy Google URLs, coordinates, and hours are stripped before web persistence and before catalog generation; V1 uses external Apple Maps directions only. |
| Non-AMC cinema and venue sources | pending | none | A source-specific written basis, allowed facts, freshness policy, and required attribution are needed before catalog inclusion. |
| Jazz venues and event aggregators | pending | none | Jazz is represented as an explicit disabled feed until every included source is independently cleared. |
| Restaurant editorial, reservation, and guide sources | pending | none | Scraped editorial copy, source badges, reservation links, and location data are excluded from the iOS catalog. |
| OpenStreetMap, CARTO, and Leaflet | disabled for iOS | none | Embedded maps are out of V1. The app opens Apple Maps only as an external directions destination. |
| SIXPM Vercel catalog transport | approved, transport-only | Versioned JSON feeds with SHA-256 index digests | The user-controlled [SIXPM deployment](https://sixpm.vercel.app/) transports the catalog. Transport approval does not approve third-party content. |
| Local catalog cache and saved-evening snapshots | controlled local processing | Only the already-approved fields from a verified V1 feed; no raw legacy payload, key, or pending provider field | A full offline catalog cache is revalidated on every use and deleted on integrity or freshness failure. Saved evenings retain a provider section only until that section’s own expiry; loading or persisting a plan redacts expired fields and rewrites Preferences. |

## Native catalog rules

1. `pending` and `disabled` records fail catalog generation, rather than being filtered only in a view.
2. Accepted records carry provider IDs, attribution, schema version, generation time, expiry, and a SHA-256-indexed payload.
3. `scripts/build-ios-catalog.js` emits only hard-coded allowed fields; `scripts/validate-ios-catalog.js` rejects non-approved providers, stale AMC data, digest mismatches, and forbidden provider markers.
4. The browser/native client rejects an invalid or expired remote catalog. It may use only a previously verified local snapshot, and deletes the entire snapshot if any active feed fails integrity or freshness validation.
5. A saved evening can include only a declared AMC showing and a declared first-party food pick. The AMC showing must start before the approved AMC persistence window ends; an expired provider section is redacted to its provider and expiry marker before the plan is rendered or rewritten.
6. Provider metadata is never a substitute for the public legal, privacy, support, and attribution disclosures required before release.
