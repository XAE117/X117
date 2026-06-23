# SIXPM

SIXPM is a Los Angeles evening planner built with React + Vite. It combines
three local guides in one installable app: repertory cinema, jazz/live music,
and restaurants.

## Features

- **Cinema**: repertory screenings by day, theater, watchlist, map, and detail pages
- **Jazz**: live shows by day, venue, proximity, map, and show detail pages
- **Eats**: restaurants by category, starred list, map, and guide essays
- **Roll**: date-night generator that combines cinema, music, and food
- **Morning Console**: PWA body-signals check-in that posts to Notion through `/api/body-signals`

## Cinema Sources

- New Beverly Cinema
- Vista Theatre
- Academy Museum of Motion Pictures
- Alamo Drafthouse LA
- Vidiots (Eagle Theatre)
- Brain Dead Studios
- Billy Wilder Theater (Hammer Museum)
- REDCAT
- Laemmle Theatres (Nuart, NoHo 7, Los Feliz 3, Royal)

## Setup

```bash
npm install
npm run dev
```

The app opens at `http://localhost:5173`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm run scrape` | Re-scrape cinema data |
| `npm run scrape:jazz` | Re-scrape jazz/live music data |
| `npm run scrape:eats` | Re-scrape restaurant data |
| `npm run scrape:all` | Run all scrapers |
| `npm run validate` | Generate `public/health-report.md` |

## Deployments

GitHub Pages can serve the static SIXPM app at `/X117/`, but it cannot run
the Morning Console Notion endpoint. Use the Vercel deployment for
`morning-console.html` and any feature that calls `/api/*`.

Required Vercel environment variables:

- `NOTION_API_KEY`
- `NOTION_BODY_SIGNALS_DATABASE_ID`
- `MORNING_CONSOLE_SECRET`

Generate `MORNING_CONSOLE_SECRET` with `openssl rand -hex 32`. Enter the same
value once in the Morning Console; it is stored only in that browser's local
storage and sent as a request header. It is not included in the static bundle.

The Vercel build uses `VITE_BASE_PATH=/` so the app and API run from the root
of the Vercel deployment. The GitHub Pages build keeps the default `/X117/`
base path.

For automated production deployments, connect the Vercel project to
`XAE117/X117` through Vercel's Git integration. Until that integration is
authorized, deploy from an authenticated workstation with `vercel --prod`.

## Re-running Scrapers

The cinema scraper fetches screening data from revivalhouses.com and individual
theater websites, deduplicates entries, and writes `public/theaters.json`.

```bash
npm install    # ensure scraper deps (axios, cheerio) are installed
npm run scrape
```

The scraper will:
1. Fetch from revivalhouses.com (primary aggregator)
2. Fetch from each theater's website directly
3. Deduplicate screenings (preferring direct theater data)
4. Output `public/theaters.json` with a `lastUpdated` timestamp

Some theaters use JavaScript-heavy sites that may need Puppeteer for full rendering. The scraper gracefully handles fetch failures and logs which theaters couldn't be scraped.

## Data Files

- `public/theaters.json`: cinema screenings and film metadata
- `public/jazz-venues.json`: jazz/live music listings
- `public/restaurants.json`: restaurant guide data
- `public/guide-restaurants.json`: curated guide essay references
- `public/health-report.md`: generated data quality report

## Cinema Data Format

`public/theaters.json` follows this schema:

```json
{
  "lastUpdated": "2026-02-22T00:00:00Z",
  "theaters": [
    {
      "id": "new-beverly",
      "name": "New Beverly Cinema",
      "shortName": "New Bev",
      "neighborhood": "Fairfax",
      "url": "https://thenewbev.com/schedule/",
      "color": "#C9A84C",
      "screenings": [
        {
          "id": "unique-screening-id",
          "title": "Chinatown",
          "date": "2026-02-22",
          "time": "7:30 PM",
          "format": "35mm",
          "notes": "Double feature with The Long Goodbye",
          "link": "https://direct-ticket-or-calendar-link"
        }
      ]
    }
  ]
}
```

## Tech Stack

- React 19 + React Router
- Vite 7
- Cheerio + Axios (scraper)
- Google Fonts: Playfair Display, Josefin Sans
