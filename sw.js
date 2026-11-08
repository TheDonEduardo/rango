// Service worker de Rango: permite usar la app sin conexión.
// Todo lo propio va red primero (código y contenido llegan siempre de la misma versión); sin conexión, la caché.
// Subir CACHE ya no es necesario para publicar código nuevo; solo sirve para vaciar la caché antigua.
const CACHE = 'rango-v3';
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
  'src/state.js',
  'src/ui.js',
  'src/drag.js',
  'src/exercises/choice.js',
  'src/exercises/index.js',
  'src/exercises/num.js',
  'src/exercises/ordenar.js',
  'src/exercises/plan.js',
  'src/exercises/slide.js',
  'src/exercises/velas.js',
  'src/views/calc.js',
  'src/views/home.js',
  'src/views/legal.js',
  'src/views/lesson.js',
  'src/views/sim.js',
  'src/views/stats.js',
  'src/content/units/index.json',
  'src/content/casos.json',
  'src/content/semana.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png'
];

// El contenido va en un archivo por unidad: se guardan todas las del índice para poder usar la app sin conexión.
async function guardarUnidades(c) {
  const ids = await (await fetch('src/content/units/index.json', {cache: 'reload'})).json();
  await c.addAll(ids.map(id => new Request(`src/content/units/${id}.json`, {cache: 'reload'})));
}

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
  // cache: 'reload' salta la caché HTTP del navegador: la precarga guarda siempre la versión del servidor.
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(PRECACHE.map(u => new Request(u, {cache: 'reload'})))
      .then(() => guardarUnidades(c)).then(() => guardarFuentes(c)))
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
      fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; })
        .catch(() => Response.error())));
    return;
  }
  if (url.origin !== location.origin) return;

  // Página, código y contenido: red primero (siempre la misma versión de todo); sin conexión, la copia guardada.
  e.respondWith(fetch(req)
    .then(res => { if (res.ok) { const copia = res.clone(); caches.open(CACHE).then(c => c.put(req, copia)); } return res; })
    .catch(() => caches.match(req, {ignoreSearch: true})
      .then(m => m || (req.mode === 'navigate' ? caches.match('./') : Response.error()))));
});
