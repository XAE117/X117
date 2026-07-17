import { useEffect, useRef } from 'react'
import { JAZZ_VENUE_COORDS } from '../data/jazzVenueLocations.js'
import './JazzMapView.css'

function JazzMapView({ data }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return
    if (!window.L) return

    const L = window.L
    const map = L.map(mapRef.current, {
      center: [34.0, -118.25],
      zoom: 10,
      zoomControl: true,
      attributionControl: true,
    })

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
    }).addTo(map)

    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  // Add/update markers when data changes
  useEffect(() => {
    if (!mapInstanceRef.current || !data || !window.L) return
    const L = window.L
    const map = mapInstanceRef.current

    // Clear existing markers
    map.eachLayer(layer => {
      if (layer instanceof L.CircleMarker) map.removeLayer(layer)
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    data.venues.forEach(venue => {
      const coords = JAZZ_VENUE_COORDS[venue.id]
      if (!coords) return

      const upcomingShows = venue.shows
        .filter(s => new Date(s.date + 'T00:00:00') >= today)
        .slice(0, 3)

      const totalUpcoming = venue.shows.filter(s => new Date(s.date + 'T00:00:00') >= today).length
      const popupContent = document.createElement('div')
      popupContent.className = 'jazz-map-popup'

      const name = document.createElement('strong')
      name.className = 'jazz-map-popup-name'
      name.textContent = venue.name
      if (window.CSS?.supports?.('color', venue.color)) name.style.color = venue.color
      popupContent.appendChild(name)

      const neighborhood = document.createElement('span')
      neighborhood.className = 'jazz-map-popup-hood'
      neighborhood.textContent = venue.neighborhood
      popupContent.appendChild(neighborhood)

      const count = document.createElement('span')
      count.className = 'jazz-map-popup-count'
      count.textContent = `${totalUpcoming} upcoming show${totalUpcoming !== 1 ? 's' : ''}`
      popupContent.appendChild(count)

      upcomingShows.forEach((show) => {
        const line = document.createElement('div')
        line.className = 'jazz-map-popup-show'
        const d = new Date(show.date + 'T00:00:00')
        const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        line.append(document.createTextNode(`${dateStr} — ${show.artist}`))

        if (show.price) {
          const price = document.createElement('span')
          price.className = 'jazz-map-popup-price'
          price.textContent = show.price
          line.append(' ', price)
        }

        popupContent.appendChild(line)
      })

      L.circleMarker([coords.lat, coords.lng], {
        radius: 8,
        fillColor: venue.color,
        color: venue.color,
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.6,
      })
        .bindPopup(popupContent, { className: 'sixpm-popup jazz-popup', maxWidth: 280 })
        .addTo(map)
    })
  }, [data])

  return (
    <div className="jazz-map-view">
      <div ref={mapRef} className="jazz-map-container" />
    </div>
  )
}

export default JazzMapView
