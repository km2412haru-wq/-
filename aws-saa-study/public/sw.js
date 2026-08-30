// 最小構成のService Worker。
// 目的はオフライン対応そのものではなく、ブラウザの「ホーム画面に追加/インストール」
// 判定を安定させること（一部のブラウザはfetchハンドラを持つSWの存在を見る）。
// ついでに、一度開いたページはキャッシュから読めるようにして再訪時を高速化する。
const CACHE_NAME = 'aws-study-shell-v1'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request)
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response.ok) cache.put(event.request, response.clone())
          return response
        })
        .catch(() => cached)
      return cached ?? networkFetch
    }),
  )
})
