# THE PALACE

A two-month repertory cinema calendar for Los Angeles arthouse and repertory theaters. Built with React + Vite, styled as a 1930s Art Deco film palace.

## Features

- **By Theater** view: grid of theater cards, click to expand and see full screening list
- **By Month** view: two-column calendar showing all screenings across all theaters by date
- **Detail Page**: full screening info with format badges, notes, and ticket links
- **Search**: real-time filtering across all film titles
- **This Week** filter: narrow both views to the next 7 days
- Art Deco design with gold/charcoal/burgundy palette, geometric ornaments, and custom typography

## Theaters Tracked

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
| `npm run scrape` | Re-scrape theater data from the web |

## Re-running the Scraper

The scraper fetches screening data from revivalhouses.com and individual theater websites, deduplicates entries, and writes `public/theaters.json`.

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

## Data Format

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
      "url": "https://www.newbeverly.com",
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
