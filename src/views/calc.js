// Simulador de aportaciones (ruta Pasiva): crecimiento de una cartera con aportaciones mensuales y efecto de la comisión.
import {fmt} from '../util.js';
import {icoX} from '../icons.js';
import {S} from '../state.js';

// Cálculo mensual: rentabilidad neta = rentabilidad − comisión; la aportación se hace a final de cada mes.
export function aportaciones({inicial,mensual,anos,rent,ter}){
  const r=Math.pow(1+(rent-ter)/100,1/12)-1,rb=Math.pow(1+rent/100,1/12)-1;
  let v=inicial,vb=inicial;const serie=[{a:inicial,v:inicial}];
  for(let m=1;m<=anos*12;m++){v=v*(1+r)+mensual;vb=vb*(1+rb)+mensual;if(m%12===0)serie.push({a:inicial+mensual*m,v})}
  return {aportado:inicial+mensual*anos*12,final:v,sinComision:vb,serie};
}
const CALC_DEF={inicial:0,mensual:200,anos:20,rent:6,ter:0.2,cmp:false,ter2:1.8};
export const CALC_CTRL=[
  ['inicial','Capital inicial',0,50000,1000,v=>fmt(v,0)+' €'],
  ['mensual','Aportación mensual',0,2000,25,v=>fmt(v,0)+' €'],
  ['anos','Años',1,40,1,v=>v+(v===1?' año':' años')],
  ['rent','Rentabilidad anual',0,10,0.5,v=>fmt(v,1)+' %'],
  ['ter','Comisión anual',0,2,0.05,v=>fmt(v,2)+' %'],
  ['ter2','Comisión de la otra cartera',0,2.5,0.05,v=>fmt(v,2)+' %'],
];
function calcChart(r,r2){
  const W=360,H=200,pl=8,pr=52,pt=12,pb=22,n=r.serie.length-1,max=Math.max(...r.serie.map(p=>p.v),...(r2?r2.serie.map(p=>p.v):[]),1);
  const x=i=>pl+(W-pl-pr)*i/Math.max(n,1),y=v=>pt+(H-pt-pb)*(1-v/max);
  const pts=k=>r.serie.map((p,i)=>`${x(i).toFixed(1)},${y(p[k]).toFixed(1)}`).join(' ');
  const area=`${x(0).toFixed(1)},${y(0).toFixed(1)} ${pts('v')} ${x(n).toFixed(1)},${y(0).toFixed(1)}`;
  let s=`<svg class="svg calcsvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Valor de la cartera y dinero aportado año a año">`;
  [0,0.5,1].forEach(f=>{const yy=y(max*f).toFixed(1);s+=`<line class="grid" x1="${pl}" x2="${W-pr}" y1="${yy}" y2="${yy}"/><text x="${W-pr+6}" y="${(+yy+3.5).toFixed(1)}">${fmt(max*f/1000,0)} mil</text>`});
  s+=`<polygon class="cv-area" points="${area}"/><polyline class="cv-v" points="${pts('v')}"/><polyline class="cv-a" points="${pts('a')}"/>`;
  if(r2)s+=`<polyline class="cv-b" points="${r2.serie.map((p,i)=>`${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')}"/>`;
  s+=`<text x="${pl}" y="${H-6}">Año 0</text><text x="${(W-pr).toFixed(1)}" y="${H-6}" text-anchor="end">Año ${n}</text>`;
  return s+'</svg>';
}
export function calcOutHTML(){
  const p=S.calc,r=aportaciones(p),gan=r.final-r.aportado,com=r.sinComision-r.final;
  const r2=p.cmp?aportaciones(Object.assign({},p,{ter:p.ter2})):null;
  const dif=r2?r.final-r2.final:0;
  const cmp=r2?`<p class="cmpres">Con un ${fmt(p.ter2,2)} % de comisión tendrías <b>${fmt(r2.final,0)} €</b>: ${dif>=0?`${fmt(dif,0)} € menos`:`${fmt(-dif,0)} € más`} que con un ${fmt(p.ter,2)} %.</p>`:'';
  return `<dl class="simk calck"><div><dt>Valor final</dt><dd>${fmt(r.final,0)} €</dd></div><div><dt>Aportado</dt><dd>${fmt(r.aportado,0)} €</dd></div><div><dt>Rendimientos</dt><dd>${fmt(gan,0)} €</dd></div><div><dt>Se llevan las comisiones</dt><dd>${fmt(com,0)} €</dd></div></dl>${cmp}
  <figure class="chart">${calcChart(r,r2)}<figcaption class="leyenda"><span class="lv-v">Cartera con un ${fmt(p.ter,2)} %</span>${r2?`<span class="lv-b">Cartera con un ${fmt(p.ter2,2)} %</span>`:''}<span class="lv-a">Dinero aportado</span></figcaption></figure>`;
}
const ccHTML=([k,l,mi,ma,st,f])=>`<label class="cc" for="calc-${k}"><span>${l}</span><output id="out-${k}">${f(S.calc[k])}</output><input type="range" id="calc-${k}" data-calc="${k}" min="${mi}" max="${ma}" step="${st}" value="${S.calc[k]}"></label>`;
export function calcHTML(){
  S.calc=Object.assign({},CALC_DEF,S.calc);
  return `<div class="lesson sim-view"><div class="lbar"><button class="x" data-act="home" aria-label="Volver al inicio">${icoX}</button><p class="kind">Simulador de aportaciones</p></div>
  <div class="qwrap"><h1 class="q">¿Cuánto tendrías?</h1>
  <div class="calc">${CALC_CTRL.filter(c=>c[0]!=='ter2').map(ccHTML).join('')}
  <label class="ccheck" for="calc-cmp"><input type="checkbox" id="calc-cmp" data-calc="cmp"${S.calc.cmp?' checked':''}> Comparar con otra comisión</label>
  ${S.calc.cmp?ccHTML(CALC_CTRL.find(c=>c[0]==='ter2')):''}</div>
  <div id="calcOut">${calcOutHTML()}</div>
  <p class="src">Supone una rentabilidad constante cada año, algo que nunca ocurre: habrá años de fuertes caídas. Es una herramienta de formación, no una previsión ni una recomendación.</p></div>
  <div><button class="btn primary" data-act="home">Volver</button></div></div>`;
}
