let leafletPromise

export function loadLeaflet() {
  if (!leafletPromise) {
    leafletPromise = Promise.all([
      import('leaflet'),
      import('leaflet/dist/leaflet.css'),
    ])
      .then(([module]) => module.default || module)
      .catch(error => {
        leafletPromise = null
        throw error
      })
  }
  return leafletPromise
}
