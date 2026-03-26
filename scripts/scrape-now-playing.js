#!/usr/bin/env node

/**
 * THE PALACE — Now Playing Scraper
 *
 * Fetches currently showing films at LA-area AMC theaters via the AMC API,
 * then enriches each film with TMDB metadata (poster, synopsis, director,
 * cast, trailer, scores).
 *
 * Outputs: public/now-playing.json
 *
 * Usage: npm run scrape:now-playing
 *
 * Environment variables:
 *   AMC_API_KEY   — AMC Theatres API key (v2)
 *   TMDB_API_KEY  — TMDB API key for enrichment
 *   GOOGLE_PLACES_API_KEY — Google Places API key for proximity data
 */

import axios from 'axios'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH = join(__dirname, '..', 'public', 'now-playing.json')
const JAZZ_PATH = join(__dirname, '..', 'public', 'jazz-venues.json')

// ── API Keys ──
const AMC_API_KEY = process.env.AMC_API_KEY || '33407B35-31D1-48C9-8BA1-3DBB829F3F61'
const TMDB_API_KEY = process.env.TMDB_API_KEY || ''
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || 'AIzaSyBw6yqBs_yqoDj3oD3nNGUVwLpKNawvVrs'

// ── LA-area AMC Theaters ──
const AMC_THEATERS = [
  { id: 4537, name: 'AMC Century City 15', shortName: 'AMC Century City', neighborhood: 'Century City', color: '#E74C3C', lat: 34.0577, lng: -118.4178 },
  { id: 8170, name: 'AMC The Grove 14', shortName: 'AMC The Grove', neighborhood: 'Fairfax', color: '#E67E22', lat: 34.0722, lng: -118.3580 },
  { id: 4566, name: 'AMC Burbank 16', shortName: 'AMC Burbank', neighborhood: 'Burbank', color: '#F39C12', lat: 34.1816, lng: -118.3254 },
  { id: 8312, name: 'AMC Santa Monica 7', shortName: 'AMC Santa Monica', neighborhood: 'Santa Monica', color: '#3498DB', lat: 34.0151, lng: -118.4953 },
  { id: 4578, name: 'AMC Del Amo 18', shortName: 'AMC Del Amo', neighborhood: 'Torrance', color: '#9B59B6', lat: 33.8312, lng: -118.3560 },
  { id: 2210, name: 'AMC DINE-IN Sunset 5', shortName: 'AMC Sunset', neighborhood: 'West Hollywood', color: '#E91E63', lat: 34.0980, lng: -118.3712 },
]

const AMC_BASE = 'https://api.amctheatres.com/v2'

// ── Helpers ──
function slugify(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ── AMC API ──
async function fetchAMCShowtimes(theaterId, date) {
  try {
    const url = `${AMC_BASE}/theatres/${theaterId}/showtimes/${date}`
    const res = await axios.get(url, {
      headers: {
        'X-AMC-Vendor-Key': AMC_API_KEY,
        'Accept': 'application/json',
      },
      timeout: 15000,
    })
    return res.data?._embedded?.showtimes || []
  } catch (err) {
    console.warn(`  AMC API error for theater ${theaterId}: ${err.message}`)
    return []
  }
}

async function fetchAMCMovies(theaterId) {
  try {
    const url = `${AMC_BASE}/theatres/${theaterId}/movies`
    const res = await axios.get(url, {
      headers: {
        'X-AMC-Vendor-Key': AMC_API_KEY,
        'Accept': 'application/json',
      },
      timeout: 15000,
    })
    return res.data?._embedded?.movies || []
  } catch (err) {
    console.warn(`  AMC movies API error for theater ${theaterId}: ${err.message}`)
    return []
  }
}

// ── TMDB API ──
async function searchTMDB(title, year) {
  if (!TMDB_API_KEY) return null
  try {
    const params = { api_key: TMDB_API_KEY, query: title, language: 'en-US', page: 1 }
    if (year) params.year = year
    const res = await axios.get('https://api.themoviedb.org/3/search/movie', { params, timeout: 10000 })
    return res.data?.results?.[0] || null
  } catch {
    return null
  }
}

async function getTMDBDetails(tmdbId) {
  if (!TMDB_API_KEY || !tmdbId) return null
  try {
    const res = await axios.get(`https://api.themoviedb.org/3/movie/${tmdbId}`, {
      params: { api_key: TMDB_API_KEY, append_to_response: 'credits,videos,release_dates' },
      timeout: 10000,
    })
    return res.data
  } catch {
    return null
  }
}

function extractTMDBData(details) {
  if (!details) return {}

  const director = details.credits?.crew?.find(c => c.job === 'Director')?.name || null
  const cast = (details.credits?.cast || []).slice(0, 5).map(c => c.name)
  const trailer = (details.videos?.results || []).find(v => v.type === 'Trailer' && v.site === 'YouTube')
  const trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null

  // US certification
  const usRelease = (details.release_dates?.results || []).find(r => r.iso_3166_1 === 'US')
  const certification = usRelease?.release_dates?.[0]?.certification || null

  return {
    tmdbId: details.id,
    overview: details.overview || null,
    posterPath: details.poster_path || null,
    backdropPath: details.backdrop_path || null,
    director,
    cast,
    trailerUrl,
    runtime: details.runtime || null,
    rating: details.vote_average || null,
    voteCount: details.vote_count || 0,
    genres: (details.genres || []).map(g => g.name),
    releaseDate: details.release_date || null,
    certification,
    year: details.release_date ? parseInt(details.release_date.slice(0, 4)) : null,
  }
}

// ── Distance Calculation ──
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 3959 // miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Load jazz venue coordinates for Date Night proximity
function loadJazzVenues() {
  if (!existsSync(JAZZ_PATH)) return []
  try {
    const data = JSON.parse(readFileSync(JAZZ_PATH, 'utf-8'))
    return (data.venues || []).filter(v => v.lat && v.lng).map(v => ({
      name: v.name,
      lat: v.lat,
      lng: v.lng,
      neighborhood: v.neighborhood,
    }))
  } catch {
    return []
  }
}

function findNearbyJazzVenues(theaterLat, theaterLng, jazzVenues, radiusMiles = 3) {
  return jazzVenues
    .map(v => ({
      ...v,
      distance: haversineDistance(theaterLat, theaterLng, v.lat, v.lng),
    }))
    .filter(v => v.distance <= radiusMiles)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5)
}

// ── Main Scraper ──
async function scrapeNowPlaying() {
  console.log('🎬 Now Playing scraper starting...')

  const today = new Date()
  const dates = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    dates.push(formatDate(d))
  }

  const jazzVenues = loadJazzVenues()
  console.log(`  Loaded ${jazzVenues.length} jazz venues for proximity`)

  const allFilms = {}
  const theaters = []

  for (const theater of AMC_THEATERS) {
    console.log(`\n📍 ${theater.name}...`)

    const showtimesByFilm = {}

    // Fetch movies list for this theater
    const movies = await fetchAMCMovies(theater.id)
    console.log(`  Found ${movies.length} movies`)

    // Map movie data
    const movieMap = {}
    for (const movie of movies) {
      const slug = slugify(movie.name || movie.title || '')
      movieMap[slug] = {
        title: movie.name || movie.title,
        amcId: movie.id,
        slug,
        mpaaRating: movie.mpaaRating || null,
        runTime: movie.runTime || null,
        posterUrl: movie.media?.posterThumbnail || movie.media?.posterDynamic || null,
        websiteUrl: movie.websiteUrl || null,
        genre: movie.genre || null,
        synopsis: movie.shortSynopsis || movie.synopsis || null,
      }
    }

    // Fetch showtimes for each date
    for (const date of dates) {
      const showtimes = await fetchAMCShowtimes(theater.id, date)

      for (const st of showtimes) {
        const title = st.movieName || st.movie?.title || 'Unknown'
        const slug = slugify(title)

        if (!showtimesByFilm[slug]) {
          showtimesByFilm[slug] = {
            title,
            slug,
            showtimes: [],
          }
        }

        const dt = new Date(st.showDateTimeUtc || st.showDateTimeLocal)
        const timeStr = dt.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: 'America/Los_Angeles',
        })

        showtimesByFilm[slug].showtimes.push({
          date,
          time: timeStr,
          format: st.premiumFormat || st.movieFormat || 'Digital',
          ticketUrl: st._links?.['https://api.amctheatres.com/rels/v2/tickets']?.href || null,
          isSoldOut: st.isSoldOut || false,
        })
      }

      await sleep(200) // Rate limiting
    }

    // Compute nearby jazz venues for this theater
    const nearbyJazz = findNearbyJazzVenues(theater.lat, theater.lng, jazzVenues)

    const theaterEntry = {
      id: `amc-${theater.id}`,
      name: theater.name,
      shortName: theater.shortName,
      neighborhood: theater.neighborhood,
      color: theater.color,
      lat: theater.lat,
      lng: theater.lng,
      nearbyJazzVenues: nearbyJazz,
      films: Object.values(showtimesByFilm).map(film => {
        const movieInfo = movieMap[film.slug] || {}
        return {
          ...film,
          mpaaRating: movieInfo.mpaaRating || null,
          runtime: movieInfo.runTime || null,
          amcPosterUrl: movieInfo.posterUrl || null,
          ticketPageUrl: movieInfo.websiteUrl || null,
          genre: movieInfo.genre || null,
          amcSynopsis: movieInfo.synopsis || null,
        }
      }),
    }

    theaters.push(theaterEntry)

    // Collect unique films for TMDB enrichment
    for (const film of Object.values(showtimesByFilm)) {
      if (!allFilms[film.slug]) {
        allFilms[film.slug] = film.title
      }
    }

    await sleep(300)
  }

  // ── TMDB Enrichment ──
  const tmdbData = {}
  const filmSlugs = Object.keys(allFilms)

  if (TMDB_API_KEY) {
    console.log(`\n🎬 Enriching ${filmSlugs.length} films with TMDB data...`)

    for (const slug of filmSlugs) {
      const title = allFilms[slug]
      console.log(`  TMDB: ${title}`)

      const searchResult = await searchTMDB(title)
      if (searchResult) {
        const details = await getTMDBDetails(searchResult.id)
        tmdbData[slug] = extractTMDBData(details)
      }

      await sleep(250) // TMDB rate limit: ~4/sec
    }
  } else {
    console.log('\n⚠️  No TMDB_API_KEY set — skipping enrichment')
    console.log('   Set TMDB_API_KEY in .env for full metadata')
  }

  // ── Output ──
  const output = {
    lastUpdated: new Date().toISOString(),
    scrapeDate: formatDate(today),
    dateRange: { start: dates[0], end: dates[dates.length - 1] },
    theaters,
    films: tmdbData,
    meta: {
      tmdbEnriched: !!TMDB_API_KEY,
      theaterCount: theaters.length,
      filmCount: filmSlugs.length,
    },
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2))
  console.log(`\n✅ Wrote ${OUTPUT_PATH}`)
  console.log(`   ${theaters.length} theaters, ${filmSlugs.length} films`)
  console.log(`   TMDB enriched: ${!!TMDB_API_KEY}`)
}

scrapeNowPlaying().catch(err => {
  console.error('Scraper failed:', err)
  process.exit(1)
})
