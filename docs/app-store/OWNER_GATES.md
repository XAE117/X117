# SIXPM Owner and External Gates

This document separates ordinary implementation work from actions that create external obligations, spend money, contact third parties, expose the app to others, or publish it.

| Gate | Required owner authorization | What may happen after authorization |
| --- | --- | --- |
| Provider outreach or contract | A specific instruction naming the provider and intended contact/contract action | Contact provider, request/accept terms, or negotiate rights. |
| Developer program / App Store Connect setup | Explicit confirmation of the Apple account and any paid membership or record-creation action | Create/confirm identifiers, certificates, development provisioning profiles, App Store Connect app record, or pay an Apple fee. |
| External TestFlight | Explicit authorization naming the tester group and build | Invite external testers or submit Beta App Review information. |
| App Store submission | `SUBMIT SIXPM V1` | Submit the prepared V1 for App Review. |
| Manual release | Explicit approval after App Review acceptance | Release the approved build to the public App Store. |

## Actions already authorized by the mission

- Local repository work, clean worktree creation, documentation, code changes, tests, commits, and PR preparation.
- Read-only verification of Apple/Xcode/signing state, Vercel availability, provider terms, data freshness, GitHub status, and App Store requirements.
- Disabling an unresolved provider from the iOS catalog.
- Internal simulator work and physical-device work using already-available signing only when a connected owner device is made available; do not treat a simulator as device proof.

## Stop rules

- Do not send a provider message, accept online terms, pay a fee, invite external testers, submit, or release on the owner's behalf without the corresponding gate above.
- Do not make a legal claim of clearance from a technical review. Retain evidence and label uncertainty.
- Stop before submission even if every technical check passes, and ask only for `SUBMIT SIXPM V1`.

## Current physical-device prerequisite

Xcode can see the connected owner iPhone, but no Apple Developer account is
signed into Xcode and no development profile exists for `com.xae117.sixpm`.
The owner must sign in through Xcode’s Accounts settings and explicitly confirm
that automatic development provisioning may create or fetch the profile for
that bundle identifier. Do not provide an Apple ID password, session token, or
other credential in this repository or chat.
