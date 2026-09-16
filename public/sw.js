/* Buñuelandia PWA — basic offline shell cache */
const CACHE = "bunuelandia-shell-v1";
const PRECACHE = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/logo-bunuelandia.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Never cache API/auth-ish or PDF/ticket
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("/pdf") ||
    url.pathname.includes("/ticket") ||
    url.pathname.includes("/export")
  ) {
    return;
  }
  // Network first for navigations; cache fallback for icons/manifest
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("/login") || caches.match(req))
    );
    return;
  }
  if (PRECACHE.some((p) => url.pathname === p) || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }))
    );
  }
});
