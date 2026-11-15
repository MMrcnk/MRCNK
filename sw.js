// MRCNK – service worker: offline + powiadomienia push
const CACHE = 'mrcnk-v4';
const FILES = [
  './', 'index.html', 'styles.css', 'manifest.json', 'app.js', 'ui.js', 'db.js', 'sync.js', 'logic.js', 'today.js', 'focus.js', 'training.js', 'calendar.js', 'reports.js', 'more.js', 'chat.js',
  'preact.js', 'supabase.js', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png',
  'anton-latin-400.woff2', 'anton-latin-ext-400.woff2', 'inter-latin-400.woff2', 'inter-latin-500.woff2', 'inter-latin-600.woff2', 'inter-latin-ext-400.woff2', 'inter-latin-ext-500.woff2', 'inter-latin-ext-600.woff2',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // sieć najpierw (świeża wersja), cache gdy offline
  e.respondWith(
    fetch(req, { cache: 'no-cache' }).then((res) => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('index.html')))
  );
});

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'MRCNK', { body: d.body || '', icon: 'icon-192.png', badge: 'icon-192.png', tag: d.tag || 'mrcnk', data: { url: d.url || './' } }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
    for (const c of cs) { if ('focus' in c) return c.focus(); }
    return self.clients.openWindow(e.notification.data && e.notification.data.url ? e.notification.data.url : './');
  }));
});
