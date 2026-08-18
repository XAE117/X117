# SIXPM V1 Release Checklist

This is the operator checklist for the free, ad-free, account-free, iPhone-only
United States release. A check is not complete merely because an analogous web,
simulator, or local fixture flow passed.

## Local release lane

- [x] Work is isolated to `codex/ios-app-store`; canonical unrelated changes
  remain untouched.
- [x] Node 22, lint, unit tests, web build, audit, iOS bundle boundary, privacy
  manifest, Capacitor sync, browser smoke checks, and native simulator QA have
  recorded evidence in [STATUS.md](STATUS.md).
- [x] `npm run ios:release:check` passes from the current clean release commit;
  `npm run release:check` remains a separate strict web-guide health gate.
- [x] The iPhone surface restores SIXPM’s editorial directory identity rather
  than the generic dashboard/card direction.
- [x] A disposable simulator exercised the actual iOS notification permission,
  local-reminder schedule, and cancellation lifecycle; this is recorded as
  simulator evidence only in [STATUS.md](STATUS.md).
- [x] The iOS catalog permits only approved AMC and owner-authored dinner data;
  unresolved providers are disabled.
- [ ] Confirm a PR review of the final release diff and resolve all actionable
  review comments.

## Before owner-authorized merge/deployment

- [ ] Owner explicitly authorizes merging/deploying the reviewed release lane.
- [ ] Owner supplies/approves a public Support URL with actual contact
  information.

## After owner-authorized deployment / before device QA

- [ ] `npm run catalog:live:check` passes against the exact production host:
  it requires current JSON over HTTPS—not HTML, a redirect, or Vercel SSO—plus
  public CORS, catalog digests, expiry, and approved-provider validation.
- [ ] `/privacy`, `/terms`, `/support`, and `/credits` are publicly reachable
  from the exact release deployment.
- [ ] Vercel request logging, Analytics, Observability, and Log Drains are
  reviewed for the final App Store privacy declaration.

## Before signed device testing / archive

- [ ] Owner signs into Xcode’s Apple Developer account and explicitly confirms
  automatic development provisioning for `com.xae117.sixpm`.
- [ ] A physical iPhone installs the signed app; bundle ID, icon, launch
  storyboard, and version/build are confirmed.
- [ ] Physical-device matrix in [TESTFLIGHT_TEST_PLAN.md](TESTFLIGHT_TEST_PLAN.md)
  is complete, including actual Calendar, notification, VoiceOver, Reduce
  Motion, offline, and permission-denial checks.
- [ ] Archive uses a clean Release configuration, iPhone-only deployment target,
  no localhost/ATS development exception, no uncommitted source changes, and
  no key/secret in the bundle or catalog.

## Before TestFlight / App Store Connect entry

- [ ] Owner authorizes creation/confirmation of the App Store Connect record
  and any required identifier/certificate/profile action.
- [ ] Owner completes current age-rating and export-compliance questionnaires.
- [ ] Privacy and support entries are finalized from production evidence.
- [ ] Metadata is reviewed against
  [APP_STORE_METADATA_DRAFT.md](APP_STORE_METADATA_DRAFT.md).
- [ ] Five native 6.9-inch screenshots are captured and checked using
  [SCREENSHOT_CAPTURE_PLAN.md](SCREENSHOT_CAPTURE_PLAN.md).
- [ ] App Review notes/contact are finalized using
  [APP_REVIEW_NOTES_DRAFT.md](APP_REVIEW_NOTES_DRAFT.md).
- [ ] No P0/P1 remains open; all release claims match the built app.

## Owner-only delivery actions

- [ ] Owner authorizes an internal TestFlight build and any tester assignment.
- [ ] Owner explicitly authorizes any external TestFlight group/invitation.
- [ ] Stop immediately before App Review submission and obtain exactly:

  ```text
  SUBMIT SIXPM V1
  ```

- [ ] After approval, obtain separate manual-release authorization.
- [ ] Verify a clean public App Store installation on a physical iPhone.
- [ ] Tag `ios-v1.0.0`, merge the final PR, record the App Store URL and live
  proof, and create the final handoff.
