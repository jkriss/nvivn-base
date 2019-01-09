const version = 'v3'

const resources = [
  '/',
  '/base.js',
  '/iframe.html',
  '/index.html',
  'app.js', // the app
]
console.log("cached resources:", resources)

self.addEventListener('install', function(event) {
  console.log("got install event:", event )
  // automatically install the new version
  self.skipWaiting()
  caches.open(version).then(function(cache) {
    return cache.addAll(resources)
      .then(() => console.log("precached", resources))
      .catch(console.error)
  })
});

const networkOrCache = (req) => {
  return caches.open(version).then(function(cache) {
    const cachedRes = () => cache.match(req)
    // if we're offline, respond immediately with the cache
    if (!navigator.onLine) {
      console.log("we're offline, hoping for", cachedRes().then(res => console.log("cached res:", res)))
      // event.respondWith(cachedRes())
      return cachedRes()
    } else {
      // if we're online, try the request, and if it fails or times out, response with cache
      // cache.add(event.request).catch(err => {
      return fetch(req)
        .then(res => {
          console.log("got response, caching if ok. ok?", res.ok)
          if (res.ok) cache.put(req, res.clone())
          return res.ok ? res : cachedRes()
          // event.respondWith(res)
        })
        .catch(err => {
          console.log("error fetching:", err, "falling back to cache")
          return cachedRes().then(res => {
            console.log("returned", res)
            return res
          })
          // return cachedRes()
          // event.respondWith(cachedRes())
        })
    }
  })
}


self.addEventListener('fetch', function(event) {
  console.log("fetch event:", event)
  console.log("fetching url:", event.request.url)

  event.respondWith(networkOrCache(event.request))
})

self.addEventListener('activate', function(event) {
  console.log('[activate] Activating service worker!');
  console.log('[activate] Claiming this service worker!');
  event.waitUntil(self.clients.claim());
})
