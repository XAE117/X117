# SIXPM — Claude Code Build Context

## API Keys
**All keys are stored in `.env` (gitignored) and as GitHub Actions secrets.**
**Canonical reference: see the "x117 API Keys" page in Notion under Claude Context Master.**

Required environment variables (see `.env.example`):
- `TMDB_API_KEY` — The Movie Database v3 API key (film enrichment in `scripts/scrape.js`)
- `AMC_API_KEY` — AMC Theatres Developer API vendor key (X-AMC-Vendor-Key header)
- `NOTION_API_KEY` — Notion integration token (shared with iMessage pipeline)
- `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER` — Godfather SMS alert + weekly digest

**Never commit secrets to this file or anywhere tracked by git.** This repo is public.
If a key is ever leaked, rotate it immediately in the provider console and update both
`.env` and the GitHub Actions secret (`gh secret set KEY_NAME --repo xae117/X117`).

## Architecture
- **Framework**: React 19 + Vite + React Router v7
- **Data**: Static JSON files in `public/` scraped by Node.js scripts
- **Three modes**: Cinema (film), Jazz, Eats — each with own data file and routes
- **Scraping**: Cheerio for HTML parsing, Puppeteer for JS-rendered pages, Axios for HTTP

## Data Files
- `public/theaters.json` — Cinema screenings + TMDB film metadata
- `public/film-enrichments.json` — Curated RT/Letterboxd/reviews/podcasts (merged during scrape)
- `public/jazz-venues.json` — Jazz venue shows
- `public/restaurants.json` — Restaurant guide with tier classification and heat scores
- `public/health-report.md` — Data health report, regenerated on every scrape

## npm Scripts
- `npm run scrape` — Scrape cinema data (loads `.env` via `--env-file-if-exists`)
- `npm run scrape:jazz` — Scrape jazz data
- `npm run scrape:eats` — Scrape restaurant data
- `npm run scrape:all` — Run all three scrapers sequentially
- `npm run validate` — Run data health checks (exit code 2 = critical)
- `npm run dev` — Dev server
- `npm run build` — Production build

## Commit Convention
- Descriptive first line summarizing changes
- Body with details when warranted
- Include Claude session URL

## File Organization
- `src/views/` — Page components (ByDay, Detail, EatsByTier, etc.)
- `src/components/` — Shared UI (Nav, ModeSwitcher, Icons, SplashScreen)
- `scripts/` — Data scrapers and utilities
- `public/` — Static data files
