// Figuras explicativas de las guías: diagramas anotados (no gráficos de datos), dibujados en SVG.
//   {type:'velas', data:[[apertura,máximo,mínimo,cierre] | null,...], alt, h?   (null: hueco sin vela)
//     llaves:[{i,y1,y2,texto,lado?}]  corchete junto a la vela i entre dos precios (cuerpo, mecha…)
//     marcas:[{i,y,texto,lado?}]      punto de la vela i con su etiqueta (apertura, spring…)
//     lineas:[{y,texto?,tono?,lado?}] línea horizontal (soporte, stop…); texto a la derecha o, con lado 'i', a la izquierda
//     franjas:[{y1,y2,texto?}]        franja horizontal sombreada (rango)
//     zonas:[{i1,i2,texto}]           tramo de velas con título arriba (fase, contracción…)
//     etiquetas:[texto|null,...]      nombre bajo cada vela (martillo, peonza…)}
//   {type:'curvas', series:[{data:[...],texto,tono?,dy?}], alt, h?, lineas, marcas:[{i,y,texto,lado?}], llaves, zonas}
//     x?: [...] posiciones x (misma longitud que cada serie, no decreciente; repetidas = escalón vertical); sin x, reparto por índice. marcas, llaves y zonas siguen usando el índice del array
//     dy: desplaza en vertical el nombre de la serie (si dos acaban en el mismo punto)
//   {type:'barras', barras:[{texto, valor?, tono?, segmentos?:[{valor,texto,tono?}]}], alt, h?, unidad?, lineas?, margen?, ancho?}
//     barras verticales con escala desde 0 y el nombre (texto) debajo de cada una; el valor va encima (valor:false lo oculta)
//     segmentos: barra apilada (el primero abajo); su valor total es la suma y cada segmento lleva su texto dentro (con la cifra ya escrita)
//     unidad: sufijo del valor ('€' por defecto; '' = sin unidad). lineas:[{y,texto?,tono?}]: referencia horizontal (objetivo); su texto va
//     arriba de la línea, a la derecha; con margen (px a la derecha de las barras, p. ej. 150) cabe sin pisarlas. ancho: ancho máximo de barra
// lado: 'd' (derecha, por defecto) o 'i' (izquierda). tono: 'up', 'dn', 'sel', 'acc' o 'ink'.
import {esc} from './util.js';

const W = 360;
function escala(vals, top, bot, H) {
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = (hi - lo) * 0.08 || 1; lo -= pad; hi += pad;
  return v => top + (hi - v) / (hi - lo) * (H - top - bot);
}
const txt = (x, y, s, cls = '', anchor = 'start') => `<text class="ft ${cls}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}">${esc(s)}</text>`;

function capas(f, X, y, H, top, bot, pl, pr) {
  let s = '';
  (f.franjas || []).forEach(z => {
    const a = y(z.y2), b = y(z.y1);
    s += `<rect class="fz" x="${pl}" width="${W - pl - pr}" y="${a.toFixed(1)}" height="${(b - a).toFixed(1)}"/>`;
    if (z.texto) s += txt(pl + 4, a + 13, z.texto, 'fzt');
  });
  (f.zonas || []).forEach(z => {
    const a = X(z.i1) - X.paso / 2 + 2, b = X(z.i2) + X.paso / 2 - 2;
    s += `<rect class="fv" x="${a.toFixed(1)}" width="${(b - a).toFixed(1)}" y="${top - 6}" height="${H - top - bot + 6}" rx="6"/>`
      + txt((a + b) / 2, top - 10, z.texto, 'fzt', 'middle');
  });
  (f.lineas || []).forEach(l => {
    const yy = y(l.y).toFixed(1);
    s += `<line class="fl t-${l.tono || 'ink'}" x1="${pl}" x2="${W - pr}" y1="${yy}" y2="${yy}"/>`;
    if (l.texto) s += l.lado === 'i' ? txt(pl, y(l.y) - 5, l.texto, `t-${l.tono || 'ink'}`) : txt(W - pr, y(l.y) - 5, l.texto, `t-${l.tono || 'ink'}`, 'end');
  });
  return s;
}
function anotaciones(f, X, y, bw) {
  let s = '';
  (f.llaves || []).forEach(k => {
    const izq = k.lado === 'i', x = X(k.i) + (izq ? -1 : 1) * (bw / 2 + 8), a = y(k.y2), b = y(k.y1), d = izq ? 5 : -5;
    s += `<path class="fk" d="M${(x + d).toFixed(1)} ${a.toFixed(1)}H${x.toFixed(1)}V${b.toFixed(1)}H${(x + d).toFixed(1)}"/>`
      + txt(x + (izq ? -6 : 6), (a + b) / 2 + 4, k.texto, 'fkt', izq ? 'end' : 'start');
  });
  (f.marcas || []).forEach(m => {
    const izq = m.lado === 'i', x0 = X(m.i), yy = y(m.y), x1 = x0 + (izq ? -1 : 1) * (bw / 2 + 22);
    s += `<circle class="fp" cx="${x0.toFixed(1)}" cy="${yy.toFixed(1)}" r="3"/><line class="fk" x1="${(x0 + (izq ? -4 : 4)).toFixed(1)}" x2="${x1.toFixed(1)}" y1="${yy.toFixed(1)}" y2="${yy.toFixed(1)}"/>`
      + txt(x1 + (izq ? -4 : 4), yy + 4, m.texto, 'fkt', izq ? 'end' : 'start');
  });
  return s;
}
function velas(f) {
  const H = f.h || 220, top = f.zonas ? 30 : 14, bot = f.etiquetas ? 30 : 14, pl = 16, pr = 16;
  const vals = []; f.data.forEach(c => { if (c) vals.push(c[1], c[2]); });
  ['lineas', 'franjas'].forEach(k => (f[k] || []).forEach(l => vals.push(...[l.y, l.y1, l.y2].filter(v => typeof v === 'number'))));
  const y = escala(vals, top, bot, H), n = f.data.length;
  // Margen lateral para las etiquetas de llaves y marcas: las velas se centran en el espacio que queda.
  const m = f.margen == null ? (f.llaves || f.marcas ? 90 : 0) : f.margen;
  const izq = (f.llaves || []).concat(f.marcas || []).some(a => a.lado === 'i') ? m : 0, der = m && (f.llaves || []).concat(f.marcas || []).some(a => a.lado !== 'i') ? m : 0;
  const paso = (W - pl - pr - izq - der) / n, X = i => pl + izq + paso * i + paso / 2; X.paso = paso;
  const bw = Math.min(26, paso * 0.5);
  let s = capas(f, X, y, H, top, bot, pl, pr);
  f.data.forEach((c, i) => {
    if (!c) return;  // hueco: deja sitio libre (para textos) sin vela
    const [o, hi, lo, cl] = c, up = cl >= o, a = y(Math.max(o, cl)), b = y(Math.min(o, cl));
    s += `<g class="cd ${up ? 'up' : 'dn'}"><line class="wick" x1="${X(i).toFixed(1)}" x2="${X(i).toFixed(1)}" y1="${y(hi).toFixed(1)}" y2="${y(lo).toFixed(1)}"/><rect class="body" x="${(X(i) - bw / 2).toFixed(1)}" y="${a.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1.6, b - a).toFixed(1)}" rx="2"/></g>`;
  });
  (f.etiquetas || []).forEach((e, i) => { if (e) s += txt(X(i), H - 10, e, 'fkt', 'middle'); });
  return s + anotaciones(f, X, y, bw);
}
function curvas(f) {
  // Margen derecho para el nombre de cada serie, según su longitud (unos 7 px por carácter a 12 px).
  const H = f.h || 200, top = f.zonas ? 30 : 14, bot = 14, pl = 12, pr = f.margen == null ? Math.max(40, ...f.series.map(se => (se.texto || '').length * 7 + 14)) : f.margen;
  const vals = []; f.series.forEach(se => vals.push(...se.data)); (f.lineas || []).forEach(l => vals.push(l.y));
  const y = escala(vals, top, bot, H), n = Math.max(...f.series.map(se => se.data.length));
  let paso = n > 1 ? (W - pl - pr) / (n - 1) : W - pl - pr;
  let X = i => pl + paso * i;
  if (Array.isArray(f.x) && f.x.length === n) {
    // x explícitas: posiciones escaladas entre el mínimo y el máximo; las anotaciones siguen usando el índice del array.
    const x0 = f.x[0], x1 = f.x[n - 1];
    const ancho = W - pl - pr, rango = (x1 - x0) || 1;
    X = i => pl + (f.x[i] - x0) / rango * ancho;
    // El paso de las zonas es el menor salto real entre x consecutivas (no el reparto uniforme).
    const saltos = f.x.slice(1).map((v, i) => v - f.x[i]).filter(d => d > 0);
    paso = saltos.length ? Math.min(...saltos) / rango * ancho : ancho;
  }
  X.paso = paso;
  let s = capas(f, X, y, H, top, bot, pl, 12);
  f.series.forEach(se => {
    s += `<polyline class="fc t-${se.tono || 'sel'}" points="${se.data.map((v, i) => `${X(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}"/>`;
    const k = se.data.length - 1;
    if (se.texto) s += txt(X(k) + 6, y(se.data[k]) + 4 + (se.dy || 0), se.texto, `t-${se.tono || 'sel'}`);
  });
  return s + anotaciones(f, X, y, 0);
}
const miles = v => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
function barras(f) {
  if (!Array.isArray(f.barras) || !f.barras.length) return '';
  const H = f.h || 240, top = 24, bot = 30, pl = 16, pr = 16, mg = f.margen || 0, u = f.unidad === undefined ? ' €' : (f.unidad ? ' ' + f.unidad : '');
  const tot = b => b.segmentos ? b.segmentos.reduce((a, g) => a + g.valor, 0) : b.valor;
  const max0 = Math.max(...f.barras.map(tot), ...(f.lineas || []).map(l => l.y)), max = max0 > 0 ? max0 : 1;
  const y = v => H - bot - v / max * (H - top - bot), n = f.barras.length, area = W - pl - pr - mg, slot = area / n, bw = Math.min(slot * 0.8, f.ancho || 220);
  let s = `<line class="fl t-ink" style="stroke-dasharray:none;stroke-width:1.2" x1="${pl}" x2="${W - pr - mg}" y1="${y(0)}" y2="${y(0)}"/>`;
  f.barras.forEach((b, i) => {
    const cx = pl + slot * i + slot / 2, x = cx - bw / 2;
    if (b.segmentos) {
      let acc = 0;
      b.segmentos.forEach(g => {
        const a = y(acc + g.valor), c = y(acc);
        s += `<rect class="fb t-${g.tono || b.tono || 'sel'}" x="${x.toFixed(1)}" y="${a.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, c - a).toFixed(1)}"/>`;
        if (g.texto && c - a >= 15) s += txt(cx, (a + c) / 2 + 4, g.texto, '', 'middle');
        acc += g.valor;
      });
    } else s += `<rect class="fb llena t-${b.tono || 'sel'}" x="${x.toFixed(1)}" y="${y(b.valor).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, y(0) - y(b.valor)).toFixed(1)}"/>`;
    if (b.valor !== false) s += txt(cx, y(tot(b)) - 7, miles(tot(b)) + u, '', 'middle');
    s += txt(cx, H - 10, b.texto, 'fkt', 'middle');
  });
  (f.lineas || []).forEach(l => {
    const yy = y(l.y).toFixed(1);
    s += `<line class="fl t-${l.tono || 'ink'}" x1="${pl}" x2="${W - pr}" y1="${yy}" y2="${yy}"/>`;
    if (l.texto) s += txt(mg ? W - pr - mg + 6 : W - pr, y(l.y) - 5, l.texto, 'fkt', mg ? 'start' : 'end');
  });
  return s;
}
export function figuraSVG(f) {
  const H = f.h || (f.type === 'curvas' ? 200 : f.type === 'barras' ? 240 : 220);
  const cuerpo = f.type === 'curvas' ? curvas(f) : f.type === 'barras' ? barras(f) : velas(f);
  return `<svg class="svg fig" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(f.alt)}">${cuerpo}</svg>`;
}
