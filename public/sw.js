// Liza's Palace — Service Worker
// Strategy: network-first for HTML/data, stale-while-revalidate for assets
const CACHE_NAME = 'palace-v2'
const BASE = '/X117/'

self.addEventListener('install', (e) => {
  // Skip waiting so the new SW activates immediately
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  // Purge all old caches
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

  // Only handle same-origin + fonts
  if (url.origin !== self.location.origin &&
      url.hostname !== 'fonts.googleapis.com' &&
      url.hostname !== 'fonts.gstatic.com') {
    return
  }

  // Network-first for navigation (HTML pages) and theater data
  if (e.request.mode === 'navigate' || url.pathname.endsWith('theaters.json')) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone))
          return res
        })
        .catch(() => caches.match(e.request))
    )
    return
  }

  // Stale-while-revalidate for everything else (JS, CSS, fonts, images)
  // Serves cached version immediately, then updates the cache in the background
  e.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(e.request).then((cached) => {
        const networkFetch = fetch(e.request).then((res) => {
          cache.put(e.request, res.clone())
          return res
        }).catch(() => cached)

        // Return cached immediately if available, otherwise wait for network
        return cached || networkFetch
      })
    )
  )
})
