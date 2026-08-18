# SIXPM iPhone App Store Status

Last updated: 2026-08-18 (Pacific)  
Mission state: active  
Current phase: 6 — Accessibility and iPhone polish

## Mission

Ship SIXPM as a free, ad-free, account-free, iPhone-only App Store app for the United States. The web product remains React 19 + Vite; the native shell will use Capacitor 8 and Xcode 26, target iOS 17+, bundle its UI locally, and fetch only a versioned rights-gated catalog from the SIXPM Vercel deployment.

## Working locations

| Purpose | Location |
| --- | --- |
| Canonical repository | `/Users/jameswalker/Documents/AI Projects - All/10_ACTIVE_PROJECTS/Apps/X117` |
| iOS implementation worktree | `/Users/jameswalker/.codex/worktrees/X117-ios-app-store` |
| iOS implementation branch | `codex/ios-app-store` |
| Production web deployment | `https://sixpm.vercel.app/` |

The canonical checkout has two pre-existing protected changes: a modified `scripts/generate-bio.js` and untracked `AGENTS.md`. They have not been inspected, staged, copied, or changed by this mission.

## Gate log

| Gate | State | Evidence / next action |
| --- | --- | --- |
| 0.1 Repository and dirty-tree revalidation | passed | Protected canonical changes confirmed; iOS work occurs only in the clean Codex worktree. |
| 0.2 PR #11 revalidation and merge | passed | Mergeable, green checks, no human review threads; merged to `main` as `dc15dfa1dc3d78e2e871fe9c0389ff648571b2e9`. |
| 0.3 PR #12 revalidation | passed | Mergeable, green checks, no human review threads before merge. Its original stacked base remained `agent/amc-la-category`; its merge commit `4da559cfe34c6f9bbbd722a0c8b79a4140e14b3d` is not yet on `main`. |
| 0.4 PR #12 integration | passed | The iOS branch carries the reviewed source changes and a fresh cinema regeneration. Conflicting integration PR #13 was closed with an explanation after it was superseded by the resolved release lane. |
| 0.5 Production data reachability | passed | `theaters.json`, `jazz-venues.json`, `restaurants.json`, and the application all returned HTTP 200 on 2026-08-18. Cinema feed timestamp: `2026-08-18T10:25:59.832Z`. |
| 0.6 Native toolchain | passed | Xcode 26.6, iOS 26.5 iPhone simulator, and one Apple Development identity are present. Node 22.23.2 is installed at `/opt/homebrew/opt/node@22`; `.nvmrc` and `package.json` now pin the repository to Node 22. |
| 0.7 Baseline release checks | complete with data warning | Under Node 22: lint, 53 unit tests, production build, and dependency audit pass; 40 desktop/mobile browser checks pass. `release:check` exits 2 only because strict data validation reports five theatre records with no future screenings. This is recorded as a catalog-health condition to resolve through the iOS provider/catalog gate, not waived as a native-release pass. |
| 0.8 Draft release lane | passed | Draft PR #14 (`codex/ios-app-store` → `main`) is the sole authoritative App Store mission lane. |
| 2.1 Provider policy | passed | `config/ios-provider-policy.json` defines machine-readable `approved` / `pending` / `disabled` states. Only limited AMC catalog fields and two owner-authored `manualPick` restaurant records are approved. |
| 2.2 Google Places remediation | passed | The restaurant scraper no longer calls Google Places; its geocoder was removed. The deterministic migration stripped legacy Google URLs from 232 restaurant records and 25 guide records, retaining coordinates/hours only on the two documented editorial records. No remote secret was changed. |
| 2.3 Versioned catalog | passed locally | `public/catalog/v1/` contains SHA-256-indexed cinema, food, and explicit-disabled jazz feeds. It contains 5 AMC theatres / 2,366 screenings and 2 SIXPM editorial restaurants; no TMDB, Google, jazz, or unapproved source payload is emitted. The feed will reach production only through the normal reviewed PR/deployment path. |
| 2.4 Catalog verification | passed | 58 unit tests, lint, production build, catalog-current check, catalog validator, and 40 browser route checks pass under Node 22. The catalog check is deterministic against the cinema scrape timestamp. |
| 3.1 Separate iPhone entry | passed | `ios.html` and `src/ios/` form a standalone React surface. `vite --mode ios` builds only `dist-ios/`, with no legacy public tree copied into the bundle. |
| 3.2 Remote catalog client | passed locally | The client fetches only versioned catalog paths, verifies SHA-256 digests, field allowlists, expiry, source state, and explicit disabled Jazz behavior before rendering. It cannot fall back to `theaters.json`, `restaurants.json`, or jazz source data. |
| 3.3 Product boundary check | passed | `npm run build:ios` produces an isolated local UI bundle (10 generated files in the current build) and `ios:bundle:check` found no excluded products or API-key variable tokens. |
| 3.4 iPhone-size visual QA | passed locally | At 393×852, the catalog rendered without Vite overlays or console errors; evening-first grouped film cards, food browse/detail, and bottom navigation were exercised. This is browser evidence only, not simulator or device proof. |
| 4.1 Capacitor iPhone shell | passed | Capacitor core/CLI/iOS are `8.5.0`; the generated target uses `com.xae117.sixpm`, iOS 17.0 minimum, and `TARGETED_DEVICE_FAMILY = 1`. The iOS shell loads only `dist-ios/index.html`; the build normalizes the isolated Vite `ios.html` artifact to that Capacitor entrypoint. |
| 4.2 Native capability boundary | passed | Only Browser, Calendar, Geolocation, Local Notifications, Network, Preferences, and Share are present through Swift Package Manager. `NATIVE_CAPABILITIES.md` records the prompt, storage, and no-tracking boundaries. Calendar uses the interactive system editor; location and notification permission denials are never automatically re-prompted. |
| 4.3 Native build verification | passed | `npm audit --omit=dev`, lint, 13 focused iOS tests, `npm run build:ios`, and `cap sync ios` passed. An iPhone simulator build completed with `BUILD SUCCEEDED` using `CODE_SIGNING_ALLOWED=NO`; this is compile evidence only, not signed-device proof. |
| 5.1 Rights-bounded saved evenings | passed | A saved plan contains only an approved AMC showing and first-party food record with catalog provenance. It rejects unapproved providers, missing editorial coordinates, insecure links, stale feeds, and showtimes beyond AMC’s 36-hour freshness window. |
| 5.2 Expiring local storage and offline catalog | passed | A verified catalog may be cached only after full validation; integrity or expiry failure deletes that whole cache. On saved-plan read/write, expired AMC or editorial sections are redacted and rewritten in Preferences rather than silently reused offline. |
| 5.3 Local evening actions | passed in browser wiring | The full choose → pair → save → Calendar/reminder/share → completion/delete flow was exercised at 393×852. Calendar/reminder fallbacks are truthful outside iOS, and deletion requires confirmation. The actual native system sheets remain separately unproven until simulator/device QA. |
| 5.4 Phase verification | passed | Under Node 22: `npm run check` passed (80 tests), `npm run catalog:check`, `npm run build:ios`, `npx cap sync ios`, and an iPhone Simulator `xcodebuild` with `CODE_SIGNING_ALLOWED=NO` all passed. |
| 6.1 SIXPM visual identity restoration | passed locally | Historic SIXPM screen captures in the owner's local Photos library and the legacy source supplied the visual authority. The iPhone surface now uses locally bundled Source Serif 4 and Josefin Sans, dense editorial listings, gold frames, venue labels, showtime tags, and deco rules instead of rounded-card UI. At 393×852, browser inspection found no overflow and all visible controls met the 44-point target. An iPhone Simulator inspection used a temporary local, rights-gated catalog solely to make the reviewed data render; the normal release bundle was then rebuilt and re-synced with no localhost endpoint or local-network exception. |
| 6.2 Current normal-bundle verification | passed | Under Node 22: lint, all 85 unit tests, production build, dependency audit, catalog-current/validation, iOS build, Capacitor sync, plist validation, release-bundle local-endpoint guard, diff whitespace check, and an iPhone Simulator `xcodebuild` with `CODE_SIGNING_ALLOWED=NO` all passed. |
| 6.3 Dynamic Type and route focus | passed locally | An app-owned local Capacitor bridge observes iOS Dynamic Type changes and maps categories to proportional custom-font scaling. At the simulator’s `accessibility-large` setting, the masthead stayed intact and dense listings reflowed without clipping; the Simulator was restored to standard `large` afterward. At browser 393×852, route changes move focus to the one `main` landmark, every visible button/link measured at least 44 points, and no horizontal overflow occurred. The temporary rights-gated local catalog and local-network exception used for this native visual proof were removed before the normal-bundle verification. |

## Phase status

| Phase | State | Completion condition |
| --- | --- | --- |
| 0. Revalidate, integrate, and baseline | complete | Clean worktree, protected canonical tree, current catalog snapshot, Node 22 baseline, audited dependencies, and one draft release lane are established. |
| 1. App Store control documents | complete | This status, scope, execution plan, owner gates, and initial rights ledger are committed. |
| 2. Rights ledger and safe catalog | complete | Machine-enforced provider states prevent pending or disabled data from entering the iOS catalog; legacy Google persistence is remediated and a versioned catalog is generated and verified. |
| 3. iOS product boundary | complete | A separately built local UI consumes only the verified V1 catalog and excludes private/tangential web products from its production bundle. |
| 4. Capacitor and platform adapters | complete | Capacitor 8 iPhone target, local entrypoint, tested platform adapters, truthful purpose strings, and native compile evidence are committed. |
| 5. Saved evenings and offline | complete | Whole-evening plans persist locally, work offline only within their source freshness conditions, support native system actions, and erase provider details when they expire. |
| 6. Accessibility and iPhone polish | in progress | The original SIXPM visual language, portrait behavior, safe-area treatment, final icon/splash direction, Dynamic Type reflow, route focus, and minimum target sizing are locally verified. VoiceOver, reduced-motion, permission-denial, offline-state, and native-system-sheet verification remain. |
| 7. Legal, privacy, and support | pending | Public legal/support pages and native privacy manifest are complete. |
| 8. Release checks and device QA | pending | Web/iOS checks, simulator QA, and physical-device QA are evidenced separately. |
| 9. TestFlight and App Store preparation | pending | Metadata, assets, review notes, and test plan are ready; no submission occurs. |
| 10. Submission and release | blocked by owner gates | Requires exact owner authorization and later manual-release approval. |

## Non-owner blockers being handled autonomously

- Integrate the already-reviewed PR #12 content without overwriting scheduled catalog updates.
- Establish the Node 22 command path and baseline test evidence.
- Build a native-only product surface that consumes the verified catalog without inheriting private or tangential web routes.
- Add Capacitor 8 and native adapters without putting a key, a private product, or a provider-content fallback in the iOS target.

## Owner and external gates

No provider contact, contract acceptance, fee payment, external TestFlight invitation, App Store submission, or release is authorized by this document. The detailed gate list is in [OWNER_GATES.md](OWNER_GATES.md). The required submission authorization is exactly:

```text
SUBMIT SIXPM V1
```

## Evidence discipline

- Browser checks are not native proof.
- Simulator checks are not physical-device proof.
- TestFlight availability is not public App Store proof.
- A provider is unavailable to iOS until the rights registry marks it `approved` with required attribution and freshness conditions.
- No API key may enter the app bundle, `capacitor.config`, Info.plist, screenshots, documentation examples, or public catalog.
