var CACHE = 'fui-shell-v1';
var ASSETS = ['/', '/styles.css', '/app.js', '/manifest.json'];
self.addEventListener('install', function (event) { event.waitUntil(caches.open(CACHE).then(function (cache) { return cache.addAll(ASSETS); })); });
self.addEventListener('activate', function (event) { event.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function (event) { if (event.request.method !== 'GET' || event.request.url.indexOf('/api/') !== -1) { return; } event.respondWith(caches.match(event.request).then(function (cached) { return cached || fetch(event.request).then(function (response) { var copy = response.clone(); caches.open(CACHE).then(function (cache) { cache.put(event.request, copy); }); return response; }); })); });
