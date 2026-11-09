/* Service worker do Portal Shop Titans: funciona offline depois da primeira visita.
   - interface (html/css/js): rede primeiro, cache como reserva
   - dados, ícones e imagens: cache primeiro (os arquivos de dados têm ?v=<data da extração>) */
const CACHE = 'st-v13';
const SHELL = ['./', './index.html', './assets/style.css', './assets/st-pure.js', './assets/hm-worker.js', './assets/core.js', './assets/i18n.js', './assets/search.js', './assets/pages/home.js',
  './assets/pages/items.js', './assets/pages/db.js', './assets/pages/tools.js', './assets/pages/tools2.js', './assets/pages/hypermax.js', './assets/pages/builder.js', './assets/pages/events.js', './assets/pages/calendar.js', './assets/pages/community.js', './assets/pages/extras.js', './assets/pages/account.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const isAsset = /\/(img|og|icons)\//.test(url.pathname) || (/\/data\//.test(url.pathname) && !/(meta|community)\.js$/.test(url.pathname));
  if (isAsset) {
    e.respondWith(caches.open(CACHE).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    }));
    return;
  }
  e.respondWith(fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./index.html'))));
});
