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

      const showLines = upcomingShows.map(s => {
        const d = new Date(s.date + 'T00:00:00')
        const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        const price = s.price ? ` <span class="jazz-map-popup-price">${s.price}</span>` : ''
        return `<div class="jazz-map-popup-show">${dateStr} — ${s.artist}${price}</div>`
      }).join('')

      const totalUpcoming = venue.shows.filter(s => new Date(s.date + 'T00:00:00') >= today).length

      const popupContent = `
        <div class="jazz-map-popup">
          <strong class="jazz-map-popup-name" style="color:${venue.color}">${venue.name}</strong>
          <span class="jazz-map-popup-hood">${venue.neighborhood}</span>
          <span class="jazz-map-popup-count">${totalUpcoming} upcoming show${totalUpcoming !== 1 ? 's' : ''}</span>
          ${showLines}
        </div>
      `

      L.circleMarker([coords.lat, coords.lng], {
        radius: 8,
        fillColor: venue.color,
        color: venue.color,
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.6,
      })
        .bindPopup(popupContent, { className: 'palace-popup jazz-popup', maxWidth: 280 })
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
