# SIXPM App Store Privacy and Support Draft

**State:** draft only — do not enter or publish these answers until the open
gates below are resolved.
**Last evidence review:** 2026-08-18 (Pacific)

This document distinguishes what is verified in the iPhone app from what
App Store Connect requires about the production catalog host. It is not legal
advice and it does not authorize App Store Connect changes.

## Candidate public URLs

| App Store field | Candidate / state |
| --- | --- |
| Privacy Policy URL | `https://sixpm.vercel.app/privacy` — source route exists and is locally verified; must be publicly deployed before entry. |
| Privacy Choices URL | `https://sixpm.vercel.app/privacy#delete-local-data` — source route exists and documents in-app erase plus app deletion; optional in App Store Connect. |
| Terms of Use | `https://sixpm.vercel.app/terms` — source route exists and is locally verified. |
| Credits | `https://sixpm.vercel.app/credits` — source route exists and is locally verified. |
| Support URL | **Blocked.** `https://github.com/XAE117/X117/issues/new` is the current in-app public support tracker, but Apple says the App Store Support URL must lead to actual contact information. Do not enter it as the Support URL without an owner-approved public contact endpoint. |

## Verified iPhone-app facts

- There is no account, login, remote user profile, advertising, analytics SDK,
  tracking SDK, push backend, subscription, IAP, or advertising identifier.
- Saved evenings and the validated offline catalog live in app-only iPhone
  Preferences. Location is used in memory only for a user-initiated nearby
  sort. Calendar, reminders, sharing, and external links happen only after a
  user action.
- The app bundles no API key and fetches only the versioned, rights-gated
  catalog from `https://sixpm.vercel.app/`.
- The native privacy manifest declares no tracking, no app-collected data
  types, and only app-owned UserDefaults access (`CA92.1`).

On-device processing alone is not App Store “collection.” It must remain on
device and must not later be transmitted before that statement remains valid.

## Production-host fact that prevents a no-data answer

The catalog request goes to Vercel. Vercel’s current Privacy Notice says it
collects end-user IP address, coarse location derived from that address,
device/system information, and request/log data for hosted sites. Vercel’s
documentation also describes retained runtime logs and optional log drains.

Therefore **do not select “No, we do not collect data from this app”** in App
Store Connect based solely on the local native code scan. Before entry, inspect
the production project’s logging, observability, analytics, and log-drain
configuration and classify the retained Vercel request data against the live
App Store Connect questionnaire. If it is retained, the answer must include
the relevant Apple data types and purposes for the production catalog request;
if an owner turns off or removes every retained request-data path, re-evaluate
with evidence rather than carrying this draft forward.

## Tentative questionnaire posture after that review

| Question | Current answer | What is needed to finalize |
| --- | --- | --- |
| Does the app or a third-party partner collect data? | **Yes / pending exact types.** | Production Vercel retention and any configured observability/log drain must be inspected. |
| Is tracking used? | **No.** | Keep the iOS bundle free of tracking SDKs/domains and do not enable Vercel or another partner for advertising/cross-app tracking. |
| Is local location collection disclosed? | **No, if it stays on device.** | Recheck that no location or derived distance leaves the device. |
| Are local saved evenings, Calendar state, reminders, or share recipients disclosed as collected? | **No, if they stay on device.** | Recheck that no cloud sync, analytics, crash report, or support attachment transmits them. |
| Are catalog-request metadata types disclosed? | **Pending.** | Map the actual Vercel-retained fields to Apple’s current data-type choices, linkage, and purpose prompts. |

## Privacy-manifest evidence

`ios/App/App/PrivacyInfo.xcprivacy` is included in the `App` target’s Resources
phase. `plutil -lint` passes, and the no-signing iPhone simulator build placed
the manifest at:

```text
App.app/PrivacyInfo.xcprivacy
```

It records:

```text
NSPrivacyTracking = false
NSPrivacyTrackingDomains = []
NSPrivacyCollectedDataTypes = []
NSPrivacyAccessedAPICategoryUserDefaults = CA92.1
```

## Remaining gates

1. Owner supplies or approves a publicly reachable support endpoint containing
   actual support contact information. Do not invent an email address, legal
   address, or telephone number.
2. Merge/deploy the reviewed legal routes through the normal release lane and
   verify each public URL directly.
3. Inspect the actual production Vercel project for Analytics, Observability,
   Runtime Logs, and Log Drains. Record which request fields are retained,
   where they go, and for how long.
4. Use that evidence to choose current App Store Connect privacy data types,
   purposes, linkage, and tracking answers. The Account Holder, Admin, or App
   Manager performs the entry.
5. Recheck this document immediately before submission; privacy practices and
   provider behavior can change.

## Source guidance

- [Apple App privacy reference](https://developer.apple.com/help/app-store-connect/reference/app-privacy/)
- [Apple guidance for managing app privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy)
- [Apple App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)
- [Apple privacy manifest files](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files)
- [Apple required-reason API values](https://developer.apple.com/documentation/bundleresources/app-privacy-configuration/nsprivacyaccessedapitypes/nsprivacyaccessedapitypereasons)
- [Vercel Privacy Notice](https://vercel.com/legal/privacy-notice)
- [Vercel Runtime Logs](https://vercel.com/docs/logs/runtime)
