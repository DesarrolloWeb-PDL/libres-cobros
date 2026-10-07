const CACHE_NAME = 'libres-cobros-v2';

// Only truly static, non-sensitive assets. Never precache HTML navigations:
// Next.js/auth redirects + navigation redirect mode break cache-first HTML.
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

const STATIC_EXTENSIONS = /\.(js|css|png|jpg|jpeg|svg|gif|webp|avif|ico|woff|woff2|ttf|otf|eot)$/;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
            return undefined;
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  // Navigation requests: network-first with explicit redirect follow.
  // Never serve a raw redirect through respondWith.
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  const url = new URL(request.url);

  // Never intercept API traffic: auth, payments, and session data must not
  // land in Cache Storage, and offline API cache is unsafe for a cobro app.
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  if (STATIC_EXTENSIONS.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Other same-origin GETs (RSC payloads, etc.): network-first, no cache poison.
  event.respondWith(networkFirst(request));
});

async function handleNavigation(request) {
  try {
    const response = await fetch(
      new Request(request.url, {
        redirect: 'follow',
        credentials: 'same-origin',
        headers: request.headers,
      })
    );

    // Only cache successful, non-redirect final responses.
    if (response.ok && response.type !== 'opaqueredirect') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    const fallback = await cache.match('/offline.html');
    return (
      fallback ||
      new Response('<h1>Sin conexión</h1>', {
        status: 503,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    );
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response.ok && response.type === 'basic') {
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    return new Response(JSON.stringify({ error: 'Sin conexión' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
