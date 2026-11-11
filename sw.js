// Service worker de Rango: permite usar la app sin conexión.
// Todo va red primero (código, contenido y fuentes llegan siempre de la misma versión); sin conexión, la caché.
// Las fuentes se sirven desde fonts/: la app no pide nada a terceros.
// Subir CACHE ya no es necesario para publicar código nuevo; solo sirve para vaciar la caché antigua.
const CACHE = 'rango-v4';
const PRECACHE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'src/app.js',
  'src/charts.js',
  'src/compartir.js',
  'src/config.js',
  'src/content.js',
  'src/figuras.js',
  'src/glosario.js',
  'src/medicion.js',
  'src/icons.js',
  'src/util.js',
  'src/styles.css',
  'src/state.js',
  'src/sync.js',
  'src/textos.js',
  'src/ui.js',
  'src/drag.js',
  'src/exercises/choice.js',
  'src/exercises/index.js',
  'src/exercises/num.js',
  'src/exercises/ordenar.js',
  'src/exercises/plan.js',
  'src/exercises/slide.js',
  'src/exercises/velas.js',
  'src/exercises/zona.js',
  'src/views/calc.js',
  'src/views/glosario.js',
  'src/views/guia.js',
  'src/views/home.js',
  'src/views/legal.js',
  'src/views/lesson.js',
  'src/views/sim.js',
  'src/views/stats.js',
  'src/content/units.json',
  'src/content/glosario.json',
  'src/content/casos.json',
  'src/content/semana.json',
  'fonts/fuentes.css',
  'fonts/bricolage-grotesque-latin.woff2',
  'fonts/ibm-plex-sans-latin.woff2',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  // cache: 'reload' salta la caché HTTP del navegador: la precarga guarda siempre la versión del servidor.
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(PRECACHE.map(u => new Request(u, {cache: 'reload'}))))
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

  if (url.origin !== location.origin) return;

  // Página, código y contenido: red primero (siempre la misma versión de todo); sin conexión, la copia guardada.
  e.respondWith(fetch(req)
    .then(res => { if (res.ok) { const copia = res.clone(); caches.open(CACHE).then(c => c.put(req, copia)); } return res; })
    .catch(() => caches.match(req, {ignoreSearch: true})
      .then(m => m || (req.mode === 'navigate' ? caches.match('./') : Response.error()))));
});
