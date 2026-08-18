# SIXPM App Store Metadata Draft

**State:** preparation only. Do not create an App Store Connect record, enter
these fields, or upload media without the owner gate in
[OWNER_GATES.md](OWNER_GATES.md).

This copy describes the released iPhone scope only: approved AMC cinema, the
small SIXPM dinner notebook, locally saved evenings, and optional native
actions. Jazz remains disabled in the iPhone catalog and is not marketable in
V1.

## Proposed English (U.S.) metadata

| Field | Draft | Release check |
| --- | --- | --- |
| Name | `SIXPM` | 5 of Apple’s 30-character maximum. |
| Subtitle | `Los Angeles after work` | 22 of Apple’s 30-character maximum. |
| Promotional text | `A field guide for the part of Los Angeles that begins after work: current cinema, a small dinner notebook, and evenings saved on your iPhone.` | Keep under Apple’s 170-character limit. Recheck that the live catalog is operating before using “current.” |
| Description | See below. | Plain text only; must remain under Apple’s 4,000-character limit. |
| Keywords | `los angeles,movies,showtimes,dinner,evening,cinema,nightlife` | Keep under 100 bytes. Do not add provider, company, or other app names. |
| Primary category | Entertainment | Owner may choose a different category only if it still describes the actual cinema-first product. |
| Secondary category | Food & Drink | Optional; do not make it primary while the V1 food catalog remains intentionally small. |
| Content rating | Pending owner completion of Apple’s current age-rating questionnaire. | Do not guess or preselect an age rating. |
| Price | Free | No ads, IAP, subscription, or account. |
| Availability | United States only | Preserve the locked V1 territory. |
| Release | Manual release | Preserve the owner’s manual-release gate. |
| Copyright | `2026 [owner-approved legal name or entity]` | Required. Do not invent the rights-holder name. |
| Marketing URL | `https://sixpm.vercel.app/` | Candidate only; verify it is public and reflects the released build. |
| Privacy Policy URL | `https://sixpm.vercel.app/privacy` | Candidate only; requires public deployment and final privacy review. |
| Support URL | **Pending owner-provided public contact endpoint.** | Apple requires actual contact information at this URL. |

## Description draft

SIXPM is a field guide for the part of Los Angeles that begins after work.

Find a current cinema showing, pair it with a small, first-party dinner
notebook, and hold the evening together on your iPhone.

SIXPM is deliberately narrow:

- A dense cinema directory with showtimes, formats, theatres, and direct
  provider links.
- A small editorial dinner notebook—not a review database or a promise of
  availability.
- Saved evenings that stay on your iPhone, with Calendar, reminder, directions,
  and sharing actions only when you choose them.
- Optional nearby sorting that requests location only when you ask.

No account. No ads. No subscription. No in-app purchase. No tracking SDK.

SIXPM does not sell tickets, make reservations, or operate venues. Confirm
details directly with the provider before you go.

## Claims that must never enter V1 metadata

- Jazz listings, concert recommendations, maps, ratings, reviews, ticket sales,
  reservations, or any provider not approved for the iPhone catalog.
- “All of Los Angeles,” “every showtime,” “best restaurants,” “real-time,” or
  any claim that exceeds the rights-gated catalog and freshness window.
- “No data collected” until the production Vercel retention review in
  [APP_STORE_PRIVACY_ANSWERS_DRAFT.md](APP_STORE_PRIVACY_ANSWERS_DRAFT.md)
  is finalized.
- A support email, legal entity, age rating, privacy answer, or contact name
  that the owner has not supplied or approved.

## Current Apple reference points

Apple’s current App Store Connect reference states that the app name and
subtitle each allow up to 30 characters; promotional text allows 170
characters; the description allows 4,000 characters; keywords allow 100 bytes;
and the Support URL must lead to actual contact information. Revalidate these
requirements immediately before App Store Connect entry.

- [App information reference](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information)
- [Platform version information reference](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information)
