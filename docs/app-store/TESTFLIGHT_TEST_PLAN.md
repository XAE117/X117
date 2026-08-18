# SIXPM V1 TestFlight Test Plan

**State:** preparation only. This file does not authorize an archive upload,
internal tester assignment, external invitation, beta review submission, or
public-link creation.

## TestFlight gate

Before an internal TestFlight build is prepared, all of the following need
separate evidence:

- a signed Release archive for `com.xae117.sixpm`;
- a current public verified catalog endpoint;
- public privacy and owner-approved support contact URLs;
- completed App Store privacy review for the production Vercel configuration;
- physical-iPhone core-flow QA; and
- no open P0 or P1 release defects.

External testing additionally requires the owner’s explicit authorization
naming the tester group and build. Do not create or invite any group until then.

## Internal test brief draft

**Beta description:**

SIXPM is an account-free Los Angeles evening field guide. It pairs approved
cinema listings with a small editorial dinner notebook and keeps saved evenings
on the iPhone.

**What to test:**

Please test the complete evening loop, App Notes and deletion controls, and any
native permission or system sheet you choose to use. Report the exact screen,
device, iOS version, network state, and whether a permission was allowed,
denied, or cancelled. Do not report provider availability as a bug unless the
catalog is stale or the app presents it inaccurately.

**Feedback contact:**

Pending owner-approved support contact. Do not enter a placeholder email.

## Required test matrix

| Area | Scenario | Pass condition | Evidence type |
| --- | --- | --- | --- |
| Fresh install / catalog | Clean device online, launch Tonight | Current directory appears from a verified public catalog; no API key or web fallback is present. | Physical iPhone required |
| Catalog failure | Disconnect or return invalid catalog response | Plain-language recovery appears; field index, Saved, and Notes stay usable. | Simulator + physical iPhone |
| Saved evening | Choose current approved film + dinner, save, reopen, complete, delete | Whole evening survives relaunch locally; explicit deletion removes owned local data. | Physical iPhone required |
| Location allowed | Tap **Use my location** and allow | Nearby dinner ordering works for the session only; no location is stored or sent. | Physical iPhone required |
| Location denied | Deny permission, relaunch Notes | No repeated prompt; clear iPhone Settings guidance; app remains useful. | Simulator passed; physical iPhone required |
| Calendar | Create a saved evening, open editor, save then cancel on separate attempt | Apple editor is interactive; SIXPM neither reads nor silently creates calendar events. | Physical iPhone with configured calendar required |
| Reminder | Schedule, deny on separate clean run, then cancel/delete plan | Permission is user initiated; denied state is respected; owned reminder is cancelled when applicable. | Physical iPhone required |
| Share / external links | Open share then cancel; open provider/directions link | Native share/browser surfaces appear and a cancel does not falsely claim success. | Physical iPhone required |
| Offline / expiry | Cache valid catalog, go offline; then exceed freshness | Valid snapshot stays readable; expired provider fields are redacted, not reused. | Simulator + physical iPhone |
| Accessibility | Dynamic Type, VoiceOver, Reduce Motion, keyboard/external keyboard where available | Semantics, focus, motion, touch size, and readable reflow are human-verified. | Physical iPhone required |
| Launch / visual | Cold launch at native size | Editorial launch treatment, safe areas, and directory identity look intentional with no clipping. | Physical iPhone required |

## Defect rubric

| Severity | Meaning | Release rule |
| --- | --- | --- |
| P0 | Crash, unsafe data/rights exposure, broken first launch, inaccessible core path, or false action confirmation. | Block archive, TestFlight expansion, and submission. |
| P1 | Core task seriously degraded, visual identity compromised, permission/system action misleading, or privacy/legal copy inaccurate. | Fix before external testing or submission. |
| P2 | Noticeable but bounded polish issue with a documented workaround. | Triage before submission; fix if it affects screenshots or reviewer trust. |

Every report must include build number, commit SHA, device, iOS version, exact
steps, expected versus actual result, screenshot/screen recording when safe,
and whether it reproduces after a clean reinstall. Never attach personal
location, Calendar content, phone numbers, or other sensitive data.

## TestFlight facts to recheck before use

Apple currently states that TestFlight builds can be tested for up to 90 days;
internal testing supports up to 100 App Store Connect users; external testing
can include up to 10,000 people and may require Beta App Review. App Store
Connect also requires beta test information and a feedback email. Recheck all
limits and workflow details immediately before taking an external action.

- [TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview)
- [Invite external testers](https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-external-testers)
