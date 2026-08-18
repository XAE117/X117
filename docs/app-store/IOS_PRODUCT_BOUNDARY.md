# SIXPM iPhone Product Boundary

The iPhone application is a separate React/Vite entrypoint, not a mobile view
of the broad web product.

## Build contract

| Concern | iPhone behavior |
| --- | --- |
| Source entry HTML | `ios.html` |
| Capacitor entry HTML | `dist-ios/index.html`, produced from the isolated source entry during `npm run build:ios` |
| React entry | `src/ios/main.jsx` |
| Production bundle | `dist-ios/` from `npm run build:ios` |
| Local UI | React, CSS, and UI logic ship in the Capacitor bundle; no remote web page is loaded. |
| Catalog | The app fetches only `catalog/v1/index.json`, `cinema.json`, `jazz.json`, and `food.json` from `https://sixpm.vercel.app/` by default. |
| Verification | Every feed path, SHA-256 digest, expiry, provider state, and declared field set is checked before it is rendered. |
| Local QA override | `VITE_IOS_CATALOG_BASE` may point at a local catalog server. It is public configuration only and never contains a key. |
| Native bridge | The iPhone target exposes only the capabilities documented in [NATIVE_CAPABILITIES.md](NATIVE_CAPABILITIES.md). |

`vite.config.js` uses `publicDir: false` for the iOS production build, so the
legacy `public/` tree cannot be copied into `dist-ios`. `scripts/check-ios-bundle.js`
fails a build if excluded products or API-key variable tokens appear in the
native bundle.

## Included V1 surface

- Tonight: evening-first AMC film choices and the currently approved SIXPM
  editorial food records.
- Browse: grouped films and the small approved food set.
- Saved: the dedicated destination for locally saved AMC-and-food evenings,
  including offline-safe detail redaction, native actions, completion, and
  explicit deletion.
- Settings: catalog freshness and privacy-first capability status.
- External Apple Maps directions and official AMC showtime links.

Native external links accept HTTPS only. On iPhone they are handled by the
Capacitor Browser adapter, rather than allowing the WebView to navigate away
from SIXPM or embedding an unreviewed third-party map.

## Explicitly excluded

- Morning Console, Momentum Streaks, and all other private or tangential
  products.
- Louis Cole biography and web-only jazz feature content.
- Jazz listings, non-AMC cinema, embedded maps, TMDB enrichment/imagery,
  Google content, scraped restaurant editorial/reservation data, accounts,
  advertising, payments, analytics/tracking SDKs, Android, and iPad-specific
  UI.

The iOS catalog exposes Jazz as an explicit disabled feed rather than a
partial/fallback listing. A disabled feed is permitted to have an old expiry
because it contains no provider records; any non-disabled feed fails closed at
expiry.

## Deployment contract

`vercel.json` grants anonymous read-only CORS access only to `/catalog/*` and
uses short CDN caching. The production static catalog will not exist until this
release branch is merged/deployed through the normal reviewed path. The iPhone
client must display a verified offline snapshot or a clear unavailable state
until then; it must never fall back to legacy web data.

## Local commands

```sh
# Serve the iPhone entry and this checkout's generated catalog together.
VITE_IOS_CATALOG_BASE=http://127.0.0.1:5173/ npm run dev:ios

# Build only the native web bundle and verify its boundary.
npm run build:ios
```

`dev:ios` enables CORS only for the local Capacitor QA origin, so a temporary
rights-gated catalog can render in Simulator. It does not alter a production
build, the Vercel headers, or the release app's HTTPS-only catalog endpoint.

For the native local-reminder lifecycle only, run the explicit disposable-
simulator command:

```sh
IOS_SIMULATOR_ID=<disposable-simulator-udid> npm run test:ios:native-actions
```

That harness builds a separate `com.xae117.sixpm.qa` app against the local,
rights-gated catalog and uses `App/Info-QA.plist` solely to allow local
networking during the test. It asserts the native notification permission,
schedule, and cancellation flow and refuses a Main Thread Checker diagnostic,
then uninstalls the QA app and runs `npm run ios:sync` in a `finally` block.
The shipping bundle and
`App/Info.plist` remain HTTPS-only and must never contain the local-network
exception.
