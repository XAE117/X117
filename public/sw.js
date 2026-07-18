// SIXPM — bounded offline cache
const CACHE_NAME = 'sixpm-v4'
const BASE = new URL(self.registration.scope).pathname
const PRECACHE_URLS = [
  BASE,
  `${BASE}favicon.svg`,
  `${BASE}icon-192.svg`,
  `${BASE}icon-512.svg`,
]

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS)))
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  )
  self.clients.claim()
})

function stableCacheKey(request) {
  const url = new URL(request.url)
  url.searchParams.delete('t')
  return new Request(url.toString(), request)
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME)
  const key = stableCacheKey(request)
  try {
    const response = await fetch(request)
    if (response.ok) await cache.put(key, response.clone())
    return response
  } catch {
    const cached = await cache.match(key)
    if (cached) return cached
    if (request.mode === 'navigate') return cache.match(BASE)
    throw new Error('Offline and no cached response is available')
  }
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return
  event.respondWith(networkFirst(event.request))
})
