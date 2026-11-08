// Arranque, navegación entre pantallas, flujo de una lección y eventos.
// Las pantallas están en views/, los tipos de ejercicio en exercises/ y el progreso guardado en state.js.
import {today,yest,shuffle} from './util.js';
import {UNITS,FLAT,CASOS,SEMANA,EXBYID,PLACEMENT,trackOf} from './content.js';
import {S,save,resetState,migrar,advancedOpen,statuses,srsDue,srsRecord,SRS_MAX} from './state.js';
import {$app,toast,ses} from './ui.js';
import {setPlanCtx} from './drag.js';
import {TIPOS} from './exercises/index.js';
import {homeHTML} from './views/home.js';
import {lessonHTML,resultHTML,failHTML} from './views/lesson.js';
import {simHTML,simResHTML,simInfo,simValid,simSave,simRecord,simHist,simulate,SIM_PLACE} from './views/sim.js';
import {calcHTML,calcOutHTML,CALC_CTRL,aportaciones} from './views/calc.js';
import {legalHTML,LEGAL_V} from './views/legal.js';
import {statsHTML,statRecord,STATS_L,flojos} from './views/stats.js';
import {t} from './textos.js';

const SRS_L={id:'srs',title:t.repasoDia,kind:'srs'};
// Test de nivel: con TEST_PASS aciertos o más se abren las demás rutas; cada unidad con sus dos preguntas
// acertadas queda marcada como completada.
const TEST_L={id:'test',title:t.testNivel,kind:'test'};
const TEST_PASS=10;

const VISTAS={home:homeHTML,legal:()=>legalHTML(false),sim:simHTML,simres:simResHTML,calc:calcHTML,lesson:lessonHTML,result:resultHTML,fail:failHTML,stats:statsHTML};
function render(){
  if(ses.view==='home'&&S.legal<LEGAL_V){$app.innerHTML=legalHTML(true);window.scrollTo(0,0);return}
  $app.innerHTML=VISTAS[ses.view]();
  if(ses.view==='home'){
    if(ses.goCur){const n=$app.querySelector('.node.current');if(n)n.scrollIntoView({block:'center'});ses.goCur=false}
    else window.scrollTo(0,ses.homeY);
  }else window.scrollTo(0,0);
  const run=ses.run;
  if(ses.view==='lesson'&&!run.checked){const T=TIPOS[run.queue[0].t];if(T.focus)T.focus()}
}
const ir=(v,{guardarY=true}={})=>{if(guardarY&&ses.view==='home')ses.homeY=window.scrollY;ses.view=v;render()};

// Lección: ejercicios fijos barajados y, al final, un caso real al azar (si hay datos).
// Repaso de unidad: 5 al azar de sus lecciones. Repaso del día: los fallos que tocan hoy.
// Puntos débiles: los ejercicios que más fallas (estadísticas locales).
function startRun(L){
  const ex=L.kind==='test'?shuffle(PLACEMENT.map(u=>EXBYID.get(u)))
    :L.kind==='srs'?shuffle(srsDue()).slice(0,SRS_MAX)
    :L.kind==='weak'?shuffle(flojos(SRS_MAX))
    :L.kind==='review'?shuffle(L.unit.lessons.flatMap(l=>l.ex)).slice(0,5)
    :shuffle(L.ex).concat(shuffle(L.casos).slice(0,1));
  if(!ex.length){ses.view='home';render();return}
  ses.run={L,res:{},queue:ex.slice(),total:ex.length,done:0,lives:3,firstWrong:0,seen:new Set(),perm:new Map(),sel:null,val:'',checked:false,ok:null,t0:Date.now()};
  ses.view='lesson';render();
}
function check(){
  const run=ses.run,ex=run.queue[0],ok=TIPOS[ex.t].correct(ex,run);
  run.ok=ok;run.checked=true;
  // Solo cuenta el primer intento de cada ejercicio. En el test de nivel no hay vidas ni repaso.
  if(!run.seen.has(ex)){
    run.seen.add(ex);if(!ok)run.firstWrong++;
    if(run.L.kind==='test')run.res[ex.id]=ok;else srsRecord(ex,ok,run.L.kind==='srs');
    statRecord(ex,ok);save();
  }
  if(!ok&&run.L.kind!=='test')run.lives--;
  render();
}
function next(){
  const run=ses.run,ex=run.queue.shift();
  if(run.ok||run.L.kind==='test')run.done++;else run.queue.push(ex);
  if(!run.ok&&run.lives<=0){ses.view='fail';render();return}
  if(run.queue.length===0){finish();return}
  run.sel=null;run.val='';run.checked=false;run.ok=null;render();
}
function finishTest(){
  const res=ses.run.res,score=Object.values(res).filter(Boolean).length,total=PLACEMENT.length,dominadas=[];
  UNITS.filter(u=>trackOf(u)==='basico'&&u.gate!==false&&u.lessons).forEach(u=>{
    const ids=PLACEMENT.filter(x=>u.lessons.some(l=>l.id===EXBYID.get(x).lesson));
    if(ids.length&&ids.every(x=>res[x])){
      dominadas.push(u.title);
      FLAT.filter(l=>l.unit===u).forEach(l=>{if(!S.done[l.id])S.done[l.id]={acc:1,test:true}});
    }
  });
  const abre=score>=TEST_PASS;
  if(abre)S.skipBasics=true;
  S.placement={score,total,date:today()};
  save();
  ses.lastRes={test:true,score,total,dominadas,abre,title:TEST_L.title};
  ses.view='result';render();
}
function finish(){
  const run=ses.run;
  if(run.L.kind==='test'){finishTest();return}
  const right=run.total-run.firstWrong,acc=right/run.total,xp=right*10+(run.firstWrong===0?10:0),t=today();
  if(S.last!==t){S.streak=(S.last===yest())?S.streak+1:1;S.last=t}
  if(S.day!==t){S.day=t;S.dayXp=0}
  S.xp+=xp;S.dayXp+=xp;
  const lec=run.L.kind==='lesson'||run.L.kind==='review';
  if(lec){const prev=S.done[run.L.id];S.done[run.L.id]={acc:Math.max(acc,prev?prev.acc:0)}}
  // Tiempo dedicado (minutos, para las estadísticas): se cuenta como mucho media hora por sesión.
  S.stats.min=(S.stats.min||0)+Math.min(30,(Date.now()-run.t0)/60000);
  save();
  ses.lastRes={xp,acc,title:run.L.title,srs:!lec,kind:run.L.kind};
  ses.view='result';render();
}

// Líneas arrastrables: el ejercicio «plan» en una lección o el plan de la Operación de la semana.
setPlanCtx(()=>{
  if(ses.view==='sim'&&ses.simDraft)return {place:SIM_PLACE,step:SEMANA.step,vals:ses.simDraft,after:simInfo};
  const run=ses.run;
  if(ses.view==='lesson'&&run&&!run.checked){const ex=run.queue[0],T=TIPOS[ex.t];if(T.plan)return T.plan(ex,run)}
  return null;
});
// Acción propia del tipo de ejercicio en curso (elegir opción, colocar un elemento, mover el deslizador…).
function accionEjercicio(a,b){
  const run=ses.run;if(ses.view!=='lesson'||!run||run.checked)return false;
  const ex=run.queue[0],f=TIPOS[ex.t].act&&TIPOS[ex.t].act[a];
  if(!f)return false;f(b,run,ex);return true;
}
const ACCIONES={
  open(b){
    const L=FLAT.find(l=>l.id===b.dataset.id),s=statuses()[L.id];
    if(s==='locked'){toast(trackOf(L.unit)!=='basico'&&!advancedOpen()?t.bloqueadaBasico:t.bloqueadaAnterior);return}
    ses.homeY=window.scrollY;startRun(L);
  },
  check(b){if(!b.disabled)check()},
  next,
  retry(){startRun(ses.run.L)},
  quit(){ses.simDraft=null;ses.view='home';ses.goCur=false;render()},
  home(){const deSim=['sim','simres','calc','stats'].includes(ses.view);ses.simDraft=null;ses.view='home';ses.goCur=!deSim;render()},
  sim(){ses.simDraft=null;ir('sim')},
  simres(){ir('simres')},
  calc(){ir('calc')},
  stats(){ir('stats')},
  weak(){ses.homeY=0;startRun(STATS_L)},
  simsave(){if(ses.simDraft&&simValid(ses.simDraft)){simSave();ses.simDraft=null;ses.view='home';render();toast(t.planGuardado)}},
  unfold(b){const id=b.dataset.id,ab=ses.abiertas;ab.has(id)?ab.delete(id):ab.add(id);ses.homeY=window.scrollY;render();const nb=$app.querySelector(`[data-act=unfold][data-id="${id}"]`);if(nb)nb.focus({preventScroll:true})},
  legal(){ir('legal')},
  legalok(){S.legal=LEGAL_V;save();ses.homeY=0;render()},
  srs(){ses.homeY=window.scrollY;startRun(SRS_L)},
  test(){ses.homeY=0;startRun(TEST_L)},
  notest(){S.placement={skipped:true};save();render()},
  install(){const ev=ses.installEvt;if(!ev)return;ev.prompt();ev.userChoice.finally(()=>{ses.installEvt=null;ses.homeY=window.scrollY;render()})},
  track(b){S.track=b.dataset.track;save();ses.homeY=0;render()},
  skipbasics(){S.skipBasics=true;save();ses.homeY=0;render();toast(t.rutasAbiertas)},
  // Herramientas de desarrollo: solo aparecen con ?dev en la dirección.
  unlock(){S.all=!S.all;save();ses.homeY=window.scrollY;render()},
  reset(){
    if(!ses.resetArm){ses.resetArm=true;ses.homeY=window.scrollY;render();setTimeout(()=>{if(ses.resetArm){ses.resetArm=false;if(ses.view==='home'){ses.homeY=window.scrollY;render()}}},4000)}
    else{resetState();ses.resetArm=false;ses.homeY=0;render()}
  },
};
$app.addEventListener('click',e=>{
  const run=ses.run,svgEl=e.target.closest('.cd[tabindex],.lv');
  if(svgEl&&ses.view==='lesson'&&!run.checked){const T=TIPOS[run.queue[0].t];if(T.svg)T.svg(svgEl,run);return}
  const b=e.target.closest('[data-act]');if(!b)return;
  const a=b.dataset.act;
  if(accionEjercicio(a,b))return;
  if(ACCIONES[a])ACCIONES[a](b);
});
$app.addEventListener('input',e=>{
  // Deslizadores del simulador de aportaciones: actualizan solo el resultado, sin redibujar (no se pierde el foco).
  const k=e.target.dataset&&e.target.dataset.calc;
  if(k==='cmp'&&ses.view==='calc'){S.calc.cmp=e.target.checked;save();render();const c=$app.querySelector('#calc-cmp');if(c)c.focus({preventScroll:true});return}
  if(k&&ses.view==='calc'){
    S.calc[k]=+e.target.value;save();
    const c=CALC_CTRL.find(x=>x[0]===k);$app.querySelector('#out-'+k).textContent=c[5](S.calc[k]);
    $app.querySelector('#calcOut').innerHTML=calcOutHTML();return;
  }
  const run=ses.run;
  if(ses.view==='lesson'&&run&&!run.checked){const ex=run.queue[0],T=TIPOS[ex.t];if(T.input)T.input(e,run,ex)}
});
document.addEventListener('keydown',e=>{
  if(ses.view!=='lesson')return;
  const el=e.target,run=ses.run,T=TIPOS[run.queue[0].t];
  if((e.key==='Enter'||e.key===' ')&&el.closest&&el.closest('.cd[tabindex],.lv')&&!run.checked){e.preventDefault();if(T.svg)T.svg(el.closest('.cd,.lv'),run);return}
  // Enter mantenido (auto-repetición) no debe comprobar y saltar la explicación de un golpe.
  if(e.key!=='Enter'||e.repeat||(el.closest&&el.closest('button')))return;
  if(run.checked){e.preventDefault();next()}
  else if(T.enter&&T.enter(el,run)){e.preventDefault();check()}
});

simRecord();
render();

// PWA: el service worker solo se registra servido por http(s) (no en file:// ni en los tests).
if(typeof window.addEventListener==='function'){
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();ses.installEvt=e;if(ses.view==='home'){ses.homeY=window.scrollY;render()}});
  window.addEventListener('appinstalled',()=>{ses.installEvt=null;toast(t.instalada)});
}
if(typeof navigator!=='undefined'&&'serviceWorker' in navigator&&typeof location!=='undefined'&&/^https?:$/.test(location.protocol)){
  navigator.serviceWorker.register('sw.js').catch(()=>{});
}

// API mínima para tests (test/smoke.mjs)
export const api={migrar,FLAT,CASOS,SEMANA,PLACEMENT,simulate,simRecord,simHist,aportaciones,
  openCalc:()=>{ses.view='calc';render()},openSim:()=>{ses.simDraft=null;ses.view='sim';render()},openSimRes:()=>{ses.view='simres';render()},
  openStats:()=>{ses.view='stats';render()},startWeak:()=>startRun(STATS_L),
  simDraftSet:p=>{ses.simDraft=p},simSave,goHome:()=>{ses.view='home';render()},startTest:()=>startRun(TEST_L),srsDue,
  acceptLegal:()=>{S.legal=LEGAL_V},startSrs:()=>startRun(SRS_L),setTrack:t=>{S.track=t},skipBasics:()=>{S.skipBasics=true},
  homeHTML,startRun,lessonHTML,check,next,resultHTML,failHTML,render,getRun:()=>ses.run,setSel:v=>{ses.run.sel=v},setVal:v=>{ses.run.val=v},getState:()=>S};
