// Guía de la unidad: unas pocas tarjetas de teoría (unit.guia = [{id, titulo, texto, figura?, ejemplo?, chart?}]).
// figura: diagrama anotado (ver figuras.js), para lo que se entiende mejor dibujado.
// Modos: «inicio» (sale sola la primera vez que se entra en la unidad y al cerrarla empieza la lección),
// «consulta» (desde el botón Guía del inicio) y «repaso» (desde una pregunta fallada; vuelve a la lección).
import {tx} from '../util.js';
import {icoX} from '../icons.js';
import {candlesSVG,lineSVG} from '../charts.js';
import {figuraSVG} from '../figuras.js';
import {S,save} from '../state.js';
import {ses} from '../ui.js';
import {t} from '../textos.js';

// Abre la guía de una unidad en la tarjeta indicada. L: lección que empieza al terminar (modo inicio).
export function abrirGuia(unit,modo,{tarjeta=null,L=null}={}){
  const i=tarjeta?Math.max(0,unit.guia.findIndex(c=>c.id===tarjeta)):0;
  ses.guia={unit,i,modo,L};
  if(!S.guias[unit.id]){S.guias[unit.id]=1;save()}
}
// La guía sale sola antes de la primera lección de una unidad que aún no se ha visto.
export const guiaPendiente=L=>L.kind==='lesson'&&L.unit.guia&&L.unit.guia.length&&!S.guias[L.unit.id];

export function guiaHTML(){
  const g=ses.guia,u=g.unit,c=u.guia[g.i],n=u.guia.length,ultima=g.i===n-1;
  const fin=g.modo==='inicio'?t.empezarLeccion:g.modo==='repaso'?t.volverLeccion:t.cerrar;
  const sp=c.chart,graf=sp?`<figure class="chart">${sp.type==='line'?lineSVG(sp):candlesSVG(sp,null)}</figure>`:'';
  return `<div class="lesson guia"><div class="lbar"><button class="x" data-act="guiafin" aria-label="${g.modo==='inicio'?t.saltarGuia:t.cerrarGuia}">${icoX}</button><div class="prog" role="progressbar" aria-label="${t.progresoGuia}" aria-valuemin="1" aria-valuemax="${n}" aria-valuenow="${g.i+1}"><i style="width:${(g.i+1)/n*100}%"></i></div>${g.modo==='inicio'?`<button class="btn ghost saltar" data-act="guiafin">${t.saltar}</button>`:''}</div>
  <div class="qwrap"><p class="kind">${t.guiaDe(u.title)} · ${g.i+1} / ${n}</p><h1 class="q">${tx(c.titulo)}</h1><p class="gtexto">${tx(c.texto)}</p>${c.figura?`<figure class="chart gfig">${figuraSVG(c.figura)}</figure>`:''}
  ${c.ejemplo?`<div class="gej"><b>${t.ejemplo}</b><p>${tx(c.ejemplo)}</p></div>`:''}${graf}<button class="link reporte" data-act="reportar">${t.verError}</button></div>
  <div class="row gnav">${g.i>0?`<button class="btn line" data-act="guiaprev">${t.anterior}</button>`:''}<button class="btn primary" data-act="${ultima?'guiafin':'guianext'}">${ultima?fin:t.siguiente}</button></div></div>`;
}
