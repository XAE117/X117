// Artist → music link mapping
// Keys are matched as substrings against show.artist (case-insensitive)

const ARTIST_LINKS = {
  // ── Blue Note ──
  'Robert Glasper':       { url: 'https://open.spotify.com/artist/5cM1PvItlR21WUyBnsdMcn', type: 'spotify' },
  'Lakecia Benjamin':     { url: 'https://open.spotify.com/artist/6hvjxbUASJd6bHds2Teaul', type: 'spotify' },
  'Cory Henry':           { url: 'https://open.spotify.com/artist/21SOnTj5ECwVXeBUTRcP3s', type: 'spotify' },
  'Joe Lovano':           { url: 'https://open.spotify.com/artist/36YE6h8aN09ZKG4EhneDSf', type: 'spotify' },
  'Ambrose Akinmusire':   { url: 'https://open.spotify.com/artist/4ai53dgSBGhQwcFtGyY1bF', type: 'spotify' },

  // ── Baked Potato ──
  'Billy Mohler':         { url: 'https://open.spotify.com/artist/0Uarz3INviDpAxsBzZSGN0', type: 'spotify' },
  'Nate Wood':            { url: 'https://open.spotify.com/artist/7naYSK1hW7hTZJtrhCrLvR', type: 'spotify' },
  'Jeff Parker':          { url: 'https://open.spotify.com/artist/3AaY5O1qS0tcNPHwwMwplt', type: 'spotify' },

  // ── Catalina ──
  'Connie Han':           { url: 'https://open.spotify.com/artist/05u1DXPSD35OnIBPXFogTG', type: 'spotify' },
  'John Beasley':         { url: 'https://open.spotify.com/artist/48F7fzeDb7gxJm8I9tHVRW', type: 'spotify' },
  'Kamasi Washington':    { url: 'https://open.spotify.com/artist/6HQYnRM4OzToCYPpVBInuU', type: 'spotify' },

  // ── Sam First ──
  'Nicole McCabe':        { url: 'https://open.spotify.com/artist/00yDWlggrS34V03oLFjMbl', type: 'spotify' },
  'Devin Daniels':        { url: 'https://open.spotify.com/artist/4HPiRHS9kbeZNlSFPC7gWu', type: 'spotify' },
  'Henry Solomon':        { url: 'https://open.spotify.com/artist/65dR9mWSEKojt3aFbevjrR', type: 'spotify' },

  // ── Vibrato ──
  'Tierney Sutton':       { url: 'https://open.spotify.com/artist/2jc5EP16xf145WUYvolSVm', type: 'spotify' },
  'Larry Goldings':       { url: 'https://open.spotify.com/artist/6wTD4jLsPadWutQ9nJvzT6', type: 'spotify' },

  // ── World Stage ──
  'Dwight Trible':        { url: 'https://open.spotify.com/artist/5HzryqCINeBjTh2KnPtWnu', type: 'spotify' },

  // ── Lodge Room / Minaret ──
  'Sam Wilkes':           { url: 'https://open.spotify.com/artist/6Xo1vXFRCEJPgVqCyHlTPW', type: 'spotify' },
  'Fievel is Glauque':    { url: 'https://open.spotify.com/artist/0aCjVhVSBUMVwo7WRrdLiJ', type: 'spotify' },
  'Kassa Overall':        { url: 'https://open.spotify.com/artist/7qzzcFzliEAHMlDA9qaRVf', type: 'spotify' },

  // ── St. Barnabas / Minaret ──
  'Sam Gendel':           { url: 'https://open.spotify.com/artist/3luuQQRuSBuDNnrkYvatnk', type: 'spotify' },
  'Steve Lehman':         { url: 'https://open.spotify.com/artist/5Al3ktlrPkN2fhMRQzSYXP', type: 'spotify' },

  // ── Concert Halls ──
  'Vijay Iyer':           { url: 'https://open.spotify.com/artist/27DeRe5LjIt9ZPXUjF90h6', type: 'spotify' },
  'Christian McBride':    { url: 'https://open.spotify.com/artist/5ACxPOI9gR3l0cyy2dvkHv', type: 'spotify' },
  'Otmaro Ruiz':          { url: 'https://open.spotify.com/artist/1FWrmABS5NEpmqdsHfXj2N', type: 'spotify' },
  'Branford Marsalis':    { url: 'https://open.spotify.com/artist/1gPY6jETlC02stpXOUmSBH', type: 'spotify' },

  // ── The High Low ──
  'Dan Rosenboom':        { url: 'https://open.spotify.com/artist/4kVvCUomBdjmo6vRVgz4hz', type: 'spotify' },

  // ── PSSTUDIO ──
  'Slauson Malone':       { url: 'https://open.spotify.com/artist/6mWYIx4qV7et94cpRRU77N', type: 'spotify' },

  // ── MCYC ──
  'Salami Rose Joe Louis': { url: 'https://open.spotify.com/artist/6EHS9kZ9PpeXaJ4wZO3FSX', type: 'spotify' },
}

/**
 * Look up a music link for a show's artist name.
 * Matches artist keys as substrings (case-insensitive) so
 * "Sam Gendel solo" matches the "Sam Gendel" entry.
 */
export function getArtistLink(artistName) {
  if (!artistName) return null
  const lower = artistName.toLowerCase()
  for (const [key, value] of Object.entries(ARTIST_LINKS)) {
    if (lower.includes(key.toLowerCase())) return value
  }
  return null
}

export default ARTIST_LINKS
