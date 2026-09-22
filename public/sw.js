/* Tender Hours service worker — offline-capable PWA shell.
 *
 * Strategy:
 *  - Precache the app shell on install (manifest, icons, a few key pages).
 *  - Navigation requests: network-first, fall back to cached / when offline.
 *  - Static assets (/_next/static, /icons, /manifest, /favicon): cache-first,
 *    with stale-while-revalidate so they update eventually.
 *  - API requests: never cached (always network — we want fresh data).
 */

const VERSION = 'tender-hours-v1'
const STATIC_CACHE = `${VERSION}-static`
const RUNTIME_CACHE = `${VERSION}-runtime`

const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon-32.png',
  '/favicon-16.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('SW precache failed', err))
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(VERSION))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)

  // Only handle GET requests
  if (req.method !== 'GET') return

  // Never cache API requests — we want fresh data
  if (url.pathname.startsWith('/api/')) return

  // Skip non-http(s) requests (e.g., chrome-extension://)
  if (!url.protocol.startsWith('http')) return

  // Navigation requests (page loads): network-first, fall back to cached /
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, copy))
          return res
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match('/'))
        )
    )
    return
  }

  // Static assets: stale-while-revalidate
  if (
    url.pathname.startsWith('/_next/static') ||
    url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|otf|css|js)$/i) ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res && res.status === 200) {
              const copy = res.clone()
              caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, copy))
            }
            return res
          })
          .catch(() => cached)
        return cached || network
      })
    )
    return
  }

  // Default: try cache, fall back to network
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone()
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, copy))
          }
          return res
        })
    )
  )
})

// Allow the page to ask the SW to skip waiting (for instant updates)
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})
