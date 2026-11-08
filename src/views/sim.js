// Operación de la semana: plan de compra en ruptura sobre velas reales (semana.json) y resultado la semana siguiente.
import {fmt,esc,today} from '../util.js';
import {icoX} from '../icons.js';
import {candlesSVG} from '../charts.js';
import {SEMANA} from '../content.js';
import {S,save} from '../state.js';
import {$app,ses} from '../ui.js';
import {fineHTML} from '../drag.js';

export const SIM_PLACE=[{id:'entry',label:'Entrada'},{id:'stop',label:'Stop'},{id:'target',label:'Objetivo'}];
// Guarda el plan en edición para la semana actual.
export function simSave(){S.sim[SEMANA.semana]={ticker:SEMANA.ticker,plan:Object.assign({},ses.simDraft),fecha:today()};save()}
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
  if(!(p.stop<p.entry&&p.entry<p.target))return '<p class="warn">Coloca el stop por debajo de la entrada y el objetivo por encima.</p>';
  if(p.entry<=simLast())return `<p class="warn">La entrada es una compra en ruptura: ponla por encima del último cierre (${fmt(simLast())} ${m}).</p>`;
  const risk=p.entry-p.stop;
  return `<dl class="simk"><div><dt>Riesgo por acción</dt><dd>${fmt(risk)} ${m} · ${fmt(risk/p.entry*100,1)} %</dd></div><div><dt>Beneficio/riesgo</dt><dd>${fmt((p.target-p.entry)/risk,1)}R</dd></div></dl>`;
}
export function simInfo(){
  const box=$app.querySelector('#simInfo');if(box)box.innerHTML=simInfoHTML();
  const b=$app.querySelector('[data-act=simsave]');if(b)b.disabled=!simValid(ses.simDraft);
}
// Guarda el resultado de la semana anterior en su plan: semana.json solo trae una semana pasada,
// así que el historial (R acumulado) se construye en el dispositivo semana a semana.
export function simRecord(){
  const P=SEMANA&&SEMANA.prev,g=P&&S.sim[P.semana];
  if(!g||g.ticker!==P.ticker||!P.despues||!P.despues.length)return;
  const r=simulate(g.plan,P.despues),res={estado:r.estado,r:Math.round(r.r*100)/100,nombre:P.nombre,sesiones:P.despues.length};
  if(!g.res||g.res.r!==res.r||g.res.estado!==res.estado||g.res.sesiones!==res.sesiones){g.res=res;save()}
}
export const simHist=()=>Object.keys(S.sim).sort().filter(k=>S.sim[k].res).map(k=>Object.assign({semana:k},S.sim[k].res));
function simHistHTML(full){
  const hs=simHist(),con=hs.filter(x=>x.estado!=='sin entrada');
  if(hs.length<2)return '';
  const tot=con.reduce((a,x)=>a+x.r,0),pos=con.filter(x=>x.r>0).length,cls=tot>0?'up':tot<0?'dn':'';
  let h=`<p class="simhist">Tu historial: ${hs.length} semanas, ${con.length} ${con.length===1?'operación':'operaciones'} con entrada, ${pos} en positivo. Total: <b class="${cls}">${fR(tot)}</b></p>`;
  if(full)h+=`<ul class="histl">${hs.slice().reverse().map(x=>`<li><span>${esc(x.semana.replace('-W',' · semana '))} · ${esc(x.nombre)}</span><b class="${x.r>0?'up':x.r<0?'dn':''}">${x.estado==='sin entrada'?'sin entrada':fR(x.r)}</b></li>`).join('')}</ul>`;
  return h;
}
export function simCardHTML(){
  const P=SEMANA.prev,mio=P&&S.sim[P.semana];
  let h='<section class="sim" aria-label="Operación de la semana"><b>Operación de la semana</b>';
  if(mio&&P.despues&&P.despues.length){const r=simulate(mio.plan,P.despues);h+=`<div class="simrow"><span>Semana pasada, ${esc(P.nombre)}: <b class="${r.r>0?'up':r.r<0?'dn':''}">${r.estado==='sin entrada'?'sin entrada':fR(r.r)}</b></span><button class="btn ghost" data-act="simres">Ver resultado</button></div>`}
  const guardado=S.sim[SEMANA.semana];
  h+=`<div class="simrow"><span>${guardado?`Tu plan para ${esc(SEMANA.nombre)} está guardado. El resultado, el próximo sábado.`:`Monta tu operación sobre el gráfico real de ${esc(SEMANA.nombre)} (${esc(SEMANA.ticker)}).`}</span><button class="btn ${guardado?'ghost':'primary'}" data-act="sim">${guardado?'Ver o cambiar':'Empezar'}</button></div>`;
  return h+simHistHTML(false)+'</section>';
}
export function simHTML(){
  const W=SEMANA,g=S.sim[W.semana];
  if(!ses.simDraft)ses.simDraft=g?Object.assign({},g.plan):simStart();
  const sp={type:'candles',data:W.data,vol:W.vol,h:300,alt:`Gráfico diario de ${W.nombre} con las líneas de tu plan`};
  return `<div class="lesson sim-view"><div class="lbar"><button class="x" data-act="home" aria-label="Volver al inicio">${icoX}</button><p class="kind">Operación de la semana</p></div>
  <div class="qwrap"><h1 class="q">${esc(W.nombre)} (${esc(W.ticker)})</h1>
  <p class="intro">Plan de compra en ruptura: coloca la entrada por encima del último cierre, el stop y el objetivo. El sábado que viene verás qué habría pasado con las velas reales.</p>
  <figure class="chart">${candlesSVG(sp,{mode:'plan',vals:ses.simDraft,checked:false,place:SIM_PLACE})}</figure>${fineHTML(SIM_PLACE)}
  <div id="simInfo" class="siminfo" aria-live="polite">${simInfoHTML()}</div>
  <p class="src">Velas diarias de ${esc(W.fuente)} hasta el ${fechaES(W.hasta)}. Último cierre: ${fmt(simLast())} ${W.moneda}. Es formación, no una recomendación.</p></div>
  <div><button class="btn primary" data-act="simsave"${simValid(ses.simDraft)?'':' disabled'}>${g?'Guardar cambios':'Guardar mi plan'}</button></div></div>`;
}
export function simResHTML(){
  const P=SEMANA.prev,plan=S.sim[P.semana].plan,r=simulate(plan,P.despues),m=P.moneda;
  const dia=i=>`la sesión ${i+1}`;
  const txt=r.estado==='sin entrada'?`El precio no llegó a tu entrada de ${fmt(plan.entry)} ${m}: la orden no se ejecutó. Ni ganas ni pierdes.`
    :r.estado==='stop'?`Entraste a ${fmt(r.fill)} ${m} en ${dia(r.dEnt)} y saltó el stop en ${dia(r.dSal)}, a ${fmt(r.exit)} ${m}.`
    :r.estado==='objetivo'?`Entraste a ${fmt(r.fill)} ${m} en ${dia(r.dEnt)} y alcanzaste el objetivo en ${dia(r.dSal)}, a ${fmt(r.exit)} ${m}.`
    :`Entraste a ${fmt(r.fill)} ${m} en ${dia(r.dEnt)} y al último cierre (${fmt(r.exit)} ${m}) la operación seguía abierta.`;
  const sp={type:'candles',data:P.data.concat(P.despues),h:300,split:P.data.length,alt:`Gráfico diario de ${P.nombre} con tu plan y las sesiones posteriores`};
  return `<div class="lesson sim-view"><div class="lbar"><button class="x" data-act="home" aria-label="Volver al inicio">${icoX}</button><p class="kind">Resultado de la semana pasada</p></div>
  <div class="qwrap"><h1 class="q">${esc(P.nombre)} (${esc(P.ticker)}): <span class="${r.r>0?'up':r.r<0?'dn':''}">${r.estado==='sin entrada'?'sin entrada':fR(r.r)}</span></h1>
  <figure class="chart">${candlesSVG(sp,{mode:'plan',vals:plan,fijo:true,place:SIM_PLACE})}</figure>
  <p class="intro">${txt}</p>
  <p class="src">${P.despues.length} sesiones reales después del ${fechaES(P.hasta)}. Si un día tocaba stop y objetivo, se cuenta el stop; con hueco, se ejecuta a la apertura.</p>${simHistHTML(true)}</div>
  <div><button class="btn primary" data-act="home">Continuar</button></div></div>`;
}
