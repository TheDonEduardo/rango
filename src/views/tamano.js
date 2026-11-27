// Calculadora de tamaño de posición (ruta Técnico): con las cifras del usuario, cuántas acciones comprar.
import {fmt,esc} from '../util.js';
import {icoX} from '../icons.js';
import {S} from '../state.js';
import {t} from '../textos.js';
import {TAM_LIM,tamanoLimpio,tamanoPosicion} from '../herramientas.js';
import {ctrlHTML} from './ctrl.js';

const eur=v=>fmt(v,2)+' €',eur0=v=>fmt(v,0)+' €',pct=(d)=>v=>fmt(v,d)+' %';
const rr=v=>fmt(v,v%1?1:0)+' R';
// Controles visibles: con el ATR, el stop sale de ATR y múltiplo; si no, se pone el precio del stop.
export const tamanoCtrl=()=>{
  const c=t.tamCtrl,d=(k,l,f)=>[k,l,...TAM_LIM[k],f];
  return [d('capital',c.capital,eur0),d('riesgo',c.riesgo,pct(2)),d('entrada',c.entrada,eur),d('tope',c.tope,pct(0)),
    ...(S.tamano.usarAtr?[d('atr',c.atr,eur),d('mult',c.mult,v=>fmt(v,1)+' ×')]:[d('stop',c.stop,eur)]),d('objetivoR',c.objetivoR,rr)];
};

// Entrada, stop y objetivo como líneas horizontales; las zonas de riesgo y de ganancia, sombreadas.
function tamChart(r,p){
  const W=360,H=190,pl=8,pt=16,pb=18,span=r.objetivo-r.stop,min=r.stop-span*0.2,max=r.objetivo+span*0.2;
  const y=v=>(pt+(H-pt-pb)*(1-(v-min)/(max-min))).toFixed(1),x2=W-pl;
  const yo=y(r.objetivo),ye=y(p.entrada),ys=y(r.stop),R=(r.objetivo-p.entrada)/r.porAccion;
  const lin=(c,yy)=>`<line class="${c}" x1="${pl}" x2="${x2}" y1="${yy}" y2="${yy}"/>`;
  const tx=(c,yy,txt,txt2)=>`<text class="${c}" x="${pl+4}" y="${yy}">${txt}</text><text class="${c}" x="${x2-4}" y="${yy}" text-anchor="end">${txt2}</text>`;
  return `<svg class="svg calcsvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t.tamAlt(fmt(p.entrada,2),fmt(r.stop,2),fmt(r.objetivo,2),fmt(R,R%1?1:0)))}">
  <rect class="tm-zup" x="${pl}" y="${yo}" width="${x2-pl}" height="${(ye-yo).toFixed(1)}"/><rect class="tm-zdn" x="${pl}" y="${ye}" width="${x2-pl}" height="${(ys-ye).toFixed(1)}"/>
  ${lin('tm-obj',yo)}${lin('tm-ent',ye)}${lin('tm-stop',ys)}
  ${tx('tm-tup',+yo-5,`${t.tamObj} ${eur(r.objetivo)}`,rr(R))}${tx('tm-tink',+ye-5,`${t.tamEntrada} ${eur(p.entrada)}`,'')}${tx('tm-tdn',+ys+13,`${t.tamStop} ${eur(r.stop)}`,'−1 R')}</svg>`;
}
export function tamanoOutHTML(){
  const p=S.tamano,r=tamanoPosicion(p);
  if(!r.ok)return `<p class="aviso-h" role="alert">${r.motivo==='cero'?t.tamStopCero:t.tamStopMal}</p>`;
  const k=(l,v)=>`<div><dt>${l}</dt><dd>${v}</dd></div>`;
  const aviso=r.manda==='peso'?`<p class="aviso-h">${t.tamAvisoPeso(r.porRiesgo,fmt(r.pesoRiesgo,1),fmt(p.tope,0))}</p>`:'';
  return `<dl class="simk calck">${k(t.tamRiesgoEur,eur(r.riesgoEur))}${k(t.tamRiesgoAccion,eur(r.porAccion))}${k(t.tamAcciones,fmt(r.acciones,0))}${k(t.tamImporte,eur(r.importe))}${k(t.tamPeso,fmt(r.peso,1)+' %')}${k(t.tamRiesgoReal,eur(r.riesgoReal))}${k(t.tamObjetivo(fmt(p.objetivoR,p.objetivoR%1?1:0)),eur(r.objetivo))}${k(t.tamGanancia,'+'+eur(r.ganancia))}${p.usarAtr?k(t.tamStopAtr,eur(r.stop)):''}</dl>
  ${aviso}<p class="cmpres">${r.acciones>0?t.tamManda(r.manda,r.acciones):t.tamNinguna}</p>
  <figure class="chart">${tamChart(r,p)}</figure>`;
}
export function tamanoHTML(){
  S.tamano=tamanoLimpio(S.tamano);
  const chk=`<label class="ccheck" for="chk-tamano-usarAtr"><input type="checkbox" id="chk-tamano-usarAtr" data-chk="tamano:usarAtr"${S.tamano.usarAtr?' checked':''}> ${t.tamUsarAtr}</label>`;
  return `<div class="lesson sim-view"><div class="lbar"><button class="x" data-act="home" aria-label="${t.volverInicio}">${icoX}</button><p class="kind">${t.tamTitulo}</p></div>
  <div class="qwrap"><h1 class="q">${t.tamPregunta}</h1>
  <div class="calc">${tamanoCtrl().map(c=>ctrlHTML('tamano',S.tamano,c)+(c[0]==='tope'?chk:'')).join('')}</div>
  <div id="tamOut" aria-live="polite">${tamanoOutHTML()}</div>
  <p class="src">${t.tamNota}</p></div>
  <div><button class="btn primary" data-act="home">${t.volver}</button></div></div>`;
}
