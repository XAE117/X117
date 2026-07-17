import { useMemo } from 'react'

const FILM_FORMATS = ['35mm', '70mm', '16mm', 'nitrate']
const NEW_RELEASE_MIN_YEAR = 2024

const FAVORITE_THEATERS = [
  'vista-theatre',
  'alamo-dtla',
  'egyptian',
  'los-feliz-3',
  'new-beverly',
  'academy-museum',
]

export function filterCinemaData(data, formatFilter, now = new Date()) {
  if (!data) return null

  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  let theaterList = data.theaters

  // Favorites filter: show only curated theaters
  if (formatFilter === 'favorites') {
    theaterList = theaterList.filter(t => FAVORITE_THEATERS.includes(t.id))
  }

  const theaters = theaterList.map(theater => {
    let screenings = theater.screenings.filter(s => {
      const d = new Date(s.date + 'T00:00:00')
      return d >= today
    })

    // Apply format filter (film only)
    if (formatFilter === 'film') {
      screenings = screenings.filter(s => {
        return FILM_FORMATS.includes(s.format?.toLowerCase())
      })
    }

    // Apply new release filter
    if (formatFilter === 'new') {
      const films = data.films || {}
      const slugify = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      screenings = screenings.filter(s => {
        const slug = slugify(s.title)
        const film = films[slug]
        return film && film.year >= NEW_RELEASE_MIN_YEAR
      })
    }

    return { ...theater, screenings }
  }).filter(theater => theater.screenings.length > 0)

  return { ...data, theaters }
}

export function useCinemaFilter(data, formatFilter) {
  return useMemo(() => filterCinemaData(data, formatFilter), [data, formatFilter])
}
