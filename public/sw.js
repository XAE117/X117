// Liza's Palace — Service Worker
// Strategy: network-first for all requests, cache as offline fallback only
const CACHE_NAME = 'palace-v8'
const BASE = '/X117/'

self.addEventListener('install', (e) => {
  // Skip waiting so the new SW activates immediately
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  // Purge ALL old caches
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)

  // Only handle same-origin + Google Fonts
  if (url.origin !== self.location.origin &&
      url.hostname !== 'fonts.googleapis.com' &&
      url.hostname !== 'fonts.gstatic.com') {
    return
  }

  // Skip non-GET requests
  if (e.request.method !== 'GET') return

  // Network-first for everything
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Only cache successful responses
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone))
        }
        return res
      })
      .catch(() => caches.match(e.request))
  )
})
