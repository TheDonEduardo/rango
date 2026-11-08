// Estado, vistas, lógica de lección y eventos.
import {KEY,GOAL,RH,OFFS,fmt,esc,today,yest,addDays,shuffle,parseNum,planTol,planStep} from './util.js';
import {P,ico,icoX,icoOk,LOGO} from './icons.js';
import {candlesSVG,lineSVG,glyph} from './charts.js';
import {UNITS,FLAT,CASOS,SEMANA,TRACKS,EXBYID,PLACEMENT,trackOf,exCount} from './content.js';

const DEF=()=>({xp:0,streak:0,last:null,day:null,dayXp:0,done:{},all:false,track:'basico',skipBasics:false,legal:0,srs:{},sim:{},calc:null});
// Sube LEGAL_V si cambia el texto del aviso: se vuelve a pedir la aceptación.
const LEGAL_V=1;
// Repaso espaciado: días hasta la siguiente aparición tras cada acierto. Tras el último, sale de la lista.
const SRS_STEPS=[1,3,7,14];
const SRS_MAX=10;
const SRS_L={id:'srs',title:'Repaso del día',kind:'srs'};
// Test de nivel: con TEST_PASS aciertos o más se abren las demás rutas; cada unidad con sus dos preguntas
// acertadas queda marcada como completada.
const TEST_L={id:'test',title:'Test de nivel',kind:'test'};
const TEST_PASS=10;
// Operación de la semana (simulador con velas reales de semana.json).
const SIM_PLACE=[{id:'entry',label:'Entrada'},{id:'stop',label:'Stop'},{id:'target',label:'Objetivo'}];
let simDraft=null;
function load(){
  try{const j=JSON.parse(localStorage.getItem(KEY));if(j&&typeof j==='object')return Object.assign(DEF(),j)}catch(e){}
  return DEF();
}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
let installEvt=null;
let S=load(), view='home', run=null, lastRes=null, homeY=0, goCur=false, resetArm=false, toastT=0;
const $app=document.getElementById('app'), $toast=document.getElementById('toast');
const streakNow=()=>(S.last===today()||S.last===yest())?S.streak:0;
const dayXpNow=()=>S.day===today()?S.dayXp:0;

// Las rutas técnica y fundamental se abren al completar los básicos, al saltarlos o si ya hay progreso en ellas.
function advancedOpen(){
  if(S.all||S.skipBasics)return true;
  // Las unidades básicas con gate:false (complementarias) no cuentan para abrir las otras rutas.
  const basic=FLAT.filter(l=>trackOf(l.unit)==='basico'&&l.unit.gate!==false);
  if(basic.every(l=>S.done[l.id]))return true;
  return FLAT.some(l=>trackOf(l.unit)!=='basico'&&S.done[l.id]);
}
// Estado de cada lección por id. Cada ruta tiene su propia lección actual.
function statuses(){
  const st={},cur={},adv=advancedOpen();
  FLAT.forEach(l=>{
    const t=trackOf(l.unit);
    if(S.done[l.id])st[l.id]='done';
    else if(!cur[t]){cur[t]=1;st[l.id]=(t==='basico'||adv)?'current':'locked'}
    else st[l.id]=S.all?'open':'locked';
  });
  return st;
}
function srsDue(){
  const t=today();
  return Object.keys(S.srs).filter(u=>S.srs[u].due<=t&&EXBYID.has(u)).map(u=>EXBYID.get(u));
}
function srsRecord(ex,ok){
  if(!ex.uid)return;
  if(!ok){S.srs[ex.uid]={step:0,due:addDays(SRS_STEPS[0])};return}
  const r=S.srs[ex.uid];
  if(!r||run.L.kind!=='srs')return;
  const st=r.step+1;
  if(st>=SRS_STEPS.length)delete S.srs[ex.uid];
  else S.srs[ex.uid]={step:st,due:addDays(SRS_STEPS[st])};
}
function toast(msg){
  $toast.textContent=msg;$toast.hidden=false;clearTimeout(toastT);
  toastT=setTimeout(()=>{$toast.hidden=true},2400);
}


function fineHTML(place){
  return `<div class="pfine">${place.map(p=>`<div class="pf pl-${p.id}"><span>${esc(p.label)}</span><button data-act="pstep" data-id="${p.id}" data-d="-1" aria-label="Bajar ${esc(p.label)}">−</button><button data-act="pstep" data-id="${p.id}" data-d="1" aria-label="Subir ${esc(p.label)}">+</button></div>`).join('')}</div>`;
}
function chartHTML(ex){
  const sp=ex.chart;if(!sp)return'';
  let st=null;
  if(ex.t==='tap'||ex.t==='level')st={mode:ex.t,sel:run.sel,checked:run.checked,a:ex.a};
  if(ex.t==='plan'){if(!run.sel)run.sel=Object.fromEntries(ex.place.map(p=>[p.id,p.start]));st={mode:'plan',vals:run.sel,checked:run.checked,place:ex.place}}
  const fine=ex.t==='plan'&&!run.checked?fineHTML(ex.place):'';
  return `<figure class="chart">${sp.type==='line'?lineSVG(sp):candlesSVG(sp,st)}</figure>${fine}`;
}
// Texto de ejercicio: escapa y une cada número con su unidad (26,00 €, 12 %, 3R…) para que no se separen al saltar de línea.
const tx=s=>esc(s).replace(/(\d) (?=(?:M?[€$]|%|R\b|veces\b))/g,'$1\u00a0');
// Tabla de datos (resultados trimestrales, márgenes…): {cols:[...], rows:[[...]], note?}
function tableHTML(ex){
  const tb=ex.table;if(!tb)return'';
  let h='<figure class="chart tbl"><table><thead><tr>'+tb.cols.map(c=>`<th scope="col">${esc(c)}</th>`).join('')+'</tr></thead><tbody>';
  tb.rows.forEach(r=>{h+='<tr>'+r.map((c,i)=>i===0?`<th scope="row">${tx(c)}</th>`:`<td>${tx(c)}</td>`).join('')+'</tr>'});
  h+='</tbody></table>';
  if(tb.note)h+=`<figcaption>${esc(tb.note)}</figcaption>`;
  return h+'</figure>';
}

function homeHTML(){
  const st=statuses(),sk=streakNow(),dx=dayXpNow();
  let h=`<header class="top"><h1 class="brand">${LOGO}<span>Rango</span></h1><div class="stats"><span class="chip fire" aria-label="Racha de ${sk} ${sk===1?'día':'días'}">${ico('flame')}<b>${sk}</b></span><span class="chip xp" aria-label="${S.xp} XP en total">${ico('bolt')}<b>${S.xp}</b></span></div></header><div class="home">`;
  h+=`<section class="goal" aria-label="Meta diaria"><div class="goal-h"><span>Meta de hoy</span><span>${Math.min(dx,GOAL)} / ${GOAL} XP</span></div><div class="bar" role="progressbar" aria-label="Meta de hoy" aria-valuemin="0" aria-valuemax="${GOAL}" aria-valuenow="${Math.min(dx,GOAL)}"><i style="width:${Math.min(100,dx/GOAL*100)}%"></i></div></section>`;
  h+=`<nav class="tracks" aria-label="Ruta">${TRACKS.map(t=>`<button data-act="track" data-track="${t.id}" aria-pressed="${S.track===t.id}">${t.title}</button>`).join('')}</nav>`;
  const TF=FLAT.filter(l=>trackOf(l.unit)===S.track);
  if(S.track!=='basico'&&!advancedOpen())h+=`<section class="gate"><p>Esta ruta se abre al completar la ruta <b>Básico</b>.</p><div class="row"><button class="btn line" data-act="track" data-track="basico">Ir a los básicos</button><button class="btn ghost" data-act="skipbasics">Ya opero: saltar los básicos</button></div></section>`;
  if(S.track==='basico'&&!S.placement&&!Object.keys(S.done).length)h+=`<section class="test" aria-label="Test de nivel"><div><b>¿Ya sabes de bolsa?</b><span>Haz el test de nivel: ${PLACEMENT.length} preguntas, unos 5 minutos. Marcaremos lo que ya dominas y, si aciertas casi todo, se abren las demás rutas.</span></div><div class="row"><button class="btn primary" data-act="test">Hacer el test</button><button class="btn ghost" data-act="notest">Empezar desde cero</button></div></section>`;
  if(S.track==='tecnico'&&SEMANA&&advancedOpen())h+=simCardHTML();
  if(S.track==='pasiva'&&advancedOpen())h+=`<section class="sim" aria-label="Simulador de aportaciones"><b>Simulador de aportaciones</b><div class="simrow"><span>Mira cómo crece una cartera aportando cada mes, y cuánto se llevan las comisiones.</span><button class="btn primary" data-act="calc">Abrir</button></div></section>`;
  const due=srsDue().length;
  if(due)h+=`<section class="srs" aria-label="Repaso del día"><div><b>Repaso del día</b><span>${due} ${due===1?'ejercicio que fallaste':'ejercicios que fallaste'}</span></div><button class="btn primary" data-act="srs">Repasar</button></section>`;
  UNITS.filter(u=>trackOf(u)===S.track).forEach(u=>{
    if(!u.lessons){
      h+=`<section class="unit soon"><div class="ban"><div><div class="u">Unidad ${u.n}</div><h2>${u.title}</h2><p>${u.blurb}</p></div><span class="cnt">Próximamente</span></div></section>`;
      return;
    }
    const items=FLAT.filter(l=>l.unit===u),doneN=items.filter(l=>S.done[l.id]).length;
    h+=`<section class="unit" aria-label="Unidad ${u.n}: ${u.title}"><div class="ban"><div><div class="u">Unidad ${u.n}</div><h2>${u.title}</h2><p>${u.blurb}</p></div><span class="cnt">${doneN} / ${items.length}</span></div>`;
    h+=`<div class="path" style="--n:${items.length}"><svg class="route" viewBox="0 0 100 ${items.length*RH}" preserveAspectRatio="none" aria-hidden="true">`;
    for(let k=0;k<items.length-1;k++){
      const gi=TF.indexOf(items[k]),x1=50+OFFS[gi%OFFS.length],x2=50+OFFS[(gi+1)%OFFS.length];
      const y1=k*RH+44,y2=(k+1)*RH+44,ym=(y1+y2)/2;
      h+=`<path class="${st[items[k].id]==='done'?'done':''}" d="M${x1} ${y1} C${x1} ${ym} ${x2} ${ym} ${x2} ${y2}"/>`;
    }
    h+='</svg>';
    items.forEach((l,k)=>{
      const gi=TF.indexOf(l),s=st[l.id],rec=S.done[l.id],off=OFFS[gi%OFFS.length];
      const sub=s==='done'?`Precisión ${Math.round(rec.acc*100)} %`:s==='locked'?'Bloqueada':`${exCount(l)} ejercicios`;
      const stx=s==='done'?'completada':s==='locked'?'bloqueada':'disponible';
      h+=`<button class="node ${s}" style="--i:${k};--off:${off}" data-act="open" data-id="${l.id}" aria-label="${esc(l.title)}, ${stx}"${s==='locked'?' aria-disabled="true"':''}><span class="g">${glyph(s,rec?rec.acc:null)}</span><span class="nt">${esc(l.title)}</span><span class="ns">${sub}</span></button>`;
    });
    h+='</div></section>';
  });
  if(S.track==='fundamental'&&CASOS)h+=`<p class="src">Casos reales con datos de ${esc(CASOS.fuente)} a ${esc(CASOS.fecha)}. Es formación, no una recomendación de inversión.</p>`;
  h+=`</div><footer class="foot-home"><p>Prototipo. El progreso se guarda solo en este navegador. <button class="link" data-act="legal">Aviso legal</button></p>${installHTML()}<div class="row"><button class="btn ghost" data-act="unlock">${S.all?'Volver a bloquear':'Desbloquear todo'}</button><button class="btn ghost" data-act="reset">${resetArm?'Pulsa de nuevo para borrar':'Reiniciar progreso'}</button></div></footer>`;
  return h;
}

const KIND={choice:'Elige una respuesta',num:'Escribe el resultado',tap:'Toca una vela del gráfico',level:'Toca una línea del gráfico',order:'Ordena los pasos',match:'Empareja cada uno con su descripción',plan:'Arrastra las líneas del gráfico'};
function answerText(ex){
  if(ex.t==='choice')return ex.opts[ex.a];
  if(ex.t==='num')return fmt(ex.a,Number.isInteger(ex.a)?0:2)+(ex.unit?' '+ex.unit:'');
  if(ex.t==='tap')return 'Vela '+(ex.a+1);
  if(ex.t==='order')return ex.items.map((t,i)=>(i+1)+'. '+t).join('  ');
  if(ex.t==='match')return ex.pairs.map(p=>p[0]+': '+p[1]).join('  ');
  if(ex.t==='plan')return ex.place.map(p=>p.label+' '+fmt(p.a)).join(' · ');
  return 'Nivel '+ex.a;
}
function lessonHTML(){
  const ex=run.queue[0],pct=Math.round(run.done/run.total*100);
  let hearts='';for(let i=0;i<3;i++)hearts+=`<svg class="heart ${i<run.lives?'on':'off'}" viewBox="0 0 24 24" aria-hidden="true"><path d="${P.heart}" fill="currentColor"/></svg>`;
  let h=`<div class="lesson"><div class="lbar"><button class="x" data-act="quit" aria-label="Salir de la lección">${icoX}</button><div class="prog" role="progressbar" aria-label="Progreso de la lección" aria-valuemin="0" aria-valuemax="${run.total}" aria-valuenow="${run.done}"><i style="width:${pct}%"></i></div>${run.L.kind==='test'?'':`<div class="lives" role="img" aria-label="${run.lives} vidas">${hearts}</div>`}</div>`;
  h+=`<div class="qwrap"><p class="kind">${ex.caso?`Caso real: ${esc(ex.caso)} · `:''}${KIND[ex.t]}</p><h1 class="q">${tx(ex.q)}</h1>${chartHTML(ex)}${tableHTML(ex)}`;
  if(ex.t==='choice'){
    h+='<div class="opts">';
    ex.opts.forEach((o,i)=>{
      let c='';
      if(run.checked){if(i===ex.a)c='good';else if(i===run.sel)c='bad'}else if(i===run.sel)c='sel';
      h+=`<button class="opt ${c}" data-act="pick" data-i="${i}"${run.checked?' disabled':''}>${tx(o)}</button>`;
    });
    h+='</div>';
  }
  if(ex.t==='order'||ex.t==='match')h+=`<div class="ord${ex.t==='match'?' match':''}">${ordHTML(ex)}</div>`;
  if(ex.t==='num'){
    const c=run.checked?(run.ok?'good':'bad'):'';
    h+=`<div class="numrow"><input id="numIn" class="num ${c}" type="text" inputmode="decimal" autocomplete="off" aria-label="Tu respuesta" value="${esc(run.val)}"${run.checked?' disabled':''}>${ex.unit?`<span class="suffix">${ex.unit}</span>`:''}</div>`;
  }
  h+='</div>';
  const can=canCheck(ex);
  if(!run.checked){
    h+=`<div><button class="btn primary" data-act="check"${can?'':' disabled'}>Comprobar</button></div>`;
  }else{
    h+=`<div class="fb ${run.ok?'good':'bad'}" role="status"><div class="fb-h">${run.ok?icoOk:icoX}<span>${run.ok?'Correcto':'Incorrecto'}</span></div><p>${tx(ex.why)}</p>${run.ok?'':ex.t==='order'?`<div class="ans">Orden correcto:<ol>${ex.items.map(t=>`<li>${tx(t)}</li>`).join('')}</ol></div>`:ex.t==='match'?`<div class="ans">Parejas correctas:<ul>${ex.pairs.map(p=>`<li>${tx(p[0])}: ${tx(p[1])}</li>`).join('')}</ul></div>`:`<p class="ans">Respuesta: ${tx(answerText(ex))}</p>`}<button class="btn primary" data-act="next">Continuar</button></div>`;
  }
  return h+'</div>';
}
// Ordenar (order) y emparejar (match) comparten mecánica: el usuario toca elementos de la lista y llenan
// el primer hueco libre; run.sel[k] = índice del elemento en el hueco k, o null si está vacío. Quitar uno
// deja su hueco libre sin mover los demás (en match, cada hueco es de un término).
const ordItems=ex=>ex.t==='match'?ex.pairs.map(p=>p[1]):ex.items;
function ordHTML(ex){
  const items=ordItems(ex),labels=ex.t==='match'?ex.pairs.map(p=>p[0]):null,n=items.length,sel=run.sel||Array(n).fill(null);
  const next=sel.indexOf(null);
  if(!run.perm.has(ex)){let p;do{p=shuffle(items.map((_,i)=>i))}while(p.every((v,i)=>v===i));run.perm.set(ex,p)}
  let h=`<ol class="ord-ans" aria-label="${labels?'Tus parejas':'Tu orden'}">`;
  for(let k=0;k<n;k++){
    const mark=labels?`<span class="mt">${tx(labels[k])}</span>`:`<span class="n">${k+1}</span>`;
    if(sel[k]!=null){
      const c=run.checked?(sel[k]===k?'good':'bad'):'filled';
      h+=`<li>${labels?mark:''}<button class="opt ${c}" data-act="ounpick" data-k="${k}"${run.checked?' disabled':` aria-label="Quitar: ${esc(items[sel[k]])}"`}>${labels?'':mark}${tx(items[sel[k]])}</button></li>`;
    }else h+=`<li>${labels?mark:''}<div class="slot${k===next?' next':''}" aria-hidden="true">${labels?(k===next?'Toca su descripción':''):mark}</div></li>`;
  }
  h+='</ol>';
  if(!run.checked){
    const rest=run.perm.get(ex).filter(i=>!sel.includes(i));
    if(rest.length)h+='<div class="opts ord-pool">'+rest.map(i=>`<button class="opt" data-act="opick" data-i="${i}">${tx(items[i])}</button>`).join('')+'</div>';
  }
  return h;
}
function canCheck(ex){
  if(ex.t==='num')return run.val.trim()!=='';
  if(ex.t==='order'||ex.t==='match')return !!run.sel&&run.sel.length===ordItems(ex).length&&run.sel.every(v=>v!=null);
  if(ex.t==='plan')return true;
  return run.sel!==null;
}
function updateOrd(){
  const ex=run.queue[0];
  $app.querySelector('.ord').innerHTML=ordHTML(ex);
  const c=$app.querySelector('[data-act=check]');if(c)c.disabled=!canCheck(ex);
  const f=$app.querySelector('.ord-pool .opt')||c;if(f&&f.focus)f.focus({preventScroll:true});
}
// Instalar como app: botón cuando el navegador lo ofrece (Android, Chrome); en iPhone/iPad, indicación manual.
function installHTML(){
  if(installEvt)return '<button class="btn line install" data-act="install">Instalar Rango en este dispositivo</button>';
  const nav=typeof navigator!=='undefined'?navigator:null;
  if(nav&&/iP(hone|ad|od)/.test(nav.userAgent||'')&&!nav.standalone)return '<p>Para instalar Rango en tu iPhone: botón Compartir y «Añadir a pantalla de inicio».</p>';
  return '';
}
// ---------- Operación de la semana ----------
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
function simValid(p){return p.stop<p.entry&&p.entry<p.target&&p.entry>simLast()}
function simInfoHTML(){
  const p=simDraft,m=SEMANA.moneda;
  if(!(p.stop<p.entry&&p.entry<p.target))return '<p class="warn">Coloca el stop por debajo de la entrada y el objetivo por encima.</p>';
  if(p.entry<=simLast())return `<p class="warn">La entrada es una compra en ruptura: ponla por encima del último cierre (${fmt(simLast())} ${m}).</p>`;
  const risk=p.entry-p.stop;
  return `<dl class="simk"><div><dt>Riesgo por acción</dt><dd>${fmt(risk)} ${m} · ${fmt(risk/p.entry*100,1)} %</dd></div><div><dt>Beneficio/riesgo</dt><dd>${fmt((p.target-p.entry)/risk,1)}R</dd></div></dl>`;
}
function simInfo(){
  const box=$app.querySelector('#simInfo');if(box)box.innerHTML=simInfoHTML();
  const b=$app.querySelector('[data-act=simsave]');if(b)b.disabled=!simValid(simDraft);
}
function simCardHTML(){
  const P=SEMANA.prev,mio=P&&S.sim[P.semana];
  let h='<section class="sim" aria-label="Operación de la semana"><b>Operación de la semana</b>';
  if(mio&&P.despues&&P.despues.length){const r=simulate(mio.plan,P.despues);h+=`<div class="simrow"><span>Semana pasada, ${esc(P.nombre)}: <b class="${r.r>0?'up':r.r<0?'dn':''}">${r.estado==='sin entrada'?'sin entrada':fR(r.r)}</b></span><button class="btn ghost" data-act="simres">Ver resultado</button></div>`}
  const guardado=S.sim[SEMANA.semana];
  h+=`<div class="simrow"><span>${guardado?`Tu plan para ${esc(SEMANA.nombre)} está guardado. El resultado, el próximo sábado.`:`Monta tu operación sobre el gráfico real de ${esc(SEMANA.nombre)} (${esc(SEMANA.ticker)}).`}</span><button class="btn ${guardado?'ghost':'primary'}" data-act="sim">${guardado?'Ver o cambiar':'Empezar'}</button></div>`;
  return h+'</section>';
}
function simHTML(){
  const W=SEMANA,g=S.sim[W.semana];
  if(!simDraft)simDraft=g?Object.assign({},g.plan):simStart();
  const sp={type:'candles',data:W.data,vol:W.vol,h:300,alt:`Gráfico diario de ${W.nombre} con las líneas de tu plan`};
  return `<div class="lesson sim-view"><div class="lbar"><button class="x" data-act="home" aria-label="Volver al inicio">${icoX}</button><p class="kind">Operación de la semana</p></div>
  <div class="qwrap"><h1 class="q">${esc(W.nombre)} (${esc(W.ticker)})</h1>
  <p class="intro">Plan de compra en ruptura: coloca la entrada por encima del último cierre, el stop y el objetivo. El sábado que viene verás qué habría pasado con las velas reales.</p>
  <figure class="chart">${candlesSVG(sp,{mode:'plan',vals:simDraft,checked:false,place:SIM_PLACE})}</figure>${fineHTML(SIM_PLACE)}
  <div id="simInfo" class="siminfo" aria-live="polite">${simInfoHTML()}</div>
  <p class="src">Velas diarias de ${esc(W.fuente)} hasta el ${fechaES(W.hasta)}. Último cierre: ${fmt(simLast())} ${W.moneda}. Es formación, no una recomendación.</p></div>
  <div><button class="btn primary" data-act="simsave"${simValid(simDraft)?'':' disabled'}>${g?'Guardar cambios':'Guardar mi plan'}</button></div></div>`;
}
function simResHTML(){
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
  <p class="src">${P.despues.length} sesiones reales después del ${fechaES(P.hasta)}. Si un día tocaba stop y objetivo, se cuenta el stop; con hueco, se ejecuta a la apertura.</p></div>
  <div><button class="btn primary" data-act="home">Continuar</button></div></div>`;
}
// ---------- Simulador de aportaciones (ruta Pasiva) ----------
// Cálculo mensual: rentabilidad neta = rentabilidad − comisión; la aportación se hace a final de cada mes.
export function aportaciones({inicial,mensual,anos,rent,ter}){
  const r=Math.pow(1+(rent-ter)/100,1/12)-1,rb=Math.pow(1+rent/100,1/12)-1;
  let v=inicial,vb=inicial;const serie=[{a:inicial,v:inicial}];
  for(let m=1;m<=anos*12;m++){v=v*(1+r)+mensual;vb=vb*(1+rb)+mensual;if(m%12===0)serie.push({a:inicial+mensual*m,v})}
  return {aportado:inicial+mensual*anos*12,final:v,sinComision:vb,serie};
}
const CALC_DEF={inicial:0,mensual:200,anos:20,rent:6,ter:0.2,cmp:false,ter2:1.8};
const CALC_CTRL=[
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
function calcOutHTML(){
  const p=S.calc,r=aportaciones(p),gan=r.final-r.aportado,com=r.sinComision-r.final;
  const r2=p.cmp?aportaciones(Object.assign({},p,{ter:p.ter2})):null;
  const dif=r2?r.final-r2.final:0;
  const cmp=r2?`<p class="cmpres">Con un ${fmt(p.ter2,2)} % de comisión tendrías <b>${fmt(r2.final,0)} €</b>: ${dif>=0?`${fmt(dif,0)} € menos`:`${fmt(-dif,0)} € más`} que con un ${fmt(p.ter,2)} %.</p>`:'';
  return `<dl class="simk calck"><div><dt>Valor final</dt><dd>${fmt(r.final,0)} €</dd></div><div><dt>Aportado</dt><dd>${fmt(r.aportado,0)} €</dd></div><div><dt>Rendimientos</dt><dd>${fmt(gan,0)} €</dd></div><div><dt>Se llevan las comisiones</dt><dd>${fmt(com,0)} €</dd></div></dl>${cmp}
  <figure class="chart">${calcChart(r,r2)}<figcaption class="leyenda"><span class="lv-v">Cartera con un ${fmt(p.ter,2)} %</span>${r2?`<span class="lv-b">Cartera con un ${fmt(p.ter2,2)} %</span>`:''}<span class="lv-a">Dinero aportado</span></figcaption></figure>`;
}
const ccHTML=([k,l,mi,ma,st,f])=>`<label class="cc" for="calc-${k}"><span>${l}</span><output id="out-${k}">${f(S.calc[k])}</output><input type="range" id="calc-${k}" data-calc="${k}" min="${mi}" max="${ma}" step="${st}" value="${S.calc[k]}"></label>`;
function calcHTML(){
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
function legalHTML(first){
  return `<div class="res legal"><div class="res-main"><h1>${first?'Antes de empezar':'Aviso legal'}</h1>
  <p>Rango es una herramienta de formación. Nada de lo que ves es asesoramiento financiero ni una recomendación de comprar o vender ningún valor.</p>
  <p>Los casos con empresas reales usan datos públicos de Yahoo Finance, con su fecha. Pueden contener errores o estar desactualizados, y que una empresa aparezca no implica ninguna opinión sobre ella.</p>
  <p>Invertir en bolsa conlleva riesgo de perder parte o todo el capital. Las rentabilidades pasadas no garantizan las futuras.</p>
  <p>La información fiscal es general y simplificada: las normas cambian y dependen de tu situación. Consulta con un profesional antes de decidir.</p>
  <p>Las decisiones de inversión son tuyas y bajo tu responsabilidad.</p></div>
  <div><button class="btn primary" data-act="${first?'legalok':'home'}">${first?'Entendido, empezar':'Volver'}</button></div></div>`;
}
function testResultHTML(r){
  const nota=r.abre?'Pasiva, Fundamental y Técnico quedan abiertas. Puedes volver a los básicos cuando quieras.'
    :r.dominadas.length?'Las unidades que dominas quedan marcadas como completadas: sigue por la primera pendiente de Básico.'
    :'Empieza por Básico: en pocas lecciones tendrás la base para el resto.';
  return `<div class="res"><div class="res-main"><div class="res-top">${glyph('done',r.score/r.total,84,108)}<div><h1>Test completado</h1><p>${r.score} de ${r.total} aciertos</p></div></div>
  ${r.dominadas.length?`<div class="note"><b>Ya dominas</b><ul class="dom">${r.dominadas.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></div>`:''}
  <p class="note">${nota}</p></div>
  <div><button class="btn primary" data-act="home">Continuar</button></div></div>`;
}
function resultHTML(){
  const r=lastRes,sk=streakNow();
  if(r.test)return testResultHTML(r);
  return `<div class="res"><div class="res-main"><div class="res-top">${glyph('done',r.acc,84,108)}<div><h1>${r.srs?'Repaso completado':'Lección completada'}</h1><p>${esc(r.title)}</p></div></div>
  <div class="metrics"><div><b>+${r.xp}</b><span>XP ganados</span></div><div><b>${Math.round(r.acc*100)} %</b><span>Precisión</span></div><div><b>${sk}</b><span>${sk===1?'día de racha':'días de racha'}</span></div></div>
  <p class="note">${r.srs?'Los que has acertado volverán dentro de unos días; los que has fallado, mañana.':`El cuerpo de tu vela es proporcional a tu precisión. ${r.acc===1?'Vela llena: sin un solo fallo.':'Repite la lección para llenarla.'}`}</p></div>
  <div><button class="btn primary" data-act="home">Continuar</button></div></div>`;
}
function failHTML(){
  return `<div class="res"><div class="res-main"><div class="res-top">${glyph('locked',null,84,108)}<div><h1>Sin vidas</h1><p>Has agotado los 3 fallos de esta lección.</p></div></div><p class="note">Repasa las explicaciones y vuelve a intentarlo. Las preguntas se barajan de nuevo.</p></div><div class="stack"><button class="btn primary" data-act="retry">Reintentar lección</button><button class="btn line" data-act="home">Volver al inicio</button></div></div>`;
}

function render(){
  const needLegal=S.legal<LEGAL_V;
  if(view==='home'&&needLegal){$app.innerHTML=legalHTML(true);window.scrollTo(0,0);return}
  $app.innerHTML=view==='home'?homeHTML():view==='legal'?legalHTML(false):view==='sim'?simHTML():view==='simres'?simResHTML():view==='calc'?calcHTML():view==='lesson'?lessonHTML():view==='result'?resultHTML():failHTML();
  if(view==='home'){
    if(goCur){const n=$app.querySelector('.node.current');if(n)n.scrollIntoView({block:'center'});goCur=false}
    else window.scrollTo(0,homeY);
  }else window.scrollTo(0,0);
  if(view==='legal')return;
  if(view==='lesson'&&!run.checked&&run.queue[0].t==='num'){const i=document.getElementById('numIn');if(i)i.focus({preventScroll:true})}
}


function startRun(L){
  // Lección: ejercicios fijos barajados y, al final, un caso real al azar (si hay datos).
  // Repaso de unidad: 5 al azar de sus lecciones. Repaso del día: los fallos que tocan hoy.
  const ex=L.kind==='test'?shuffle(PLACEMENT.map(u=>EXBYID.get(u))):L.kind==='srs'?shuffle(srsDue()).slice(0,SRS_MAX):L.kind==='review'?shuffle(L.unit.lessons.flatMap(l=>l.ex)).slice(0,5):shuffle(L.ex).concat(shuffle(L.casos).slice(0,1));
  if(!ex.length){view='home';render();return}
  run={L,res:{},queue:ex.slice(),total:ex.length,done:0,lives:3,firstWrong:0,seen:new Set(),perm:new Map(),sel:null,val:'',checked:false,ok:null};
  view='lesson';render();
}
function check(){
  const ex=run.queue[0];let ok=false;
  if(ex.t==='num'){const v=parseNum(run.val);ok=v!==null&&Math.abs(v-ex.a)<=(ex.tol==null?0.005:ex.tol)}
  else if(ex.t==='order'||ex.t==='match')ok=!!run.sel&&run.sel.length===ordItems(ex).length&&run.sel.every((v,k)=>v===k);
  else if(ex.t==='plan')ok=ex.place.every(p=>Math.abs(run.sel[p.id]-p.a)<=planTol(p)+1e-9);
  else ok=run.sel===ex.a;
  run.ok=ok;run.checked=true;
  // En el test de nivel no hay vidas ni repaso: solo se anota el resultado de cada pregunta.
  if(!run.seen.has(ex)){run.seen.add(ex);if(!ok)run.firstWrong++;if(run.L.kind==='test')run.res[ex.uid]=ok;else srsRecord(ex,ok);save()}
  if(!ok&&run.L.kind!=='test')run.lives--;
  render();
}
function next(){
  const ex=run.queue.shift();
  if(run.ok||run.L.kind==='test')run.done++;else run.queue.push(ex);
  if(!run.ok&&run.lives<=0){view='fail';render();return}
  if(run.queue.length===0){finish();return}
  run.sel=null;run.val='';run.checked=false;run.ok=null;render();
}
function finishTest(){
  const res=run.res,score=Object.values(res).filter(Boolean).length,total=PLACEMENT.length,dominadas=[];
  UNITS.filter(u=>trackOf(u)==='basico'&&u.gate!==false&&u.lessons).forEach(u=>{
    const ids=PLACEMENT.filter(x=>u.lessons.some(l=>x.startsWith(l.id+'#')));
    if(ids.length&&ids.every(x=>res[x])){
      dominadas.push(u.title);
      FLAT.filter(l=>l.unit===u).forEach(l=>{if(!S.done[l.id])S.done[l.id]={acc:1,test:true}});
    }
  });
  const abre=score>=TEST_PASS;
  if(abre)S.skipBasics=true;
  S.placement={score,total,date:today()};
  save();
  lastRes={test:true,score,total,dominadas,abre,title:TEST_L.title};
  view='result';render();
}
function finish(){
  if(run.L.kind==='test'){finishTest();return}
  const right=run.total-run.firstWrong,acc=right/run.total,xp=right*10+(run.firstWrong===0?10:0),t=today();
  if(S.last!==t){S.streak=(S.last===yest())?S.streak+1:1;S.last=t}
  if(S.day!==t){S.day=t;S.dayXp=0}
  S.xp+=xp;S.dayXp+=xp;
  if(run.L.kind!=='srs'){const prev=S.done[run.L.id];S.done[run.L.id]={acc:Math.max(acc,prev?prev.acc:0)}}
  save();
  lastRes={xp,acc,title:run.L.title,srs:run.L.kind==='srs'};
  view='result';render();
}


function pickChoice(i){
  run.sel=i;
  $app.querySelectorAll('.opt').forEach((b,k)=>b.classList.toggle('sel',k===i));
  const c=$app.querySelector('[data-act=check]');if(c)c.disabled=false;
}
// Ejercicio «plan»: arrastrar líneas (ratón, dedo) o moverlas con las flechas del teclado.
let drag=null;
// Contexto de las líneas arrastrables: ejercicio plan de una lección o la Operación de la semana.
function planCtx(){
  if(view==='sim'&&simDraft)return {place:SIM_PLACE,step:SEMANA.step,vals:simDraft,after:simInfo};
  if(view==='lesson'&&run&&!run.checked&&run.queue[0].t==='plan'){const ex=run.queue[0];return {place:ex.place,step:planStep(ex),vals:run.sel}}
  return null;
}
function planSet(g,v){
  const ctx=planCtx();if(!ctx)return;
  const svg=g.ownerSVGElement,d=svg.dataset,lo=+d.lo,hi=+d.hi;
  const st=ctx.step;v=Math.round(Math.min(hi,Math.max(lo,v))/st)*st;v=Math.round(v*100)/100;
  const id=g.dataset.id,p=ctx.place.find(q=>q.id===id);
  ctx.vals[id]=v;
  g.setAttribute('transform',`translate(0 ${(+d.top+(hi-v)/(hi-lo)*+d.ph).toFixed(1)})`);
  g.querySelector('.pt').textContent=p.label+' '+fmt(v);
  g.setAttribute('aria-valuenow',v);g.setAttribute('aria-valuetext',p.label+' '+fmt(v));
  if(ctx.after)ctx.after();
}
function planMove(e){
  const g=drag.g,svg=g.ownerSVGElement,d=svg.dataset,pt=svg.createSVGPoint();
  pt.x=e.clientX;pt.y=e.clientY;
  const sy=pt.matrixTransform(svg.getScreenCTM().inverse()).y;
  planSet(g,+d.hi-(sy-+d.top)/+d.ph*(+d.hi-+d.lo));
}
$app.addEventListener('pointerdown',e=>{
  const g=e.target.closest&&e.target.closest('.pl');
  if(!g||!planCtx())return;
  e.preventDefault();drag={g};g.classList.add('drag');
  try{g.setPointerCapture(e.pointerId)}catch(_){}
  planMove(e);
});
$app.addEventListener('pointermove',e=>{if(drag){e.preventDefault();planMove(e)}});
const endDrag=()=>{if(drag){drag.g.classList.remove('drag');drag=null}};
$app.addEventListener('pointerup',endDrag);$app.addEventListener('pointercancel',endDrag);
function pickSvg(el){
  const ex=run.queue[0];
  if(ex.t==='tap'){run.sel=+el.dataset.i;$app.querySelectorAll('.cd').forEach(g=>g.classList.toggle('sel',g===el))}
  else{run.sel=el.dataset.id;$app.querySelectorAll('.lv').forEach(g=>g.classList.toggle('sel',g===el))}
  const c=$app.querySelector('[data-act=check]');if(c)c.disabled=false;
}
$app.addEventListener('click',e=>{
  const svgEl=e.target.closest('.cd[tabindex],.lv');
  if(svgEl&&view==='lesson'&&!run.checked){pickSvg(svgEl);return}
  const b=e.target.closest('[data-act]');if(!b)return;
  const a=b.dataset.act;
  if(a==='open'){
    const L=FLAT.find(l=>l.id===b.dataset.id),s=statuses()[L.id];
    if(s==='locked'){toast(trackOf(L.unit)!=='basico'&&!advancedOpen()?'Completa antes la ruta Básico.':'Completa antes la lección anterior.');return}
    homeY=window.scrollY;startRun(L);
  }
  else if(a==='pick'&&!run.checked)pickChoice(+b.dataset.i);
  else if(a==='pstep'){const c=planCtx(),g=$app.querySelector(`.pl[data-id="${b.dataset.id}"]`);if(c&&g)planSet(g,c.vals[b.dataset.id]+(+b.dataset.d)*c.step)}
  else if(a==='sim'){homeY=window.scrollY;simDraft=null;view='sim';render()}
  else if(a==='simres'){homeY=window.scrollY;view='simres';render()}
  else if(a==='calc'){homeY=window.scrollY;view='calc';render()}
  else if(a==='simsave'&&simDraft&&simValid(simDraft)){S.sim[SEMANA.semana]={ticker:SEMANA.ticker,plan:Object.assign({},simDraft),fecha:today()};save();simDraft=null;view='home';render();toast('Plan guardado. El sábado que viene verás el resultado.')}
  else if(a==='opick'&&!run.checked){
    const n=ordItems(run.queue[0]).length;if(!run.sel)run.sel=Array(n).fill(null);
    const k=run.sel.indexOf(null);if(k>=0){run.sel[k]=+b.dataset.i;updateOrd()}
  }
  else if(a==='ounpick'&&!run.checked){run.sel[+b.dataset.k]=null;updateOrd()}
  else if(a==='check'&&!b.disabled)check();
  else if(a==='next')next();
  else if(a==='quit'||a==='home'){const deSim=view==='sim'||view==='simres'||view==='calc';simDraft=null;view='home';goCur=(a==='home'&&!deSim);render()}
  else if(a==='retry')startRun(run.L);
  else if(a==='legal'){homeY=window.scrollY;view='legal';render()}
  else if(a==='legalok'){S.legal=LEGAL_V;save();homeY=0;render()}
  else if(a==='srs'){homeY=window.scrollY;startRun(SRS_L)}
  else if(a==='test'){homeY=0;startRun(TEST_L)}
  else if(a==='notest'){S.placement={skipped:true};save();render()}
  else if(a==='install'&&installEvt){installEvt.prompt();installEvt.userChoice.finally(()=>{installEvt=null;homeY=window.scrollY;render()})}
  else if(a==='track'){S.track=b.dataset.track;save();homeY=0;render()}
  else if(a==='skipbasics'){S.skipBasics=true;save();homeY=0;render();toast('Rutas Pasiva, Fundamental y Técnico abiertas.')}
  else if(a==='unlock'){S.all=!S.all;save();homeY=window.scrollY;render()}
  else if(a==='reset'){
    if(!resetArm){resetArm=true;homeY=window.scrollY;render();setTimeout(()=>{if(resetArm){resetArm=false;if(view==='home'){homeY=window.scrollY;render()}}},4000)}
    else{S=DEF();save();resetArm=false;homeY=0;render()}
  }
});
$app.addEventListener('input',e=>{
  // Deslizadores del simulador de aportaciones: actualizan solo el resultado, sin redibujar (no se pierde el foco).
  const k=e.target.dataset&&e.target.dataset.calc;
  if(k==='cmp'&&view==='calc'){S.calc.cmp=e.target.checked;save();render();const c=$app.querySelector('#calc-cmp');if(c)c.focus({preventScroll:true});return}
  if(k&&view==='calc'){
    S.calc[k]=+e.target.value;save();
    const c=CALC_CTRL.find(x=>x[0]===k);$app.querySelector('#out-'+k).textContent=c[5](S.calc[k]);
    $app.querySelector('#calcOut').innerHTML=calcOutHTML();return;
  }
  if(e.target.id!=='numIn'||!run)return;
  run.val=e.target.value;
  const c=$app.querySelector('[data-act=check]');if(c)c.disabled=run.val.trim()==='';
});
document.addEventListener('keydown',e=>{
  if(view!=='lesson'&&view!=='sim')return;
  const t=e.target;
  if((e.key==='Enter'||e.key===' ')&&t.closest&&t.closest('.cd[tabindex],.lv')&&!run.checked){e.preventDefault();pickSvg(t.closest('.cd,.lv'));return}
  const pg=t.closest&&t.closest('.pl'),pc=pg&&planCtx();
  if(pc){
    const k={ArrowUp:1,ArrowRight:1,ArrowDown:-1,ArrowLeft:-1,PageUp:10,PageDown:-10}[e.key];
    if(k){e.preventDefault();planSet(pg,pc.vals[pg.dataset.id]+k*pc.step);return}
  }
  if(view==='sim')return;
  // Enter mantenido (auto-repetición) no debe comprobar y saltar la explicación de un golpe.
  if(e.key==='Enter'&&e.repeat)return;
  if(e.key==='Enter'&&(!t.closest||!t.closest('button'))){
    if(run.checked){e.preventDefault();next()}
    else if(t.id==='numIn'&&run.val.trim()!==''){e.preventDefault();check()}
  }
});

render();

// PWA: el service worker solo se registra servido por http(s) (no en file:// ni en los tests).
if(typeof window.addEventListener==='function'){
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvt=e;if(view==='home'){homeY=window.scrollY;render()}});
  window.addEventListener('appinstalled',()=>{installEvt=null;toast('Rango instalado.')});
}
if(typeof navigator!=='undefined'&&'serviceWorker' in navigator&&typeof location!=='undefined'&&/^https?:$/.test(location.protocol)){
  navigator.serviceWorker.register('sw.js').catch(()=>{});
}


// API mínima para tests (test/smoke.mjs)
export const api={FLAT,CASOS,SEMANA,PLACEMENT,simulate,aportaciones,openCalc:()=>{view='calc';render()},openSim:()=>{simDraft=null;view='sim';render()},openSimRes:()=>{view='simres';render()},simDraftSet:p=>{simDraft=p},simSave:()=>{S.sim[SEMANA.semana]={ticker:SEMANA.ticker,plan:Object.assign({},simDraft),fecha:today()}},goHome:()=>{view='home';render()},startTest:()=>startRun(TEST_L),srsDue,acceptLegal:()=>{S.legal=LEGAL_V},startSrs:()=>startRun(SRS_L),setTrack:t=>{S.track=t},skipBasics:()=>{S.skipBasics=true},homeHTML,startRun,lessonHTML,check,next,resultHTML,failHTML,render,getRun:()=>run,setSel:v=>{run.sel=v},setVal:v=>{run.val=v},getState:()=>S};
