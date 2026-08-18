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

## Production-host evidence and the remaining privacy decision

The catalog request goes to Vercel. A read-only project audit on 2026-08-18
established all of the following for the linked `sixpm` project:

- Web Analytics is disabled in the project configuration and no analytics
  client marker appears in either the public production HTML or the current
  Vercel Preview HTML.
- A Speed Insights configuration exists but reports `hasData: false`; no Speed
  Insights client marker appears in either rendered HTML response.
- The team has zero configured Log Drains for this project, and the
  Observability Plus configuration endpoint reports that the feature is not
  enabled.
- The release artifact is a static catalog/UI build; it has no app-owned
  analytics SDK, tracking SDK, or server-side personal-data endpoint.

Those facts rule out SIXPM-configured behavior analytics, but they do **not**
make Vercel's underlying network operation disappear. Vercel's current Privacy
Notice says that its hosted-site service processes end-user IP address,
IP-derived city/country, device/system information, and request/log data, and
retains information for operational, legal, and business purposes. Apple
defines “collect” as off-device transmission retained longer than real-time
servicing. The Vercel notice is therefore sufficient reason not to select
**“No, we do not collect data from this app”** merely because the local native
code has no analytics.

Before App Store Connect entry, the owner must approve a conservative mapping
of the actual Vercel retention path to Apple's then-current questionnaire. Do
not infer an unverified retention exception from the absence of a dashboard
feature. No project setting was changed during this audit.

## Tentative questionnaire posture after that review

| Question | Current answer | What is needed to finalize |
| --- | --- | --- |
| Does the app or a third-party partner collect data? | **Yes / pending owner-approved exact types.** | Read-only audit ruled out SIXPM-configured Web Analytics, client analytics scripts, Log Drains, and Observability Plus; Vercel's platform privacy notice still describes retained hosted-request metadata. Map that exact path conservatively before entry. |
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
3. Obtain owner approval for the conservative App Store mapping of Vercel's
   retained hosted-request metadata, then record the chosen data types,
   purposes, and linkage. Do not inspect or export real end-user logs merely
   to complete this paperwork.
4. Use that approval and current Apple guidance to choose App Store Connect
   privacy data types, purposes, linkage, and tracking answers. The Account
   Holder, Admin, or App Manager performs the entry.
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
