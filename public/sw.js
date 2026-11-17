const prefix = 'cfo-shell-';
const cacheName = prefix + 'v1';
const shell = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const response = await fetch('/index.html', { cache: 'reload' });
    if (!response.ok) throw new Error('No se pudo cargar el HTML de CFO');
    const html = await response.text();
    const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(match => match[1]);
    const cache = await caches.open(cacheName);
    await cache.addAll([...shell, ...assets]);
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(prefix) && key !== cacheName).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    if (request.mode === 'navigate') {
      try { return await fetch(request); }
      catch { return (await cache.match('/index.html')) || Response.error(); }
    }
    return (await cache.match(request, { ignoreVary: true })) || fetch(request);
  })());
});
