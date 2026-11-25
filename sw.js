const prefix = "etchinstone-shell-";
const cacheName = prefix + "3";
const assets = [
  "./",
  "./index.html",
  "./app.mjs",
  "./game.mjs",
  "./cards.mjs",
  "./card-art.mjs",
  "./style.css",
  "./manifest.webmanifest",
  "./vale.webp",
  "./icon-192.png",
  "./icon-512.png",
];
self.addEventListener("install", (event) =>
  event.waitUntil(
    (async () => {
      const cache = await caches.open(cacheName);
      await cache.addAll(assets);
      await self.skipWaiting();
    })(),
  ),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key.startsWith(prefix) && key !== cacheName)
          await caches.delete(key);
      await self.clients.claim();
    })(),
  ),
);
self.addEventListener("fetch", (event) => {
  if (
    event.request.method !== "GET" ||
    new URL(event.request.url).origin !== self.location.origin
  )
    return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(cacheName);
      return (
        (await cache.match(
          event.request.mode === "navigate" ? "./index.html" : event.request,
        )) || fetch(event.request)
      );
    })(),
  );
});
