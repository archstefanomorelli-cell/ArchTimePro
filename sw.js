const ARCH_TIME_SW_VERSION = '2026-05-16-02';
const ARCH_TIME_OFFLINE_CACHE = `archtime-offline-${ARCH_TIME_SW_VERSION}`;
const ARCH_TIME_OFFLINE_URL = '/offline.html';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(ARCH_TIME_OFFLINE_CACHE)
      .then(cache => cache.add(ARCH_TIME_OFFLINE_URL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith('archtime-offline-') && key !== ARCH_TIME_OFFLINE_CACHE)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.mode !== 'navigate') return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(ARCH_TIME_OFFLINE_URL))
  );
});
