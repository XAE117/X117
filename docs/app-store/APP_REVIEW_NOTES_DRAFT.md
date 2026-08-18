# SIXPM V1 App Review Notes Draft

**State:** draft only. It is written for a future App Store Connect submission,
not entered or sent. The owner must supply the App Review contact name, email,
and phone number at the point of submission.

## Paste-ready review notes

SIXPM is an iPhone-only, account-free Los Angeles evening field guide. It has
no login, demo account, payment, subscription, advertising, or in-app purchase.

The app loads a rights-gated public catalog over HTTPS. In V1, the enabled
content is current AMC cinema information plus a small set of owner-authored
SIXPM dinner records. Jazz is intentionally disabled in the iPhone catalog.
The app contains no provider API keys and does not scrape on device.

To review the main flow:

1. Launch the app. The Tonight field index displays the current cinema
   directory when the catalog is available.
2. Open a film, choose **Add film to evening**, then browse the dinner notebook
   and choose **Add dinner to evening**.
3. Review and save the pair. Saved evenings remain on the device only.
4. Calendar, local reminder, directions, sharing, and provider links are all
   user-initiated. Calendar opens Apple’s interactive event editor; it does not
   silently write or read calendars.
5. Open **Notes** to find the local privacy summary, terms, credits, support
   guidance, and the explicit erase-on-device-data control.

Location is requested only after the user taps **Use my location** in Notes to
sort the small dinner notebook nearby. If the permission is denied, the app
does not prompt repeatedly and remains usable. Notification permission is only
requested after a user deliberately schedules a reminder for a saved evening.

If the catalog cannot be verified, SIXPM presents a plain-language recovery
state. Saved evenings and App Notes remain reachable. This is a recovery path,
not a substitute for the release gate requiring the public catalog endpoint to
serve verified JSON.

## Submission-time fields still required

| App Review field | Required input | State |
| --- | --- | --- |
| Contact name | Owner-approved person or entity contact | Pending owner |
| Contact email | Reachable review contact | Pending owner |
| Contact phone | Reachable review contact | Pending owner |
| Sign-in required | No | Verified by product scope |
| Demo account | None | Verified by product scope |
| Notes | The approved final version of the text above | Pending live-catalog and privacy recheck |

## Do not submit until all are true

- The normal production catalog path returns verified JSON, not a Vercel login
  page or SPA HTML.
- The public privacy and support URLs are live, direct, and match the final
  privacy answer.
- Physical-iPhone testing has passed with real permission and system-sheet
  behavior recorded separately from simulator evidence.
- The current build’s version, build number, icon, launch artwork, screenshots,
  and metadata match what the reviewer will see.
- The owner has given the exact authorization: `SUBMIT SIXPM V1`.

## Reference

Apple requires an App Review contact and permits review notes up to 4,000 bytes.
Recheck the live form before entry:

- [Platform version information reference](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information)
