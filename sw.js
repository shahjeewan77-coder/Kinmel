self.addEventListener('fetch', (event) => {
  // Minimal fetch handler required by Chrome for PWA installability
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
