/* GG Outreach service worker.
 *
 * Caches ONLY immutable, public, static files: hashed build assets under /_next/static/, icons and launch images.
 * It never stores an HTML page, an RSC payload, an API response or anything that depends on the session cookie:
 * every navigation and every other request goes straight to the network. When a navigation fails (offline) it shows
 * a static page with no data in it. Logging out deletes every cache and unregisters this worker.
 */
const CACHE = "gg-static-v1";
const OFFLINE = "/offline.html";
const STATIC = [/^\/_next\/static\//, /^\/icons\//, /^\/splash\//, /^\/icon\.svg$/, /^\/apple-touch-icon\.png$/, /^\/favicon\.ico$/];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([OFFLINE, "/icons/icon-192.png", "/icon.svg"])).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("message", event => {
  if (event.data && event.data.type === "CLEAR") event.waitUntil(caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key)))));
});
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE)));
    return;
  }
  if (!STATIC.some(pattern => pattern.test(url.pathname)) || url.search.includes("_rsc")) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(request);
    if (hit) return hit;
    const response = await fetch(request);
    // Only successful, non-redirected, cookie-free public files are stored.
    if (response.ok && response.type === "basic" && !response.redirected && !response.headers.has("set-cookie")) cache.put(request, response.clone());
    return response;
  }));
});
