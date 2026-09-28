// Vitalog Service Worker
//
// PWAの「インストール可能」判定(Chromeのbeforeinstallprompt条件)を満たすための
// 最小限のService Worker。オフライン時にキャッシュから返す簡易対応も兼ねる。
// データそのものはlocalStorage/IndexedDBにあり、ここではページのシェルのみ扱う。

const CACHE_NAME = "vitalog-shell-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
