export function createAppleMapsUrl({ name = '', address = '', neighborhood = '', lat, lng } = {}) {
  const query = [name, address || neighborhood, 'Los Angeles, CA']
    .filter(Boolean)
    .join(', ')

  const params = new URLSearchParams()
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    params.set('ll', `${lat},${lng}`)
  }
  if (query) params.set('q', query)

  return `https://maps.apple.com/?${params.toString()}`
}
