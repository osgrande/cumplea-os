importScripts("db.js");

const CACHE = "cumples-v1";
const FILES = ["./", "index.html", "db.js", "manifest.json", "icon-192.png", "icon-512.png", "icon-maskable-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Funciona sin conexión
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});

// Comprobación en segundo plano (Chrome Android, app instalada).
// Android decide cuándo la ejecuta (aprox. una vez al día).
self.addEventListener("periodicsync", (e) => {
  if (e.tag === "check-birthdays") e.waitUntil(notifyTodayIfNeeded(self.registration));
});

// Al tocar el aviso se abre la app
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
      for (const c of cs) if ("focus" in c) return c.focus();
      return self.clients.openWindow("./");
    })
  );
});
