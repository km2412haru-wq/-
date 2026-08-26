// Minimal service worker: makes the app installable as a standalone icon
// (Android's "Install app" prompt looks for a registered SW) and gives a
// best-effort offline fallback. News data itself is never cached here —
// it always goes to the network so you see fresh articles, not stale ones.
const CACHE_NAME = "ai-ma-radar-v1";
const APP_SHELL = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Always hit the network for news data / API calls — no stale caching.
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches
          .open(CACHE_NAME)
          .then((cache) => cache.put(request, copy))
          .catch(() => {});
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
  );
});
