const CACHE_NAME = 'libres-cobros-v3';

// Static, non-sensitive assets only.
const STATIC_ASSETS = [
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

  // Navigations: do NOT intercept.
  // Chrome navigation requests use redirect mode "manual". Auth/login and
  // /pagos → /pagos/instituciones return 307s. Returning those through
  // respondWith causes:
  // "a redirected response was used for a request whose redirect mode is not follow".
  // Let the browser follow redirects natively.
  if (request.mode === 'navigate') {
    return;
  }

  const url = new URL(request.url);

  // Never intercept API traffic (auth, payments, sessions).
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  if (STATIC_EXTENSIONS.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});

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
