// Guía de la unidad: unas pocas tarjetas de teoría (unit.guia = [{id, titulo, texto, figura?, ejemplo?, chart?}]).
// figura: diagrama anotado (ver figuras.js), para lo que se entiende mejor dibujado.
// Modos: «inicio» (sale sola la primera vez que se entra en la unidad y al cerrarla empieza la lección),
// «consulta» (desde el botón Guía del inicio) y «repaso» (desde una pregunta fallada; vuelve a la lección).
import {tx} from '../util.js';
import {icoX} from '../icons.js';
import {candlesSVG,lineSVG} from '../charts.js';
import {figuraSVG} from '../figuras.js';
import {glos} from '../glosario.js';
import {UNITS} from '../content.js';
import {S,save,sumarRacha} from '../state.js';
import {ses,toast} from '../ui.js';
import {today} from '../util.js';
import {t} from '../textos.js';

// Abre la guía de una unidad en la tarjeta indicada. L: lección que empieza al terminar (modo inicio).
export function abrirGuia(unit,modo,{tarjeta=null,L=null}={}){
  const i=tarjeta?Math.max(0,unit.guia.findIndex(c=>c.id===tarjeta)):0;
  ses.guia={unit,i,modo,L,vistas:new Set([i]),ganado:false};
  if(!S.guias[unit.id]){S.guias[unit.id]=1;save()}
}
// Teoría leída: se pasó por todas las tarjetas (no basta con «Saltar»). Da LEER_XP una sola vez por unidad
// (S.leidas[unidad] = fecha) y cuenta para la meta diaria y la racha como una lección.
export const LEER_XP=10;
export const guiaLeida=u=>!!S.leidas[u.id];
export const guiaSinLeer=u=>!!(u&&u.guia&&u.guia.length&&!S.leidas[u.id]);
export function guiaVista(){
  const g=ses.guia;if(!g)return;
  g.vistas.add(g.i);
  if(g.vistas.size<g.unit.guia.length||S.leidas[g.unit.id])return;
  const hoy=today();sumarRacha();
  if(S.day!==hoy){S.day=hoy;S.dayXp=0}
  S.xp+=LEER_XP;S.dayXp+=LEER_XP;S.leidas[g.unit.id]=hoy;save();
  g.ganado=true;
  toast(t.teoriaXP(LEER_XP));
}
export const guiasLeidas=()=>{const c=UNITS.filter(u=>u.guia&&u.guia.length);return {leidas:c.filter(u=>S.leidas[u.id]).length,total:c.length}};
// La guía sale sola antes de la primera lección de una unidad que aún no se ha visto.
export const guiaPendiente=L=>L.kind==='lesson'&&L.unit.guia&&L.unit.guia.length&&!S.guias[L.unit.id];

export function guiaHTML(){
  const g=ses.guia,u=g.unit,c=u.guia[g.i],n=u.guia.length,ultima=g.i===n-1;
  const fin=g.modo==='inicio'?t.empezarLeccion:g.modo==='repaso'?t.volverLeccion:t.cerrar;
  const sp=c.chart,graf=sp?`<figure class="chart">${sp.type==='line'?lineSVG(sp):candlesSVG(sp,null)}</figure>`:'';
  return `<div class="lesson guia"><div class="lbar"><button class="x" data-act="guiafin" aria-label="${g.modo==='inicio'?t.saltarGuia:t.cerrarGuia}">${icoX}</button><div class="prog" role="progressbar" aria-label="${t.progresoGuia}" aria-valuemin="1" aria-valuemax="${n}" aria-valuenow="${g.i+1}"><i style="width:${(g.i+1)/n*100}%"></i></div>${g.modo==='inicio'?`<button class="btn ghost saltar" data-act="guiafin">${t.saltar}</button>`:''}</div>
  <div class="qwrap"><p class="kind">${t.guiaDe(u.title)} · ${g.i+1} / ${n}</p><h1 class="q">${tx(c.titulo)}</h1><p class="gtexto">${glos(tx(c.texto))}</p>${c.figura?`<figure class="chart gfig">${figuraSVG(c.figura)}</figure>`:''}
  ${c.ejemplo?`<div class="gej"><b>${t.ejemplo}</b><p>${glos(tx(c.ejemplo))}</p></div>`:''}${graf}<button class="link reporte" data-act="reportar">${t.verError}</button></div>
  ${g.ganado&&ultima?`<p class="note gleida" role="status">${t.teoriaLeida(LEER_XP)}</p>`:''}<div class="row gnav">${g.i>0?`<button class="btn line" data-act="guiaprev">${t.anterior}</button>`:''}<button class="btn primary" data-act="${ultima?'guiafin':'guianext'}">${ultima?fin:t.siguiente}</button></div></div>`;
}
