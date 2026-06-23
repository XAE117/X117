# sixpm audit - 2026-05-23

## Top 5 (act on these first)

1. [P0] Scraped titles are interpolated into Leaflet popup HTML, so a compromised source can ship XSS straight into the app - `src/views/MapView.jsx:54`, `src/views/JazzMapView.jsx:65`.
2. [P1] The "13 dark theaters are all JS-rendered" hypothesis is wrong; several have usable initial HTML and simply have no adapter, while AMC works locally but is starved of its API key in CI - `scripts/scrape.js:68`, `.github/workflows/scrape.yml:27`.
3. [P1] Silent failure is a design pattern here: source adapters catch errors, return `[]`, and the UI filters empty venues away - `scripts/scrape.js:543`, `src/hooks/useCinemaFilter.js:53`.
4. [P1] The rename is still leaky in package metadata, README, generated reports, script banners, SMS copy, env template, and branch/deploy config - `package.json:2`, `README.md:1`, `scripts/validate-data.js:259`, `scripts/weekly-digest.js:115`.
5. [P1] This is a client-only SPA with JSON data files, no SSR/static prerender, no sitemap, no robots.txt, no canonical URLs, and no per-listing real HTML. For an aggregator, that is a core product problem - `index.html:21`, `src/main.jsx:36`, `src/components/AppRoutes.jsx:38`.

## Root-cause: the 13 dark theaters

Scraper entry point: `npm run scrape` -> `scripts/scrape.js` via `package.json:10`. The scraper uses RevivalHouses as primary source, then a small set of supplemental scrapers - New Beverly, Vista, Brain Dead, Vidiots, Cinespia, 2220, AMC - at `scripts/scrape.js:974`. Most theaters do not have direct adapters.

Live checks on 2026-05-23:

- [P1] American Cinematheque - Egyptian Theatre: current RevivalHouses has listings. American Cinematheque `now-showing` returns initial HTML plus JSON-LD, but there is no direct AC adapter. Root cause for the May 1 zero state is source coverage/freshness, not a proven JS blocker - `scripts/scrape.js:69`.
- [P1] Billy Wilder Theater at the Hammer: Hammer page returns initial HTML with article/date text. Cheerio can likely parse it. Root cause is no adapter - `scripts/scrape.js:105`.
- [P1] REDCAT: REDCAT home returns initial HTML with event/date text. Cheerio can likely parse it. Root cause is no adapter - `scripts/scrape.js:114`.
- [P1] Secret Movie Club: homepage returns marketing/ticket text, no dated schedule in initial HTML. Uncertain whether the right source is another page, embedded ticketing, or rendered content. Needs browser/network inspection - `scripts/scrape.js:160`.
- [P1] Cinespia: page contains current event text, but the adapter looks for `article, .event-item, .screening-item` and finds zero. Root cause is broken selector/site drift, not necessarily JS - `scripts/scrape.js:749`.
- [P1] 2220 Arts + Archives: configured URL returns a "Coming Soon" page; robots/sitemap return private-site pages. Root cause is dead/wrong/inaccessible source. Headless browser will not fix a private placeholder - `scripts/scrape.js:789`.
- [P1] WHAMMY! Analog Media: homepage has generic calendar/event copy but no dated schedule in initial HTML. Uncertain; likely needs alternate event endpoint or rendered browser path - `scripts/scrape.js:187`.
- [P1] FILM at LACMA: film page returns initial HTML with film/date/time signals. Root cause is no adapter - `scripts/scrape.js:206`.
- [P1] The Culver Theater: configured domain `theculvertheater.com` did not resolve in live checks. Root cause is dead/wrong URL, not JS - `scripts/scrape.js:287`.
- [P1] Landmark Sunset Hollywood: configured source is generic Landmark homepage with no Sunset schedule in initial HTML. Needs venue-specific endpoint/API discovery; Playwright may help discover it - `scripts/scrape.js:305`.
- [P1] AMC Century City 15: public page is Cloudflare 403, but AMC API works locally when `AMC_API_KEY` is present. CI scrape does not pass `AMC_API_KEY`, so production will skip/fail AMC - `.github/workflows/scrape.yml:27`, `scripts/scrape.js:855`.
- [P1] AMC Burbank 16: same as above - `.github/workflows/scrape.yml:27`, `scripts/scrape.js:325`.
- [P1] AMC The Americana at Brand 18: same as above - `.github/workflows/scrape.yml:27`, `scripts/scrape.js:345`.

Recommended fix path:

- Keep Cheerio for static HTML sources: Hammer, REDCAT, LACMA, American Cinematheque if JSON-LD is reliable.
- Fix selector adapters first: Cinespia.
- Fix/deprecate source URLs: 2220, Culver, Landmark.
- Add Playwright only for the genuinely rendered/embedded sources: Secret Movie Club, WHAMMY, Landmark discovery/fallback, maybe Cinespia fallback.
- Add `sourceStatus` metadata per source and per venue: `ok`, `empty`, `error`, `skipped_missing_key`, `blocked`, `wrong_source`.
- Make validation fail or warn on source errors directly, not only on aggregate "0 future screenings."
- Change the UI so an empty/error venue survives filtering and displays "couldn't load this venue today" instead of disappearing.

Scope estimate for just the dark-theater subset: 2-4 focused days. One day for source-status plumbing, one day for Cheerio adapters, one day for Playwright fallback and CI browser setup, plus regression/health-report polish.

## Findings by dimension

### Rename hygiene

- [P1] Package name is still `the-palace` - `package.json:2`, `package-lock.json:2`, `package-lock.json:8`.
- [P1] README still opens as `THE PALACE` and describes a 1930s Art Deco film palace, not sixpm - `README.md:1`, `README.md:3`.
- [P1] Health report generator still prints `Liza's Palace - Data Health Report` - `scripts/validate-data.js:259`, `scripts/validate-data.js:297`. Generated report is stale too - `public/health-report.md:1`.
- [P1] Script banners still use THE PALACE - `scripts/scrape.js:4`, `scripts/scrape.js:1256`, `scripts/scrape-jazz.js:4`, `scripts/scrape-jazz.js:1064`, `scripts/notify.js:2`, `scripts/weekly-digest.js:4`.
- [P1] Weekly SMS still says `Palace Picks` - `scripts/weekly-digest.js:115`.
- [P1] Restaurant scraper comment still says "Liza's Palace EATS mode" - `scripts/scrape-restaurants.js:4`.
- [P1] Env template still says Liza's Palace - `.env.example:1`.
- [P2] Deploy helper watches old branch names - `.github/workflows/fix-and-deploy.yml:4`. That is not user-facing, but it is identity drift and operational noise.
- [P2] Git metadata still contains old branch names - `.git/config:20`, `.git/FETCH_HEAD:13`. Not committed app code, but worth cleaning locally.
- [P2] Public path remains `/X117/`, not sixpm-branded - `vite.config.js:7`, `index.html:5`, `index.html:39`, `public/manifest.json:5`, `public/404.html:10`. This may be intentional GitHub Pages hosting, but it contradicts brand polish.

### Art Deco strip

Do not touch palette, dark background, card structure, grids, or density. The following are the Art Deco tells to remove or neutralize.

- [P1] Explicit Art Deco divider component: `src/components/DecoDivider.jsx:3`, `src/components/DecoDivider.css:1`.
- [P1] By-day page imports and renders DecoDivider sunburst/fan ornaments - `src/views/ByDay.jsx:4`, `src/views/ByDay.jsx:240`.
- [P1] Detail view has decorative corner frame motifs - `src/views/Detail.jsx:250`, `src/views/Detail.css:68`.
- [P1] Screenshot views use corner frames, diamonds, and centered ornamental divider bands - `src/views/DayScreenshot.jsx:74`, `src/views/DayScreenshot.jsx:82`, `src/views/JazzDayScreenshot.jsx:71`, `src/views/JazzDayScreenshot.jsx:79`, `src/views/DayScreenshot.css:44`, `src/views/DayScreenshot.css:99`, `src/views/DayScreenshot.css:135`.
- [P1] Film-format badges use "film strip sprocket holes" via `::before`/`::after`; that is pure Deco/cinema ornament - `src/views/ByDay.css:321`, `src/views/ByTheater.css:239`, `src/views/Search.css:196`, `src/views/Detail.css:408`, `src/views/DayScreenshot.css:214`.
- [P2] Pizza/Taco guide decorative lines are ornamental flourishes - `src/views/PizzaGuide.jsx:160`, `src/views/PizzaGuide.css:14`, `src/views/TacoGuide.jsx:166`, `src/views/TacoGuide.css:14`.
- [P2] Global `.deco-border-top` and `.deco-rule` utilities still exist - `src/App.css:672`, `src/App.css:712`.
- [P2] Body and notch noise overlays are decorative SVG backgrounds. Not strictly Art Deco, but audit them during the polish pass - `src/index.css:61`, `src/App.css:54`, `src/App.css:112`, `src/components/ModeSwitcher.css:22`, `src/components/BackPill.css:36`.
- [P2] README still documents the old Art Deco system - `README.md:12`, `README.md:97`.
- [P2] No active Playfair Display import was found. README claims it, but code imports Sora, Josefin Sans, Poiret One, and Source Serif 4 - `index.html:15`, `README.md:97`.
- [P2] Active serif is `Source Serif 4`, not Playfair. Replace serif usage with Inter/Geist/system-ui if the goal is fully neutral type - `src/views/GuidePage.css:13`, `src/views/GuidePage.css:291`, `src/views/GuidePage.css:341`, `src/views/GuidePage.css:363`, `src/components/GuideRestaurantCard.css:91`, `src/views/JazzBioEssay.css:37`.
- [P2] Josefin Sans is globally assigned as body font. Flagged for James decision, not removal - `index.html:15`, `src/index.css:18`.
- [P2] Layouts that are symmetrical purely for ornament: DecoDivider, screenshot frames, detail corner motif - `src/components/DecoDivider.jsx:6`, `src/views/DayScreenshot.jsx:82`, `src/views/Detail.jsx:250`.

### App icon replacement

Done in this pass:

- [P1] Replaced LP/favicon film-reel mark with neutral `6` placeholder - `public/favicon.svg:1`.
- [P1] Replaced 192px LP manifest/apple-touch icon with neutral `6pm` placeholder - `public/icon-192.svg:1`.
- [P1] Replaced 512px LP/Liza's Palace manifest icon with neutral `6pm` placeholder - `public/icon-512.svg:1`.

Where icons ship:

- [P1] Browser favicon uses `/X117/favicon.svg` - `index.html:5`.
- [P1] Apple touch icon uses `icon-192.svg` - `index.html:12`.
- [P1] Manifest icons point at `icon-192.svg` and `icon-512.svg` - `public/manifest.json:12`, `public/manifest.json:18`.
- [P2] No OG image/social card image was found in `index.html`, `public`, or `src`.
- [P2] No inline SVG brand logo was found in header/nav. Header SVGs are controls, not identity marks - `src/components/TopBar.jsx:215`, `src/views/Search.jsx:117`.
- [P2] Browser tab title is already sixpm via static HTML and runtime page-title hook - `index.html:18`, `src/hooks/usePageTitle.js:4`.

To drop in James's real logo later, replace exactly these files: `public/favicon.svg`, `public/icon-192.svg`, `public/icon-512.svg`. If OG/social cards are added, add them explicitly in `index.html`.

### Data layer

- [P1] Cinema is hybrid: RevivalHouses primary plus direct scrapers and AMC API. There is no robust source-status model - `scripts/scrape.js:6`, `scripts/scrape.js:964`, `scripts/scrape.js:853`.
- [P1] Jazz is a bigger hybrid: static HTML, parsed JS blobs, Puppeteer for some sources, plus Songkick/Dice/Eventbrite source modules - `scripts/scrape-jazz.js:6`, `scripts/scrape-jazz.js:22`, `scripts/scrape-jazz.js:25`.
- [P1] Restaurants are scraped from food media, merged with manual additions, seeds, aliases, and optional Google Places enrichment - `scripts/scrape-restaurants.js:20`, `scripts/scrape-restaurants.js:273`, `scripts/scrape-restaurants.js:344`.
- [P2] Guide is manual JSON only and has no freshness metadata - `public/guide-restaurants.json:1`, `scripts/validate-data.js:225`.
- [P1] Freshness lives in generated JSON timestamps, not runtime server state - `scripts/scrape.js:1304`, `scripts/scrape-jazz.js:1436`, `scripts/scrape-restaurants.js:443`.
- [P2] Normalization exists, but it is ad hoc and spread across scripts/hooks rather than a typed contract - `scripts/scrape-restaurants.js:69`, `src/hooks/useAppData.js:14`.
- [P1] `useAppData` cache-busts JSON with `?t=Date.now()`, while the service worker caches exact requests. Offline/cache behavior is likely worse than intended - `src/hooks/useAppData.js:47`, `public/sw.js:43`, `public/sw.js:47`.

### Silent-failure architecture

- [P1] Cinema supplemental scrapers catch and return `[]` - `scripts/scrape.js:543`, `scripts/scrape.js:619`, `scripts/scrape.js:722`, `scripts/scrape.js:781`, `scripts/scrape.js:829`.
- [P1] Filmbot date-page failures are skipped silently inside the loop - `scripts/scrape.js:710`, `scripts/scrape.js:715`.
- [P1] AMC missing key returns empty results, so "not configured" becomes "no showtimes" downstream - `scripts/scrape.js:853`, `scripts/scrape.js:856`.
- [P1] Jazz has a `scrapeErrors` array, which is good, but sources can still return `[]` internally and avoid that mechanism - `scripts/scrape-jazz.js:1071`, `scripts/scrape-jazz.js:1439`.
- [P1] Restaurant adapters return `[]` for expected and unexpected failures - `scripts/sources/infatuation-hitlist.js:85`, `scripts/sources/infatuation-hitlist.js:124`, `scripts/sources/eater-essential.js:26`, `scripts/sources/eater-essential.js:31`.
- [P1] UI filters out empty cinema theaters before the By Theater page can display an error or empty-source state - `src/hooks/useCinemaFilter.js:53`, `src/components/AppRoutes.jsx:39`.

Target shape:

- Source adapters return `{ status, records, error, fetchedAt, sourceUrl }`, not bare arrays.
- Health report lists source failures and source-empty states separately.
- UI receives venues/theaters even when their records array is empty and displays source status.
- CI fails on adapter exceptions unless the source is explicitly marked optional.

### Eventbrite 405

- [P2] Eventbrite adapter is at `scripts/sources/eventbrite-jazz.js:14`. It uses axios GET with UA and Accept only - `scripts/sources/eventbrite-jazz.js:15`.
- [P2] Live check on 2026-05-23 returned valid Eventbrite results, so the May 1 405 is not currently reproducible. Most likely cause: Eventbrite varied bot handling in GitHub Actions or required fuller browser headers.
- [P2] Fix: add `Accept-Language`, broader Accept, retry/fallback through native `fetch` on 403/405, and report 405 as a source error in health instead of collapsing to lost listings.

### Guide freshness

- [P2] Confirmed: validator says "Manual file, no freshness check" - `scripts/validate-data.js:225`.
- [P2] Add `lastReviewed` to `guide-restaurants.json` and validate it with a looser editorial threshold, probably warn at 60 days and critical at 120. If James wants guide content intentionally evergreen, document that in the file and health report instead of silently skipping it.

### Architecture & state

- [P2] State is local React state and props, no Context/Zustand/Redux/server-state library - `src/App.jsx:27`, `src/App.jsx:28`, `src/App.jsx:29`.
- [P2] `App` is still the data/state/router coordinator; recent `AppRoutes` extraction helps, but state still flows top-down through props - `src/App.jsx:84`, `src/components/AppRoutes.jsx:31`.
- [P1] Filters are not URL-shareable. Format filter, search query, vibe, splash state, and user identity live in component state/session/local storage - `src/App.jsx:28`, `src/App.jsx:29`, `src/App.jsx:30`, `src/App.jsx:31`, `src/views/Watchlist.jsx:145`.
- [P2] Back/forward works for routes, but not for filter state. Deep links exist for screenings, jazz shows, food spots, and day screenshots - `src/components/AppRoutes.jsx:38`, `src/components/AppRoutes.jsx:40`, `src/components/AppRoutes.jsx:48`, `src/components/AppRoutes.jsx:60`.
- [P1] Pure Vite client rendering means crawlers get an empty root and JavaScript bundle, not listing HTML - `index.html:21`, `src/main.jsx:36`.

### Performance

- [P2] Build succeeds. Current chunks: `dist/index.html` 1.09 kB gzip, CSS 22.29 kB gzip, `html2canvas.esm` 47.07 kB gzip, main JS 120.00 kB gzip. Nothing exceeds 200 kB gzip, but main JS is carrying every mode - build output from 2026-05-23.
- [P2] `html2canvas` is a heavy route-specific feature bundled as its own chunk; justified for screenshot generation if lazy-loaded, but keep it isolated - `package.json:20`.
- [P2] Leaflet is loaded from CDN in the document head, not route-lazy. Map code pays global network and CSS/JS cost even for non-map users - `index.html:16`, `index.html:17`.
- [P2] Images often lack explicit width/height and lazy loading in list views. Poster images in ByDay use CSS sizing only - `src/views/ByDay.jsx:58`, `src/views/Detail.jsx:264`.
- [P2] Render performance is mostly okay for current scale, but `useAppData` fetches all domains on first load even if the user only wants cinema - `src/hooks/useAppData.js:50`.
- [P3] FCP estimate: shell should paint quickly on static hosting after JS/CSS load, but meaningful content is gated by JSON fetch and hydration. Without lab measurement, call it likely sub-second locally, unstable on cold mobile network.

### SEO & discoverability

- [P1] No SSR/static prerender. Listing content is not in HTML - `index.html:21`.
- [P1] No sitemap or robots.txt found in `public`.
- [P1] No canonical URLs or OG/Twitter card tags found in `index.html`.
- [P1] No schema.org Event/MovieTheater/Restaurant structured data - search found none in `src` or `index.html`.
- [P1] Routes for individual screenings exist, but their title/description are runtime only and not crawler/link-preview friendly - `src/components/AppRoutes.jsx:40`, `src/hooks/usePageTitle.js:13`.
- [P2] Static meta still describes only cinema, not jazz/food/guide - `index.html:7`, `public/manifest.json:4`.

### Accessibility

- [P1] Map popups are raw Leaflet HTML strings, not React semantics, and they also create the XSS issue - `src/views/MapView.jsx:54`, `src/views/JazzMapView.jsx:65`.
- [P2] Main listing rows are `li` elements and clickable cards, but many are not native links/buttons for the primary action. Keyboard support is likely uneven - `src/views/ByTheater.jsx:51`, `src/views/Search.jsx:45`.
- [P2] TopBar has nested buttons: a `button` contains a refresh `button`, which is invalid interactive markup - `src/components/TopBar.jsx:200`, `src/components/TopBar.jsx:208`.
- [P2] Filter drawer has no focus trap or focus return. It is not a modal, but keyboard users can get a sloppy experience - `src/components/TopBar.jsx:127`.
- [P2] No automated contrast audit run. Palette is intentionally dark/gold; many muted text values need spot checks - `src/index.css:7`, `src/index.css:13`, `src/index.css:14`.

### Security

- [P0] XSS via Leaflet `bindPopup` strings from scraped data - `src/views/MapView.jsx:54`, `src/views/MapView.jsx:74`, `src/views/JazzMapView.jsx:65`, `src/views/JazzMapView.jsx:82`.
- [P1] `dangerouslySetInnerHTML` renders generated bio markdown after only lightweight regex processing. If `louis-cole-bio.json` is trusted and local, risk is lower; if generated/edited from external content, sanitize properly - `src/views/JazzBioEssay.jsx:34`, `src/views/JazzBioEssay.jsx:37`.
- [P2] No `VITE_*` client env usage found, so no obvious API keys are intentionally bundled.
- [P2] CSP headers are absent; GitHub Pages makes this harder, but there is no equivalent hardening file/config - `.github/workflows/deploy.yml:1`.
- [P2] `npm audit --audit-level=high` could not run in this sandbox because registry DNS failed (`ENOTFOUND registry.npmjs.org`). Current advisories are therefore uncertain; rerun with network.

### Error handling & resilience

- [P1] There is no React error boundary around app routes; a render error takes down the app shell - `src/main.jsx:36`.
- [P1] `useAppData` treats cinema JSON as mandatory and the others as optional. If cinema fails, app only shows "Unable to load data"; if jazz/food/guide fail, their routes degrade to null-ish state depending on view - `src/hooks/useAppData.js:50`, `src/App.jsx:40`.
- [P1] Empty source state and broken source state collapse to the same UI in cinema - `src/hooks/useCinemaFilter.js:53`.
- [P2] Service worker precaches JSON by exact path but runtime fetches cache-busted URLs, so offline support for data is probably broken - `public/sw.js:4`, `public/sw.js:43`, `src/hooks/useAppData.js:48`.
- [P2] Zero-result filter states exist but are generic, not source-aware - `src/views/ByDay.jsx:181`, `src/views/ByTheater.jsx:172`, `src/views/Search.jsx:155`.

### Code quality

- [P2] This is JavaScript, not TypeScript. For a scraper-heavy data product, lack of typed source/output contracts is a real quality tax - `package.json:5`.
- [P2] Big files should be split by responsibility: `scripts/scrape-jazz.js` 1463 lines, `scripts/scrape.js` 1334, `src/views/Detail.css` 776, `src/App.css` 724, `src/views/EatsByTier.css` 710, `src/views/DateNightGenerator.jsx` 454.
- [P2] `src/views/DateNightGenerator.jsx` mixes plan generation UI, sharing, filtering, activity rendering, and state - `src/views/DateNightGenerator.jsx:1`.
- [P2] `src/hooks/useAppData.js` mutates fetched restaurant objects in place while normalizing - `src/hooks/useAppData.js:14`.
- [P2] Duplicated badge/format strip styling exists across ByDay, ByTheater, Search, Detail, Screenshot - `src/views/ByDay.css:321`, `src/views/ByTheater.css:239`, `src/views/Search.css:196`, `src/views/Detail.css:408`.
- [P2] Lint currently fails, including `setState` in effects and duplicate keys in seed data - `src/components/TopBar.jsx:78`, `src/hooks/useAppData.js:77`, `src/views/DateNightGenerator.jsx:68`, `scripts/seed-lists.js:65`.
- [P3] TODO/FIXME/HACK count appears low; no major TODO inventory showed up. The real debt is structural, not comments.

### Testing

- [P2] No test script in `package.json` - `package.json:6`.
- [P2] Only `test-scraper.js` was found, and it uses CommonJS `require` in a `"type": "module"` package, so it is a manual probe at best and likely broken as-is - `test-scraper.js:11`, `package.json:5`.
- [P2] No Vitest/Jest/Playwright config found. For a single-maintainer side project, not urgent; for data scrapers that silently fail, source-contract tests are worth it.

### Build & deploy

- [P2] Deploy target is GitHub Pages - `.github/workflows/deploy.yml:1`, `.github/workflows/deploy.yml:42`.
- [P1] Scrape workflow validates but then commits and deploys under `if: always()`, so validation failure does not reliably block publishing bad data - `.github/workflows/scrape.yml:46`, `.github/workflows/scrape.yml:49`, `.github/workflows/scrape.yml:73`.
- [P1] Cinema scrape step passes Twilio/TMDB env vars but not `AMC_API_KEY`, breaking AMC fallback in CI - `.github/workflows/scrape.yml:27`.
- [P2] `.env.example` exists but still has old branding and needs source/env documentation refreshed - `.env.example:1`.
- [P2] README documents only `npm run scrape`, not the real multi-domain scripts - `README.md:35`, `package.json:11`, `package.json:12`, `package.json:14`.

### Scope drift between README and reality

- [P2] README describes cinema-only product - `README.md:3`.
- [P2] Actual app has cinema, jazz, food, guide, and roll/date-night modes - `src/components/AppRoutes.jsx:37`, `src/components/AppRoutes.jsx:45`, `src/components/AppRoutes.jsx:53`, `src/components/AppRoutes.jsx:63`, `src/components/AppRoutes.jsx:66`.
- [P2] Actual scripts include `scrape:jazz`, `scrape:eats`, `scrape:eats:hot`, and `scrape:all` - `package.json:11`, `package.json:12`, `package.json:13`, `package.json:14`.
- [P2] CI schedule runs cinema+jazz daily, restaurants Fridays/Sundays/manual, weekly digest Fridays - `.github/workflows/scrape.yml:4`.

README rewrite outline:

1. What sixpm is: time-organized LA cinema, jazz, food, guides.
2. Modes and data files: `theaters.json`, `jazz-venues.json`, `restaurants.json`, `guide-restaurants.json`.
3. Scraper architecture: Cheerio static adapters, API adapters, Playwright-only dynamic adapters.
4. Health model: freshness, source status, failure semantics.
5. Local dev and scripts.
6. Env vars and secrets.
7. Deploy and scrape schedule.
8. Known fragile sources and how to debug them.

### Horizon mismatch

- [P2] README says "two-month" - `README.md:3`.
- [P2] Scraper comments say RevivalHouses is about 7 days, with supplemental sources extending only selected theaters - `scripts/scrape.js:6`, `scripts/scrape.js:9`.
- [P2] AMC API fetches only next 7 days - `scripts/scrape.js:898`.
- [P2] Supplemental horizon depends on source: New Bev ~1 month, Vista ~5 weeks, Brain Dead ~6 weeks, Vidiots ~1 month - `scripts/scrape.js:9`.
- [P2] Health report horizon of 37 days is therefore expected from current source mix, not a bug - `public/health-report.md:15`.

### The one weird thing

- [P2] The Infatuation scraper tries to import `puppeteer-extra` and `puppeteer-extra-plugin-stealth`, but `package.json` only lists `puppeteer`. When Cheerio gets too few results, the fallback can silently return `[]` because the package is missing - `scripts/sources/infatuation-hitlist.js:85`, `package.json:36`.

## What's actually good

- The recent route extraction is good. `AppRoutes` makes the actual product shape visible and easier to reason about - `src/components/AppRoutes.jsx:31`.
- The data health report exists and catches aggregate rot. It needs source-level blame, but the habit is right - `scripts/validate-data.js:1`.
- The current visual density/card/grid direction is worth preserving. The problem is the Deco garnish, not the whole UI.
- The scraper already has the right instinct to abort a catastrophically thin cinema scrape instead of writing garbage - `scripts/scrape.js:1289`.

## Open questions for James

- Should AMC multiplexes remain in scope, or should sixpm focus on repertory/curated venues?
- Is `/X117/` still the intended public URL, or is a real sixpm domain coming?
- For the guide, should freshness mean "last editorial review" rather than scrape freshness?
- For Secret Movie Club, WHAMMY, and Landmark: is browser-rendered scraping acceptable, or should those be manually curated until stable endpoints are found?
- Should Josefin Sans stay as part of the current sixpm feel, or should all type move to Inter/Geist/system-ui?

