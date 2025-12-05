const CACHE_NAME = "looped-fluid-pwa-v12";
const OFFLINE_URL = "/offline.html";
const ASSETS = [
  "/",
  "/index.html",
  "/offline.html",
  "/styles.css",
  "/app.js",
  "/manifest.webmanifest",
  "/assets/icons/app-icon-192.png",
  "/assets/icons/app-icon-512.png",
  "/assets/images/looped-hero.webp"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : null)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      const url = new URL(event.request.url);
      const isHttp = url.protocol === "http:" || url.protocol === "https:";

      return fetch(event.request)
        .then((response) => {
          // Only cache same-origin, HTTP(S) requests to avoid chrome-extension and other schemes.
          if (isHttp && url.origin === self.location.origin) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(OFFLINE_URL));
    })
  );
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (err) {
    payload = { body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Looped Fluid";
  const options = {
    body: payload.body || "You have a new update.",
    icon: "/assets/icons/app-icon-192.png",
    badge: "/assets/icons/app-icon-192.png",
    data: {}
  };

  const targetUrl =
    payload.url ||
    `/#notice?title=${encodeURIComponent(title)}&body=${encodeURIComponent(options.body)}`;
  options.data.url = targetUrl;

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data && event.notification.data.url ? event.notification.data.url : "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
      return null;
    })
  );
});
