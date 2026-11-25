// Operación de la semana: ejercicio retrospectivo. El gráfico real (semana.json) se corta 5 sesiones antes de su último cierre;
// el usuario coloca entrada (compra en ruptura), stop y objetivo y, al comprobar, ve al instante las sesiones siguientes (`despues`).
import {fmt,esc,today} from '../util.js';
import {icoX} from '../icons.js';
import {candlesSVG} from '../charts.js';
import {SEMANA} from '../content.js';
import {S,save} from '../state.js';
import {$app,ses} from '../ui.js';
import {fineHTML} from '../drag.js';
import {t} from '../textos.js';

export const SIM_PLACE=[{id:'entry',label:t.entrada},{id:'stop',label:t.stop},{id:'target',label:t.objetivo}];
// Comprueba el plan en edición: simula las sesiones siguientes y guarda plan y resultado (una vez por semana ISO).
export function simSave(){
  const k=SEMANA.semana;if(S.sim[k])return S.sim[k];
  const plan=Object.assign({},ses.simDraft),r=simulate(plan,SEMANA.despues);
  S.sim[k]={ticker:SEMANA.ticker,plan,fecha:today(),res:{estado:r.estado,r:Math.round(r.r*100)/100,nombre:SEMANA.nombre,sesiones:SEMANA.despues.length}};
  save();return S.sim[k];
}
// Simula un plan de compra en ruptura sobre las sesiones posteriores. Reglas conservadoras:
// la entrada se activa al tocarla (si abre por encima con hueco, a la apertura); el stop y el objetivo igual;
// si un mismo día toca stop y objetivo, cuenta el stop; si sigue abierta al final, se valora al último cierre.
export function simulate(plan,velas){
  const {entry,stop,target}=plan,risk=entry-stop;let fill=null,dEnt=null;
  for(let i=0;i<velas.length;i++){
    const [o,h,l,c]=velas[i];
    if(fill===null){
      if(h<entry)continue;
      fill=o>entry?o:entry;dEnt=i;
      if(l<=stop)return {estado:'stop',fill,exit:stop,dEnt,dSal:i,r:(stop-fill)/risk};
      if(c>=target&&o>=target)return {estado:'objetivo',fill,exit:o,dEnt,dSal:i,r:(o-fill)/risk};
      if(h>=target)return {estado:'objetivo',fill,exit:target,dEnt,dSal:i,r:(target-fill)/risk};
      continue;
    }
    if(l<=stop){const x=o<stop?o:stop;return {estado:'stop',fill,exit:x,dEnt,dSal:i,r:(x-fill)/risk}}
    if(h>=target){const x=o>target?o:target;return {estado:'objetivo',fill,exit:x,dEnt,dSal:i,r:(x-fill)/risk}}
  }
  if(fill===null)return {estado:'sin entrada',r:0};
  const x=velas[velas.length-1][3];
  return {estado:'abierta',fill,exit:x,dEnt,dSal:velas.length-1,r:(x-fill)/risk};
}
const fR=r=>(r>0?'+':r<0?'−':'')+fmt(Math.abs(r),1)+'R';
const simLast=()=>SEMANA.data[SEMANA.data.length-1][3];
const fechaES=iso=>iso.split('-').reverse().join('/');
function simStart(){
  const c=simLast(),st=SEMANA.step,sn=v=>Math.round(Math.round(v/st)*st*100)/100;
  return {entry:sn(c*1.03),stop:sn(c*0.95),target:sn(c*1.12)};
}
export function simValid(p){return p.stop<p.entry&&p.entry<p.target&&p.entry>simLast()}
function simInfoHTML(){
  const p=ses.simDraft,m=SEMANA.moneda;
  if(!(p.stop<p.entry&&p.entry<p.target))return `<p class="warn">${t.simOrden}</p>`;
  if(p.entry<=simLast())return `<p class="warn">${t.simRuptura(fmt(simLast())+' '+m)}</p>`;
  const risk=p.entry-p.stop;
  return `<dl class="simk"><div><dt>${t.riesgoAccion}</dt><dd>${fmt(risk)} ${m} · ${fmt(risk/p.entry*100,1)} %</dd></div><div><dt>${t.benefRiesgo}</dt><dd>${fmt((p.target-p.entry)/risk,1)}R</dd></div></dl>`;
}
export function simInfo(){
  const box=$app.querySelector('#simInfo');if(box)box.innerHTML=simInfoHTML();
  const b=$app.querySelector('[data-act=simsave]');if(b)b.disabled=!simValid(ses.simDraft);
}
export const simHist=()=>Object.keys(S.sim).sort().filter(k=>S.sim[k].res).map(k=>Object.assign({semana:k},S.sim[k].res));
function simHistHTML(full){
  const hs=simHist(),con=hs.filter(x=>x.estado!=='sin entrada');
  if(hs.length<2)return '';
  const tot=con.reduce((a,x)=>a+x.r,0),pos=con.filter(x=>x.r>0).length,cls=tot>0?'up':tot<0?'dn':'';
  let h=`<p class="simhist">${t.historial(hs.length,con.length,pos,`<b class="${cls}">${fR(tot)}</b>`)}</p>`;
  if(full)h+=`<ul class="histl">${hs.slice().reverse().map(x=>`<li><span>${esc(t.semanaN(...x.semana.split('-W')))} · ${esc(x.nombre)}</span><b class="${x.r>0?'up':x.r<0?'dn':''}">${x.estado==='sin entrada'?t.sinEntrada:fR(x.r)}</b></li>`).join('')}</ul>`;
  return h;
}
export function simCardHTML(){
  const mio=S.sim[SEMANA.semana];
  let h=`<section class="sim" aria-label="${t.simTitulo}"><b>${t.simTitulo}</b>`;
  if(mio){const r=simulate(mio.plan,SEMANA.despues);h+=`<div class="simrow"><span>${t.simHecha(esc(SEMANA.nombre))}<b class="${r.r>0?'up':r.r<0?'dn':''}">${r.estado==='sin entrada'?t.sinEntrada:fR(r.r)}</b></span><button class="btn ghost" data-act="sim">${t.verResultado}</button></div>`}
  else h+=`<div class="simrow"><span>${t.practica(esc(SEMANA.nombre),esc(SEMANA.ticker),fechaES(SEMANA.hasta))}</span><button class="btn line" data-act="sim">${t.empezar}</button></div>`;
  return h+simHistHTML(false)+'</section>';
}
export function simHTML(){
  const W=SEMANA;
  if(S.sim[W.semana])return simResHTML();
  if(!ses.simDraft)ses.simDraft=simStart();
  const sp={type:'candles',data:W.data,vol:W.vol,h:300,alt:t.simAlt(W.nombre)};
  return `<div class="lesson sim-view"><div class="lbar"><button class="x" data-act="home" aria-label="${t.volverInicio}">${icoX}</button><p class="kind">${t.simTitulo}</p></div>
  <div class="qwrap"><h1 class="q">${esc(W.nombre)} (${esc(W.ticker)})</h1>
  <p class="intro">${t.simIntro(esc(W.nombre),esc(W.ticker),fechaES(W.hasta),W.despues.length)}</p>
  <figure class="chart">${candlesSVG(sp,{mode:'plan',vals:ses.simDraft,checked:false,place:SIM_PLACE})}</figure>${fineHTML(SIM_PLACE)}
  <div id="simInfo" class="siminfo" aria-live="polite">${simInfoHTML()}</div>
  <p class="src">${t.simFuente(esc(W.fuente),fechaES(W.hasta),fmt(simLast())+' '+W.moneda)}</p></div>
  <div><button class="btn primary" data-act="simsave"${simValid(ses.simDraft)?'':' disabled'}>${t.comprobar}</button></div></div>`;
}
export function simResHTML(){
  const P=SEMANA,plan=S.sim[P.semana].plan,r=simulate(plan,P.despues),m=P.moneda;
  const dia=i=>t.sesionN(i+1),pr=v=>fmt(v)+' '+m;
  const txt=r.estado==='sin entrada'?t.resSinEntrada(pr(plan.entry))
    :r.estado==='stop'?t.resStop(pr(r.fill),dia(r.dEnt),dia(r.dSal),pr(r.exit))
    :r.estado==='objetivo'?t.resObjetivo(pr(r.fill),dia(r.dEnt),dia(r.dSal),pr(r.exit))
    :t.resAbierta(pr(r.fill),dia(r.dEnt),pr(r.exit));
  const sp={type:'candles',data:P.data.concat(P.despues),h:300,split:P.data.length,alt:t.simResAlt(P.nombre)};
  return `<div class="lesson sim-view"><div class="lbar"><button class="x" data-act="home" aria-label="${t.volverInicio}">${icoX}</button><p class="kind">${t.simResTitulo}</p></div>
  <div class="qwrap"><h1 class="q">${esc(P.nombre)} (${esc(P.ticker)}): <span class="${r.r>0?'up':r.r<0?'dn':''}">${r.estado==='sin entrada'?t.sinEntrada:fR(r.r)}</span></h1>
  <figure class="chart">${candlesSVG(sp,{mode:'plan',vals:plan,fijo:true,place:SIM_PLACE})}</figure>
  <p class="intro">${txt}</p>
  <p class="src">${t.resNota(P.despues.length,fechaES(P.hasta),esc(P.fuente))}</p>${simHistHTML(true)}</div>
  <div><button class="btn primary" data-act="home">${t.continuar}</button></div></div>`;
}
