const CACHE_NAME = 'unclebike-admin-pwa-v2';
const ADMIN_CACHE_PREFIX = 'unclebike-admin-pwa-';
const APP_SHELL = [
  '/admin-offline.html',
  '/admin.webmanifest',
  '/admin.js',
  '/images/admin-icon-192.png',
  '/images/admin-icon-512.png',
  '/images/admin-apple-touch-icon-180.png',
  '/images/uncle-logo.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key.startsWith(ADMIN_CACHE_PREFIX) && key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

function isAdminStaticPath(pathname) {
  return pathname === '/admin.js' ||
    pathname === '/admin.webmanifest' ||
    pathname === '/admin-offline.html' ||
    pathname.startsWith('/fonts/') ||
    pathname.startsWith('/images/');
}

async function networkFirstAndCache(request, fallbackResponse) {
  try {
    const response = await fetch(request);
    if (response?.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (_err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return fallbackResponse;
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate' && url.pathname.startsWith('/admin')) {
    event.respondWith((async () => {
      try {
        return await fetch(request);
      } catch (_err) {
        const offline = await caches.match('/admin-offline.html');
        if (offline) return offline;
        return new Response('Offline', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=UTF-8' },
        });
      }
    })());
    return;
  }

  if (url.pathname === '/admin.js') {
    event.respondWith(networkFirstAndCache(
      request,
      new Response('/* Offline */', {
        status: 503,
        headers: { 'Content-Type': 'application/javascript; charset=UTF-8' },
      })
    ));
    return;
  }

  if (url.pathname === '/admin.webmanifest') {
    event.respondWith(networkFirstAndCache(
      request,
      new Response('{"name":"Uncle Bike Admin"}', {
        status: 503,
        headers: { 'Content-Type': 'application/manifest+json; charset=UTF-8' },
      })
    ));
    return;
  }

  if (!isAdminStaticPath(url.pathname)) {
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    try {
      const response = await fetch(request);
      if (response?.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
      }
      return response;
    } catch (_err) {
      const fallback = await caches.match('/admin-offline.html');
      if (fallback) return fallback;
      return new Response('Offline', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=UTF-8' },
      });
    }
  })());
});
