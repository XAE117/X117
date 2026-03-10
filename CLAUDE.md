# Liza's Palace — Claude Code Build Context

## API Keys (stored in .env, gitignored)
- **Google Places API**: `AIzaSyBw6yqBs_yqoDj3oD3nNGUVwLpKNawvVrs` (Firebase project)
- **AMC Theatres API**: `33407B35-31D1-48C9-8BA1-3DBB829F3F61`
- **TMDB API**: stored in environment, used by `scripts/scrape.js`

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

## npm Scripts
- `npm run scrape` — Scrape cinema data
- `npm run scrape:jazz` — Scrape jazz data
- `npm run scrape:eats` — Scrape restaurant data
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
