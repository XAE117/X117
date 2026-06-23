// SIXPM — Service Worker
// Strategy: network-first for all requests, cache as offline fallback only
const CACHE_NAME = 'sixpm-v3'
const BASE = self.registration.scope.endsWith('/X117/') ? '/X117/' : '/'
const PRECACHE_URLS = [
  `${BASE}`,
  `${BASE}morning-console.html`,
  `${BASE}morning-console.webmanifest`,
  `${BASE}icon-192.svg`,
  `${BASE}icon-512.svg`,
]

self.addEventListener('install', (e) => {
  // Skip waiting so the new SW activates immediately
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)))
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

  // Only handle same-origin + app fonts/runtime imports
  if (url.origin !== self.location.origin &&
      url.hostname !== 'fonts.googleapis.com' &&
      url.hostname !== 'fonts.gstatic.com' &&
      url.hostname !== 'esm.sh') {
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
