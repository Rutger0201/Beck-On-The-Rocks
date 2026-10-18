// Service worker voor de offerte- en factuurmaker: werkt ook offline.
const CACHE = 'beck-documenten-v9';
const BASIS = [
  'documenten.html',
  'documenten.webmanifest',
  'assets/css/documenten.css',
  'assets/js/documenten.js',
  'assets/js/analyse.js',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/favicon-48.png',
  'assets/img/logo-light.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASIS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('beck-documenten-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const zelfde = url.origin === location.origin;
  if (!zelfde && url.hostname !== 'fonts.googleapis.com' && url.hostname !== 'fonts.gstatic.com') return;

  // Bibliotheken en lettertypes veranderen niet: eerst uit de cache
  if (url.pathname.includes('/assets/vendor/') || !zelfde) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') caches.open(CACHE).then(c => c.put(req, res.clone()));
      return res;
    })));
    return;
  }

  // De rest: eerst het netwerk (altijd de nieuwste versie), offline uit de cache
  e.respondWith(fetch(req).then(res => {
    if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true })));
});
