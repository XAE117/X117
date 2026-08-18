# SIXPM V1 Product Scope

## Locked release shape

| Area | V1 decision |
| --- | --- |
| Platform | iPhone only, iOS 17+, portrait-first; no iPad-specific release and no Android. |
| Commercial model | Free, ad-free, no IAP, no subscription, no account, no login. |
| Product core | React 19 + Vite, packaged with Capacitor 8 and Xcode 26. |
| Content delivery | Bundled UI plus a versioned, rights-gated remote catalog from SIXPM's Vercel deployment. |
| Personal data | On-device saved evenings and preferences only; no tracking SDK, analytics SDK, push backend, or remote profile. |
| Territory | United States-only App Store availability. |
| Release mode | Manual release only. |

## V1 user loop

1. Open a concise evening dashboard with a small set of validated choices.
2. Browse approved cinema, jazz, and food information.
3. Build and save a whole evening locally.
4. Use optional native location or a manual fallback to tailor directions and proximity.
5. Add a calendar entry, local reminder, directions, or system share using native controls.
6. Reopen saved evenings offline, mark them complete, or delete them.

## Required V1 capabilities

- Rights-gated catalog loading with an intelligible offline/stale fallback.
- Preferences-backed local persistence with an explicit clear/delete flow.
- Optional, one-time foreground location with a manual neighborhood fallback.
- Calendar interactive event creation.
- Local notifications/reminders, scheduled only by the user.
- System share sheet and external links opened through the platform browser.
- Apple Maps directions, never an embedded mixed-provider map.
- Safe-area, Dynamic Type, VoiceOver, reduced-motion, keyboard, permission-denial, and offline support.
- In-app settings, privacy, terms, support, credits, and data-source attribution.

## Explicitly out of scope

- Login, account sync, social features, ads, IAP, subscription, analytics/tracking SDKs, remote push, or advertising identifiers.
- Android, iPad-specific layouts, watchOS, widgets, or CarPlay.
- Ticketing, commerce, transactions, provider contracts, or scraping on device.
- Morning Console, Momentum Streaks, Louis Cole biography, and unrelated X117 products.
- Any unresolved provider's fields, images, listings, coordinates, maps, or derived content.
- API keys and provider secrets in any shipped artifact.

## Boundary rules

- The app is useful with an empty or stale remote catalog: saved evenings, settings, support, and clear offline explanation stay functional.
- App Store metadata and in-app claims must match actual behavior, not intended future behavior.
- An external-link action sends a user to the provider's own destination. SIXPM does not imply ticket availability, affiliation, or endorsement.
- A feature that requires an account, a new provider agreement, or a personal-data backend is deferred from V1 rather than partially simulated.
