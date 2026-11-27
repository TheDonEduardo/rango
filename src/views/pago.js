// Curva de pago de opciones al vencimiento (ruta Opciones): resultado por contrato (100 acciones) según el precio final.
import {fmt,esc} from '../util.js';
import {icoX} from '../icons.js';
import {S} from '../state.js';
import {t} from '../textos.js';
import {PAGO_EST,PAGO_CAMPOS,PAGO_LIM,pagoLimpio,pagoEstrategia} from '../herramientas.js';
import {ctrlHTML} from './ctrl.js';

const dec=v=>Number.isInteger(Math.round(v*100)/100)?0:2;
const usd=v=>fmt(v,dec(v))+' $',precio=v=>fmt(v,0)+' $',prima=v=>fmt(v,2)+' $';
// Controles de la estrategia elegida: el precio de la acción y sus ejercicios y primas.
export const pagoCtrl=()=>{
  const e=S.pago.est,c=t.pagoCampo[e],d=(k,l)=>[k,l,...PAGO_LIM[k],k[0]==='p'?prima:precio];
  return [d('precio',t.pagoPrecio),...PAGO_CAMPOS[e].map(k=>d(k,c[k]))];
};
function pagoChart(r,p){
  const W=360,H=220,pl=8,pr=44,pt=20,pb=36,ks=[p.precio,...PAGO_CAMPOS[p.est].filter(k=>k[0]==='k').map(k=>p[k])];
  const mn=Math.min(...ks),mx=Math.max(...ks),pad=Math.max((mx-mn)*0.4,mx*0.1),lo=Math.max(0,mn-pad),hi=mx+pad;
  const xs=[lo,...r.bps.filter(b=>b>lo&&b<hi),hi],vs=xs.map(r.f);
  const ymin=Math.min(0,...vs),ymax=Math.max(0,...vs),ext=(ymax-ymin||1)*0.1,a=ymin-ext,b=ymax+ext;
  const x=s=>pl+(W-pl-pr)*(s-lo)/(hi-lo),y=v=>pt+(H-pt-pb)*(1-(v-a)/(b-a));
  const f1=v=>v.toFixed(1),y0=y(0),pts=xs.map((s,i)=>`${f1(x(s))},${f1(y(vs[i]))}`).join(' ');
  const area=`${f1(x(lo))},${f1(y0)} ${pts} ${f1(x(hi))},${f1(y0)}`,xr=W-pr;
  let s=`<svg class="svg calcsvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t.pagoAlt(t.pagoEst[p.est]))}">
  <defs><clipPath id="pg-sup"><rect x="${pl}" y="0" width="${xr-pl}" height="${f1(y0)}"/></clipPath><clipPath id="pg-inf"><rect x="${pl}" y="${f1(y0)}" width="${xr-pl}" height="${H}"/></clipPath></defs>
  <polygon class="pg-up" clip-path="url(#pg-sup)" points="${area}"/><polygon class="pg-dn" clip-path="url(#pg-inf)" points="${area}"/>`;
  // Eje derecho: máximo, cero y mínimo (sin repetir los que casi coinciden).
  const marcas=[ymax,0,ymin].filter((v,i,l)=>l.findIndex(u=>Math.abs(y(u)-y(v))<12)===i);
  marcas.forEach(v=>{s+=`<text x="${xr+5}" y="${f1(y(v)+3.5)}">${fmt(v,0)}</text>`});
  s+=`<line class="pg-cero" x1="${pl}" x2="${xr}" y1="${f1(y0)}" y2="${f1(y0)}"/>`;
  // Ejercicios (rayas con su cifra abajo, en dos filas para que no se pisen) y precio actual.
  [...new Set(ks.slice(1))].sort((u,v)=>u-v).forEach((k,i)=>{const xx=Math.min(xr-10,Math.max(pl+10,x(k)));s+=`<line class="pg-k" x1="${f1(x(k))}" x2="${f1(x(k))}" y1="${pt}" y2="${H-pb}"/><text x="${f1(xx)}" y="${H-pb+13+i%2*12}" text-anchor="middle">${t.pagoEj} ${fmt(k,0)}</text>`});
  const xp=x(p.precio);
  s+=`<line class="pg-hoy" x1="${f1(xp)}" x2="${f1(xp)}" y1="${pt}" y2="${H-pb}"/><text class="pg-thoy" x="${f1(Math.min(xr-14,Math.max(pl+14,xp)))}" y="${pt-6}" text-anchor="middle">${t.pagoHoy} ${fmt(p.precio,0)}</text>`;
  s+=`<polyline class="pg-curva" points="${pts}"/>`;
  r.equilibrios.filter(e=>e>=lo&&e<=hi).forEach(e=>{s+=`<circle class="pg-eq" cx="${f1(x(e))}" cy="${f1(y0)}" r="4"/>`});
  return s+'</svg>';
}
export function pagoOutHTML(){
  const p=S.pago,r=pagoEstrategia(p.est,p);
  if(!r.ok)return `<p class="aviso-h" role="alert">${r.motivo==='debito'?t.pagoDebito:t.pagoOrden[p.est]}</p>`;
  const k=(l,v)=>`<div><dt>${l}</dt><dd>${v}</dd></div>`;
  const eq=r.equilibrios.length?r.equilibrios.map(e=>fmt(e,dec(e))+' $').join(t.yEq):t.ninguno;
  return `<dl class="simk calck">${k(t.pagoPerdida,r.perdidaMax===Infinity?t.ilimitada:'−'+usd(r.perdidaMax))}${k(t.pagoGanancia,r.gananciaMax===Infinity?t.ilimitada:'+'+usd(r.gananciaMax))}${k(t.pagoEquilibrio(r.equilibrios.length),eq)}${k(t.pagoAlPrecio,(r.alPrecio>0?'+':r.alPrecio<0?'−':'')+usd(Math.abs(r.alPrecio)))}</dl>
  <figure class="chart">${pagoChart(r,p)}<figcaption class="leyenda"><span class="lv-c">${t.pagoLeyCurva}</span><span class="lv-a">${t.pagoLeyEj}</span></figcaption></figure>`;
}
export function pagoHTML(){
  S.pago=pagoLimpio(S.pago);
  return `<div class="lesson sim-view"><div class="lbar"><button class="x" data-act="home" aria-label="${t.volverInicio}">${icoX}</button><p class="kind">${t.pagoTitulo}</p></div>
  <div class="qwrap"><h1 class="q">${t.pagoPregunta}</h1>
  <div class="calc"><div class="cs"><label class="sl-h" for="pago-est"><span>${t.pagoEstrategia}</span></label><select id="pago-est" class="sel" data-pagoest="1">${PAGO_EST.map(e=>`<option value="${e}"${S.pago.est===e?' selected':''}>${t.pagoEst[e]}</option>`).join('')}</select></div>
  <p class="src pg-desc" id="pagoDesc">${t.pagoDesc[S.pago.est]}</p>
  ${pagoCtrl().map(c=>ctrlHTML('pago',S.pago,c)).join('')}</div>
  <div id="pagoOut" aria-live="polite">${pagoOutHTML()}</div>
  <p class="src">${t.pagoNota}</p></div>
  <div><button class="btn primary" data-act="home">${t.volver}</button></div></div>`;
}
