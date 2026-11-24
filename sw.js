/* Ibaadat DSO Dashboard - iPhone PWA service worker.
   Caches the app shell so the app opens offline. Sheet data itself is cached
   separately in localStorage by the app, so the last figures survive offline too.
   The shell is revalidated on every launch, which is how iPhone "tracks the
   deployed site" with no release to install. */
const SHELL = 'ibaadat-dso-shell-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL).then((cache) => cache.addAll(['./', './index.html', './manifest.webmanifest']))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;                       // never cache bridge POSTs
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        // never cache the Apps Script bridge

  // Network first so a new deploy is picked up, cache as the offline fallback.
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(SHELL).then((cache) => cache.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
  );
});
