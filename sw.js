// Service worker per Tock.
//
// IMPORTANTE: la partita è multiplayer via Firebase in tempo reale, quindi
// la pagina DEVE sempre poter caricare l'ultima versione pubblicata — mai
// restare bloccati su una copia in cache come è già successo prima. Per
// questo la strategia è "network-first" per la pagina stessa: prova sempre
// la rete, e usa la cache SOLO come riserva se sei offline. La cache non è
// quindi la fonte primaria, serve solo per l'installabilità/offline.
//
// Cambia CACHE_VERSION ad ogni nuova build pubblicata (tienilo allineato ad
// APP_VERSION in index.html) così le cache vecchie vengono scartate subito.
const CACHE_VERSION = "v3-6";
const CACHE_NAME = "tock-cache-" + CACHE_VERSION;

const APP_SHELL = ["./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // lascia stare Firebase/Google Fonts/CDN

  // Network-first: prova sempre la rete (così vedi subito l'ultima build),
  // aggiorna la cache in background, e usa la cache solo se sei offline.
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match("./index.html")))
  );
});
