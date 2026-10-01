/* Offline shell: network first, cached copy when offline. Bump VERSION when files change. */
var VERSION = 'cl-v16';
var SHELL = ['./', 'index.html', 'styles.css', 'config.js', 'bank.html', 'starter.js', 'c3dmeta.js', 'c3d.js', 'creatures.js', 'avatar.js', 'pets.js', 'adventure.js', 'defense.js', 'world.js', 'store.js', 'app.js',
  'firebase-app.js', 'firebase-auth.js', 'firebase-firestore.js', 'icon-192.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches['delete'](k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(fetch(e.request).then(function (res) {
    var copy = res.clone();
    caches.open(VERSION).then(function (c) { c.put(e.request, copy); });
    return res;
  })['catch'](function () { return caches.match(e.request).then(function (r) { return r || caches.match('index.html'); }); }));
});
