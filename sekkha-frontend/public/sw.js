// Minimal network-first Service Worker for PWA installability on Android & Desktop.
// Deliberately avoids aggressive caching so API responses and authenticated routes always stay fresh.

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api")) {
    return
  }

  event.respondWith(fetch(request))
})
