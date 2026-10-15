/* Alatika Pro — Service Worker v6 */
const CACHE_NAME = 'alatikapro-v10';
const CORE_ASSETS = [
  './', './index.html', './manifest.json', './sw-v6.js',
  './css/base.css', './css/theme.css', './css/layout-v6.css',
  './css/modules.css', './css/pin.css', './css/profile.css',
  './css/reminders.css', './css/bills.css', './css/items.css',
  './css/money.css', './css/rates.css',
  './js/i18n.js', './js/storage.js', './js/state.js', './js/utils.js',
  './js/currencies.js', './js/nbs.js', './js/converter.js',
  './js/rates-widget.js', './js/router.js', './js/pin.js', './js/pin-ui.js',
  './js/profile.js', './js/back-button-v6.js', './js/help.js', './js/home.js',
  './js/settings.js', './js/reminders.js', './js/bills.js', './js/items.js',
  './js/money.js', './js/app.js',
  './icons/web-app-manifest-192x192.png', './icons/web-app-manifest-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(CORE_ASSETS.map((url) => cache.add(url).catch(() => null)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => key !== CACHE_NAME ? caches.delete(key) : null))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
