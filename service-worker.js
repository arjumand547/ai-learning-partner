const CACHE = 'ai-partner-v3';
const ASSETS = ['./', './index.html', './css/style.css', './manifest.json', './icons/icon-192.png', './icons/icon-512.png',
  './js/config.js', './js/firebase-config.js', './js/store.js', './js/attendance.js', './js/ai.js', './js/docs.js', './js/ui.js', './js/auth.js', './js/app.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.pathname.startsWith('/api/') || u.origin !== location.origin) return; // never cache API or third-party requests
  e.respondWith(fetch(r).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); } return res; })
    .catch(() => caches.match(r).then(m => m || (r.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
});
