// Simulador de aportaciones (ruta Pasiva): crecimiento de una cartera con aportaciones mensuales y efecto de la comisión.
import {fmt} from '../util.js';
import {icoX} from '../icons.js';
import {S} from '../state.js';
import {t} from '../textos.js';

// Cálculo mensual: rentabilidad neta = rentabilidad − comisión; la aportación se hace a final de cada mes.
// caida (opcional): la cartera cae un caida % al final del año anoCaida (si cae dentro del plazo).
export function aportaciones({inicial,mensual,anos,rent,ter,caida=0,anoCaida=0}){
  const r=Math.pow(1+(rent-ter)/100,1/12)-1,rb=Math.pow(1+rent/100,1/12)-1,mc=caida>0&&anoCaida>=1&&anoCaida<=anos?anoCaida*12:-1;
  let v=inicial,vb=inicial;const serie=[{a:inicial,v:inicial}];
  for(let m=1;m<=anos*12;m++){
    v=v*(1+r)+mensual;vb=vb*(1+rb)+mensual;
    if(m===mc){v*=1-caida/100;vb*=1-caida/100}
    if(m%12===0)serie.push({a:inicial+mensual*m,v});
  }
  return {aportado:inicial+mensual*anos*12,final:v,sinComision:vb,serie};
}
const CALC_DEF={inicial:0,mensual:200,anos:20,rent:6,ter:0.2,cmp:false,ter2:1.8,crash:false,caida:30,anoCaida:10};
export const CALC_CTRL=[
  ['inicial',t.calcCtrl.inicial,0,50000,1000,v=>fmt(v,0)+' €'],
  ['mensual',t.calcCtrl.mensual,0,2000,25,v=>fmt(v,0)+' €'],
  ['anos',t.calcCtrl.anos,1,40,1,t.anos],
  ['rent',t.calcCtrl.rent,0,10,0.5,v=>fmt(v,1)+' %'],
  ['ter',t.calcCtrl.ter,0,2,0.05,v=>fmt(v,2)+' %'],
  ['ter2',t.calcCtrl.ter2,0,2.5,0.05,v=>fmt(v,2)+' %'],
  ['caida',t.calcCtrl.caida,10,60,5,v=>fmt(v,0)+' %'],
  ['anoCaida',t.calcCtrl.anoCaida,1,40,1,v=>t.anoN(v)],
];
// Parámetros efectivos: la caída solo cuenta con la casilla marcada y dentro del plazo elegido.
const efectivos=p=>Object.assign({},p,p.crash?{anoCaida:Math.min(p.anoCaida,p.anos)}:{caida:0});
function calcChart(r,r2){
  const W=360,H=200,pl=8,pr=52,pt=12,pb=22,n=r.serie.length-1,max=Math.max(...r.serie.map(p=>p.v),...(r2?r2.serie.map(p=>p.v):[]),1);
  const x=i=>pl+(W-pl-pr)*i/Math.max(n,1),y=v=>pt+(H-pt-pb)*(1-v/max);
  const pts=k=>r.serie.map((p,i)=>`${x(i).toFixed(1)},${y(p[k]).toFixed(1)}`).join(' ');
  const area=`${x(0).toFixed(1)},${y(0).toFixed(1)} ${pts('v')} ${x(n).toFixed(1)},${y(0).toFixed(1)}`;
  let s=`<svg class="svg calcsvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${t.calcAlt}">`;
  [0,0.5,1].forEach(f=>{const yy=y(max*f).toFixed(1);s+=`<line class="grid" x1="${pl}" x2="${W-pr}" y1="${yy}" y2="${yy}"/><text x="${W-pr+6}" y="${(+yy+3.5).toFixed(1)}">${t.mil(fmt(max*f/1000,0))}</text>`});
  s+=`<polygon class="cv-area" points="${area}"/><polyline class="cv-v" points="${pts('v')}"/><polyline class="cv-a" points="${pts('a')}"/>`;
  if(r2)s+=`<polyline class="cv-b" points="${r2.serie.map((p,i)=>`${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')}"/>`;
  s+=`<text x="${pl}" y="${H-6}">${t.anoN(0)}</text><text x="${(W-pr).toFixed(1)}" y="${H-6}" text-anchor="end">${t.anoN(n)}</text>`;
  return s+'</svg>';
}
export function calcOutHTML(){
  const p=efectivos(S.calc),r=aportaciones(p),gan=r.final-r.aportado,com=r.sinComision-r.final;
  const r2=p.cmp?aportaciones(Object.assign({},p,{ter:p.ter2})):null;
  const r0=p.crash?aportaciones(Object.assign({},p,{caida:0})):null;
  const crash=r0?`<p class="cmpres">${t.caidaRes(fmt(p.caida,0),p.anoCaida,fmt(r.final,0),fmt(r0.final-r.final,0))}</p>`:'';
  const dif=r2?r.final-r2.final:0;
  const cmp=r2?`<p class="cmpres">${t.comparacion(fmt(p.ter2,2),fmt(r2.final,0),fmt(Math.abs(dif),0),dif<0,fmt(p.ter,2))}</p>`:'';
  return `<dl class="simk calck"><div><dt>${t.valorFinal}</dt><dd>${fmt(r.final,0)} €</dd></div><div><dt>${t.aportado}</dt><dd>${fmt(r.aportado,0)} €</dd></div><div><dt>${t.rendimientos}</dt><dd>${fmt(gan,0)} €</dd></div><div><dt>${t.comisiones}</dt><dd>${fmt(com,0)} €</dd></div></dl>${crash}${cmp}
  <figure class="chart">${calcChart(r,r2)}<figcaption class="leyenda"><span class="lv-v">${t.carteraCon(fmt(p.ter,2))}</span>${r2?`<span class="lv-b">${t.carteraCon(fmt(p.ter2,2))}</span>`:''}<span class="lv-a">${t.dineroAportado}</span></figcaption></figure>`;
}
const ccHTML=([k,l,mi,ma,st,f])=>`<label class="cc" for="calc-${k}"><span>${l}</span><output id="out-${k}">${f(S.calc[k])}</output><input type="range" id="calc-${k}" data-calc="${k}" min="${mi}" max="${ma}" step="${st}" value="${S.calc[k]}"></label>`;
export function calcHTML(){
  S.calc=Object.assign({},CALC_DEF,S.calc);
  return `<div class="lesson sim-view"><div class="lbar"><button class="x" data-act="home" aria-label="${t.volverInicio}">${icoX}</button><p class="kind">${t.calcTitulo}</p></div>
  <div class="qwrap"><h1 class="q">${t.calcPregunta}</h1>
  <div class="calc">${CALC_CTRL.filter(c=>!['ter2','caida','anoCaida'].includes(c[0])).map(ccHTML).join('')}
  <label class="ccheck" for="calc-cmp"><input type="checkbox" id="calc-cmp" data-calc="cmp"${S.calc.cmp?' checked':''}> ${t.comparar}</label>
  ${S.calc.cmp?ccHTML(CALC_CTRL.find(c=>c[0]==='ter2')):''}
  <label class="ccheck" for="calc-crash"><input type="checkbox" id="calc-crash" data-calc="crash"${S.calc.crash?' checked':''}> ${t.simularCaida}</label>
  ${S.calc.crash?ccHTML(CALC_CTRL.find(c=>c[0]==='caida'))+ccHTML(CALC_CTRL.find(c=>c[0]==='anoCaida')):''}</div>
  <div id="calcOut">${calcOutHTML()}</div>
  <p class="src">${t.calcNota}</p></div>
  <div><button class="btn primary" data-act="home">${t.volver}</button></div></div>`;
}
