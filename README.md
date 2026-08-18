# SIXPM

SIXPM is a decision-first Los Angeles evening planner. It combines current
film screenings, live jazz, and restaurants into plans that are feasible by
time, distance, and known opening hours.

Production: [sixpm.vercel.app](https://sixpm.vercel.app)

## Product

- **Home**: two workable evening lineups plus a small set of film, jazz, and
  dinner alternatives
- **Roll**: generates an hours-checked food + film or food + jazz plan within
  an eight-mile maximum
- **Browse and search**: grouped film showtimes, jazz listings, restaurants,
  date filters, and maps
- **Saved**: local film/jazz watchlist and starred restaurants
- **Guides**: editorial taco, pizza, and artist essays, loaded only when opened
- **Installable**: responsive PWA with bounded offline caching
- **Morning Console**: a private refresh-driven briefing at
  `/morning-console` that combines Notion projects, Toggl effort, body signals,
  and a clearly labeled symbolic astrology layer

SIXPM does not invent availability. Restaurants without coordinates or usable
hours can be browsed, but they are excluded from generated plans.

## Local development

Requires Node 22.

```bash
npm install
npm run dev
```

The app opens at `http://localhost:5173`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Build the production app into `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run desktop and mobile Playwright journeys |
| `npm run check` | Lint, unit test, build, and dependency audit |
| `npm run validate` | Validate data and update `public/health-report.md` |
| `npm run release:check` | Run the web-wide quality gate and strict guide-data validation without rewriting the report |
| `npm run ios:release:check` | Run the iPhone quality, rights-catalog, bundle, privacy, and Capacitor-sync checks |
| `IOS_SIMULATOR_ID=<udid> npm run test:ios:ui` | Run native iPhone recovery and denied-location QA on an explicit disposable simulator |
| `npm run scrape` | Refresh cinema data |
| `npm run scrape:jazz` | Refresh jazz data |
| `npm run scrape:eats` | Refresh the full restaurant catalog |
| `npm run scrape:eats:hot` | Refresh the fast-moving restaurant lists |
| `npm run scrape:all` | Run all three data pipelines |

`release:check` is the web-wide release gate. Warnings are allowed during
ordinary data refreshes but fail its strict validation. The iPhone lane uses
`ios:release:check`: it still requires the rights-gated catalog, isolated
bundle, privacy manifest, web quality checks, and Capacitor sync, but it does
not confuse the intentionally rights-cleared iPhone dinner notebook with the
full web guide’s coordinate and coverage thresholds.

## Data trust

| File | Contents | Refresh |
| --- | --- | --- |
| `public/theaters.json` | Cinema screenings and film metadata | Daily |
| `public/jazz-venues.json` | Jazz and live-music listings | Daily |
| `public/restaurants.json` | Restaurant catalog | Friday and Sunday |
| `public/guide-restaurants.json` | Hand-curated guide references | Manual |
| `public/scrape-log.json` | Restaurant source outcomes and catalog diff | Per restaurant scrape |
| `public/health-report.md` | Human-readable release health | Per validation |

The validator rejects stale or critically thin datasets, out-of-market
restaurants, and insufficient event coverage. The restaurant scraper refuses
to refresh timestamps unless enough live sources return records.

Optional enrichment keys:

- `AMC_API_KEY` for AMC showtimes
- `TMDB_API_KEY` for film metadata
- Twilio credentials for configured SMS alerts

Google Places enrichment is retired. The App Store catalog never receives
Google-derived place content; its provider policy and field-level validator
are documented in [`docs/app-store/DATA_RIGHTS_LEDGER.md`](docs/app-store/DATA_RIGHTS_LEDGER.md).

## Deployment

Vercel is the canonical production host. `vercel.json` builds the app at `/`,
applies security headers, preserves `/api/*`, and rewrites client routes to the
SPA entry point.

The GitHub Pages workflow remains a static fallback at `/X117/`. It cannot run
the Morning Console Notion endpoint.

Morning Console API variables:

- `NOTION_API_KEY`
- `NOTION_BODY_SIGNALS_DATABASE_ID`
- `MORNING_CONSOLE_SECRET`
- `TOGGL_API_TOKEN`

The Morning Console keeps Notion and Toggl credentials server-side. Its private
access key is stored only in the local browser. Momentum Streaks currently keeps
its history in that app's browser storage, so the console reports it as
device-only instead of claiming a live sync. The coaching language is reflective
planning support, not therapy or medical care. Astrological material is an
optional symbolic lens and does not override health, legal, financial, or safety
decisions.

Before production:

```bash
npm run release:check
vercel --prod
```

After deployment, verify `/`, `/roll`, `/search`, `/map`, `robots.txt`, and
`sitemap.xml` on the production hostname.

## Architecture

- React 19 and React Router 7
- Vite 7 with route-level code splitting
- Leaflet loaded only on map routes
- Vitest and Playwright
- Node/Cheerio/Axios/Puppeteer data pipelines

See [`PRODUCT_REVIEW_2026-07-17.md`](PRODUCT_REVIEW_2026-07-17.md) for the
product rationale, research synthesis, measured improvements, and launch gates.
