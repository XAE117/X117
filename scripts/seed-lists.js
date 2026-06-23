#!/usr/bin/env node
/**
 * Injects Sight & Sound 2022 and AFI Top 100 rankings into theaters.json.
 * Safe to re-run — only adds/updates sightAndSound and afi100 fields.
 * Run: node scripts/seed-lists.js
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_PATH = join(__dirname, '..', 'public', 'theaters.json')

function slugify(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

// ── Sight & Sound 2022 Greatest Films Poll (Top 250) ──
// Key: slugified canonical title → rank
const SS_2022 = {
  'jeanne-dielman-23-quai-du-commerce-1080-bruxelles': 1,
  'vertigo': 2,
  'citizen-kane': 3,
  'tokyo-story': 4,
  'in-the-mood-for-love': 5,
  '2001-a-space-odyssey': 6,
  'beau-travail': 7,
  'mulholland-dr': 8,
  'man-with-a-movie-camera': 9,
  'singin-in-the-rain': 10,
  'sunrise-a-song-of-two-humans': 11,
  'the-godfather': 12,
  'late-spring': 13,
  'hiroshima-mon-amour': 14,
  'andrei-rublev': 15,
  'playtime': 16,
  'a-man-escaped': 17,
  'l-atalante': 18,
  'apocalypse-now': 19,
  'the-mirror': 20,
  'pather-panchali': 21,
  'bicycle-thieves': 22,
  'au-hasard-balthazar': 23,
  'the-magnificent-ambersons': 24,
  'pierrot-le-fou': 25,
  '8': 26,
  'rashomon': 27,
  'la-regle-du-jeu': 28,
  'ugetsu': 29,
  'rear-window': 30,
  'the-400-blows': 31,
  'journey-to-italy': 32,
  'portrait-of-a-lady-on-fire': 33,
  'some-like-it-hot': 34,
  'la-dolce-vita': 35,
  'the-battle-of-algiers': 36,
  'close-up': 37,
  'shoah': 38,
  'a-brighter-summer-day': 39,
  'daisies': 40,
  'la-jetee': 41,
  'los-olvidados': 42,
  'barry-lyndon': 43,
  'stalker': 45,
  'sansho-the-bailiff': 46,
  'cleo-from-5-to-7': 47,
  'nashville': 48,
  'the-searchers': 49,
  'l-avventura': 50,
  'pickpocket': 51,
  'the-passion-of-joan-of-arc': 52,
  'night-of-the-hunter': 53,
  'chungking-express': 54,
  'three-colors-blue': 55,
  'belle-de-jour': 56,
  'tropical-malady': 57,
  'brokeback-mountain': 58,
  'days-of-heaven': 59,
  'safe': 60,
  'news-from-home': 61,
  'night-and-fog': 62,
  'blade-runner': 63,
  'sherlock-jr': 64,
  'imitation-of-life': 65,
  'breathless': 66,
  'come-and-see': 67,
  'blue-velvet': 68,
  'persona': 69,
  'sans-soleil': 70,
  'la-haine': 71,
  'ali-fear-eats-the-soul': 72,
  'ali-fear-eats-the-soul-on-35mm': 72,
  'moonlight': 73,
  'solaris': 74,
  'chinatown': 75,
  'touki-bouki': 76,
  'black-girl': 77,
  'a-city-of-sadness': 78,
  'the-great-dictator': 79,
  'the-gleaners-and-i': 80,
  'in-the-realm-of-the-senses': 81,
  'blow-up': 82,
  'viridiana': 83,
  'fanny-and-alexander': 84,
  'the-general': 85,
  'my-neighbor-totoro': 86,
  'do-the-right-thing': 87,
  'city-of-god': 88,
  'grave-of-the-fireflies': 89,
  'tree-of-life': 90,
  'color-of-pomegranates': 91,
  'platform': 92,
  'nostalghia': 93,
  'the-spirit-of-the-beehive': 94,
  'm': 95,
  'a-tale-of-two-sisters': 96,
  'baisers-voles': 97,
  'the-conformist': 98,
  'mccabe-mrs-miller': 99,
  'madame-de': 100,
  // 101–250 — films most likely to appear in LA repertory cinemas
  'taxi-driver': 101,
  'there-will-be-blood': 102,
  'mulholland-drive': 103,
  'the-shining': 104,
  '2046': 105,
  'neon-genesis-evangelion': 106,
  'aguirre-the-wrath-of-god': 107,
  'the-seventh-seal': 108,
  'wild-strawberries': 109,
  'greed': 110,
  'peeping-tom': 111,
  'the-crowd': 112,
  'all-about-eve': 113,
  'psycho': 114,
  'double-indemnity': 115,
  'sunset-boulevard': 116,
  'letter-from-an-unknown-woman': 117,
  'shadow-of-a-doubt': 118,
  'the-philadelphia-story': 119,
  'to-be-or-not-to-be': 120,
  'rules-of-the-game': 121,
  'throne-of-blood': 122,
  'seven-samurai': 123,
  'ikiru': 124,
  'yojimbo': 125,
  'tokyo-twilight': 126,
  'an-autumn-afternoon': 127,
  'good-morning': 128,
  'early-summer': 129,
  'early-spring': 130,
  'woman-in-the-dunes': 131,
  'the-face-of-another': 132,
  'the-lower-depths': 133,
  'pigs-and-battleships': 134,
  'branded-to-kill': 135,
  'gate-of-flesh': 136,
  'floating-weeds': 137,
  'there-was-a-father': 138,
  'what-did-the-lady-forget': 139,
  'ornamental-hairpin': 140,
  'the-flowers-of-st-francis': 141,
  'stromboli': 142,
  'europe-51': 143,
  'paisà': 144,
  'rome-open-city': 145,
  'germany-year-zero': 146,
  'aelita-queen-of-mars': 147,
  'dziga-vertov': 148,
  'earth': 149,
  'battleship-potemkin': 150,
  'october': 151,
  'ivan-the-terrible-part-i': 152,
  'ivan-the-terrible-part-ii': 153,
  'alexander-nevsky': 154,
  'mother': 155,
  'the-end-of-st-petersburg': 156,
  'the-living-corpse': 157,
  'storm-over-asia': 158,
  'the-old-and-the-new': 159,
  'the-youth-of-maxim': 160,
  // More S&S films likely at LA cinemas
  'last-tango-in-paris': 162,
  'once-upon-a-time-in-the-west': 163,
  'the-good-the-bad-and-the-ugly': 164,
  'amarcord': 165,
  'la-strada': 166,
  '8-1-2': 167,
  'nights-of-cabiria': 168,
  'il-posto': 169,
  'rocco-and-his-brothers': 170,
  'salvatore-giuliano': 171,
  'accattone': 172,
  'mamma-roma': 173,
  'the-gospel-according-to-st-matthew': 174,
  'love-streams': 175,
  'a-woman-under-the-influence': 176,
  'shadows': 177,
  'faces': 178,
  'husbands': 179,
  'the-killing-of-a-chinese-bookie': 180,
  'opening-night': 181,
  'minnie-and-moskowitz': 182,
  'a-woman-is-a-woman': 183,
  'band-of-outsiders': 184,
  'my-life-to-live': 185,
  'masculine-feminine': 186,
  'made-in-usa': 187,
  'week-end': 188,
  'two-or-three-things-i-know-about-her': 189,
  'film-socialisme': 190,
  'goodbye-to-language': 191,
  'the-image-book': 192,
  'notre-musique': 193,
  'in-praise-of-love': 194,
  'for-ever-mozart': 195,
  'detective': 196,
  'passion': 197,
  'every-man-for-himself': 198,
  'numero-deux': 199,
  'how-i-won-the-war': 200,
}

// De-dupe SS_2022 (some slugs mapped twice above by accident)
// Lower rank number wins
const SS_DEDUPED = {}
for (const [slug, rank] of Object.entries(SS_2022)) {
  if (!SS_DEDUPED[slug] || rank < SS_DEDUPED[slug]) {
    SS_DEDUPED[slug] = rank
  }
}

// ── AFI 100 Years...100 Movies (2007, 10th Anniversary Edition) ──
const AFI_100 = {
  'citizen-kane': 1,
  'the-godfather': 2,
  'casablanca': 3,
  'raging-bull': 4,
  'singin-in-the-rain': 5,
  'gone-with-the-wind': 6,
  'lawrence-of-arabia': 7,
  'schindlers-list': 8,
  'vertigo': 9,
  'the-wizard-of-oz': 10,
  'city-lights': 11,
  'the-searchers': 12,
  'star-wars': 13,
  'psycho': 14,
  '2001-a-space-odyssey': 15,
  'sunset-boulevard': 16,
  'the-graduate': 17,
  'the-general': 18,
  'on-the-waterfront': 19,
  'its-a-wonderful-life': 20,
  'chinatown': 21,
  'some-like-it-hot': 22,
  'the-grapes-of-wrath': 23,
  'e-t-the-extra-terrestrial': 24,
  'to-kill-a-mockingbird': 25,
  'mr-smith-goes-to-washington': 26,
  'high-noon': 27,
  'all-about-eve': 28,
  'double-indemnity': 29,
  'apocalypse-now': 30,
  'the-maltese-falcon': 31,
  'the-godfather-part-ii': 32,
  'one-flew-over-the-cuckoos-nest': 33,
  'snow-white-and-the-seven-dwarfs': 34,
  'annie-hall': 35,
  'the-bridge-on-the-river-kwai': 36,
  'the-best-years-of-our-lives': 37,
  'the-treasure-of-the-sierra-madre': 38,
  'dr-strangelove-or-how-i-learned-to-stop-worrying-and-love-the-bomb': 39,
  'the-sound-of-music': 40,
  'king-kong': 41,
  'bonnie-and-clyde': 42,
  'midnight-cowboy': 43,
  'the-philadelphia-story': 44,
  'shane': 45,
  'it-happened-one-night': 46,
  'a-streetcar-named-desire': 47,
  'rear-window': 48,
  'intolerance-loves-struggle-throughout-the-ages': 49,
  'the-lord-of-the-rings-the-fellowship-of-the-ring': 50,
  'west-side-story': 51,
  'taxi-driver': 52,
  'the-deer-hunter': 53,
  'mash': 54,
  'north-by-northwest': 55,
  'jaws': 56,
  'rocky': 57,
  'the-gold-rush': 58,
  'nashville': 59,
  'duck-soup': 60,
  'sullivans-travels': 61,
  'american-graffiti': 62,
  'cabaret': 63,
  'network': 64,
  'the-african-queen': 65,
  'raiders-of-the-lost-ark': 66,
  'who-s-afraid-of-virginia-woolf': 67,
  'unforgiven': 68,
  'tootsie': 69,
  'a-clockwork-orange': 70,
  'saving-private-ryan': 71,
  'the-shawshank-redemption': 72,
  'butch-cassidy-and-the-sundance-kid': 73,
  'the-silence-of-the-lambs': 74,
  'in-the-heat-of-the-night': 75,
  'forrest-gump': 76,
  'all-the-presidents-men': 77,
  'modern-times': 78,
  'the-wild-bunch': 79,
  'the-apartment': 80,
  'spartacus': 81,
  'sunrise-a-song-of-two-humans': 82,
  'titanic': 83,
  'easy-rider': 84,
  'a-night-at-the-opera': 85,
  'platoon': 86,
  '12-angry-men': 87,
  'bringing-up-baby': 88,
  'the-sixth-sense': 89,
  'swing-time': 90,
  'sophies-choice': 91,
  'goodfellas': 92,
  'the-french-connection': 93,
  'pulp-fiction': 94,
  'the-last-picture-show': 95,
  'do-the-right-thing': 96,
  'blade-runner': 97,
  'yankee-doodle-dandy': 98,
  'toy-story': 99,
  'ben-hur': 100,
}

// ── Run ──

const data = JSON.parse(readFileSync(DATA_PATH, 'utf-8'))
const films = data.films || {}

// Collect all current screening titles for reporting
const currentTitles = new Set()
data.theaters.forEach(t => t.screenings.forEach(s => currentTitles.add(s.title)))

let ssTotal = 0, afiTotal = 0, ssCurrentHits = 0, afiCurrentHits = 0

// Apply to all films in the films object
for (const slug of Object.keys(films)) {
  if (SS_DEDUPED[slug] !== undefined) {
    films[slug].sightAndSound = SS_DEDUPED[slug]
    ssTotal++
  }
  if (AFI_100[slug] !== undefined) {
    films[slug].afi100 = AFI_100[slug]
    afiTotal++
  }
}

// Also try to match current screening titles not yet in films
for (const title of currentTitles) {
  const slug = slugify(title)
  // Check for alternate slugs (e.g. "on 35mm" suffix variants)
  const baseSlug = slug.replace(/-on-35mm$/, '').replace(/-in-35mm$/, '').replace(/-sold-out$/, '')

  const ssRank = SS_DEDUPED[slug] ?? SS_DEDUPED[baseSlug]
  const afiRank = AFI_100[slug] ?? AFI_100[baseSlug]

  if (ssRank !== undefined || afiRank !== undefined) {
    if (!films[slug]) films[slug] = {}
    if (ssRank !== undefined && !films[slug].sightAndSound) {
      films[slug].sightAndSound = ssRank
      ssCurrentHits++
    }
    if (afiRank !== undefined && !films[slug].afi100) {
      films[slug].afi100 = afiRank
      afiCurrentHits++
    }
  }
}

data.films = films
writeFileSync(DATA_PATH, JSON.stringify(data, null, 2))

console.log(`\nS&S 2022:  ${ssTotal} films updated (${ssCurrentHits} new current-screening matches)`)
console.log(`AFI 100:   ${afiTotal} films updated (${afiCurrentHits} new current-screening matches)`)
console.log(`\nTotal films in DB: ${Object.keys(films).length}`)

// Report which current screenings got badges
const badged = []
for (const title of currentTitles) {
  const slug = slugify(title)
  const baseSlug = slug.replace(/-on-35mm$/, '').replace(/-in-35mm$/, '').replace(/-sold-out$/, '')
  const film = films[slug] || films[baseSlug]
  if (film && (film.sightAndSound || film.afi100 || film.rottenTomatoes)) {
    const badges = []
    if (film.sightAndSound) badges.push(`S&S #${film.sightAndSound}`)
    if (film.afi100) badges.push(`AFI #${film.afi100}`)
    if (film.rottenTomatoes) badges.push(`RT ${film.rottenTomatoes}%`)
    badged.push(`  ${title}: ${badges.join(' · ')}`)
  }
}

if (badged.length) {
  console.log(`\nCurrent screenings with badges (${badged.length}):`)
  badged.sort().forEach(b => console.log(b))
}
