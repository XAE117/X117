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

      const popupContent = document.createElement('div')
      popupContent.className = 'map-popup'

      const name = document.createElement('strong')
      name.className = 'map-popup-name'
      name.textContent = theater.name
      if (window.CSS?.supports?.('color', theater.color)) name.style.color = theater.color
      popupContent.appendChild(name)

      const neighborhood = document.createElement('span')
      neighborhood.className = 'map-popup-hood'
      neighborhood.textContent = theater.neighborhood
      popupContent.appendChild(neighborhood)

      const count = document.createElement('span')
      count.className = 'map-popup-count'
      count.textContent = `${theater.screenings.length} upcoming`
      popupContent.appendChild(count)

      theater.screenings.slice(0, 3).forEach((screening) => {
        const line = document.createElement('div')
        line.className = 'map-popup-screening'
        const d = new Date(screening.date + 'T00:00:00')
        const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        line.append(document.createTextNode(`${dateStr} — ${screening.title}`))

        if (screening.format && screening.format !== 'digital') {
          const format = document.createElement('span')
          format.className = 'map-popup-format'
          format.textContent = screening.format
          line.append(' ', format)
        }

        popupContent.appendChild(line)
      })

      L.circleMarker([coords.lat, coords.lng], {
        radius: 8,
        fillColor: theater.color,
        color: theater.color,
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.6,
      })
        .bindPopup(popupContent, { className: 'sixpm-popup', maxWidth: 280 })
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
