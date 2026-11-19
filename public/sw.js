/* BoonData service worker (V16-OFFLINE, D-N6, L143): hand-written, no dependency, registered by src/pwa.ts.
 * The build prepends VERSION, FILES (every file of this build) and HTML_SHA256 (its index.html) (scripts/offline.mjs).
 * - install: precaches the whole build into one cache per version; fails (the old version stays) unless every file
 *   loads and index.html is this build's (HTML_SHA256), so a cache never holds a mixed old/new set.
 * - no automatic skipWaiting, no clients.claim: a new version waits until the player accepts the reload, then every
 *   tab reloads (src/pwa.ts). activate drops the other versions' caches.
 * - fetch: navigations get this version's index.html (hash routes only); other same-origin GETs come from this
 *   version's cache, else the network. Nothing is cached at runtime.
 * The seeded databases are not here: the PGlite worker keeps them in IndexedDB (src/db/snapshot.ts). */
/* global VERSION, FILES, HTML_SHA256 */
const CACHE = 'cq-' + VERSION;
const SCOPE = self.registration.scope;
const at = (f) => new URL(f, SCOPE).href;

self.addEventListener('install', (e) => {
  e.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // Unhashed files bypass the HTTP cache (GitHub Pages serves them with max-age), so a stale shell is never kept.
      const html = await fetch(at('index.html'), { cache: 'reload' });
      const hex = [...new Uint8Array(await crypto.subtle.digest('SHA-256', await html.clone().arrayBuffer()))].map((b) => b.toString(16).padStart(2, '0')).join('');
      if (!html.ok || hex !== HTML_SHA256) throw new Error('sw: index.html is not this build');
      await cache.put(at('index.html'), html);
      const rest = FILES.filter((f) => f !== 'index.html');
      await cache.addAll(rest.map((f) => new Request(at(f), { cache: f.startsWith('assets/') ? 'default' : 'reload' })));
    })().catch(async (err) => {
      await caches.delete(CACHE);
      throw err;
    }),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('cq-') && k !== CACHE).map((k) => caches.delete(k)))));
});

self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(SCOPE)) return;
  const key = req.mode === 'navigate' ? at('index.html') : req;
  e.respondWith(
    caches
      .open(CACHE)
      .then((c) => c.match(key, { ignoreVary: true })) // precached without the Origin header module scripts send (Vary: Origin)
      .then((hit) => hit || fetch(req)),
  );
});
