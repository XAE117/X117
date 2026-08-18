# SIXPM Saved Evenings Data Lifecycle

This document records the storage and expiry boundary for the iPhone V1
saved-evening feature. It applies to local Preferences only; V1 has no account,
cloud sync, analytics, or server-side saved-plan store.

## Save boundary

A user may save one whole evening only when all of the following are true:

1. The catalog passed the V1 integrity, field, provider-policy, and expiry
   validation rules.
2. The cinema record is `amc-catalog`, the feed declares that provider, and
   the selected Los Angeles showtime begins no later than the AMC feed’s
   approved 36-hour expiry.
3. The restaurant is `sixpm-editorial`, the food feed declares that provider,
   and it includes owner-maintained coordinates for external Apple Maps
   directions.
4. The data retained in the plan is limited to the allowlisted presentation
   fields in the catalog policy. A plan stores its catalog version and provider
   expiries with those fields.

The app refuses the save if any condition fails. It does not widen the local
storage rule simply because a showing or restaurant card was visible earlier.

## Offline behavior

| Local item | Admission | When freshness or integrity fails |
| --- | --- | --- |
| Full catalog snapshot | Only after `validateRemoteCatalog` passes | Delete the entire snapshot; no partial legacy fallback is shown. |
| AMC portion of a saved evening | Only while the selected showing starts before the approved AMC expiry | Replace the portion with `{ availability: "expired", provider, expiresAt }`; remove its registered reminder from the local plan. |
| First-party food portion of a saved evening | Only while its declared food expiry is current | Replace the portion with the same minimal expired marker. |
| Saved evening shell | Schema-valid local record, maximum 24 plans | Keep only the status, timestamps, catalog provenance, and expired markers so the user can still delete the plan. |

Redaction occurs both when plans are loaded and when they are written. It is not
only a display filter, so an expired provider payload is not silently left in
Preferences.

## Native action boundary

- Calendar uses the interactive iOS editor and only receives fresh cinema data.
  SIXPM does not read calendars, silently create events, or delete an event it
  previously opened in Calendar.
- A local reminder is scheduled only for a future fresh AMC showing, 90 minutes
  before its start. Completing or deleting the plan first cancels a registered
  notification; if cancellation fails, the plan change does not proceed.
- Directions use secure Apple Maps URLs. Sharing includes only currently fresh
  approved provider detail and omits redacted sections.

## Evidence status

The model is unit-tested for precise Los Angeles time conversion, invalid/
unapproved input rejection, expiry redaction and rewrite, corrupt-row removal,
offline catalog deletion, Calendar/reminder/share payload construction, and
stable notification identifiers. The browser UI flow has exercised pairing,
saving, local action fallback, and confirmation-gated deletion. iOS system
sheet behavior and physical-device proof are intentionally deferred to the
simulator and device release gates.
