import { useEffect, useRef } from 'react'
import { THEATER_COORDS } from '../data/theaterLocations.js'
import './MapView.css'

function MapView({ data }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return
    if (!window.L) return

    const L = window.L
    const map = L.map(mapRef.current, {
      center: [34.05, -118.3],
      zoom: 11,
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

    data.theaters.forEach(theater => {
      const coords = THEATER_COORDS[theater.id]
      if (!coords) return

      const upcoming = theater.screenings.slice(0, 3)
      const screeningLines = upcoming.map(s => {
        const d = new Date(s.date + 'T00:00:00')
        const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        const fmt = s.format && s.format !== 'digital' ? ` <span class="map-popup-format">${s.format}</span>` : ''
        return `<div class="map-popup-screening">${dateStr} — ${s.title}${fmt}</div>`
      }).join('')

      const popupContent = `
        <div class="map-popup">
          <strong class="map-popup-name" style="color:${theater.color}">${theater.name}</strong>
          <span class="map-popup-hood">${theater.neighborhood}</span>
          <span class="map-popup-count">${theater.screenings.length} upcoming</span>
          ${screeningLines}
        </div>
      `

      L.circleMarker([coords.lat, coords.lng], {
        radius: 8,
        fillColor: theater.color,
        color: theater.color,
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.6,
      })
        .bindPopup(popupContent, { className: 'palace-popup', maxWidth: 280 })
        .addTo(map)
    })
  }, [data])

  return (
    <div className="map-view">
      <div ref={mapRef} className="map-container" />
    </div>
  )
}

export default MapView
