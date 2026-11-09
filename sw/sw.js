/* BUP Navi service worker. Generated into dist/sw.js at build time by vite.config.ts:
 * The version and precache placeholders below are replaced with the build's hash and file list.
 *
 * Strategy
 *  - App shell + campus data are precached on install, so the map opens with no signal.
 *  - Page loads: network first (fresh deploys win), cached shell as the fallback.
 *  - Hashed /assets/: cache first (they never change).
 *  - Campus data: stale-while-revalidate.
 *  - OpenStreetMap tiles: cache first, capped, only tiles the user actually viewed
 *    (no bulk prefetching, per the OSM tile usage policy).
 */
const VERSION = "__VERSION__";
const PRECACHE = __PRECACHE__;
const SHELL = `bupc-shell-${VERSION}`;
const RUNTIME = "bupc-runtime";
const TILES = "bupc-tiles";
const MAX_TILES = 600;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("bupc-shell-") && k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trimTiles() {
  const cache = await caches.open(TILES);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - MAX_TILES; i++) await cache.delete(keys[i]);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.hostname === "tile.openstreetmap.org") {
    event.respondWith(
      caches.open(TILES).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) { cache.put(req, res.clone()); trimTiles(); }
        return res;
      }),
    );
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => { caches.open(SHELL).then((c) => c.put("./", res.clone())); return res; })
        .catch(async () => (await caches.match("./")) || (await caches.match("./index.html")) || Response.error()),
    );
    return;
  }

  if (url.pathname.includes("/data/")) {
    event.respondWith(
      caches.open(RUNTIME).then(async (cache) => {
        const cached = (await cache.match(req)) || (await caches.match(req));
        const fresh = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => cached);
        return cached || fresh;
      }),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && url.pathname.includes("/assets/")) caches.open(RUNTIME).then((c) => c.put(req, res.clone()));
      return res;
    })),
  );
});
