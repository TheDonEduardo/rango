// Service worker de Rango: permite usar la app sin conexión.
// Sube CACHE al cambiar el código (src/*.js, styles.css, index.html) para que todos los usuarios reciban la versión nueva.
const CACHE = 'rango-v1';
const FONTS_CSS = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600..800&family=IBM+Plex+Sans:wght@400;500;600&display=swap';
const PRECACHE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'src/app.js',
  'src/charts.js',
  'src/content.js',
  'src/icons.js',
  'src/util.js',
  'src/styles.css',
  'src/content/units.json',
  'src/content/casos.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png'
];

// Guarda la hoja de Google Fonts y todas sus fuentes para que la tipografía funcione sin conexión
// aunque esa pantalla no se haya visto nunca. Si falla (sin red), la app sigue funcionando con la letra del sistema.
async function guardarFuentes(c) {
  try {
    const css = await fetch(FONTS_CSS);
    if (!css.ok) return;
    const texto = await css.clone().text();
    await c.put(FONTS_CSS, css);
    const urls = [...new Set(texto.match(/https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2/g) || [])];
    await Promise.all(urls.map(u => fetch(u, {mode: 'cors'}).then(r => r.ok && c.put(u, r)).catch(() => {})));
  } catch (_) {}
}

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(PRECACHE).then(() => guardarFuentes(c)))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Fuentes de Google: no cambian; caché primero.
  if (url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('gstatic.com')) {
    e.respondWith(caches.open(CACHE).then(async c => (await c.match(req)) ||
      fetch(req).then(res => { c.put(req, res.clone()); return res; })));
    return;
  }
  if (url.origin !== location.origin) return;

  // Página y contenido (units.json, casos.json): red primero para recibir los casos de cada semana;
  // sin conexión, la última copia guardada.
  if (req.mode === 'navigate' || url.pathname.endsWith('.json')) {
    e.respondWith(fetch(req)
      .then(res => { if (res.ok) { const copia = res.clone(); caches.open(CACHE).then(c => c.put(req, copia)); } return res; })
      .catch(() => caches.match(req, {ignoreSearch: true}).then(m => m || caches.match('./'))));
    return;
  }

  // Código, estilos e iconos: caché primero y actualización en segundo plano.
  e.respondWith(caches.open(CACHE).then(async c => {
    const enCache = await c.match(req);
    const red = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => enCache);
    return enCache || red;
  }));
});
