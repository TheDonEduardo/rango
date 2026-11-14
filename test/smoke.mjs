// Test de humo sin navegador: valida el contenido y recorre todas las lecciones.
// Uso: npm test
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const store = {};
const el = () => ({focus(){}, innerHTML:'', textContent:'', hidden:true, addEventListener(){}, querySelector(){return null}, querySelectorAll(){return []}});
const app = el();
const def = (k, v) => Object.defineProperty(globalThis, k, {value: v, configurable: true, writable: true});
def('document', {getElementById: id => id === 'app' ? app : el(), addEventListener(){}, querySelector(){return null}});
def('window', {scrollTo(){}, scrollY: 0});
def('localStorage', {getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; }, removeItem: k => { delete store[k]; }});
def('fetch', async u => ({json: async () => JSON.parse(fs.readFileSync(fileURLToPath(u), 'utf8'))}));

const errs = [];
const C = createRequire(import.meta.url)('./contenido.cjs');
const udir = C.dirUnidades(root), indice = C.indice(root), units = C.unidades(root);
// La app carga units.json (las unidades juntas): tiene que coincidir con los archivos por unidad.
if (!fs.existsSync(C.paquete(root)) || fs.readFileSync(C.paquete(root), 'utf8') !== JSON.stringify(units) + '\n') errs.push('src/content/units.json no está al día con src/content/units/: ejecuta npm run empaquetar');
// Numeración: en cada ruta, las unidades van 1, 2, 3… en el orden del índice.
const porRuta = {};
for (const u of units) { const r = u.track || 'tecnico'; porRuta[r] = (porRuta[r] || 0) + 1; if (u.n !== porRuta[r]) errs.push(`${u.id}: n = ${u.n}, debería ser ${porRuta[r]} (orden del índice en la ruta ${r})`); }
// Cada archivo de unidad está en el índice y se llama como su unidad.
for (const f of fs.readdirSync(udir).filter(f => f !== 'index.json')) if (!indice.includes(f.replace(/\.json$/, ''))) errs.push('unidad fuera del índice: ' + f);
units.forEach((u, i) => { if (u.id !== indice[i]) errs.push(`el archivo ${indice[i]}.json contiene la unidad ${u.id}`); });
// Ids de ejercicio: presentes, únicos y con el formato «lección-n».
const exIds = new Set();
for (const u of units) for (const l of u.lessons || []) for (const ex of l.ex) {
  if (!ex.id || !ex.id.startsWith(l.id + '-') || !/^\d+$/.test(ex.id.slice(l.id.length + 1))) errs.push(`${l.id}: id de ejercicio ausente o mal formado: ${ex.id}`);
  if (exIds.has(ex.id)) errs.push('id de ejercicio repetido: ' + ex.id);
  if (!(l.ultimo >= +ex.id.slice(l.id.length + 1))) errs.push(`${ex.id}: supera «ultimo» de su lección (${l.ultimo}); usa tools/contenido.py o súbelo`);
  exIds.add(ex.id);
}
const casosPath = path.join(root, 'src/content/casos.json');
const casos = fs.existsSync(casosPath) ? JSON.parse(fs.readFileSync(casosPath, 'utf8')) : null;

// Guías de unidad: 2-6 tarjetas cortas con id único; cada ejercicio con «guia» apunta a una tarjeta de su unidad.
for (const u of units) {
  const ids = new Set();
  if (u.guia !== undefined) {
    if (!Array.isArray(u.guia) || u.guia.length < 2 || u.guia.length > 6) errs.push(u.id + ': la guía debe tener de 2 a 6 tarjetas');
    for (const c of u.guia || []) {
      if (!c.id || !c.titulo || !c.texto || ids.has(c.id)) errs.push(`${u.id}: tarjeta de guía incompleta o repetida (${c.id})`);
      ids.add(c.id);
      if (c.figura) {
        const f = c.figura, w = `${u.id}/${c.id}`;
        if (!['velas', 'curvas'].includes(f.type) || !f.alt) errs.push(w + ': figura sin tipo válido o sin alt');
        const n = f.type === 'velas' ? (f.data || []).length : Math.max(0, ...(f.series || []).map(se => se.data.length));
        if (!n) errs.push(w + ': figura sin datos');
        if (f.type === 'velas' && !f.data.every(v => v === null || v.length === 4 && v[1] >= Math.max(v[0], v[3]) && v[2] <= Math.min(v[0], v[3]))) errs.push(w + ': vela mal formada en la figura');
        for (const a of [...(f.llaves || []), ...(f.marcas || [])]) if (!(a.i >= 0 && a.i < n) || !a.texto) errs.push(w + ': anotación fuera de la figura');
        for (const z of f.zonas || []) if (!(z.i1 >= 0 && z.i2 < n && z.i1 <= z.i2)) errs.push(w + ': zona fuera de la figura');
      }
      const pal = (c.texto + ' ' + (c.ejemplo || '')).split(/\s+/).length;
      if (pal > 70) errs.push(`${u.id}/${c.id}: tarjeta de guía demasiado larga (${pal} palabras; máximo 70)`);
    }
  }
  for (const l of u.lessons || []) for (const ex of l.ex) if (ex.guia !== undefined && !ids.has(ex.guia)) errs.push(`${ex.id}: «guia» apunta a una tarjeta inexistente (${ex.guia})`);
}

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
        if (c > 1.25 * o) errs.push(`${w}: la opción correcta (${c} caracteres) es mucho más larga que las demás (${o})`);
      }
      if (ex.t === 'num' && typeof ex.a !== 'number') errs.push(w + ': a no numérico');
      // Variantes de un ejercicio de cálculo: mismas reglas que el original y enunciados distintos entre sí.
      if (ex.variantes !== undefined) {
        if (ex.t !== 'num' || !Array.isArray(ex.variantes) || !ex.variantes.length) errs.push(w + ': variantes solo en ejercicios de cálculo y no vacías');
        else {
          const vistos = new Set([ex.q]);
          for (const v of ex.variantes) {
            if (typeof v.q !== 'string' || typeof v.why !== 'string' || typeof v.a !== 'number' || !(v.a >= 0 && v.a < 1000)) errs.push(w + ': variante mal formada');
            else if (vistos.has(v.q)) errs.push(w + ': variante con el mismo enunciado que otra');
            else if (v.a === ex.a && ex.variantes.every(x => x.a === ex.a)) errs.push(w + ': todas las variantes dan la misma respuesta que el original');
            vistos.add(v.q);
          }
        }
      }
      if (ex.t === 'choice' && ex.porque === undefined && !ex.caso) errs.push(w + ': falta porque (por qué no es correcta cada opción)');
      if (ex.porque !== undefined) {
        if (ex.t !== 'choice' || !Array.isArray(ex.porque) || ex.porque.length !== ex.opts.length || ex.porque[ex.a] !== null || ex.porque.some((p, k) => k !== ex.a && !(typeof p === 'string' && p.length > 10)))
          errs.push(w + ': porque debe tener una explicación por opción incorrecta y null en la correcta');
        else for (const p of ex.porque) if (p && p.split(/\s+/).length > 35) errs.push(w + ': explicación de opción demasiado larga');
      }
      if (ex.t === 'tap' && !(ex.chart && ex.a >= 0 && ex.a < ex.chart.data.length)) errs.push(w + ': vela fuera de rango');
      if (ex.t === 'level' && !(ex.chart?.levels || []).some(v => v.id === ex.a)) errs.push(w + ': nivel inexistente');
      if (ex.t === 'order' && !(Array.isArray(ex.items) && ex.items.length >= 3 && new Set(ex.items).size === ex.items.length)) errs.push(w + ': order necesita 3+ elementos distintos');
      if (ex.t === 'match' && !(Array.isArray(ex.pairs) && ex.pairs.length >= 3 && new Set(ex.pairs.map(p => p[0])).size === ex.pairs.length && new Set(ex.pairs.map(p => p[1])).size === ex.pairs.length)) errs.push(w + ': match necesita 3+ parejas distintas');
      if (ex.t === 'zone') {
        const top = (ex.place || []).find(p => p.id === 'top'), bot = (ex.place || []).find(p => p.id === 'bottom');
        if (!top || !bot || ex.place.length !== 2 || !(top.a > bot.a)) errs.push(w + ': zone necesita place top y bottom con top.a > bottom.a');
      }
      if (ex.t === 'plan' || ex.t === 'zone') {
        if (ex.chart?.type !== 'candles' || !Array.isArray(ex.place) || !ex.place.length) errs.push(w + ': plan necesita gráfico de velas y place');
        for (const p of ex.place || []) {
          const tol = p.tol == null ? 0.1 : p.tol;
          if (!p.id || !p.label || typeof p.a !== 'number' || typeof p.start !== 'number') errs.push(w + ': línea de plan incompleta');
          else if (Math.abs(p.start - p.a) <= tol + 1e-9) errs.push(w + ': la línea ' + p.id + ' empieza ya en la respuesta');
        }
      }
      if (ex.t === 'slide') {
        const nums = ['min', 'max', 'step', 'start', 'a'].every(k => typeof ex[k] === 'number');
        const tol = ex.tol == null ? ex.step / 2 : ex.tol, enRejilla = v => Math.abs((v - ex.min) / ex.step - Math.round((v - ex.min) / ex.step)) < 1e-6;
        if (!nums || !ex.label) errs.push(w + ': slide necesita min, max, step, start, a y label');
        else if (!(ex.min < ex.max && ex.a >= ex.min && ex.a <= ex.max && ex.start >= ex.min && ex.start <= ex.max)) errs.push(w + ': slide con valores fuera de rango');
        else if (!enRejilla(ex.a) || !enRejilla(ex.start)) errs.push(w + ': a o start no caen en un paso del deslizador');
        else if (Math.abs(ex.start - ex.a) <= tol + 1e-9) errs.push(w + ': el deslizador empieza ya en la respuesta');
        for (const s of ex.show || []) if (!s.label || typeof s.k !== 'number') errs.push(w + ': show mal formado');
      }
      if (!['choice', 'num', 'tap', 'level', 'order', 'match', 'plan', 'slide', 'zone'].includes(ex.t)) errs.push(w + ': tipo desconocido ' + ex.t);
};
for (const u of units) {
  if (!['basico', 'pasiva', 'tecnico', 'fundamental', 'derivados', undefined].includes(u.track)) errs.push('ruta desconocida en ' + u.id);
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
for (const f of fs.readdirSync(path.join(root, 'src'), {recursive: true}).map(f => f.split(path.sep).join('/')).filter(f => /\.(js|css)$/.test(f))) if (!pre.includes('src/' + f)) errs.push('sw.js no precarga src/' + f);
const man = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
for (const ic of man.icons) if (!fs.existsSync(path.join(root, ic.src))) errs.push('icono del manifiesto inexistente: ' + ic.src);
if (!man.icons.some(i => i.purpose === 'maskable')) errs.push('falta icono maskable en el manifiesto');
// Carga en paralelo: index.html precarga todos los módulos de la app (si falta uno, vuelve a llegar en cadena).
{ const h = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const f of fs.readdirSync(path.join(root, 'src'), {recursive: true}).map(f => f.split(path.sep).join('/')).filter(f => /\.js$/.test(f) && f !== 'bienvenida.js'))
    if (!h.includes(`<link rel="modulepreload" href="src/${f}">`)) errs.push('index.html no precarga el módulo src/' + f);
  for (const m of h.matchAll(/rel="modulepreload" href="([^"]+)"/g)) if (!fs.existsSync(path.join(root, m[1]))) errs.push('index.html precarga un módulo que no existe: ' + m[1]); }
// Seguridad: las dos páginas llevan política de seguridad de contenido y ningún script en línea (los bloquearía).
for (const f of ['index.html', 'bienvenida.html']) {
  const h = fs.readFileSync(path.join(root, f), 'utf8');
  if (!/http-equiv="Content-Security-Policy"[^>]*script-src 'self'/.test(h)) errs.push(f + ': falta la política de seguridad de contenido');
  if (/<script(?![^>]*\bsrc=)[^>]*>/.test(h) || /\son\w+="/.test(h)) errs.push(f + ': script en línea o manejador en un atributo (la política de seguridad los bloquea)');
  if (!h.includes('property="og:image"')) errs.push(f + ': faltan los metadatos para compartir el enlace');
}
// Fuentes propias: ninguna página pide recursos a Google (privacidad) y el service worker las precarga.
for (const f of ['index.html', 'bienvenida.html', 'sw.js', 'src/styles.css']) if (/fonts\.(googleapis|gstatic)\.com/.test(fs.readFileSync(path.join(root, f), 'utf8'))) errs.push(f + ' sigue pidiendo fuentes a Google');
for (const f of fs.readdirSync(path.join(root, 'fonts')).filter(f => /\.(woff2|css)$/.test(f))) if (!pre.includes('fonts/' + f)) errs.push('sw.js no precarga fonts/' + f);
for (const m of fs.readFileSync(path.join(root, 'fonts/fuentes.css'), 'utf8').matchAll(/url\(([^)]+)\)/g)) if (!fs.existsSync(path.join(root, 'fonts', m[1]))) errs.push('fuente inexistente: ' + m[1]);

// Textos de la interfaz: toda clave t.xxx usada en src/ existe en textos.js (evita «undefined» en pantalla).
{
  const {t} = await import(pathToFileURL(path.join(root, 'src/textos.js')));
  for (const f of fs.readdirSync(path.join(root, 'src'), {recursive: true}).filter(f => f.endsWith('.js') && !f.endsWith('textos.js'))) {
    const src = fs.readFileSync(path.join(root, 'src', f), 'utf8');
    if (!/import \{t\} from/.test(src)) continue;
    for (const [, k] of src.matchAll(/\bt\.([a-zA-Z0-9]+)/g)) if (!(k in t)) errs.push(`textos.js no tiene la clave t.${k} (usada en ${f})`);
  }
}

// 2) Recorrido completo de cada lección
const {api: T} = await import(pathToFileURL(path.join(root, 'src/app.js')));
const ident = ex => (ex.items || ex.pairs).map((_, i) => i);
const planOf = (ex, k) => Object.fromEntries(ex.place.map(p => [p.id, p[k]]));
const wrong = ex => ex.t === 'num' ? '999' : ex.t === 'tap' ? 0 : ex.t === 'level' ? 'Z' : ex.t === 'order' || ex.t === 'match' ? ident(ex).reverse() : ex.t === 'plan' || ex.t === 'zone' ? planOf(ex, 'start') : ex.t === 'slide' ? ex.start : (ex.a + 1) % ex.opts.length;
const right = ex => ex.t === 'num' ? String(ex.a).replace('.', ',') : ex.t === 'order' || ex.t === 'match' ? ident(ex) : ex.t === 'plan' || ex.t === 'zone' ? planOf(ex, 'a') : ex.a;
const give = (ex, v) => ex.t === 'num' ? T.setVal(v) : T.setSel(v);

// Aviso legal: aparece en el primer uso y desaparece al aceptarlo.
if (!app.innerHTML.includes('Antes de empezar')) errs.push('no aparece el aviso legal en el primer uso');
T.acceptLegal(); T.render();
if (app.innerHTML.includes('Antes de empezar') || !app.innerHTML.includes('Rango')) errs.push('aceptar el aviso legal no lleva al inicio');
if (!T.homeHTML().includes('data-act="legal"')) errs.push('falta el enlace al aviso legal en el inicio');
if (!T.homeHTML().includes('Rango')) errs.push('home no renderiza');
// Test de nivel: se ofrece a un usuario nuevo y sus preguntas existen (dos por unidad obligatoria de Básico).
if (!T.homeHTML().includes('data-act="objetivo"') || T.homeHTML().includes('data-act="test"')) errs.push('un usuario nuevo no elige primero su objetivo');
T.getState().objetivo = 'basico';
if (!T.homeHTML().includes('data-act="test"')) errs.push('no se ofrece el test de nivel a un usuario nuevo');
const lecDe = id => id.slice(0, id.lastIndexOf('-'));
for (const id of T.PLACEMENT) if (!exIds.has(id)) errs.push('el test de nivel usa un ejercicio inexistente: ' + id);
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

// «¿Ves un error?» en la explicación de cada ejercicio.
{ const L = T.FLAT.find(l => l.kind === 'lesson'); T.startRun(L); const ex = T.getRun().queue[0]; give(ex, right(ex)); T.check();
  if (!app.innerHTML.includes('data-act="reportar"')) errs.push('la explicación no ofrece avisar de un error'); T.goHome(); }

// Glosario: entradas completas y sin repetir; los términos se marcan una vez, respetan palabras y exclusiones.
{
  const G = JSON.parse(fs.readFileSync(path.join(root, 'src/content/glosario.json'), 'utf8')), vistos = new Set();
  for (const g of G) { if (!g.termino || !g.d || vistos.has(g.termino)) errs.push('entrada de glosario incompleta o repetida: ' + g.termino); vistos.add(g.termino); }
  const h = T.glos('El ATR mide el ATR y el PERímetro no es el PER.');
  if ((h.match(/data-act="term"/g) || []).length !== 2 || /PERímetro<\/button>|>PERí/.test(h)) errs.push('el glosario no marca bien los términos: ' + h);
  if (/data-act="term"/.test(T.glos('desempleo de larga duración'))) errs.push('el glosario ignora sus exclusiones');
  if (!/línea RS<\/button>/.test(T.glos('La línea RS sube'))) errs.push('el glosario no prefiere el término más largo');
  T.openGlosario(); if (!app.innerHTML.includes('glos-q') || !app.innerHTML.includes('ATR')) errs.push('la pantalla del glosario no se dibuja'); T.goHome();
  // Aviso: términos que no aparecen en ningún enunciado, explicación ni guía.
  const textos = units.flatMap(u => [...(u.guia || []).flatMap(c => [c.texto, c.ejemplo || '']), ...(u.lessons || []).flatMap(l => l.ex.flatMap(e => [e.q, e.why]))]).join(' ');
  const glosTodo = T.glos(textos.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'));
  const sinUso = G.filter(g => !glosTodo.includes(`data-k="${G.indexOf(g)}"`));
  if (sinUso.length) console.warn('AVISO: términos del glosario que no aparecen en el contenido: ' + sinUso.map(g => g.termino).join(', '));
}

// Medición anónima: sin MEDICION_URL no se envía nada ni se ofrece en estadísticas.
{ const {medir} = await import(pathToFileURL(path.join(root, 'src/medicion.js'))); T.getState().medir = true;
  if (medir('prueba', {id: 'x'})) errs.push('la medición envía datos sin MEDICION_URL configurada');
  T.getState().medir = false; T.openStats(); if (app.innerHTML.includes('data-act="medir"')) errs.push('se ofrece la medición sin servicio configurado'); T.goHome(); }

// Textos con números: plurales y tiempo de estudio redondeado.
{ const {t} = await import(pathToFileURL(path.join(root, 'src/textos.js')));
  if (t.vidas(1) !== '1 vida' || t.nEjercicios(1) !== '1 ejercicio' || t.tiempo(59.7) !== '1 h 0 min' || t.tiempo(119.6) !== '2 h 0 min' || t.tiempo(12.2) !== '12 min') errs.push('plurales o tiempo mal formados'); }

// Variantes: en el examen de la unidad, un ejercicio con variantes sale con cifras distintas alguna vez y se corrige con ellas.
{ const R = T.FLAT.find(l => l.kind === 'review' && l.unit.lessons.some(x => x.ex.some(e => e.variantes)));
  const base = R.unit.lessons.flatMap(x => x.ex).find(e => e.variantes), vistos = new Set();
  for (let k = 0; k < 60 && vistos.size < 2; k++) {
    T.startRun(R); const run = T.getRun(), e = run.queue.find(x => x.id === base.id);
    if (e) { vistos.add(e.q);
      if (e.q !== base.q) { run.queue = [e]; T.setVal(String(e.a).replace('.', ',')); T.check(); if (!T.getRun().ok) errs.push('una variante no se corrige con su propia respuesta'); if (e.id !== base.id || e.unit !== base.unit) errs.push('la variante pierde el id o la unidad'); } }
    T.goHome();
  }
  if (vistos.size < 2) errs.push('el examen no usa las variantes numéricas'); }

// Las opciones se barajan (salvo las de orden fijo) y cada botón conserva su índice original.
{ const L = T.FLAT.find(l => l.kind === 'lesson' && l.ex.some(e => e.t === 'choice' && !T.ordenFijo(e.opts))), ex = L.ex.find(e => e.t === 'choice' && !T.ordenFijo(e.opts));
  const ordenes = new Set();
  for (let k = 0; k < 30; k++) {
    T.startRun(Object.assign({}, L, {ex: [ex], casos: []}));
    const h = app.innerHTML, ids = [...h.matchAll(/data-act="pick" data-i="(\d)"/g)].map(m => m[1]).join('');
    ordenes.add(ids);
    if (!new RegExp(`data-i="${ex.a}"[^>]*>${ex.opts[ex.a].replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 15)}`).test(h)) errs.push('el botón de la opción correcta no lleva su texto');
    T.goHome();
  }
  if (ordenes.size < 2) errs.push('las opciones de elegir no se barajan');
  if (!T.ordenFijo(['A', 'B', 'C', 'Ninguna']) || !T.ordenFijo(['Fase 1 (base)', 'Fase 2 (avance)', 'Fase 3 (techo)', 'Fase 4 (declive)'])) errs.push('se barajan opciones cuyo orden tiene sentido'); }

// Al fallar una pregunta con «porque», se explica por qué la opción elegida no es correcta.
{ const L = T.FLAT.find(l => l.kind === 'lesson' && l.ex.some(e => e.porque)), ex = L.ex.find(e => e.porque);
  T.startRun(Object.assign({}, L, {ex: [ex], casos: []})); const mala = (ex.a + 1) % ex.opts.length; T.setSel(mala); T.check();
  if (!app.innerHTML.includes('class="porque"') || !app.innerHTML.includes(ex.porque[mala].slice(0, 20))) errs.push('el fallo no explica por qué la opción elegida no es correcta'); T.goHome(); }

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
for (const ex of enRepaso) { const r = srs[ex.id]; if (!r || r.step !== 1 || r.due <= dk(hoy)) errs.push('repaso espaciado no avanza ' + ex.id); }
// Aprendidos: un ejercicio que supera todos los intervalos sale del repaso y cuenta como aprendido; si se vuelve a fallar, deja de contar.
{
  const ex = enRepaso[0], st = T.getState();
  const otras = {}; for (const u in st.srs) if (u !== ex.id) { otras[u] = st.srs[u].due; st.srs[u].due = '2999-01-01'; }
  for (let k = 1; k < 4; k++) { st.srs[ex.id].due = dk(hoy); T.startSrs(); const cur = T.getRun().queue[0]; give(cur, right(cur)); T.check(); T.next(); }  // cur: el repaso puede servir una variante numérica
  for (const u in otras) if (st.srs[u]) st.srs[u].due = otras[u];
  if (st.srs[ex.id] || !st.aprendidos[ex.id]) errs.push('un ejercicio que supera todos los intervalos no queda aprendido');
  if (!T.homeHTML().includes('aprendido') && Object.keys(st.srs).some(u => st.srs[u].due <= dk(hoy))) errs.push('el inicio no muestra los aprendidos');
  T.openStats(); if (!app.innerHTML.includes('Aprendidos')) errs.push('las estadísticas no muestran los aprendidos'); T.goHome();
}
if (T.getState().done.srs) errs.push('el repaso del día se guarda como lección completada');

// Migración del estado guardado: la versión 1 (repaso por posición) pasa a ids estables.
{
  const m = T.migrar({xp: 50, srs: {'ba1#0': {step: 1, due: '2026-01-01'}, 'r2#4': {step: 0, due: '2026-01-02'}}});
  if (m.v !== 2 || !m.srs['ba1-1'] || m.srs['ba1-1'].step !== 1 || !m.srs['r2-5'] || m.srs['ba1#0'] || m.xp !== 50) errs.push('la migración del estado 1 → 2 falla: ' + JSON.stringify(m));
  if (Object.keys(m.srs).some(k => !exIds.has(k))) errs.push('la migración deja ids de repaso inexistentes');
  if (T.migrar({v: 2, srs: {'ba1-1': {}}}).srs['ba1-1'] === undefined) errs.push('la migración toca un estado ya actualizado');
}

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
    // Historial: el resultado se guarda en el plan y, con dos semanas o más, se resume en la tarjeta.
    const st = T.getState(), P = sem.prev, cp = P.data[P.data.length - 1][3];
    st.sim[P.semana] = {ticker: P.ticker, plan: {entry: cp * 0.5, stop: cp * 0.4, target: cp * 10}};
    T.simRecord();
    const r0 = st.sim[P.semana].res, esp = T.simulate(st.sim[P.semana].plan, P.despues);
    if (!r0 || r0.estado !== esp.estado || Math.abs(r0.r - esp.r) > 0.01) errs.push('el resultado de la semana pasada no se guarda bien');
    st.sim['2000-W01'] = {ticker: 'X', plan: {}, res: {estado: 'stop', r: -1, nombre: 'Prueba'}};
    if (T.simHist().length !== 2) errs.push('el historial del simulador no reúne las semanas');
    T.setTrack('tecnico'); st.skipBasics = true;
    if (!T.homeHTML().includes('Tu historial')) errs.push('la tarjeta no muestra el historial');
    T.openSimRes();
    if (!app.innerHTML.includes('class="histl"')) errs.push('el resultado no lista el historial');
    delete st.sim['2000-W01'];
  }
  T.goHome();
}

// 10) Guía de la unidad: sale sola la primera vez, se puede consultar desde el inicio y se repasa desde un fallo.
{
  const st = T.getState(), guias = st.guias, all = st.all; st.guias = {}; st.all = true;
  const conGuia = units.find(u => u.guia), L1 = conGuia.lessons[0];
  T.act('open', {id: L1.id});
  if (T.getView() !== 'guia' || !app.innerHTML.includes(conGuia.guia[0].titulo)) errs.push('la guía no sale antes de la primera lección de la unidad');
  T.act('guianext'); if (!app.innerHTML.includes(conGuia.guia[1].titulo)) errs.push('la guía no pasa a la tarjeta siguiente');
  T.act('guiaprev'); if (!app.innerHTML.includes(conGuia.guia[0].titulo)) errs.push('la guía no vuelve a la tarjeta anterior');
  T.act('guiafin');
  if (T.getView() !== 'lesson' || T.getRun().L.id !== L1.id) errs.push('saltar la guía no empieza la lección');
  if (!st.guias[conGuia.id]) errs.push('la guía vista no se guarda');
  // Repaso desde un fallo: vuelve a la misma lección con la explicación a la vista.
  const run = T.getRun(), ex = run.queue[0];
  give(ex, wrong(ex)); T.check();
  if (ex.guia) {
    if (!app.innerHTML.includes('data-act="guiarepaso"')) errs.push('el fallo no ofrece repasar la teoría');
    T.act('guiarepaso', {g: ex.guia});
    if (T.getView() !== 'guia' || !app.innerHTML.includes(conGuia.guia.find(c => c.id === ex.guia).titulo)) errs.push('repasar la teoría no abre su tarjeta');
    T.act('guiafin');
    if (T.getView() !== 'lesson' || T.getRun() !== run || !run.checked) errs.push('cerrar la guía no vuelve a la lección');
  }
  T.goHome();
  T.act('open', {id: L1.id}); if (T.getView() !== 'lesson') errs.push('la guía vuelve a salir sola en una unidad ya vista');
  T.goHome();
  T.act('guia', {id: conGuia.id}); T.act('guiafin'); if (T.getView() !== 'home') errs.push('la guía consultada desde el inicio no vuelve al inicio');
  st.guias = guias; st.all = all;
}

// Examen de la unidad: 8 ejercicios; sin fallos marca la unidad como dominada.
{
  const st = T.getState(), R = T.FLAT.find(l => l.kind === 'review');
  T.startRun(R);
  if (T.getRun().total !== 8) errs.push('el examen de la unidad no tiene 8 ejercicios');
  let k = 0; while (k++ < 20 && !app.innerHTML.includes('Lección completada')) { const ex = T.getRun().queue[0]; give(ex, right(ex)); T.check(); T.next(); }
  if (!st.dominadas[R.unit.id] || !app.innerHTML.includes('unidad dominada')) errs.push('un examen sin fallos no marca la unidad como dominada');
  T.goHome(); st.track = R.unit.track || 'tecnico';
  if (!T.homeHTML().includes('Dominada')) errs.push('el inicio no muestra la unidad dominada');
}

// Prueba de nivel de una ruta avanzada: supera dos unidades, falla en la tercera y se para ahí.
{
  const st = T.getState(), antes = st.done; st.done = {}; st.pruebas = {}; st.skipBasics = true; st.track = 'tecnico';
  if (!T.homeHTML().includes('data-act="nivel"')) errs.push('la ruta técnica no ofrece la prueba de nivel');
  T.startNivel('tecnico');
  const run = T.getRun();
  const nTec = 2 * new Set(T.FLAT.filter(l => l.kind === 'lesson' && (l.unit.track || 'tecnico') === 'tecnico').map(l => l.unit.id)).size;
  if (run.total !== nTec || run.lives !== 3 || app.innerHTML.includes('class="lives"')) errs.push(`la prueba de nivel no tiene ${nTec} preguntas (2 por unidad) sin vidas`);
  for (let k = 0; k < 4; k++) { const ex = T.getRun().queue[0]; give(ex, right(ex)); T.check(); T.next(); }
  { const ex = T.getRun().queue[0]; give(ex, wrong(ex)); T.check(); T.next(); }
  const tec = units.filter(u => (u.track || 'tecnico') === 'tecnico');
  const hechas = tec.filter(u => u.lessons.every(l => st.done[l.id])).map(u => u.id);
  if (hechas.join() !== tec.slice(0, 2).map(u => u.id).join() || !app.innerHTML.includes('Prueba completada') || st.pruebas.tecnico?.unidades !== 2) errs.push('la prueba de nivel no marca justo las unidades superadas: ' + hechas.join());
  if (T.homeHTML().includes('data-act="nivel"')) errs.push('la prueba de nivel se vuelve a ofrecer tras hacerla');
  if (!tec.slice(0, 2).every(u => st.done[u.id + '-rev'])) errs.push('la prueba de nivel no completa el examen de las unidades superadas');
  if (!T.homeHTML().includes(`node current" style="--i:0;--off:0" data-act="open" data-id="${tec[2].lessons[0].id}"`) && !new RegExp(`node current[^>]*data-id="${tec[2].lessons[0].id}"`).test(T.homeHTML())) errs.push('tras la prueba de nivel, la lección actual no es la primera de la unidad siguiente');
  st.done = antes; T.goHome();
}

// Racha: un día sin practicar gasta un protector; cada 7 días seguidos se gana uno (máximo 2). Meta diaria y objetivo inicial.
{
  const st = T.getState(), copia = JSON.stringify(st), dia = n => { const d = new Date(); d.setDate(d.getDate() + n); return dk(d); };
  Object.assign(st, {last: dia(-2), streak: 5, protector: 1});
  let r = T.sumarRacha(); if (!r.usado || st.streak !== 6 || st.protector !== 0) errs.push('el protector de racha no salva un día perdido');
  Object.assign(st, {last: dia(-2), streak: 5, protector: 0});
  T.sumarRacha(); if (st.streak !== 1) errs.push('sin protector, un día perdido no reinicia la racha');
  Object.assign(st, {last: dia(-1), streak: 6, protector: 2});
  r = T.sumarRacha(); if (st.streak !== 7 || st.protector !== 2 || r.ganado) errs.push('se gana un protector por encima del máximo');
  Object.assign(st, {last: dia(-1), streak: 13, protector: 0});
  r = T.sumarRacha(); if (!r.ganado || st.protector !== 1) errs.push('7 días seguidos no dan un protector');
  st.meta = 80; if (!T.homeHTML().includes('/ 80 XP')) errs.push('la meta diaria elegida no se usa en el inicio');
  T.openStats(); if (!app.innerHTML.includes('data-act="meta"') || !app.innerHTML.includes('Protectores de racha')) errs.push('las estadísticas no permiten elegir la meta ni muestran los protectores'); T.goHome();
  const done = st.done; st.done = {}; st.objetivo = null;
  if (!T.homeHTML().includes('data-act="objetivo"')) errs.push('un usuario nuevo no elige objetivo');
  st.done = done;
  Object.assign(st, JSON.parse(copia));
}

// 9) Estadísticas: cada primer intento queda registrado; los fallados forman los «puntos débiles» y se pueden practicar.
{
  const st = T.getState(), reg = st.stats.ex, ids = Object.keys(reg);
  if (ids.length < nLecciones) errs.push('estadísticas: faltan registros de ejercicios');
  if (ids.some(id => !exIds.has(id))) errs.push('estadísticas: registran ejercicios sin id (casos reales)');
  T.openStats();
  if (!app.innerHTML.includes('Tu progreso') || !app.innerHTML.includes('Tus puntos débiles')) errs.push('la pantalla de estadísticas no se dibuja');
  const flojo = ids.find(id => !reg[id].u);
  if (!flojo) errs.push('estadísticas: no hay ningún punto débil tras fallar ejercicios');
  else {
    T.startWeak();
    const cola = T.getRun().queue.slice();
    if (!cola.length || cola.length > 10 || cola.some(ex => reg[ex.id].u)) errs.push('puntos débiles: la práctica no usa los ejercicios fallados');
    let k = 0;
    while (k++ < 40 && !app.innerHTML.includes('Repaso completado')) { const ex = T.getRun().queue[0]; give(ex, right(ex)); T.check(); T.next(); }
    if (cola.some(ex => !reg[ex.id].u)) errs.push('puntos débiles: acertar no saca el ejercicio de la lista');
    if (st.done.weak) errs.push('la práctica de puntos débiles se guarda como lección');
  }
  if (!(st.stats.min > 0)) errs.push('estadísticas: no se suma tiempo de estudio');
  T.goHome();
}

// Copia de seguridad: se exporta, se lee y se recupera igual; un archivo ajeno se rechaza sin tocar nada.
{
  const st = T.getState(), copia = T.exportar(), c = T.leerCopia(copia);
  if (!c || c.resumen.xp !== st.xp || JSON.stringify(c.estado) !== JSON.stringify(st)) errs.push('la copia de seguridad no recupera el mismo progreso');
  if (T.leerCopia('{"xp":5}') || T.leerCopia('no es json') || T.leerCopia(JSON.stringify({app: 'rango', estado: {xp: 'mucho'}}))) errs.push('se acepta una copia no válida');
  if (T.leerCopia(JSON.stringify({app: 'rango', estado: {xp: 1, done: {}, srs: null}})) || T.leerCopia(JSON.stringify({app: 'rango', estado: {xp: 1, done: null}}))) errs.push('se acepta una copia con colecciones nulas');
  if (T.leerCopia(JSON.stringify({app: 'rango', estado: {v: 99, xp: 1, done: {}}})) !== 'nueva') errs.push('se acepta una copia de una versión más nueva');
  const vieja = T.leerCopia(JSON.stringify({app: 'rango', estado: {xp: 10, done: {}, srs: {'ba1#0': {step: 0, due: '2026-01-01'}}}}));
  if (!vieja || !vieja.estado.srs['ba1-1'] || vieja.estado.v !== st.v) errs.push('una copia antigua no se migra al recuperarla');
  T.openStats(); if (!app.innerHTML.includes('data-act="compartir"')) errs.push('las estadísticas no permiten compartir el progreso');
  T.openStats(); if (!app.innerHTML.includes('data-act="exportar"') || !app.innerHTML.includes('data-act="importar"')) errs.push('las estadísticas no ofrecen la copia de seguridad');
  T.goHome();
}

// 8) Inicio con progreso: atajo «Continuar» y unidades completadas plegadas.
{
  const st = T.getState(); const antes = st.done; st.done = {}; st.skipBasics = true; T.setTrack('tecnico');
  for (const l of T.FLAT.filter(l => l.unit.id === 'velas')) st.done[l.id] = {acc: 1};
  const h = T.homeHTML();
  if (!h.includes('data-act="unfold"') || !h.includes('Completada')) errs.push('la unidad completada no se pliega');
  if (!/class="hoy-row cont"[\s\S]*data-id="t1"/.test(h)) errs.push('falta el atajo «Continuar» a la siguiente lección');
  // Inicio ordenado: una sola tarjeta «Hoy» y, como mucho, un aviso de los de empezar.
  if ((h.match(/class="hoy"/g) || []).length !== 1) errs.push('el inicio no reúne meta, continuar y repaso en una tarjeta «Hoy»');
  if ((h.match(/class="(objetivo|gate|test)"/g) || []).length > 1) errs.push('el inicio apila varios avisos');
  if (h.includes('data-id="v1"')) errs.push('las lecciones de la unidad completada siguen visibles');
  st.done = antes;
}
// Reto del día: una pregunta de lo ya completado, la misma todo el día; acertarla da 20 XP y queda hecho hasta mañana.
{
  const st = T.getState(), antes = st.done, retoAntes = st.reto, xp0 = st.xp;
  st.done = {}; st.reto = null;
  if (T.retoHoy()) errs.push('reto del día sin lecciones completadas');
  for (const l of T.FLAT.filter(l => l.unit.id === 'velas' && l.kind === 'lesson')) st.done[l.id] = {acc: 1};
  const r = T.retoHoy();
  if (!r || !['choice', 'num'].includes(r.t) || !['v1', 'v2'].includes(r.id.split('-')[0]) || T.retoHoy() !== r) errs.push('el reto del día no sale de lo completado o cambia en el mismo día');
  if (!T.homeHTML().includes('data-act="reto"')) errs.push('el inicio no ofrece el reto del día');
  T.startReto(); give(r, right(r)); T.check(); T.next();
  if (!st.reto || !st.reto.ok || st.xp - xp0 !== 20) errs.push('el reto acertado no da 20 XP o no queda anotado: ' + JSON.stringify(st.reto));
  if (T.homeHTML().includes('data-act="reto"') || !T.homeHTML().includes('Mañana, otro')) errs.push('el reto hecho se sigue ofreciendo');
  if (st.done.reto) errs.push('el reto se guarda como lección completada');
  T.goHome(); st.done = antes; st.reto = retoAntes;
}

// 7) Simulador de aportaciones: valores de referencia calculados aparte.
const cerca = (x, y) => Math.abs(x - y) < 0.05;
const r1 = T.aportaciones({inicial: 0, mensual: 200, anos: 20, rent: 6, ter: 0});
const r2 = T.aportaciones({inicial: 0, mensual: 200, anos: 20, rent: 6, ter: 1.8});
const r3 = T.aportaciones({inicial: 5000, mensual: 0, anos: 10, rent: 7, ter: 0});
if (!cerca(r1.final, 90687.73) || r1.aportado !== 48000 || !cerca(r2.final, 74363.05) || !cerca(r2.sinComision, 90687.73) || !cerca(r3.final, 5000 * 1.07 ** 10) || r1.serie.length !== 21)
  errs.push(`simulador de aportaciones: ${r1.final} ${r2.final} ${r3.final}`);
T.setTrack('pasiva'); T.skipBasics();
// Itinerarios: lecciones existentes y sin repetir; elegir uno lo muestra en «Hoy» y abre su siguiente lección aunque esté bloqueada en su ruta.
{
  const {t} = await import(pathToFileURL(path.join(root, 'src/textos.js')));
  for (const it of T.ITINERARIOS) {
    if (!t.itin[it.id] || !t.itinLogros[it.id] || t.itinLogros[it.id].length !== 3) errs.push(`itinerario ${it.id}: faltan sus textos`);
    const malos = it.pasos.filter(id => !T.FLAT.some(l => l.id === id && l.kind === 'lesson'));
    if (malos.length || new Set(it.pasos).size !== it.pasos.length) errs.push(`itinerario ${it.id}: lecciones inexistentes o repetidas ${malos}`);
  }
  const st = T.getState(), hechas = st.done; st.done = {}; st.itin = null;
  T.act('itinerarios');
  if (!app.innerHTML.includes('Itinerarios guiados') || /undefined|NaN/.test(app.innerHTML)) errs.push('la pantalla de itinerarios no se dibuja bien');
  { const o = st.objetivo, x = st.xp; st.objetivo = null; st.xp = 0; if (!T.homeHTML().includes('O sigue un itinerario guiado')) errs.push('la pantalla de objetivo no ofrece los itinerarios'); st.objetivo = o; st.xp = x; }
  T.act('itinsel', {id: 'compra'});
  if (st.itin !== 'compra' || !T.homeHTML().includes('data-act="itinsig"')) errs.push('elegir un itinerario no lo muestra en el inicio');
  st.done.f1a = {acc: 1};
  if (T.itinActual().sig.id !== 'f2a' || T.itinActual().hechas !== 1) errs.push('el itinerario no avanza a la siguiente lección pendiente');
  st.guias = Object.assign({}, st.guias, {valoracion: 1});
  T.act('itinsig');
  if (T.getView() !== 'lesson' || T.getRun().L.id !== 'f2a') errs.push('«Seguir» no abre la siguiente lección del itinerario');
  // Itinerario terminado: «Hoy» ofrece el resumen y la pantalla propone el siguiente.
  for (const id of T.ITINERARIOS.find(x => x.id === 'compra').pasos) st.done[id] = {acc: 1};
  T.act('home');
  if (!T.homeHTML().includes('Itinerario completado') || T.itinActual().sig) errs.push('el itinerario terminado no se marca en el inicio');
  T.act('itinerarios');
  if (!app.innerHTML.includes('Lo que ya sabes hacer') || !app.innerHTML.includes('Siguiente: Tu primera cartera') || /undefined/.test(app.innerHTML)) errs.push('el cierre del itinerario no se dibuja bien');
  T.act('home'); T.act('itindejar');
  if (st.itin !== null) errs.push('no se puede dejar un itinerario');
  st.done = hechas;
}
// Simulador con datos reales: archivo bien formado y cálculo comprobado a mano con dos años inventados.
{
  const hp = path.join(root, 'src/content/historico.json');
  if (fs.existsSync(hp)) {
    const h = JSON.parse(fs.readFileSync(hp, 'utf8'));
    if (!h.fuente || h.anos.length < 15 || h.acciones.length !== h.anos.length || h.bonos.length !== h.anos.length || h.anos.some((a, i) => i && a !== h.anos[i - 1] + 1)
      || h.acciones.concat(h.bonos).some(v => typeof v !== 'number' || v < -90 || v > 150)) errs.push('historico.json mal formado');
    if (h.eur && (h.eur.anos.length < 12 || h.eur.acciones.length !== h.eur.anos.length || h.eur.bonos.length !== h.eur.anos.length)) errs.push('historico.json: serie en euros mal formada');
  }
  const H2 = {anos: [1, 2], acciones: [100, -50], bonos: [0, 0]};
  const con = T.historia(50, true, H2), sin = T.historia(50, false, H2);
  // Con rebalanceo: 15.000 tras el año 1 (7.500 + 7.500) y 11.250 tras el 2. Sin él: 10.000 + 5.000 y luego 5.000 + 5.000.
  if (Math.abs(con.final - 11250) > 0.01 || Math.abs(sin.final - 10000) > 0.01 || Math.abs(con.peor - 25) > 0.01 || Math.abs(sin.caida - 100 / 3) > 0.01 || Math.abs(sin.pesoFinal - 50) > 0.01)
    errs.push(`simulador con datos reales: ${con.final} ${sin.final} ${con.peor} ${sin.caida}`);
}
if (!T.homeHTML().includes('data-act="calc"')) errs.push('la ruta Pasiva no ofrece el simulador de aportaciones');
T.openCalc();
if (!app.innerHTML.includes('¿Cuánto tendrías?') || !app.innerHTML.includes('calcsvg') || /NaN|undefined/.test(app.innerHTML)) errs.push('la vista del simulador de aportaciones no se dibuja bien');
// Caída simulada: sin rentabilidad, 10.000 € que caen un 30 % en el año 5 se quedan en 7.000 €; con 100 € al mes, (10.000 + 6.000) × 0,7 + 6.000 = 17.200 €.
{
  const c1 = T.aportaciones({inicial: 10000, mensual: 0, anos: 10, rent: 0, ter: 0, caida: 30, anoCaida: 5});
  const c2 = T.aportaciones({inicial: 10000, mensual: 100, anos: 10, rent: 0, ter: 0, caida: 30, anoCaida: 5});
  const c3 = T.aportaciones({inicial: 10000, mensual: 0, anos: 4, rent: 0, ter: 0, caida: 30, anoCaida: 5});
  if (Math.abs(c1.final - 7000) > 0.01 || Math.abs(c2.final - 17200) > 0.01 || Math.abs(c3.final - 10000) > 0.01) errs.push(`simulador: caída mal aplicada ${c1.final} ${c2.final} ${c3.final}`);
  T.getState().calc.crash = true; T.openCalc();
  if (!app.innerHTML.includes('Con una caída del') || /NaN|undefined/.test(app.innerHTML)) errs.push('el simulador no muestra el resultado de la caída');
  T.getState().calc.crash = false;
}
T.getState().calc.cmp = true; T.openCalc();
if (!app.innerHTML.includes('class="cv-b"') || !app.innerHTML.includes('menos que con')) errs.push('la comparación de carteras no se dibuja');
T.goHome(); T.setTrack('tecnico');

// 5) Test de nivel: todo bien abre las rutas y marca Básico; solo una unidad bien marca solo esa unidad.
const st = T.getState();
const hacerTest = acierta => {
  st.done = {}; st.skipBasics = false; delete st.placement;
  const srsAntes = JSON.stringify(st.srs), statsAntes = JSON.stringify(st.stats.ex);
  T.startTest();
  if (T.lessonHTML().includes('class="lives"')) errs.push('el test de nivel muestra vidas');
  let k = 0;
  while (k++ < 40 && !app.innerHTML.includes('Test completado')) { const ex = T.getRun().queue[0]; give(ex, acierta(ex) ? right(ex) : wrong(ex)); T.check(); T.next(); }
  if (!app.innerHTML.includes('Test completado')) errs.push('el test de nivel no termina');
  if (JSON.stringify(st.srs) !== srsAntes) errs.push('el test de nivel modifica el repaso espaciado');
  if (JSON.stringify(st.stats.ex) !== statsAntes) errs.push('el test de nivel modifica las estadísticas');
};
hacerTest(() => true);
const obligatorias = T.FLAT.filter(l => l.unit.track === 'basico' && l.unit.gate !== false);
if (!st.skipBasics || !obligatorias.every(l => st.done[l.id])) errs.push('test perfecto: no abre las rutas o no marca Básico');
if (T.FLAT.some(l => l.unit.gate === false && st.done[l.id])) errs.push('el test marca unidades complementarias');
hacerTest(ex => ['ba1', 'ba2'].includes(lecDe(ex.id)));
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

// Contenido con fecha de revisión («revisar»: "AAAA-MM» en la unidad o en el ejercicio): normas fiscales, garantías,
// datos de informes. Al llegar la fecha se avisa (no falla) para revisarlo y mover la fecha.
const mes = new Date().toISOString().slice(0, 7), caducados = [];
for (const u of units) {
  if (u.revisar !== undefined && !/^\d{4}-\d{2}$/.test(u.revisar)) errs.push(u.id + ': revisar debe ser AAAA-MM');
  if (u.revisar && u.revisar <= mes) caducados.push(`unidad ${u.id} (${u.revisar})`);
  for (const l of u.lessons || []) for (const ex of l.ex) {
    if (ex.revisar !== undefined && !/^\d{4}-\d{2}$/.test(ex.revisar)) errs.push(ex.id + ': revisar debe ser AAAA-MM');
    if (ex.revisar && ex.revisar <= mes) caducados.push(`${ex.id} (${ex.revisar})`);
  }
}
if (caducados.length) console.warn('AVISO: contenido pendiente de revisar (normas o datos que pueden haber cambiado):\n- ' + caducados.join('\n- '));

// Política de privacidad: enlazada en el pie; «Volver» regresa al inicio o a Tu progreso, según desde dónde se abrió.
{
  if (!T.homeHTML().includes('data-act="privacidad"')) errs.push('falta el enlace a la política de privacidad en el inicio');
  T.goHome(); T.act('privacidad');
  if (T.getView() !== 'privacidad' || !app.innerHTML.includes('Política de privacidad') || !app.innerHTML.includes('aepd.es')) errs.push('la política de privacidad no se muestra');
  T.act('privvolver'); if (T.getView() !== 'home') errs.push('privacidad: «Volver» no regresa al inicio');
  T.openStats(); T.act('privacidad'); T.act('privvolver'); if (T.getView() !== 'stats') errs.push('privacidad: «Volver» no regresa a Tu progreso');
  T.goHome();
}

// Cuentas (src/sync.js): sin proyecto configurado no se ofrece nada; la fusión no pierde progreso de ningún
// dispositivo; y el flujo completo funciona contra un servidor simulado (enlace, retorno, bajada, fusión y subida).
{
  T.openStats(); if (app.innerHTML.includes('cuenta-email')) errs.push('se ofrece la cuenta sin Supabase configurado'); T.goHome();
  const a = {xp: 300, mod: 2, done: {x1: {acc: 0.5}, x2: {acc: 1}}, srs: {e1: {step: 1, due: '2026-11-20'}, e2: {step: 0, due: '2026-11-12'}},
    aprendidos: {e3: '2026-10-01'}, stats: {ex: {e1: {n: 3, f: 1, u: 1}}, min: 10}, guias: {g: 1}, dominadas: {}, pruebas: {}, sim: {},
    streak: 4, last: '2026-11-10', meta: 80, track: 'tecnico'};
  const b = {xp: 500, mod: 1, done: {x1: {acc: 1}, x3: {acc: 0.75}}, srs: {e1: {step: 2, due: '2026-11-25'}, e3: {step: 0, due: '2026-11-12'}},
    aprendidos: {}, stats: {ex: {e1: {n: 5, f: 2, u: 1}, e9: {n: 1, f: 1, u: 0}}, min: 30}, guias: {h: 1}, dominadas: {u: '2026-11-01'}, pruebas: {}, sim: {},
    streak: 9, last: '2026-11-09', meta: 20, track: 'basico', skipBasics: true};
  const f = T.fusionar(a, b);
  if (f.xp !== 500 || f.done.x1.acc !== 1 || !f.done.x2 || !f.done.x3) errs.push('fusión: se pierden lecciones o XP');
  if (f.srs.e1.step !== 2 || !f.srs.e2 || f.srs.e3) errs.push('fusión: repaso mal combinado (o un aprendido vuelve al repaso)');
  if (f.stats.ex.e1.n !== 5 || !f.stats.ex.e9 || f.stats.min !== 30) errs.push('fusión: estadísticas mal combinadas');
  if (!f.guias.g || !f.guias.h || !f.dominadas.u || !f.skipBasics) errs.push('fusión: se pierden guías, unidades dominadas o el salto de básicos');
  if (f.streak !== 4 || f.last !== '2026-11-10' || f.meta !== 80 || f.track !== 'tecnico') errs.push('fusión: racha o preferencias del dispositivo equivocado');
  const canon = o => JSON.stringify(o, (k, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort()) : v);
  if (canon(T.fusionar(b, a)) !== canon(f)) errs.push('fusión: el resultado depende del orden');

  // Servidor simulado
  const st = T.getState(), copia = JSON.parse(JSON.stringify(st)), llamadas = [];
  let guardado = {v: st.v, xp: 99999, done: {zz: {acc: 1}}, srs: {}, mod: 1};
  const fetchAntes = globalThis.fetch;
  globalThis.fetch = async (url, o = {}) => {
    llamadas.push([o.method || 'GET', url.replace('https://x.supabase.co', ''), o.headers]);
    const ok = (d, s = 200) => ({ok: s < 300, status: s, text: async () => d == null ? '' : JSON.stringify(d)});
    if (url.includes('/auth/v1/otp')) return ok({});
    if (url.includes('/auth/v1/user')) return o.headers.Authorization === 'Bearer T1' ? ok({id: 'u1', email: 'a@b.es'}) : ok(null, 401);
    if (url.includes('/rest/v1/progreso?select')) return ok(guardado ? [{estado: guardado}] : []);
    if (url.endsWith('/rest/v1/progreso')) { guardado = JSON.parse(o.body).estado; return ok(null, 201); }
    if (url.includes('/rpc/borrar_cuenta')) { guardado = null; return ok(null, 204); }
    if (url.includes('/auth/v1/logout')) return ok(null, 204);
    return ok(null, 404);
  };
  T.configurar({url: 'https://x.supabase.co/', anon: 'ANON'});
  await T.enviarEnlace('a@b.es', 'https://rango.app/');
  if (!llamadas[0][1].startsWith('/auth/v1/otp?redirect_to=https%3A%2F%2Frango.app%2F') || llamadas[0][2].apikey !== 'ANON') errs.push('cuenta: el enlace no se pide bien');
  let limpio = false;
  if (!(await T.leerRetorno('#access_token=T1&refresh_token=R1&expires_in=3600&token_type=bearer', () => { limpio = true; })) || !limpio || T.sesion().user.id !== 'u1') errs.push('cuenta: no se lee la sesión al volver del correo');
  if (await T.leerRetorno('#otra=cosa')) errs.push('cuenta: un fragmento cualquiera abre sesión');
  const xpLocal = st.xp, cambio = await T.sincronizar(), S2 = T.getState();
  if (!cambio || S2.xp !== 99999 || !S2.done.zz || Object.keys(copia.done).some(k => !S2.done[k])) errs.push('cuenta: la sincronización no fusiona lo local con lo guardado');
  if (!guardado || guardado.xp !== 99999 || !guardado.done.zz) errs.push('cuenta: no se sube el estado fusionado');
  const sube = llamadas.find(l => l[1] === '/rest/v1/progreso');
  if (!sube || sube[2].Authorization !== 'Bearer T1' || sube[2].Prefer !== 'resolution=merge-duplicates') errs.push('cuenta: la subida no va autenticada o no actualiza la fila');
  T.openStats(); if (!app.innerHTML.includes('a@b.es') || !app.innerHTML.includes('data-act="cuentacerrar"')) errs.push('cuenta: la pantalla no muestra la sesión'); T.goHome();
  guardado = {v: 999, xp: 1};
  if (await T.sincronizar() || T.getState().xp === 1) errs.push('cuenta: se aplica una copia de una versión más nueva');
  await T.borrarCuenta();
  if (T.sesion() || guardado !== null || T.getState().xp !== 99999) errs.push('cuenta: el borrado no cierra la sesión o borra el progreso local');
  // Deja el estado como estaba para el resto del test.
  T.importar(copia); st.xp = xpLocal; T.configurar({url: '', anon: ''}); globalThis.fetch = fetchAntes;
}

if (errs.length) { console.error('FALLOS:\n- ' + errs.join('\n- ')); process.exit(1); }
const nc = casos ? Object.values(casos.ex).reduce((n, l) => n + l.length, 0) : 0;
console.log(`OK: ${T.FLAT.length} lecciones, ${nc} casos reales, XP total ${T.getState().xp}`);
