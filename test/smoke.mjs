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
  if (!['basico', 'pasiva', 'tecnico', 'fundamental', undefined].includes(u.track)) errs.push('ruta desconocida en ' + u.id);
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
// Test de nivel: se ofrece a un usuario nuevo y sus preguntas existen (dos por unidad obligatoria de Básico).
if (!T.homeHTML().includes('data-act="test"')) errs.push('no se ofrece el test de nivel a un usuario nuevo');
const lecDe = uid => uid.split('#')[0];
for (const uid of T.PLACEMENT) {
  const [lid, i] = uid.split('#');
  const l = units.flatMap(u => u.lessons || []).find(x => x.id === lid);
  if (!l || !l.ex[+i]) errs.push('el test de nivel usa un ejercicio inexistente: ' + uid);
}
for (const u of units.filter(u => u.track === 'basico' && u.gate !== false && u.lessons))
  if (T.PLACEMENT.filter(x => u.lessons.some(l => l.id === lecDe(x))).length !== 2) errs.push('el test de nivel no tiene dos preguntas de ' + u.id);
// Usuario nuevo: empieza en Básico y las otras rutas están bloqueadas hasta completarlo o saltarlo.
if (!T.homeHTML().includes('Acciones y órdenes')) errs.push('un usuario nuevo no empieza en la ruta básica');
T.setTrack('tecnico');
if (!T.homeHTML().includes('data-act="skipbasics"') || T.homeHTML().includes('node current')) errs.push('la ruta técnica no está bloqueada para un usuario nuevo');
// Completar solo las unidades básicas obligatorias abre la ruta técnica (las de gate:false no bloquean).
for (const l of T.FLAT) if (l.unit.track === 'basico' && l.unit.gate !== false) T.getState().done[l.id] = {acc: 1};
if (T.homeHTML().includes('data-act="skipbasics"')) errs.push('completar los básicos obligatorios no abre la ruta técnica');
T.getState().done = {};
T.skipBasics();
if (T.homeHTML().includes('data-act="skipbasics"') || !T.homeHTML().includes('node current')) errs.push('saltar los básicos no abre la ruta técnica');
T.setTrack('fundamental');
if (!T.homeHTML().includes('Crecimiento del beneficio')) errs.push('la ruta fundamental no renderiza');
T.setTrack('pasiva');
if (!T.homeHTML().includes('Inversión pasiva') || !T.homeHTML().includes('Renta fija')) errs.push('la ruta Pasiva no muestra sus unidades');
T.setTrack('basico');
if (T.homeHTML().includes('Inversión pasiva')) errs.push('la ruta Básico muestra unidades de Pasiva');
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

// 6) Operación de la semana: reglas de la simulación y vistas.
const plan = {entry: 10, stop: 9, target: 12};
const casosSim = [
  ['sin entrada', [[9.5, 9.8, 9.4, 9.6]], 'sin entrada', 0],
  ['objetivo', [[9.8, 10.5, 9.7, 10.3], [10.3, 12.5, 10.2, 12.2]], 'objetivo', 2],
  ['hueco al alza: entra a la apertura', [[10.5, 11, 10.4, 10.8]], 'abierta', 0.3],
  ['hueco bajo el stop: sale a la apertura', [[9.8, 10.2, 9.9, 10.1], [8.5, 8.8, 8.2, 8.6]], 'stop', -1.5],
  ['stop y objetivo el mismo día: cuenta el stop', [[9.8, 10.2, 9.9, 10.1], [10, 12.5, 8.9, 11]], 'stop', -1],
  ['stop el mismo día de la entrada', [[9.9, 10.2, 8.8, 9]], 'stop', -1],
];
for (const [nom, velas, estado, r] of casosSim) {
  const res = T.simulate(plan, velas);
  if (res.estado !== estado || Math.abs(res.r - r) > 1e-9) errs.push(`simulación «${nom}»: ${res.estado} ${res.r}, se esperaba ${estado} ${r}`);
}
const semPath = path.join(root, 'src/content/semana.json');
if (fs.existsSync(semPath)) {
  const sem = JSON.parse(fs.readFileSync(semPath, 'utf8'));
  const okVelas = d => Array.isArray(d) && d.every(c => c.length === 4 && c[1] >= Math.max(c[0], c[3]) && c[2] <= Math.min(c[0], c[3]));
  if (!/^\d{4}-W\d{2}$/.test(sem.semana) || !okVelas(sem.data) || sem.data.length !== 30 || !(sem.step > 0) || sem.vol.length !== 30) errs.push('semana.json mal formado');
  if (sem.prev && (!okVelas(sem.prev.data) || !okVelas(sem.prev.despues) || sem.prev.despues.length > 5)) errs.push('semana.json: semana anterior mal formada');
  T.openSim();
  if (!app.innerHTML.includes('Operación de la semana') || !/class="svg\s+plan"/.test(app.innerHTML)) errs.push('la vista del simulador no se dibuja');
  const c = sem.data[sem.data.length - 1][3];
  T.simDraftSet({entry: c * 1.02, stop: c * 0.95, target: c * 1.1}); T.simSave();
  if (!T.getState().sim[sem.semana]) errs.push('el plan de la semana no se guarda');
  if (sem.prev) {
    T.getState().sim[sem.prev.semana] = {plan: {entry: 1, stop: 0.5, target: 2}};
    T.openSimRes();
    if (!app.innerHTML.includes('Resultado de la semana pasada') || !app.innerHTML.includes('class="split"')) errs.push('la vista del resultado no se dibuja');
  }
  T.goHome();
}

// 8) Inicio con progreso: atajo «Continuar» y unidades completadas plegadas.
{
  const st = T.getState(); const antes = st.done; st.done = {}; st.skipBasics = true; T.setTrack('tecnico');
  for (const l of T.FLAT.filter(l => l.unit.id === 'velas')) st.done[l.id] = {acc: 1};
  const h = T.homeHTML();
  if (!h.includes('data-act="unfold"') || !h.includes('Completada')) errs.push('la unidad completada no se pliega');
  if (!/class="cont"[\s\S]*data-id="t1"/.test(h)) errs.push('falta el atajo «Continuar» a la siguiente lección');
  if (h.includes('data-id="v1"')) errs.push('las lecciones de la unidad completada siguen visibles');
  st.done = antes;
}

// 7) Simulador de aportaciones: valores de referencia calculados aparte.
const cerca = (x, y) => Math.abs(x - y) < 0.05;
const r1 = T.aportaciones({inicial: 0, mensual: 200, anos: 20, rent: 6, ter: 0});
const r2 = T.aportaciones({inicial: 0, mensual: 200, anos: 20, rent: 6, ter: 1.8});
const r3 = T.aportaciones({inicial: 5000, mensual: 0, anos: 10, rent: 7, ter: 0});
if (!cerca(r1.final, 90687.73) || r1.aportado !== 48000 || !cerca(r2.final, 74363.05) || !cerca(r2.sinComision, 90687.73) || !cerca(r3.final, 5000 * 1.07 ** 10) || r1.serie.length !== 21)
  errs.push(`simulador de aportaciones: ${r1.final} ${r2.final} ${r3.final}`);
T.setTrack('pasiva'); T.skipBasics();
if (!T.homeHTML().includes('data-act="calc"')) errs.push('la ruta Pasiva no ofrece el simulador de aportaciones');
T.openCalc();
if (!app.innerHTML.includes('¿Cuánto tendrías?') || !app.innerHTML.includes('calcsvg') || /NaN|undefined/.test(app.innerHTML)) errs.push('la vista del simulador de aportaciones no se dibuja bien');
T.getState().calc.cmp = true; T.openCalc();
if (!app.innerHTML.includes('class="cv-b"') || !app.innerHTML.includes('menos que con')) errs.push('la comparación de carteras no se dibuja');
T.goHome(); T.setTrack('tecnico');

// 5) Test de nivel: todo bien abre las rutas y marca Básico; solo una unidad bien marca solo esa unidad.
const st = T.getState();
const hacerTest = acierta => {
  st.done = {}; st.skipBasics = false; delete st.placement;
  const srsAntes = JSON.stringify(st.srs);
  T.startTest();
  if (T.lessonHTML().includes('class="lives"')) errs.push('el test de nivel muestra vidas');
  let k = 0;
  while (k++ < 40 && !app.innerHTML.includes('Test completado')) { const ex = T.getRun().queue[0]; give(ex, acierta(ex) ? right(ex) : wrong(ex)); T.check(); T.next(); }
  if (!app.innerHTML.includes('Test completado')) errs.push('el test de nivel no termina');
  if (JSON.stringify(st.srs) !== srsAntes) errs.push('el test de nivel modifica el repaso espaciado');
};
hacerTest(() => true);
const obligatorias = T.FLAT.filter(l => l.unit.track === 'basico' && l.unit.gate !== false);
if (!st.skipBasics || !obligatorias.every(l => st.done[l.id])) errs.push('test perfecto: no abre las rutas o no marca Básico');
if (T.FLAT.some(l => l.unit.gate === false && st.done[l.id])) errs.push('el test marca unidades complementarias');
hacerTest(ex => ['ba1', 'ba2'].includes(lecDe(ex.uid)));
const marcadas = Object.keys(st.done);
if (st.skipBasics || !marcadas.length || marcadas.some(id => !T.FLAT.find(l => l.id === id && l.unit.id === 'acciones'))) errs.push('test parcial: marca de más o abre las rutas: ' + marcadas.join(','));
if (st.placement?.score !== 2) errs.push('test parcial: puntuación mal guardada');

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
