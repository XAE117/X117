#!/usr/bin/env node

/**
 * Seed film metadata for titles in theaters.json
 * Provides director/year/runtime for well-known films when TMDB data is unavailable.
 * Run: node scripts/seed-films.js
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_PATH = join(__dirname, '..', 'public', 'theaters.json')

function slugify(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

// Well-known film metadata (director, year, runtime in minutes)
const KNOWN_FILMS = {
  'once-upon-a-time-in-hollywood': { director: 'Quentin Tarantino', year: 2019, runtime: 161 },
  'true-romance': { director: 'Tony Scott', year: 1993, runtime: 119 },
  'django-unchained': { director: 'Quentin Tarantino', year: 2012, runtime: 165 },
  'blue-velvet': { director: 'David Lynch', year: 1986, runtime: 120 },
  'lost-in-translation': { director: 'Sofia Coppola', year: 2003, runtime: 102 },
  'barry-lyndon': { director: 'Stanley Kubrick', year: 1975, runtime: 185 },
  'la-dolce-vita': { director: 'Federico Fellini', year: 1960, runtime: 174 },
  'belle-de-jour': { director: 'Luis Buñuel', year: 1967, runtime: 100 },
  'persona': { director: 'Ingmar Bergman', year: 1966, runtime: 83 },
  'solaris': { director: 'Andrei Tarkovsky', year: 1972, runtime: 167 },
  'the-holy-mountain': { director: 'Alejandro Jodorowsky', year: 1973, runtime: 114 },
  'the-good-the-bad-and-the-ugly': { director: 'Sergio Leone', year: 1966, runtime: 178 },
  'the-maltese-falcon': { director: 'John Huston', year: 1941, runtime: 100 },
  'the-wizard-of-oz': { director: 'Victor Fleming', year: 1939, runtime: 102 },
  'the-birds': { director: 'Alfred Hitchcock', year: 1963, runtime: 119 },
  'the-warriors': { director: 'Walter Hill', year: 1979, runtime: 92 },
  'the-wicker-man': { director: 'Robin Hardy', year: 1973, runtime: 88 },
  'the-rocky-horror-picture-show': { director: 'Jim Sharman', year: 1975, runtime: 100 },
  'the-muppets-take-manhattan': { director: 'Frank Oz', year: 1984, runtime: 94 },
  'harold-and-maude': { director: 'Hal Ashby', year: 1971, runtime: 91 },
  'blow-up': { director: 'Michelangelo Antonioni', year: 1966, runtime: 111 },
  'breathless': { director: 'Jean-Luc Godard', year: 1960, runtime: 90 },
  'playtime': { director: 'Jacques Tati', year: 1967, runtime: 124 },
  'body-double': { director: 'Brian De Palma', year: 1984, runtime: 114 },
  'point-break': { director: 'Kathryn Bigelow', year: 1991, runtime: 122 },
  'spring-breakers': { director: 'Harmony Korine', year: 2012, runtime: 94 },
  'interview-with-the-vampire': { director: 'Neil Jordan', year: 1994, runtime: 123 },
  'american-graffiti': { director: 'George Lucas', year: 1973, runtime: 110 },
  'almost-famous': { director: 'Cameron Crowe', year: 2000, runtime: 122 },
  'empire-records': { director: 'Allan Moyle', year: 1995, runtime: 90 },
  'giant': { director: 'George Stevens', year: 1956, runtime: 201 },
  'super-fly': { director: 'Gordon Parks Jr.', year: 1972, runtime: 93 },
  'new-jack-city': { director: 'Mario Van Peebles', year: 1991, runtime: 97 },
  'showgirls': { director: 'Paul Verhoeven', year: 1995, runtime: 131 },
  'zardoz': { director: 'John Boorman', year: 1974, runtime: 105 },
  'viridiana': { director: 'Luis Buñuel', year: 1961, runtime: 90 },
  'safety-last': { director: 'Fred C. Newmeyer', year: 1923, runtime: 70 },
  'funny-games': { director: 'Michael Haneke', year: 1997, runtime: 108 },
  'ravenous': { director: 'Antonia Bird', year: 1999, runtime: 101 },
  'freeway': { director: 'Matthew Bright', year: 1996, runtime: 102 },
  'bicycle-thieves': { director: 'Vittorio De Sica', year: 1948, runtime: 89 },
  'grave-of-the-fireflies': { director: 'Isao Takahata', year: 1988, runtime: 89 },
  'paprika': { director: 'Satoshi Kon', year: 2006, runtime: 90 },
  'weathering-with-you': { director: 'Makoto Shinkai', year: 2019, runtime: 112 },
  'kung-fu-panda-2': { director: 'Jennifer Yuh Nelson', year: 2011, runtime: 90 },
  'beauty-and-the-beast': { director: 'Gary Trousdale', year: 1991, runtime: 84 },
  'beaches': { director: 'Garry Marshall', year: 1988, runtime: 123 },
  'the-more-the-merrier': { director: 'George Stevens', year: 1943, runtime: 104 },
  'the-hitch-hiker': { director: 'Ida Lupino', year: 1953, runtime: 71 },
  'last-tango-in-paris': { director: 'Bernardo Bertolucci', year: 1972, runtime: 129 },
  'henry-june': { director: 'Philip Kaufman', year: 1990, runtime: 136 },
  'seven-beauties': { director: 'Lina Wertmüller', year: 1975, runtime: 116 },
  'the-decameron': { director: 'Pier Paolo Pasolini', year: 1971, runtime: 111 },
  'frankenstein': { director: 'James Whale', year: 1931, runtime: 70 },
  'sweet-charity': { director: 'Bob Fosse', year: 1969, runtime: 149 },
  'the-gang-s-all-here': { director: 'Busby Berkeley', year: 1943, runtime: 103 },
  'little-shop-of-horrors': { director: 'Frank Oz', year: 1986, runtime: 94 },
  'uhf': { director: 'Jay Levey', year: 1989, runtime: 97 },
  'waiting-for-guffman': { director: 'Christopher Guest', year: 1996, runtime: 84 },
  'a-mighty-wind-on-35mm': { director: 'Christopher Guest', year: 2003, runtime: 91 },
  'romy-and-michele-s-high-school-reunion': { director: 'David Mirkin', year: 1997, runtime: 92 },
  'thank-you-for-smoking': { director: 'Jason Reitman', year: 2005, runtime: 92 },
  'babe-pig-in-the-city': { director: 'George Miller', year: 1998, runtime: 97 },
  'the-face-of-another': { director: 'Hiroshi Teshigahara', year: 1966, runtime: 124 },
  'ali-fear-eats-the-soul-on-35mm': { director: 'Rainer Werner Fassbinder', year: 1974, runtime: 93 },
  'fellini-s-casanova': { director: 'Federico Fellini', year: 1976, runtime: 155 },
  'conversation-piece': { director: 'Luchino Visconti', year: 1974, runtime: 121 },
  'venus-in-furs': { director: 'Jesús Franco', year: 1969, runtime: 86 },
  'salaam-bombay': { director: 'Mira Nair', year: 1988, runtime: 113 },
  'black-girl': { director: 'Ousmane Sembène', year: 1966, runtime: 65 },
  'zama': { director: 'Lucrecia Martel', year: 2017, runtime: 115 },
  'caligula-the-ultimate-cut': { director: 'Tinto Brass', year: 1979, runtime: 156 },
  'the-juniper-tree': { director: 'Nietzchka Keene', year: 1990, runtime: 78 },
  'son-of-the-white-mare': { director: 'Marcell Jankovics', year: 1981, runtime: 86 },
  'the-gleaners-and-i': { director: 'Agnès Varda', year: 2000, runtime: 82 },
  'bright-star': { director: 'Jane Campion', year: 2009, runtime: 119 },
  'jeanne-dielman-23-quai-du-commerce-1080-bruxelles': { director: 'Chantal Akerman', year: 1975, runtime: 201 },
  'love-streams': { director: 'John Cassavetes', year: 1984, runtime: 141 },
  'moulin-rouge-in-35mm': { director: 'Baz Luhrmann', year: 2001, runtime: 127 },
  'thx-1138': { director: 'George Lucas', year: 1971, runtime: 86 },
  'high-school': { director: 'Frederick Wiseman', year: 1968, runtime: 75 },
  'national-gallery': { director: 'Frederick Wiseman', year: 2014, runtime: 181 },
  'chico-rita': { director: 'Fernando Trueba', year: 2010, runtime: 94 },
  'la-captive': { director: 'Chantal Akerman', year: 2000, runtime: 118 },
  'lolita-1997': { director: 'Adrian Lyne', year: 1997, runtime: 137 },
  'jackass-number-two': { director: 'Jeff Tremaine', year: 2006, runtime: 95 },
  'faster-pussycat-kill-kill': { director: 'Russ Meyer', year: 1965, runtime: 83 },
  'motorpsycho': { director: 'Russ Meyer', year: 1965, runtime: 73 },
  'darby-o-gill-and-the-little-people': { director: 'Robert Stevenson', year: 1959, runtime: 93 },
  '24-hour-party-people': { director: 'Michael Winterbottom', year: 2002, runtime: 117 },
  'belly': { director: 'Hype Williams', year: 1998, runtime: 96 },
  'thunder-road': { director: 'Jim Cummings', year: 2018, runtime: 92 },
  'sinners': { director: 'Ryan Coogler', year: 2025, runtime: 137 },
  'the-running-man': { director: 'Edgar Wright', year: 2025, runtime: 0 },
  'project-hail-mary': { director: 'Phil Lord', year: 2026, runtime: 0 },
  'longlegs-sold-out': { director: 'Oz Perkins', year: 2024, runtime: 101 },
  'beyond-the-mat': { director: 'Barry W. Blaustein', year: 1999, runtime: 102 },
  'groove': { director: 'Greg Harrison', year: 2000, runtime: 86 },
  'clockstoppers': { director: 'Jonathan Frakes', year: 2002, runtime: 94 },
}

const data = JSON.parse(readFileSync(DATA_PATH, 'utf-8'))

// Collect unique titles
const titles = new Set()
data.theaters.forEach(t => t.screenings.forEach(s => titles.add(s.title)))

const films = {}
let matched = 0

for (const title of titles) {
  const slug = slugify(title)
  if (KNOWN_FILMS[slug]) {
    films[slug] = {
      ...KNOWN_FILMS[slug],
      posterPath: null,
      overview: '',
      rating: 0,
    }
    matched++
  }
}

data.films = films

writeFileSync(DATA_PATH, JSON.stringify(data, null, 2))
console.log(`Seeded ${matched} of ${titles.size} films with metadata`)
