import { useEffect, useRef, useState } from 'react'
import { THEATER_COORDS } from '../data/theaterLocations.js'
import { loadLeaflet } from '../utils/loadLeaflet.js'
import { createAppleMapsUrl } from '../utils/directions.js'
import './MapView.css'

function MapView({ data }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const [leaflet, setLeaflet] = useState(null)
  const [mapError, setMapError] = useState('')

  useEffect(() => {
    let active = true
    loadLeaflet()
      .then(instance => {
        if (active) setLeaflet(instance)
      })
      .catch(error => {
        if (active) setMapError(error.message)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return
    if (!leaflet) return

    const L = leaflet
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
  }, [leaflet])

  // Add/update markers when data changes
  useEffect(() => {
    if (!mapInstanceRef.current || !data || !leaflet) return
    const L = leaflet
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
        const line = document.createElement('a')
        line.className = 'map-popup-screening'
        line.href = `${import.meta.env.BASE_URL}screening/${encodeURIComponent(screening.id)}`
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

      const actions = document.createElement('div')
      actions.className = 'map-popup-actions'
      const directions = document.createElement('a')
      directions.href = createAppleMapsUrl({ name: theater.name, neighborhood: theater.neighborhood, ...coords })
      directions.target = '_blank'
      directions.rel = 'noopener noreferrer'
      directions.textContent = 'Directions'
      const browse = document.createElement('a')
      browse.href = `${import.meta.env.BASE_URL}by-theater#${encodeURIComponent(theater.id)}`
      browse.textContent = 'Browse venue'
      actions.append(directions, browse)
      popupContent.appendChild(actions)

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
  }, [data, leaflet])

  return (
    <div className="map-view">
      {mapError && <div className="map-load-error" role="alert">{mapError}. Use the theater list instead.</div>}
      <div ref={mapRef} className="map-container" />
    </div>
  )
}

export default MapView
