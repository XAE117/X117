# Claude Code Prompt: Fix Jazz Scraper

## Context
Run this from the root of the `X117` repo on a machine with internet access.

Branch: `claude/palace-cinema-app-OW90m`

## The Problem
`npm run scrape:jazz` (`scripts/scrape-jazz.js`) scrapes 7 jazz sources but most fail because:
1. **Minaret Records** (minaretrecords.com/shows) — Squarespace site, current selectors may not match actual DOM
2. **lajazz.com** — Weebly site, parser is too loose (grabs raw text blocks, no structured show extraction)
3. **metaljazz.com** — Blogspot, parser grabs raw text but doesn't extract artist/date/venue
4. **Direct venue sites** (Baked Potato, Catalina, Sam First, Lodge Room) — generic CSS selectors that likely don't match real HTML
5. **No Bandsintown/Songkick fallback** — mentioned in comments but never implemented

The scraper currently outputs 0 shows and falls back to stale `public/jazz-venues.json` seed data (which has a Sam Wilkes show on March 9 that may not exist).

## What To Do

### Step 1: Audit each source's real HTML
For each of these URLs, fetch the page and inspect what the actual DOM looks like:
- `https://www.minaretrecords.com/shows`
- `https://www.lajazz.com/`
- `https://www.metaljazz.com/`
- `https://www.thebakedpotato.com/`
- `https://catalinajazzclub.com/calendar/`
- `https://www.samfirstbar.com/`
- `https://www.lodgeroomhlp.com/`

Use `curl` or the WebFetch tool to check each URL. Some may be JS-rendered (need Puppeteer). Determine which ones are Cheerio-scrapable vs which need Puppeteer.

### Step 2: Fix selectors per source
Update `scripts/scrape-jazz.js` so each scraper function uses correct CSS selectors that match the real DOM structure. Key fixes likely needed:

- **Minaret**: Squarespace `summary-v2` blocks — verify the actual block type and class names
- **lajazz.com**: Parse the actual calendar structure (likely tables or structured divs, not loose paragraphs)
- **Venue sites**: Each has unique HTML — inspect and write targeted selectors
- **metaljazz.com**: May have changed format, check if it's still active

### Step 3: Add Puppeteer fallback for JS-rendered sites
Some venue sites (especially Lodge Room, which uses DICE/Eventbrite embeds) may need Puppeteer. The restaurant scraper already has Puppeteer patterns in `scripts/sources/eater-heatmap.js` — follow that pattern. Use `puppeteer-extra` with stealth plugin. Install if needed:
```
npm install -D puppeteer-extra puppeteer-extra-plugin-stealth
```

### Step 4: Add a Songkick/Bandsintown API fallback
As a safety net for venues that are hard to scrape, add a Bandsintown or Songkick lookup:
- Bandsintown: `https://rest.bandsintown.com/artists/{artist}/events?app_id=YOUR_APP_ID`
- Or just use their embeddable calendar pages to verify shows exist

### Step 5: Clean stale data
After scraping successfully, the output should:
- Only include shows with dates >= today (2026-03-07 or current date)
- Remove any shows that no longer appear on any source
- Keep the `hot` flag logic and promoter detection intact

### Step 6: Test and verify
```
npm run scrape:jazz
```
Should output actual shows with real dates, artists, venues, and ticket links. The `public/jazz-venues.json` should be updated with fresh data.

### Step 7: Commit and push
Commit to `claude/palace-cinema-app-OW90m` with a descriptive message.

## File Reference
- **Main scraper**: `scripts/scrape-jazz.js` (630 lines)
- **Output**: `public/jazz-venues.json`
- **Hot artists config**: `public/hot-artists.json`
- **Venue definitions**: Lines 27-54 in `scrape-jazz.js` (22 venues across LA and OC)
- **Existing Puppeteer pattern**: `scripts/sources/eater-heatmap.js`

## Important Notes
- Error isolation: if one source fails, others should still work (this is already implemented)
- The `0 shows → keep existing data` safety net should stay
- Don't break the existing venue IDs or show ID format (`makeShowId` function)
- Keep the hot artist detection system intact
- The frontend reads `jazz-venues.json` expecting: `{ lastUpdated, venues: [{ ...venueDef, shows: [...] }] }`
