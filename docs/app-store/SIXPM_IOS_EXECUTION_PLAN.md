# SIXPM iPhone App Store Execution Plan

This is the canonical implementation sequence for the free, account-free SIXPM V1. Each phase has one active state at a time and ends with an evidence-backed commit and a `STATUS.md` update.

## Product invariant

SIXPM is an iPhone-only local evening-planning companion. It is not a browser wrapper, a content scraper running on the phone, a social network, a ticket seller, or an account-based service. The device ships the UI, stores the user's saved evenings locally, and reads a separately versioned catalog that only exposes provider-cleared data.

## Phase 0 — Revalidate and isolate

1. Revalidate repository state, live PRs, production data, Xcode, signing, configured secret names, and baseline checks.
2. Preserve unrelated canonical changes and create `codex/ios-app-store` in a clean Codex worktree.
3. Integrate the validated PR stack without overwriting newer scheduled catalog data.
4. Run the current release checks with Node 22 and record exact outcomes.

Exit evidence: clean mission worktree, protected canonical tree, resolved source baseline, passing/reported baseline checks.

## Phase 1 — Release control plane

1. Maintain this plan, `STATUS.md`, `PRODUCT_SCOPE.md`, `OWNER_GATES.md`, and the rights ledger.
2. Add release checklist, TestFlight plan, App Store metadata, and review notes as their dependent work begins.
3. Make unknowns explicit; no document may convert an assumption into a clearance.

Exit evidence: documents committed and linked from the repository README or release tooling.

## Phase 2 — Provider rights and catalog boundary

1. Inventory every field used by cinema, jazz, food, imagery, maps, and external links.
2. Mark each provider `approved`, `pending`, or `disabled`, including attribution, maximum persistence, geographic constraints, and evidence location.
3. Make the registry machine-readable and have catalog generation reject non-approved fields and providers.
4. Remove Google Places-derived persisted content and Google-on-non-Google-map mixing from the native catalog path.
5. Establish a first-party/editorial restaurant pathway with provenance records; until evidence clears a record, omit it.
6. Add TMDB attribution and a feature flag; keep TMDB enrichment out of iOS unless its usage is explicitly cleared.

Exit evidence: versioned catalog validator fails closed; native feed contains only approved records and fields.

## Phase 3 — Separate the iOS product surface

1. Define an iOS Vite entry point and route manifest separate from the web's broader surface.
2. Include the decision-first dashboard, browse, saved evenings, settings, help, and required legal/credits routes.
3. Exclude Morning Console, Momentum Streaks, Louis Cole biography, private profile-selection behavior, and any non-V1 web-only route.
4. Register service-worker/offline behavior conditionally so it does not conflict with Capacitor.

Exit evidence: deterministic iOS web build has no excluded route/chunk or private product copy.

## Phase 4 — Capacitor 8 and native capabilities

1. Add Capacitor 8 with an iPhone-only Xcode project targeted to iOS 17+.
2. Add adapters for Preferences, Geolocation, Calendar, Local Notifications, Share, Browser/App external-link handling, Network, Status Bar, and Splash Screen.
3. Keep plugin imports behind platform adapters so the web build remains functional without native binaries.
4. Add truthful Info.plist purpose strings and the required privacy manifest entries.

Exit evidence: `npm run build:ios`, `npx cap sync ios`, and a signed simulator build pass with no API keys in the bundle.

## Phase 5 — Saved evening loop

1. Model and validate a whole evening: cinema/jazz/food selections, times, location context, catalog provenance/version, and optional notes.
2. Persist via Preferences with schema versioning, corruption recovery, export/share-safe serialization, and explicit deletion.
3. Snapshot enough approved catalog data for saved plans to remain intelligible offline.
4. Add Calendar interactive event creation, local reminders, directions in Apple Maps, system sharing, completion, and deletion.

Exit evidence: saved-plan tests cover create/read/update/delete/migration/offline recovery, and simulator action smoke tests pass.

## Phase 6 — iPhone quality

1. Tune safe areas, thumb reach, target sizes, keyboard behavior, iPhone-only orientation, and loading/error states.
2. Audit semantic headings, focus order, VoiceOver labels, Dynamic Type, contrast, reduced motion, and state announcements.
3. Test permission-denial, location unavailable, calendar unavailable, notification unavailable, network loss, stale catalog, and empty catalog paths.

Exit evidence: accessible native navigation and all denial/offline paths pass scripted simulator QA.

## Phase 7 — Legal, privacy, and support

1. Publish accessible privacy policy, terms, support, credits, data-source attribution, and data-deletion instructions.
2. Add in-app settings links and a concise no-account/no-tracking explanation.
3. Complete `PrivacyInfo.xcprivacy`, App Store privacy answers, and support contact workflow without exposing personal credentials.

Exit evidence: legal pages are public and linked; the native app and catalog accurately reflect the declared data practices.

## Phase 8 — Release verification

1. Add deterministic commands for web, catalog, iOS bundle, source-boundary, privacy-manifest, and screenshots checks.
2. Run simulator checks across the selected iPhone device sizes and iOS runtime.
3. Build and install on a physical iPhone, then independently evidence core capability flows.

Exit evidence: separate records distinguish web, simulator, and physical-device results.

## Phase 9 — TestFlight and App Store preparation

1. Prepare internal build archive, App Store metadata, US-only availability, support/privacy URLs, review notes, and five 6.9-inch screenshots.
2. Prepare TestFlight test cases and external-testing materials, but do not invite testers without approval.
3. Resolve every P0/P1 discovered in internal validation.

Exit evidence: a submission-ready package and a documented list of only owner-controlled remaining actions.

## Phase 10 — Owner-gated delivery

1. Stop before App Store submission and request `SUBMIT SIXPM V1` exactly.
2. After that authorization only, submit and address review findings.
3. Before release, request approval for manual release.
4. After manual release, verify clean public App Store installation on a physical iPhone.
5. Tag `ios-v1.0.0`, merge the final PR, record the App Store URL and live proof, and hand off.

Exit evidence: public App Store installation, physical-device verification, tag, merged PR, and handoff.
