/* eslint-disable */
/**
 * Telluride Blues & Brews — service worker (source template).
 *
 * `scripts/build-pwa.mjs` copies this into `dist/sw.js` after `expo export`,
 * substituting the three placeholders declared just below this comment. Never
 * edit `dist/sw.js` by hand.
 *
 *   BASE       the deploy sub-path with a trailing slash, e.g. "/xyz-app/"
 *   VERSION    a content hash over every precached file
 *   PRECACHE   a JSON array of absolute, base-prefixed shell URLs
 *   PREWARM    a JSON array of bundled image URLs, cached best-effort
 *
 * The placeholder tokens are deliberately not spelled out in this comment: a
 * substitution that hits the documentation instead of the code is silent and
 * ships a worker that caches nothing.
 *
 * Hand-written rather than Workbox on purpose. The whole worker is ~200 lines,
 * it adds no dependency to a repo whose CLAUDE.md constrains dependency
 * licences and weight, and — the deciding reason — every cache key and every
 * URL here has to be namespaced to the deploy sub-path, because GitHub Pages
 * serves *every* repo of an account from one origin
 * (`samgumble.github.io`). Cache Storage is origin-scoped, so a generic
 * Workbox precache would happily collide with a neighbouring project's caches.
 */

const BASE = '__BASE__';
const VERSION = '__VERSION__';

/**
 * The app shell: HTML routes, the content-hashed JS bundle, icons, manifest.
 * `install` blocks on all of it, so it must stay small — if one entry 404s the
 * whole install fails and the visitor is left with no worker at all.
 */
const PRECACHE_URLS = __PRECACHE__;

/**
 * The bundled artist and brand imagery, ~8 MB of it. Warmed in the background
 * once the app is already interactive rather than blocking the first load: the
 * plan's budget is 1.5 MB to interactive, and a phone on festival-grounds LTE
 * should not have to finish a 12 MB download before the schedule opens.
 */
const PREWARM_URLS = __PREWARM__;

/**
 * Origin-scoped storage shared with every other repo on this Pages account,
 * so every cache name carries the sub-path. `CACHE_PREFIX` is also the only
 * thing this worker is allowed to delete during activation.
 */
const CACHE_PREFIX = `tbb${BASE}`;
const SHELL_CACHE = `${CACHE_PREFIX}shell-${VERSION}`;
const IMAGE_CACHE = `${CACHE_PREFIX}images-v1`;
const CONTENT_CACHE = `${CACHE_PREFIX}content-v1`;

/** Caches that survive an activation. Anything else under our prefix goes. */
const KEEP = new Set([SHELL_CACHE, IMAGE_CACHE, CONTENT_CACHE]);

/** Cold-start fallback for a navigation we have never seen before. */
const OFFLINE_URL = `${BASE}index.html`;

/** Keeps the runtime image cache from growing without bound on a long weekend. */
const IMAGE_CACHE_LIMIT = 400;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // `cache: 'reload'` so a stale HTTP cache entry cannot be promoted into
      // the precache — that is how a "new deploy did nothing" bug is born.
      await cache.addAll(PRECACHE_URLS.map((url) => new Request(url, { cache: 'reload' })));
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith(CACHE_PREFIX) && !KEEP.has(name))
          .map((name) => caches.delete(name)),
      );
      // Serve the pages that are already open, so the first load after an
      // update does not have to wait for every tab to close.
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (data && data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (data && data.type === 'PREWARM') {
    // `waitUntil` here only keeps the worker alive for the download; the page
    // is already usable, so nothing is waiting on it.
    event.waitUntil(prewarm());
  } else if (data && data.type === 'GET_VERSION') {
    // Reply down the MessageChannel port when the caller supplied one, and
    // fall back to the client itself for a plain postMessage.
    const reply = { type: 'VERSION', version: VERSION };
    if (event.ports && event.ports[0]) event.ports[0].postMessage(reply);
    else if (event.source) event.source.postMessage(reply);
  }
});

/**
 * Fills the image cache with the bundled imagery, a few at a time, skipping
 * anything already there. Every failure is swallowed: this is an optimisation
 * for the airplane-mode case, never a correctness requirement.
 */
async function prewarm() {
  const cache = await caches.open(IMAGE_CACHE);
  const pending = [];

  for (const url of PREWARM_URLS) {
    if (!(await cache.match(url))) pending.push(url);
  }

  const CONCURRENCY = 4;
  let cursor = 0;

  async function worker() {
    while (cursor < pending.length) {
      const url = pending[cursor++];
      try {
        const response = await fetch(url, { cache: 'no-cache' });
        if (response && response.ok) await cache.put(url, response);
      } catch {
        /* offline or throttled — the runtime cache-first handler will catch it */
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
}

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  const sameOrigin = url.origin === self.location.origin;

  // Another project deployed to the same Pages account must be left alone.
  if (sameOrigin && !url.pathname.startsWith(BASE)) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigate(request, url));
    return;
  }

  if (request.destination === 'image') {
    event.respondWith(cacheFirst(request, IMAGE_CACHE, { trim: IMAGE_CACHE_LIMIT }));
    return;
  }

  // Content-hashed JS/CSS and static assets: the URL changes when the bytes
  // change, so the copy in the cache can never be wrong.
  if (sameOrigin && isImmutableAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, SHELL_CACHE, {}));
    return;
  }

  // Content JSON — the snapshot feed the sync engine will point at. Show what
  // we have immediately, refresh it in the background.
  if (isContent(url, sameOrigin)) {
    event.respondWith(staleWhileRevalidate(request, CONTENT_CACHE));
    return;
  }

  if (sameOrigin) {
    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
  }
});

/**
 * Navigations are answered from the precached shell first so a cold start on
 * no signal is instant, then revalidated in the background.
 *
 * A static host resolves `/xyz-app/schedule` to `schedule.html`, so the
 * candidate list tries the extensionless URL, the `.html` file and the
 * directory index before falling back to the app shell — which boots the
 * router and lets client-side routing take it from there.
 */
async function handleNavigate(request, url) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await matchNavigation(cache, url);

  if (cached) {
    revalidate(cache, request);
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const fallback = await cache.match(OFFLINE_URL);
    if (fallback) return fallback;
    return new Response('Offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

async function matchNavigation(cache, url) {
  const path = url.pathname;
  const candidates = [path];

  if (path.endsWith('/')) {
    candidates.push(`${path}index.html`);
  } else if (!path.endsWith('.html')) {
    candidates.push(`${path}.html`, `${path}/index.html`);
  }

  for (const candidate of candidates) {
    const hit = await cache.match(candidate, { ignoreSearch: true });
    if (hit) return hit;
  }
  return undefined;
}

/** Fire-and-forget refresh; a failure here is just "still offline". */
function revalidate(cache, request) {
  fetch(request)
    .then((response) => {
      if (response && response.ok) return cache.put(request, response);
      return undefined;
    })
    .catch(() => undefined);
}

/**
 * Looks in every cache this worker owns, in priority order.
 *
 * A single URL can legitimately land in more than one of them: the bundled
 * artist photos are prewarmed into the image cache, but the framework's own
 * chrome icons live in the precached shell — and whether a given request even
 * reaches the image branch depends on its `destination`, which is `image` for
 * an `<img>` and empty for the same URL fetched from script. Checking one
 * cache by name is how an asset that is definitely cached still 404s offline.
 *
 * Deliberately not `caches.match()`: that searches every cache on the origin,
 * and on GitHub Pages the origin is shared with every other repo.
 */
async function matchOwnCaches(request) {
  for (const name of [SHELL_CACHE, IMAGE_CACHE, CONTENT_CACHE]) {
    const cache = await caches.open(name);
    const hit = await cache.match(request);
    if (hit) return hit;
  }
  return undefined;
}

async function cacheFirst(request, cacheName, options) {
  const cached = await matchOwnCaches(request);
  if (cached) return cached;

  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    // `response.ok` is false for an opaque cross-origin image (status 0), and
    // those are exactly the artist photos we want available in airplane mode.
    if (response && (response.ok || response.type === 'opaque')) {
      await cache.put(request, response.clone());
      if (options.trim) trimCache(cache, options.trim);
    }
    return response;
  } catch (error) {
    const fallback = await cache.match(request, { ignoreSearch: true });
    if (fallback) return fallback;
    throw error;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await matchOwnCaches(request);

  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone()).catch(() => undefined);
      }
      return response;
    })
    .catch(() => undefined);

  if (cached) {
    network.catch(() => undefined);
    return cached;
  }

  const response = await network;
  if (response) return response;

  return new Response('Offline', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

async function trimCache(cache, limit) {
  const keys = await cache.keys();
  if (keys.length <= limit) return;
  await Promise.all(keys.slice(0, keys.length - limit).map((key) => cache.delete(key)));
}

function isImmutableAsset(pathname) {
  return pathname.startsWith(`${BASE}_expo/`) || pathname.startsWith(`${BASE}assets/`);
}

function isContent(url, sameOrigin) {
  if (sameOrigin) return url.pathname.startsWith(`${BASE}data/`);
  return url.pathname.includes('/data/') && url.pathname.endsWith('.json');
}
