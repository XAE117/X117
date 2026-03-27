// Liza's Palace — Service Worker
// Strategy: network-first for HTML/data/JS/CSS, cache as fallback only
const CACHE_NAME = 'palace-v3'
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

  // Network-first for everything — cache is only a fallback for offline
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const clone = res.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone))
        return res
      })
      .catch(() => caches.match(e.request))
  )
})
