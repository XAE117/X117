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
| `npm run release:check` | Run all quality checks and strict data validation |
| `npm run scrape` | Refresh cinema data |
| `npm run scrape:jazz` | Refresh jazz data |
| `npm run scrape:eats` | Refresh the full restaurant catalog |
| `npm run scrape:eats:hot` | Refresh the fast-moving restaurant lists |
| `npm run scrape:all` | Run all three data pipelines |

`release:check` is the release gate. Warnings are allowed during ordinary data
refreshes but fail the strict release check.

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
- `GOOGLE_PLACES_API_KEY` for restaurant address/neighborhood enrichment
- Twilio credentials for configured SMS alerts

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
