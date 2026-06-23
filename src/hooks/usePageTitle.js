import { useEffect } from 'react'

const MODE_TITLES = {
  roll: "SIXPM — Tonight's Lineup",
  guide: "SIXPM — The Corn & Fire Companion",
  food: "SIXPM — LA Restaurant Guide",
  jazz: "SIXPM — LA Jazz & Live Music",
  cinema: "SIXPM — LA Repertory Cinema",
}

export function usePageTitle(mode) {
  useEffect(() => {
    document.title = MODE_TITLES[mode] || MODE_TITLES.cinema
  }, [mode])
}
