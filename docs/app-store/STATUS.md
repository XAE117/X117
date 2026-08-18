# SIXPM iPhone App Store Status

Last updated: 2026-08-18 (Pacific)  
Mission state: active  
Current phase: 2 — provider rights and safe catalog boundary

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

## Phase status

| Phase | State | Completion condition |
| --- | --- | --- |
| 0. Revalidate, integrate, and baseline | complete | Clean worktree, protected canonical tree, current catalog snapshot, Node 22 baseline, audited dependencies, and one draft release lane are established. |
| 1. App Store control documents | complete | This status, scope, execution plan, owner gates, and initial rights ledger are committed. |
| 2. Rights ledger and safe catalog | in progress | Machine-enforced provider states must prevent pending or disabled data from entering the iOS catalog. |
| 3. iOS product boundary | pending | Native build excludes private/tangential products and loads only the V1 surface. |
| 4. Capacitor and platform adapters | pending | iOS project and tested native capability adapters exist. |
| 5. Saved evenings and offline | pending | Whole-evening plans persist locally, work offline, and support native actions. |
| 6. Accessibility and iPhone polish | pending | Safe-area, Dynamic Type, VoiceOver, reduced-motion, permission-denial, and offline paths pass. |
| 7. Legal, privacy, and support | pending | Public legal/support pages and native privacy manifest are complete. |
| 8. Release checks and device QA | pending | Web/iOS checks, simulator QA, and physical-device QA are evidenced separately. |
| 9. TestFlight and App Store preparation | pending | Metadata, assets, review notes, and test plan are ready; no submission occurs. |
| 10. Submission and release | blocked by owner gates | Requires exact owner authorization and later manual-release approval. |

## Non-owner blockers being handled autonomously

- Integrate the already-reviewed PR #12 content without overwriting scheduled catalog updates.
- Establish the Node 22 command path and baseline test evidence.
- Build a rights-cleared native catalog path. Pending sources will be disabled rather than treated as approved.

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
