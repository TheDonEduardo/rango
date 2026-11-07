// Estado, vistas, lógica de lección y eventos.
import {KEY,GOAL,RH,OFFS,fmt,esc,today,yest,addDays,shuffle,parseNum} from './util.js';
import {P,ico,icoX,icoOk,LOGO} from './icons.js';
import {candlesSVG,lineSVG,glyph} from './charts.js';
import {UNITS,FLAT,CASOS,TRACKS,EXBYID,trackOf,exCount} from './content.js';

const DEF=()=>({xp:0,streak:0,last:null,day:null,dayXp:0,done:{},all:false,track:'basico',skipBasics:false,legal:0,srs:{}});
// Sube LEGAL_V si cambia el texto del aviso: se vuelve a pedir la aceptación.
const LEGAL_V=1;
// Repaso espaciado: días hasta la siguiente aparición tras cada acierto. Tras el último, sale de la lista.
const SRS_STEPS=[1,3,7,14];
const SRS_MAX=10;
const SRS_L={id:'srs',title:'Repaso del día',kind:'srs'};
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
  const basic=FLAT.filter(l=>trackOf(l.unit)==='basico');
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


function chartHTML(ex){
  const sp=ex.chart;if(!sp)return'';
  let st=null;
  if(ex.t==='tap'||ex.t==='level')st={mode:ex.t,sel:run.sel,checked:run.checked,a:ex.a};
  return `<figure class="chart">${sp.type==='line'?lineSVG(sp):candlesSVG(sp,st)}</figure>`;
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
  let h=`<header class="top"><div class="brand">${LOGO}<span>Rango</span></div><div class="stats"><span class="chip fire" aria-label="Racha de ${sk} ${sk===1?'día':'días'}">${ico('flame')}<b>${sk}</b></span><span class="chip xp" aria-label="${S.xp} XP en total">${ico('bolt')}<b>${S.xp}</b></span></div></header><main>`;
  h+=`<section class="goal" aria-label="Meta diaria"><div class="goal-h"><span>Meta de hoy</span><span>${Math.min(dx,GOAL)} / ${GOAL} XP</span></div><div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${GOAL}" aria-valuenow="${Math.min(dx,GOAL)}"><i style="width:${Math.min(100,dx/GOAL*100)}%"></i></div></section>`;
  h+=`<nav class="tracks" aria-label="Ruta">${TRACKS.map(t=>`<button data-act="track" data-track="${t.id}" aria-pressed="${S.track===t.id}">${t.title}</button>`).join('')}</nav>`;
  const TF=FLAT.filter(l=>trackOf(l.unit)===S.track);
  if(S.track!=='basico'&&!advancedOpen())h+=`<section class="gate"><p>Esta ruta se abre al completar <b>Conceptos básicos</b>.</p><div class="row"><button class="btn line" data-act="track" data-track="basico">Ir a los básicos</button><button class="btn ghost" data-act="skipbasics">Ya opero: saltar los básicos</button></div></section>`;
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
  h+=`</main><footer class="foot-home"><p>Prototipo. El progreso se guarda solo en este navegador. <button class="link" data-act="legal">Aviso legal</button></p>${installHTML()}<div class="row"><button class="btn ghost" data-act="unlock">${S.all?'Volver a bloquear':'Desbloquear todo'}</button><button class="btn ghost" data-act="reset">${resetArm?'Pulsa de nuevo para borrar':'Reiniciar progreso'}</button></div></footer>`;
  return h;
}

const KIND={choice:'Elige una respuesta',num:'Escribe el resultado',tap:'Toca una vela del gráfico',level:'Toca una línea del gráfico',order:'Ordena los pasos'};
function answerText(ex){
  if(ex.t==='choice')return ex.opts[ex.a];
  if(ex.t==='num')return fmt(ex.a,Number.isInteger(ex.a)?0:2)+(ex.unit?' '+ex.unit:'');
  if(ex.t==='tap')return 'Vela '+(ex.a+1);
  if(ex.t==='order')return ex.items.map((t,i)=>(i+1)+'. '+t).join('  ');
  return 'Nivel '+ex.a;
}
function lessonHTML(){
  const ex=run.queue[0],pct=Math.round(run.done/run.total*100);
  let hearts='';for(let i=0;i<3;i++)hearts+=`<svg class="heart ${i<run.lives?'on':'off'}" viewBox="0 0 24 24" aria-hidden="true"><path d="${P.heart}" fill="currentColor"/></svg>`;
  let h=`<div class="lesson"><div class="lbar"><button class="x" data-act="quit" aria-label="Salir de la lección">${icoX}</button><div class="prog" role="progressbar" aria-valuemin="0" aria-valuemax="${run.total}" aria-valuenow="${run.done}"><i style="width:${pct}%"></i></div><div class="lives" role="img" aria-label="${run.lives} vidas">${hearts}</div></div>`;
  h+=`<div class="qwrap"><p class="kind">${ex.caso?`Caso real: ${esc(ex.caso)} · `:''}${KIND[ex.t]}</p><h2 class="q">${tx(ex.q)}</h2>${chartHTML(ex)}${tableHTML(ex)}`;
  if(ex.t==='choice'){
    h+='<div class="opts">';
    ex.opts.forEach((o,i)=>{
      let c='';
      if(run.checked){if(i===ex.a)c='good';else if(i===run.sel)c='bad'}else if(i===run.sel)c='sel';
      h+=`<button class="opt ${c}" data-act="pick" data-i="${i}"${run.checked?' disabled':''}>${tx(o)}</button>`;
    });
    h+='</div>';
  }
  if(ex.t==='order')h+=`<div class="ord">${ordHTML(ex)}</div>`;
  if(ex.t==='num'){
    const c=run.checked?(run.ok?'good':'bad'):'';
    h+=`<div class="numrow"><input id="numIn" class="num ${c}" type="text" inputmode="decimal" autocomplete="off" aria-label="Tu respuesta" value="${esc(run.val)}"${run.checked?' disabled':''}>${ex.unit?`<span class="suffix">${ex.unit}</span>`:''}</div>`;
  }
  h+='</div>';
  const can=canCheck(ex);
  if(!run.checked){
    h+=`<div><button class="btn primary" data-act="check"${can?'':' disabled'}>Comprobar</button></div>`;
  }else{
    h+=`<div class="fb ${run.ok?'good':'bad'}" role="status"><div class="fb-h">${run.ok?icoOk:icoX}<span>${run.ok?'Correcto':'Incorrecto'}</span></div><p>${tx(ex.why)}</p>${run.ok?'':ex.t==='order'?`<div class="ans">Orden correcto:<ol>${ex.items.map(t=>`<li>${tx(t)}</li>`).join('')}</ol></div>`:`<p class="ans">Respuesta: ${tx(answerText(ex))}</p>`}<button class="btn primary" data-act="next">Continuar</button></div>`;
  }
  return h+'</div>';
}
// Ordenar pasos: el usuario toca los elementos en orden; run.sel = índices de ex.items en el orden elegido.
function ordHTML(ex){
  const sel=run.sel||[],n=ex.items.length;
  if(!run.perm.has(ex)){let p;do{p=shuffle(ex.items.map((_,i)=>i))}while(p.every((v,i)=>v===i));run.perm.set(ex,p)}
  let h='<ol class="ord-ans" aria-label="Tu orden">';
  for(let k=0;k<n;k++){
    if(k<sel.length){
      const c=run.checked?(sel[k]===k?'good':'bad'):'filled';
      h+=`<li><button class="opt ${c}" data-act="ounpick" data-k="${k}"${run.checked?' disabled':` aria-label="Quitar: ${esc(ex.items[sel[k]])}"`}><span class="n">${k+1}</span>${tx(ex.items[sel[k]])}</button></li>`;
    }else h+=`<li class="slot" aria-hidden="true"><span class="n">${k+1}</span></li>`;
  }
  h+='</ol>';
  if(!run.checked){
    const rest=run.perm.get(ex).filter(i=>!sel.includes(i));
    if(rest.length)h+='<div class="opts ord-pool">'+rest.map(i=>`<button class="opt" data-act="opick" data-i="${i}">${tx(ex.items[i])}</button>`).join('')+'</div>';
  }
  return h;
}
function canCheck(ex){
  if(ex.t==='num')return run.val.trim()!=='';
  if(ex.t==='order')return !!run.sel&&run.sel.length===ex.items.length;
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
function legalHTML(first){
  return `<div class="res legal"><div class="res-main"><h1>${first?'Antes de empezar':'Aviso legal'}</h1>
  <p>Rango es una herramienta de formación. Nada de lo que ves es asesoramiento financiero ni una recomendación de comprar o vender ningún valor.</p>
  <p>Los casos con empresas reales usan datos públicos de Yahoo Finance, con su fecha. Pueden contener errores o estar desactualizados, y que una empresa aparezca no implica ninguna opinión sobre ella.</p>
  <p>Invertir en bolsa conlleva riesgo de perder parte o todo el capital. Las rentabilidades pasadas no garantizan las futuras.</p>
  <p>La información fiscal es general y simplificada: las normas cambian y dependen de tu situación. Consulta con un profesional antes de decidir.</p>
  <p>Las decisiones de inversión son tuyas y bajo tu responsabilidad.</p></div>
  <div><button class="btn primary" data-act="${first?'legalok':'home'}">${first?'Entendido, empezar':'Volver'}</button></div></div>`;
}
function resultHTML(){
  const r=lastRes,sk=streakNow();
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
  $app.innerHTML=view==='home'?homeHTML():view==='legal'?legalHTML(false):view==='lesson'?lessonHTML():view==='result'?resultHTML():failHTML();
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
  const ex=L.kind==='srs'?shuffle(srsDue()).slice(0,SRS_MAX):L.kind==='review'?shuffle(L.unit.lessons.flatMap(l=>l.ex)).slice(0,5):shuffle(L.ex).concat(shuffle(L.casos).slice(0,1));
  if(!ex.length){view='home';render();return}
  run={L,queue:ex.slice(),total:ex.length,done:0,lives:3,firstWrong:0,seen:new Set(),perm:new Map(),sel:null,val:'',checked:false,ok:null};
  view='lesson';render();
}
function check(){
  const ex=run.queue[0];let ok=false;
  if(ex.t==='num'){const v=parseNum(run.val);ok=v!==null&&Math.abs(v-ex.a)<=(ex.tol==null?0.005:ex.tol)}
  else if(ex.t==='order')ok=!!run.sel&&run.sel.length===ex.items.length&&run.sel.every((v,k)=>v===k);
  else ok=run.sel===ex.a;
  run.ok=ok;run.checked=true;
  if(!run.seen.has(ex)){run.seen.add(ex);if(!ok)run.firstWrong++;srsRecord(ex,ok);save()}
  if(!ok)run.lives--;
  render();
}
function next(){
  const ex=run.queue.shift();
  if(run.ok)run.done++;else run.queue.push(ex);
  if(!run.ok&&run.lives<=0){view='fail';render();return}
  if(run.queue.length===0){finish();return}
  run.sel=null;run.val='';run.checked=false;run.ok=null;render();
}
function finish(){
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
    if(s==='locked'){toast(trackOf(L.unit)!=='basico'&&!advancedOpen()?'Completa antes los Conceptos básicos.':'Completa antes la lección anterior.');return}
    homeY=window.scrollY;startRun(L);
  }
  else if(a==='pick'&&!run.checked)pickChoice(+b.dataset.i);
  else if(a==='opick'&&!run.checked){run.sel=(run.sel||[]).concat(+b.dataset.i);updateOrd()}
  else if(a==='ounpick'&&!run.checked){run.sel.splice(+b.dataset.k,1);updateOrd()}
  else if(a==='check'&&!b.disabled)check();
  else if(a==='next')next();
  else if(a==='quit'||a==='home'){view='home';goCur=(a==='home');render()}
  else if(a==='retry')startRun(run.L);
  else if(a==='legal'){homeY=window.scrollY;view='legal';render()}
  else if(a==='legalok'){S.legal=LEGAL_V;save();homeY=0;render()}
  else if(a==='srs'){homeY=window.scrollY;startRun(SRS_L)}
  else if(a==='install'&&installEvt){installEvt.prompt();installEvt.userChoice.finally(()=>{installEvt=null;homeY=window.scrollY;render()})}
  else if(a==='track'){S.track=b.dataset.track;save();homeY=0;render()}
  else if(a==='skipbasics'){S.skipBasics=true;save();homeY=0;render();toast('Rutas Técnico y Fundamental abiertas.')}
  else if(a==='unlock'){S.all=!S.all;save();homeY=window.scrollY;render()}
  else if(a==='reset'){
    if(!resetArm){resetArm=true;homeY=window.scrollY;render();setTimeout(()=>{if(resetArm){resetArm=false;if(view==='home'){homeY=window.scrollY;render()}}},4000)}
    else{S=DEF();save();resetArm=false;homeY=0;render()}
  }
});
$app.addEventListener('input',e=>{
  if(e.target.id!=='numIn'||!run)return;
  run.val=e.target.value;
  const c=$app.querySelector('[data-act=check]');if(c)c.disabled=run.val.trim()==='';
});
document.addEventListener('keydown',e=>{
  if(view!=='lesson')return;
  const t=e.target;
  if((e.key==='Enter'||e.key===' ')&&t.closest&&t.closest('.cd[tabindex],.lv')&&!run.checked){e.preventDefault();pickSvg(t.closest('.cd,.lv'));return}
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
export const api={FLAT,CASOS,srsDue,acceptLegal:()=>{S.legal=LEGAL_V},startSrs:()=>startRun(SRS_L),setTrack:t=>{S.track=t},skipBasics:()=>{S.skipBasics=true},homeHTML,startRun,lessonHTML,check,next,resultHTML,failHTML,render,getRun:()=>run,setSel:v=>{run.sel=v},setVal:v=>{run.val=v},getState:()=>S};
