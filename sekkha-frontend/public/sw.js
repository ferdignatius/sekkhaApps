// Minimal network-first Service Worker for PWA installability on Android & Desktop.
// Deliberately avoids aggressive caching or intercepting navigation/Vite dev requests so
// aborted navigations or dev server reloads never reject a FetchEvent.

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("fetch", () => {
  // Let the browser perform native network fetches directly.
  // Keeping the fetch listener registered satisfies Chrome/Android PWA installability criteria
  // without causing unhandled FetchEvent promise rejections on reload or aborted navigations.
})
