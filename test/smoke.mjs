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
      if (!['choice', 'num', 'tap', 'level', 'order'].includes(ex.t)) errs.push(w + ': tipo desconocido ' + ex.t);
};
for (const u of units) {
  if (!['basico', 'tecnico', 'fundamental', undefined].includes(u.track)) errs.push('ruta desconocida en ' + u.id);
  for (const l of u.lessons || []) {
    if (ids.has(l.id)) errs.push('id duplicado ' + l.id);
    ids.add(l.id);
    l.ex.forEach((ex, i) => lint(ex, `${l.id}#${i + 1}`));
  }
}
if (casos) {
  if (!casos.fecha || !casos.fuente) errs.push('casos.json: falta fecha o fuente');
  for (const [id, list] of Object.entries(casos.ex)) {
    if (!ids.has(id)) errs.push('casos.json: lección inexistente ' + id);
    list.forEach((ex, i) => { if (!ex.caso) errs.push(`casos ${id}#${i + 1}: falta caso`); lint(ex, `casos ${id}#${i + 1}`); });
  }
}

// 2) Recorrido completo de cada lección
const {api: T} = await import(pathToFileURL(path.join(root, 'src/app.js')));
const ident = ex => ex.items.map((_, i) => i);
const wrong = ex => ex.t === 'num' ? '999' : ex.t === 'tap' ? 0 : ex.t === 'level' ? 'Z' : ex.t === 'order' ? ident(ex).reverse() : (ex.a + 1) % ex.opts.length;
const right = ex => ex.t === 'num' ? String(ex.a).replace('.', ',') : ex.t === 'order' ? ident(ex) : ex.a;
const give = (ex, v) => ex.t === 'num' ? T.setVal(v) : T.setSel(v);

if (!T.homeHTML().includes('Rango')) errs.push('home no renderiza');
// Usuario nuevo: empieza en Básico y las otras rutas están bloqueadas hasta completarlo o saltarlo.
if (!T.homeHTML().includes('Acciones y órdenes')) errs.push('un usuario nuevo no empieza en la ruta básica');
T.setTrack('tecnico');
if (!T.homeHTML().includes('data-act="skipbasics"') || T.homeHTML().includes('node current')) errs.push('la ruta técnica no está bloqueada para un usuario nuevo');
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

// 4) Todos los casos reales con respuesta correcta
if (casos) for (const L of T.FLAT.filter(l => l.casos && l.casos.length)) for (const ex of L.casos) {
  T.startRun(Object.assign({}, L, {ex: [], casos: [ex]}));
  give(ex, right(ex)); T.check();
  if (!T.getRun().ok) errs.push('caso real rechazado: ' + ex.q);
  if (/undefined|NaN|\[object/.test(T.lessonHTML())) errs.push('HTML roto en caso ' + ex.caso);
}

if (errs.length) { console.error('FALLOS:\n- ' + errs.join('\n- ')); process.exit(1); }
const nc = casos ? Object.values(casos.ex).reduce((n, l) => n + l.length, 0) : 0;
console.log(`OK: ${T.FLAT.length} lecciones, ${nc} casos reales, XP total ${T.getState().xp}`);
