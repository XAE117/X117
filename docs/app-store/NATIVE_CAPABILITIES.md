# SIXPM Native Capability Boundary

This document defines the only native APIs included in the SIXPM iPhone V1.
It is intentionally narrower than the web product and uses no third-party
analytics, advertising, account, payment, push, or tracking SDK.

## Native project contract

| Concern | V1 decision |
| --- | --- |
| Runtime | Capacitor `8.5.0` with a local React/Vite `dist-ios/index.html` bundle |
| Xcode target | iOS 17.0 minimum, iPhone family only (`TARGETED_DEVICE_FAMILY = 1`) |
| Bundle identifier | `com.xae117.sixpm` |
| Native dependency resolution | Swift Package Manager; no app-owned CocoaPods dependency graph |
| External catalog | Anonymous HTTPS reads from the versioned SIXPM catalog only; no secret or provider key is shipped |
| Release scope | iPhone, United States, free, ad-free, account-free |

The current native package set is deliberately limited to Browser, Calendar,
Geolocation, Local Notifications, Network, Preferences, and Share. Any new
native package needs a rights/privacy review and an explicit update to this
document before it is included in the iPhone target.

The target also contains one app-owned bridge, `SIXPMAccessibilityPlugin`.
It is not a third-party package and exposes only the current iPhone Dynamic
Type category and its change notification. It has no network, storage,
permission, identifier, or telemetry behavior.

## Capability behavior

| Capability | V1 behavior | Prompt and persistence boundary |
| --- | --- | --- |
| Preferences | Stores versioned catalog snapshots, saved evenings, and small local settings. | Uses native Preferences on iPhone; no account or cloud sync. A catalog snapshot is accepted only after full validation and deleted when invalid/expired. Saved plans use explicit schema validation and rewrite expired provider sections as redacted markers. |
| Location | Supports a one-time, explicit nearby-picks request. | Never requested at launch or stored by SIXPM. Location is not used to infer or transmit a profile. |
| Calendar | Opens the iOS system event editor with a selected, fresh saved evening prefilled. | Uses the interactive editor rather than reading calendars or silently adding an event. No full calendar access is requested, and an event remains under the user’s Calendar control after SIXPM deletion. |
| Local reminders | Schedules one local notification 90 minutes before an explicitly saved, fresh evening. | No push backend, critical-alert entitlement, or time-sensitive-notification entitlement. A denial is respected and never re-prompted automatically; completing or deleting an evening first cancels its registered reminder. |
| Sharing | Opens the system share sheet for user-composed, approved saved-evening text. | No recipient, share target, or message content is collected. Expired provider details are omitted from share content. |
| External links | Opens approved HTTPS AMC and Apple Maps links in the native browser surface. | No arbitrary protocol, embedded third-party map, or provider key is allowed. |
| Network | Reads online/offline state to distinguish live catalog refresh from a saved offline evening. | No network telemetry is retained. |
| Accessibility text size | Reads the current Dynamic Type category and informs the locally bundled UI when it changes. | The category stays on-device. SIXPM maps it to proportional custom-font scaling and reflows dense editorial listings at accessibility sizes; no accessibility setting is persisted or transmitted. |

## Privacy strings already declared

- `NSLocationWhenInUseUsageDescription`: location only after an explicit
  nearby-picks request.
- `NSCalendarsWriteOnlyAccessUsageDescription`: a user-selected evening may
  be added to Calendar only on request.

Local notifications use iOS notification authorization at the reminder action;
they do not require an Info.plist privacy usage string. `PrivacyInfo.xcprivacy`
and the App Store privacy declaration remain a separate release gate.

## Verification record

On 2026-08-18, the native shell was built against the installed iPhone
simulator with `xcodebuild`, `CODE_SIGNING_ALLOWED=NO`, and completed with
`BUILD SUCCEEDED`. That proves project compilation only. Capability behavior,
physical-device signing, native system-sheet behavior, and human QA are
recorded independently in later release gates.

The same simulator was set to the iOS `accessibility-large` content-size
category. The app-owned bridge delivered the category to the local React UI;
the restored masthead remained intact and the cinema directory reflowed rather
than clipping. This is simulator accessibility evidence, not physical-device
or VoiceOver acceptance proof.
