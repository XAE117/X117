import { useEffect } from 'react'

const MODE_TITLES = {
  roll: "SIXPM — Tonight's Lineup",
  guide: "SIXPM — The Corn & Fire Companion",
  food: "SIXPM — LA Restaurant Guide",
  jazz: "SIXPM — LA Jazz & Live Music",
  cinema: "SIXPM — LA Repertory Cinema",
}

const ROUTE_TITLES = {
  '/': 'SIXPM — Tonight in Los Angeles',
  '/search': 'SIXPM — Search Film, Jazz & Food',
  '/browse': 'SIXPM — Film Calendar',
  '/amc': 'SIXPM — AMC Los Angeles Showtimes',
  '/tonight': 'SIXPM — Films Tonight',
  '/watchlist': 'SIXPM — Film Watchlist',
}

export function usePageTitle(mode, pathname) {
  useEffect(() => {
    document.title = ROUTE_TITLES[pathname] || MODE_TITLES[mode] || MODE_TITLES.cinema
  }, [mode, pathname])
}
