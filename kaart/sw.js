// Service worker voor het visitekaartje: maakt hem installeerbaar en laat hem ook offline werken.
const CACHE = 'beck-kaart-v4';
const BASIS = [
  '/kaart/',
  '/kaart/rutger-beck-on-the-rocks.vcf',
  '/assets/css/fonts.css',
  '/assets/css/site.css',
  '/assets/fonts/jost-latin-300-normal.woff2',
  '/assets/fonts/jost-latin-400-normal.woff2',
  '/assets/fonts/cormorant-garamond-latin-500-normal.woff2',
  '/assets/img/w/logo-dark-300.webp',
  '/assets/img/w/logo-dark-300.png',
  '/assets/img/qr-beckontherocks.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASIS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('beck-kaart-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Eerst het netwerk (altijd actueel), zonder verbinding uit de cache
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(res => {
    if (res.ok) { const kopie = res.clone(); caches.open(CACHE).then(c => c.put(e.request, kopie)); }
    return res;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
