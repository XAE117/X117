import { useEffect, useRef, useState } from 'react'
import { JAZZ_VENUE_COORDS } from '../data/jazzVenueLocations.js'
import { loadLeaflet } from '../utils/loadLeaflet.js'
import './JazzMapView.css'

function JazzMapView({ data }) {
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
        const line = document.createElement('a')
        line.className = 'jazz-map-popup-show'
        line.href = `${import.meta.env.BASE_URL}jazz/show/${encodeURIComponent(show.id)}`
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

      const directions = document.createElement('a')
      directions.className = 'jazz-map-popup-directions'
      directions.href = `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`
      directions.target = '_blank'
      directions.rel = 'noopener noreferrer'
      directions.textContent = 'Get directions'
      popupContent.appendChild(directions)

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
  }, [data, leaflet])

  return (
    <div className="jazz-map-view">
      {mapError && <div className="map-load-error" role="alert">{mapError}. Use the venue list instead.</div>}
      <div ref={mapRef} className="jazz-map-container" />
    </div>
  )
}

export default JazzMapView
