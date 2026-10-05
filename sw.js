/* Offline shell: network first, cached copy when offline. Bump VERSION when files change. */
var VERSION = 'cl-v34';
var SHELL = ['./', 'index.html', 'styles.css', 'config.js', 'bank.html', 'starter.js', 'c3dmeta.js', 'c3d.js', 'creatures.js', 'avatar.js', 'pets.js', 'games.js', 'adventure.js', 'defense.js', 'bed.js', 'world.js', 'store.js', 'app.js',
  'firebase-app.js', 'firebase-auth.js', 'firebase-firestore.js', 'firebase-messaging.js', 'icon-192.png'];
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

/* chore reminders: data pushes from the Cloud Function become notifications; tapping one opens the app */
self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (er) { d = { data: { body: e.data && e.data.text() } }; }
  var p = d.data || d.notification || d;
  e.waitUntil(self.registration.showNotification(p.title || 'Chore Quest', {
    body: p.body || 'You have a chore reminder.', icon: 'icon-192.png', badge: 'icon-mono-192.png', tag: p.tag || 'chore-reminder', renotify: true, data: { url: p.url || './' }
  }));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) { if ('focus' in list[i]) return list[i].focus(); }
    return self.clients.openWindow ? self.clients.openWindow(url) : null;
  }));
});
