// Pruebas en un navegador real (Playwright + Chromium). Levanta su propio servidor estático.
// Uso:
//   node test/e2e.cjs                      lecciones de muestra (una por ruta y por tipo de ejercicio) en 4 modos + accesibilidad
//   node test/e2e.cjs --todas              todas las lecciones, solo en móvil claro
//   node test/e2e.cjs --lecciones r2,bb2   esas lecciones en 4 modos
//   --capturas DIR                         guarda capturas de cada ejercicio (móvil)
//   --sin-axe                              omite la auditoría de accesibilidad
// Requiere playwright (y axe-core para la auditoría). En CI se instalan sin tocar package.json.
const http = require('http'), fs = require('fs'), path = require('path');
const {chromium} = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const arg = k => { const i = process.argv.indexOf(k); return i < 0 ? null : process.argv[i + 1] || ''; };
const has = k => process.argv.includes(k);

// Contenido: lee el índice de unidades igual que la app.
const {unidades, casos} = require('./contenido.cjs');
const units = unidades(ROOT), CASOS = casos(ROOT);
const exs = units.flatMap(u => (u.lessons || []).flatMap(l => l.ex)).concat(Object.values(CASOS.ex || {}).flat());
const lecciones = units.flatMap(u => (u.lessons || []).map(l => ({id: l.id, track: u.track || 'tecnico', tipos: new Set(l.ex.map(e => e.t))})));

const TYPES = {'.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml'};
function servidor() {
  return new Promise(res => {
    const s = http.createServer((req, rsp) => {
      let f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!f.startsWith(ROOT)) { rsp.writeHead(403); return rsp.end(); }
      if (f.endsWith('/')) f += 'index.html';
      fs.readFile(f, (e, d) => {
        if (e) { rsp.writeHead(404); return rsp.end(); }
        rsp.writeHead(200, {'content-type': TYPES[path.extname(f)] || 'application/octet-stream'}); rsp.end(d);
      });
    });
    s.listen(0, '127.0.0.1', () => res(s));
  });
}

const norm = s => s.replace(/\u00a0/g, ' ');
async function responder(p) {
  const q = norm(await p.locator('.q').innerText()); const ex = exs.find(e => e.q === q);
  if (!ex) throw new Error('sin ejercicio: ' + q);
  if (ex.t === 'choice') await p.click(`[data-act=pick][data-i="${ex.a}"]`);
  else if (ex.t === 'num') await p.fill('#numIn', String(ex.a).replace('.', ','));
  else if (ex.t === 'tap') await p.click(`.cd[data-i="${ex.a}"] .hit`, {force: true});
  else if (ex.t === 'level') await p.click(`.lv[data-id=${ex.a}] .hit`, {force: true});
  else if (ex.t === 'order' || ex.t === 'match') {
    for (const t of (ex.items || ex.pairs.map(x => x[1])))
      await p.locator('.ord-pool .opt').filter({hasText: new RegExp('^' + t.replace(/[()?+.*$^[\]{}|\\]/g, '\\$&').replace(/ /g, '\\s') + '$')}).first().click();
  } else if (ex.t === 'plan' || ex.t === 'zone') {
    for (const pl of ex.place) for (let k = 0; k < 200; k++) {
      const v = await p.evaluate(id => +document.querySelector(`.pl[data-id=${id}]`).getAttribute('aria-valuenow'), pl.id);
      if (Math.abs(v - pl.a) < 0.05) break;
      await p.click(`[data-act=pstep][data-id=${pl.id}][data-d="${v < pl.a ? 1 : -1}"]`);
    }
  } else if (ex.t === 'slide') {
    const n = Math.round((ex.a - ex.start) / ex.step);
    if (Math.abs(n) <= 12) for (let k = 0; k < Math.abs(n); k++) await p.click(`[data-act=sstep][data-d="${n > 0 ? 1 : -1}"]`);
    else await p.evaluate(v => { const i = document.getElementById('slIn'); i.value = v; i.dispatchEvent(new Event('input', {bubbles: true})); }, ex.a);
  }
  await p.click('[data-act=check]');
  return ex;
}

async function recorrer(b, url, ids, modos, dir) {
  let fallos = 0;
  for (const [tag, vp, scheme] of modos) {
    const p = await b.newPage({viewport: vp, colorScheme: scheme}); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
    await p.goto(url);
    for (const id of ids) {
      const L = lecciones.find(l => l.id === id);
      if (!L) { errs.push('lección inexistente ' + id); continue; }
      await p.evaluate(t => localStorage.setItem('rango.v1', JSON.stringify({legal: 99, all: true, skipBasics: true, track: t, done: {}, srs: {}})), L.track);
      await p.reload();
      await p.click(`[data-act=open][data-id="${id}"]`); let g = 0;
      // Primera vez en la unidad: sale su guía; se recorre entera y se empieza la lección.
      while (await p.locator('.guia [data-act=guianext]').count()) await p.click('.guia [data-act=guianext]');
      if (await p.locator('.guia').count()) await p.click('.gnav [data-act=guiafin]');
      while (g++ < 14 && !(await p.locator('text=Lección completada').count())) {
        const ex = await responder(p);
        if (!(await p.locator('.fb.good').count())) errs.push(`${id}: rechazada «${ex.q.slice(0, 50)}»`);
        if (dir && tag.startsWith('m')) await p.screenshot({path: `${dir}/${tag}-${id}-${g}-${ex.t}.png`, fullPage: true});
        await p.click('[data-act=next]');
      }
      if (!(await p.locator('text=Lección completada').count())) errs.push('no se completa ' + id);
    }
    console.log(`  ${tag}: ${errs.length ? errs.join('\n    ') : 'bien'}`);
    fallos += errs.length; await p.close();
  }
  return fallos;
}

// Auditoría de accesibilidad (axe-core) en las pantallas principales, claro y oscuro.
async function auditar(b, url) {
  let AXE;
  try { AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8'); } catch (e) { console.log('  axe-core no instalado: se omite la auditoría'); return 0; }
  const base = {legal: 99, all: true, skipBasics: true, done: {}, srs: {}, placement: {skipped: true}, sim: {}, guias: Object.fromEntries(units.filter(u => u.guia).map(u => [u.id, 1]))};  // guías ya vistas: se entra directo en la lección
  const conTipo = (track, t) => lecciones.find(l => l.track === track && l.tipos.has(t)).id;
  const abrirHasta = async (p, id, sel) => { for (let i = 0; i < 40; i++) { await p.click(`[data-act=open][data-id=${id}]`); if (await p.locator(sel).count()) return; await p.click('[data-act=quit]'); } };
  const pantallas = [
    ['aviso legal', {}, null],
    ['inicio básico', {...base, track: 'basico', placement: undefined}, null],
    ['inicio técnico', {...base, track: 'tecnico'}, null],
    ['inicio pasiva', {...base, track: 'pasiva'}, null],
    ['bloqueo', {legal: 99, track: 'tecnico', done: {}, srs: {}, placement: {skipped: true}}, null],
    ['lección', {...base, track: 'basico'}, async p => { await p.click('[data-act=open][data-id=ba1]'); }],
    ['lección tap', {...base, track: 'tecnico'}, async p => abrirHasta(p, conTipo('tecnico', 'tap'), '.cd[tabindex]')],
    ['lección level', {...base, track: 'tecnico'}, async p => abrirHasta(p, conTipo('tecnico', 'level'), '.lv')],
    ['lección order', {...base, track: 'fundamental'}, async p => abrirHasta(p, conTipo('fundamental', 'order'), '.ord:not(.match)')],
    ['lección match', {...base, track: 'tecnico'}, async p => abrirHasta(p, conTipo('tecnico', 'match'), '.match')],
    ['lección plan', {...base, track: 'tecnico'}, async p => abrirHasta(p, conTipo('tecnico', 'plan'), 'svg.plan')],
    ['lección zone', {...base, track: 'tecnico'}, async p => abrirHasta(p, conTipo('tecnico', 'zone'), '.zona')],
    ['lección slide', {...base, track: 'tecnico'}, async p => abrirHasta(p, conTipo('tecnico', 'slide'), '#slIn')],
    ['feedback', {...base, track: 'basico'}, async p => { await p.click('[data-act=open][data-id=ba1]'); const n = p.locator('#numIn'); if (await n.count()) await n.fill('1'); else await p.locator('[data-act=pick]').first().click(); await p.click('[data-act=check]'); }],
    ['simulador semana', {...base, track: 'tecnico'}, async p => { await p.click('[data-act=sim]'); }],
    ['simulador aportaciones', {...base, track: 'pasiva', calc: {cmp: true}}, async p => { await p.click('[data-act=calc]'); }],
    ['estadísticas', {...base, track: 'tecnico'}, async p => { if (await p.locator('[data-act=stats]').count()) await p.click('[data-act=stats]'); }],
    ['guía', {...base, guias: {}, track: 'basico'}, async p => { await p.click('[data-act=open][data-id=ba1]'); await p.click('[data-act=guianext]'); }],
    ['guía consulta', {...base, track: 'basico'}, async p => { await p.click('[data-act=guia][data-id=acciones]'); }],
    ['guía con figura', {...base, track: 'tecnico'}, async p => { await p.click('[data-act=guia][data-id=velas]'); }],
    ['test de nivel', {legal: 99, track: 'basico', done: {}, srs: {}}, async p => { await p.click('[data-act=test]'); }],
  ];
  const resumen = {};
  for (const scheme of ['light', 'dark']) for (const [nom, st, ir] of pantallas) {
    const p = await b.newPage({viewport: {width: 390, height: 844}, colorScheme: scheme});
    await p.goto(url);
    await p.evaluate(s => { localStorage.clear(); if (Object.keys(s).length) localStorage.setItem('rango.v1', JSON.stringify(s)); }, st);
    await p.reload(); await p.waitForSelector('#app *');
    if (ir) await ir(p);
    await p.addScriptTag({content: AXE});
    const r = await p.evaluate(async () => (await axe.run(document, {runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice']})).violations.map(v => ({id: v.id, help: v.help, ej: v.nodes[0].target.join(' ')})));
    for (const v of r) (resumen[v.id] = resumen[v.id] || {help: v.help, donde: [], ej: v.ej}).donde.push(`${nom} (${scheme})`);
    await p.close();
  }
  const ks = Object.keys(resumen);
  for (const k of ks) console.log(`  ${k}: ${resumen[k].help}\n    en: ${resumen[k].donde.join(', ')}\n    ej: ${resumen[k].ej}`);
  console.log(ks.length ? `  ${ks.length} incidencias de accesibilidad` : '  accesibilidad: sin incidencias');
  return ks.length;
}

// Guía: las flechas y el deslizamiento pasan de tarjeta, y el foco queda en el botón principal.
async function guiaNavegacion(b, url) {
  const p = await b.newPage({viewport: {width: 390, height: 844}, hasTouch: true}), errs = [];
  await p.goto(url);
  await p.evaluate(() => localStorage.setItem('rango.v1', JSON.stringify({legal: 99, skipBasics: true, track: 'tecnico'})));
  await p.reload(); await p.click('[data-act=guia][data-id=velas]');
  const pos = async () => (await p.locator('.guia .kind').innerText()).match(/(\d+) \/ \d+/)[1];
  await p.keyboard.press('ArrowRight'); if (await pos() !== '2') errs.push('la flecha derecha no pasa a la tarjeta 2');
  await p.keyboard.press('ArrowLeft'); if (await pos() !== '1') errs.push('la flecha izquierda no vuelve a la tarjeta 1');
  if (!(await p.evaluate(() => document.activeElement && document.activeElement.matches('.gnav .btn.primary')))) errs.push('el foco no queda en el botón principal de la guía');
  const desliza = dx => p.evaluate(dx => {
    const el = document.querySelector('.guia .qwrap'), o = {pointerType: 'touch', bubbles: true, clientY: 300};
    el.dispatchEvent(new PointerEvent('pointerdown', {...o, clientX: 200})); el.dispatchEvent(new PointerEvent('pointerup', {...o, clientX: 200 + dx}));
  }, dx);
  await desliza(-120); if (await pos() !== '2') errs.push('deslizar a la izquierda no pasa de tarjeta');
  await desliza(120); if (await pos() !== '1') errs.push('deslizar a la derecha no vuelve');
  await desliza(-20); if (await pos() !== '1') errs.push('un toque corto cambia de tarjeta');
  console.log('  ' + (errs.length ? errs.join('\n  ') : 'bien'));
  await p.close(); return errs.length;
}

(async () => {
  const s = await servidor(), url = `http://127.0.0.1:${s.address().port}/`;
  const b = await chromium.launch();
  const MOVIL = ['m-light', {width: 390, height: 844}, 'light'];
  const MODOS = [MOVIL, ['m-dark', {width: 390, height: 844}, 'dark'], ['d-light', {width: 1280, height: 900}, 'light'], ['d-dark', {width: 1280, height: 900}, 'dark']];
  const dir = arg('--capturas'); if (dir) fs.mkdirSync(dir, {recursive: true});
  let ids, modos = MODOS;
  if (has('--todas')) { ids = lecciones.map(l => l.id); modos = [MOVIL]; }
  else if (arg('--lecciones')) ids = arg('--lecciones').split(',');
  else {
    // Muestra: la primera lección de cada ruta y una lección por cada tipo de ejercicio.
    const set = new Set();
    for (const t of ['basico', 'pasiva', 'fundamental', 'tecnico']) set.add(lecciones.find(l => l.track === t).id);
    for (const t of new Set(exs.map(e => e.t))) { const l = lecciones.find(l => l.tipos.has(t)); if (l) set.add(l.id); }
    ids = [...set];
  }
  console.log(`Recorrido de ${ids.length} lecciones en ${modos.length} modo(s):`);
  let fallos = await recorrer(b, url, ids, modos, dir);
  if (!has('--lecciones') && !has('--todas')) { console.log('Guía (teclado y dedo):'); fallos += await guiaNavegacion(b, url); }
  if (!has('--sin-axe') && !has('--lecciones') && !has('--todas')) { console.log('Accesibilidad:'); fallos += await auditar(b, url); }
  await b.close(); s.close();
  console.log(fallos ? `FALLOS: ${fallos}` : 'OK');
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
