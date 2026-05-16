const ARCH_TIME_SW_VERSION = '2026-05-16-03';
const ARCH_TIME_OFFLINE_CACHE = `archtime-offline-${ARCH_TIME_SW_VERSION}`;
const ARCH_TIME_OFFLINE_URL = '/offline.html';

function shouldFetchFresh(request) {
  if (request.method !== 'GET') return false;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;

  return (
    request.mode === 'navigate' ||
    ['document', 'script', 'style', 'manifest'].includes(request.destination) ||
    /\.(?:html|js|css|webmanifest)$/i.test(url.pathname)
  );
}

function freshRequest(request) {
  return new Request(request, { cache: 'reload' });
}

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
  if (!shouldFetchFresh(event.request)) return;

  event.respondWith(
    fetch(freshRequest(event.request)).catch(() => {
      if (event.request.mode === 'navigate') return caches.match(ARCH_TIME_OFFLINE_URL);
      return Response.error();
    })
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
