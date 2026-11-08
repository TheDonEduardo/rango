// Test de humo sin navegador: valida el contenido y recorre todas las lecciones.
// Uso: npm test
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const store = {};
const el = () => ({focus(){}, innerHTML:'', textContent:'', hidden:true, addEventListener(){}, querySelector(){return null}, querySelectorAll(){return []}});
const app = el();
const def = (k, v) => Object.defineProperty(globalThis, k, {value: v, configurable: true, writable: true});
def('document', {getElementById: id => id === 'app' ? app : el(), addEventListener(){}, querySelector(){return null}});
def('window', {scrollTo(){}, scrollY: 0});
def('localStorage', {getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; }});
def('fetch', async u => ({json: async () => JSON.parse(fs.readFileSync(fileURLToPath(u), 'utf8'))}));

const errs = [];
const units = JSON.parse(fs.readFileSync(path.join(root, 'src/content/units.json'), 'utf8'));
const casosPath = path.join(root, 'src/content/casos.json');
const casos = fs.existsSync(casosPath) ? JSON.parse(fs.readFileSync(casosPath, 'utf8')) : null;

// 1) Lint de contenido
const ids = new Set();
const lint = (ex, w) => {
      if (ex.table && !(Array.isArray(ex.table.cols) && ex.table.rows.every(r => r.length === ex.table.cols.length))) errs.push(w + ': tabla mal formada');
      if (ex.t === 'num' && ex.a < 0) errs.push(w + ': respuesta negativa (el teclado decimal del móvil no tiene signo menos)');
      if (!ex.q || !ex.why) errs.push(w + ': falta q o why');
      if (ex.t === 'choice' && !(Number.isInteger(ex.a) && ex.a >= 0 && ex.a < ex.opts.length)) errs.push(w + ': a fuera de rango');
      if (ex.t === 'choice' && ex.opts.length > 2) {
        // La correcta no puede delatarse por ser mucho más larga que todas las demás.
        const c = ex.opts[ex.a].length, o = Math.max(...ex.opts.filter((_, k) => k !== ex.a).map(t => t.length));
        if (c > 1.5 * o) errs.push(`${w}: la opción correcta (${c} caracteres) es mucho más larga que las demás (${o})`);
      }
      if (ex.t === 'num' && typeof ex.a !== 'number') errs.push(w + ': a no numérico');
      if (ex.t === 'tap' && !(ex.chart && ex.a >= 0 && ex.a < ex.chart.data.length)) errs.push(w + ': vela fuera de rango');
      if (ex.t === 'level' && !(ex.chart?.levels || []).some(v => v.id === ex.a)) errs.push(w + ': nivel inexistente');
      if (ex.t === 'order' && !(Array.isArray(ex.items) && ex.items.length >= 3 && new Set(ex.items).size === ex.items.length)) errs.push(w + ': order necesita 3+ elementos distintos');
      if (ex.t === 'match' && !(Array.isArray(ex.pairs) && ex.pairs.length >= 3 && new Set(ex.pairs.map(p => p[0])).size === ex.pairs.length && new Set(ex.pairs.map(p => p[1])).size === ex.pairs.length)) errs.push(w + ': match necesita 3+ parejas distintas');
      if (ex.t === 'plan') {
        if (ex.chart?.type !== 'candles' || !Array.isArray(ex.place) || !ex.place.length) errs.push(w + ': plan necesita gráfico de velas y place');
        for (const p of ex.place || []) {
          const tol = p.tol == null ? 0.1 : p.tol;
          if (!p.id || !p.label || typeof p.a !== 'number' || typeof p.start !== 'number') errs.push(w + ': línea de plan incompleta');
          else if (Math.abs(p.start - p.a) <= tol + 1e-9) errs.push(w + ': la línea ' + p.id + ' empieza ya en la respuesta');
        }
      }
      if (!['choice', 'num', 'tap', 'level', 'order', 'match', 'plan'].includes(ex.t)) errs.push(w + ': tipo desconocido ' + ex.t);
};
for (const u of units) {
  if (!['basico', 'tecnico', 'fundamental', undefined].includes(u.track)) errs.push('ruta desconocida en ' + u.id);
  for (const l of u.lessons || []) {
    if (ids.has(l.id)) errs.push('id duplicado ' + l.id);
    ids.add(l.id);
    l.ex.forEach((ex, i) => lint(ex, `${l.id}#${i + 1}`));
  }
}
// Cada enunciado es único (evita confundir ejercicios distintos en repasos y pruebas).
const vistos = new Map();
for (const u of units) for (const l of u.lessons || []) l.ex.forEach((ex, i) => {
  if (vistos.has(ex.q)) errs.push(`enunciado repetido en ${vistos.get(ex.q)} y ${l.id}#${i + 1}`);
  vistos.set(ex.q, `${l.id}#${i + 1}`);
});
if (casos) {
  if (!casos.fecha || !casos.fuente) errs.push('casos.json: falta fecha o fuente');
  for (const [id, list] of Object.entries(casos.ex)) {
    if (!ids.has(id)) errs.push('casos.json: lección inexistente ' + id);
    list.forEach((ex, i) => { if (!ex.caso) errs.push(`casos ${id}#${i + 1}: falta caso`); lint(ex, `casos ${id}#${i + 1}`); });
  }
}

// PWA: todo lo que precarga el service worker y los iconos del manifiesto deben existir.
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const pre = JSON.parse(sw.match(/const PRECACHE = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"'));
for (const f of pre) if (f !== './' && !fs.existsSync(path.join(root, f))) errs.push('sw.js precarga un archivo que no existe: ' + f);
for (const f of fs.readdirSync(path.join(root, 'src')).filter(f => /\.(js|css)$/.test(f))) if (!pre.includes('src/' + f)) errs.push('sw.js no precarga src/' + f);
const man = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
for (const ic of man.icons) if (!fs.existsSync(path.join(root, ic.src))) errs.push('icono del manifiesto inexistente: ' + ic.src);
if (!man.icons.some(i => i.purpose === 'maskable')) errs.push('falta icono maskable en el manifiesto');
const fontsSw = sw.match(/const FONTS_CSS = '([^']+)'/)[1];
if (!fs.readFileSync(path.join(root, 'index.html'), 'utf8').includes(fontsSw)) errs.push('FONTS_CSS de sw.js no coincide con la hoja de fuentes de index.html');

// 2) Recorrido completo de cada lección
const {api: T} = await import(pathToFileURL(path.join(root, 'src/app.js')));
const ident = ex => (ex.items || ex.pairs).map((_, i) => i);
const planOf = (ex, k) => Object.fromEntries(ex.place.map(p => [p.id, p[k]]));
const wrong = ex => ex.t === 'num' ? '999' : ex.t === 'tap' ? 0 : ex.t === 'level' ? 'Z' : ex.t === 'order' || ex.t === 'match' ? ident(ex).reverse() : ex.t === 'plan' ? planOf(ex, 'start') : (ex.a + 1) % ex.opts.length;
const right = ex => ex.t === 'num' ? String(ex.a).replace('.', ',') : ex.t === 'order' || ex.t === 'match' ? ident(ex) : ex.t === 'plan' ? planOf(ex, 'a') : ex.a;
const give = (ex, v) => ex.t === 'num' ? T.setVal(v) : T.setSel(v);

// Aviso legal: aparece en el primer uso y desaparece al aceptarlo.
if (!app.innerHTML.includes('Antes de empezar')) errs.push('no aparece el aviso legal en el primer uso');
T.acceptLegal(); T.render();
if (app.innerHTML.includes('Antes de empezar') || !app.innerHTML.includes('Rango')) errs.push('aceptar el aviso legal no lleva al inicio');
if (!T.homeHTML().includes('data-act="legal"')) errs.push('falta el enlace al aviso legal en el inicio');
if (!T.homeHTML().includes('Rango')) errs.push('home no renderiza');
// Usuario nuevo: empieza en Básico y las otras rutas están bloqueadas hasta completarlo o saltarlo.
if (!T.homeHTML().includes('Acciones y órdenes')) errs.push('un usuario nuevo no empieza en la ruta básica');
T.setTrack('tecnico');
if (!T.homeHTML().includes('data-act="skipbasics"') || T.homeHTML().includes('node current')) errs.push('la ruta técnica no está bloqueada para un usuario nuevo');
// Completar solo las unidades básicas obligatorias abre la ruta técnica (las de gate:false no bloquean).
for (const l of T.FLAT) if (l.unit.track === 'basico' && l.unit.gate !== false) T.getState().done[l.id] = {acc: 1};
if (T.homeHTML().includes('data-act="skipbasics"')) errs.push('completar los básicos obligatorios no abre la ruta técnica');
if (!T.FLAT.some(l => l.unit.gate === false)) errs.push('no hay unidades básicas complementarias (gate:false)');
T.getState().done = {};
T.skipBasics();
if (T.homeHTML().includes('data-act="skipbasics"') || !T.homeHTML().includes('node current')) errs.push('saltar los básicos no abre la ruta técnica');
T.setTrack('fundamental');
if (!T.homeHTML().includes('Crecimiento del beneficio')) errs.push('la ruta fundamental no renderiza');
T.setTrack('tecnico');
if (T.homeHTML().includes('Crecimiento del beneficio')) errs.push('la ruta técnica muestra unidades fundamentales');
for (const L of T.FLAT) {
  T.startRun(L);
  let first = true, guard = 0;
  while (guard++ < 40 && !app.innerHTML.includes('Lección completada')) {
    const ex = T.getRun().queue[0];
    if (/undefined|NaN|\[object/.test(T.lessonHTML())) errs.push('HTML roto en ' + L.id);
    if (ex.table && !T.lessonHTML().includes('<table>')) errs.push('tabla no renderizada en ' + L.id);
    if (first) { give(ex, wrong(ex)); T.check(); first = false; }
    else { give(ex, right(ex)); T.check(); if (!T.getRun().ok) errs.push(`respuesta correcta rechazada: ${L.id} ${ex.q}`); }
    T.next();
  }
  if (!app.innerHTML.includes('Lección completada')) errs.push('no completa ' + L.id);
}

// 3) Pantalla sin vidas
T.startRun(T.FLAT[0]);
for (let i = 0; i < 3; i++) { const ex = T.getRun().queue[0]; give(ex, wrong(ex)); T.check(); T.next(); }
if (!app.innerHTML.includes('Sin vidas')) errs.push('no aparece la pantalla de sin vidas');

// 4) Repaso espaciado: los fallos a la primera quedan para mañana; al acertarlos en el repaso, pasan al siguiente intervalo.
const srs = T.getState().srs, nFallos = Object.keys(srs).length;
// Cada lección normal falla su primer ejercicio y sus ejercicios no se repiten entre lecciones (los repasos de unidad sí pueden repetir).
const nLecciones = T.FLAT.filter(l => l.kind === 'lesson').length;
if (nFallos < nLecciones) errs.push(`repaso espaciado: ${nFallos} fallos registrados para ${nLecciones} lecciones`);
if (T.srsDue().length) errs.push('repaso espaciado: hay ejercicios para hoy que deberían ser para mañana');
const hoy = new Date(), dk = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
for (const u in srs) srs[u].due = dk(hoy);
if (!T.homeHTML().includes('Repaso del día')) errs.push('el inicio no muestra el repaso del día');
T.startSrs();
const enRepaso = T.getRun().queue.slice();
if (enRepaso.length !== 10) errs.push('el repaso del día no limita a 10 ejercicios');
let g = 0;
while (g++ < 40 && !app.innerHTML.includes('Repaso completado')) { const ex = T.getRun().queue[0]; give(ex, right(ex)); T.check(); T.next(); }
for (const ex of enRepaso) { const r = srs[ex.uid]; if (!r || r.step !== 1 || r.due <= dk(hoy)) errs.push('repaso espaciado no avanza ' + ex.uid); }
if (T.getState().done.srs) errs.push('el repaso del día se guarda como lección completada');

// 5) Todos los casos reales con respuesta correcta
if (casos) for (const L of T.FLAT.filter(l => l.casos && l.casos.length)) for (const ex of L.casos) {
  T.startRun(Object.assign({}, L, {ex: [], casos: [ex]}));
  give(ex, right(ex)); T.check();
  if (!T.getRun().ok) errs.push('caso real rechazado: ' + ex.q);
  if (/undefined|NaN|\[object/.test(T.lessonHTML())) errs.push('HTML roto en caso ' + ex.caso);
}

if (errs.length) { console.error('FALLOS:\n- ' + errs.join('\n- ')); process.exit(1); }
const nc = casos ? Object.values(casos.ex).reduce((n, l) => n + l.length, 0) : 0;
console.log(`OK: ${T.FLAT.length} lecciones, ${nc} casos reales, XP total ${T.getState().xp}`);
