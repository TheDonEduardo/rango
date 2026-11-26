// Arranque, navegación entre pantallas, flujo de una lección y eventos.
// Las pantallas están en views/, los tipos de ejercicio en exercises/ y el progreso guardado en state.js.
import {today,yest,shuffle,esc} from './util.js';
import {UNITS,FLAT,CASOS,SEMANA,MERCADO,EXBYID,PLACEMENT,EXAMEN_N,trackOf,libre} from './content.js';
import {S,save,resetState,migrar,advancedOpen,statuses,srsDue,srsRecord,SRS_MAX,exportar,leerCopia,importar,sumarRacha,retoHoy} from './state.js';
import {$app,toast,ses} from './ui.js';
import {setPlanCtx} from './drag.js';
import {TIPOS} from './exercises/index.js';
import {ordenFijo} from './exercises/choice.js';
import {CONTACTO} from './config.js';
import {cuentaActiva,enviarEnlace,leerRetorno,sincronizar,cerrarSesion,borrarCuenta,sesion,fusionar,configurar} from './sync.js';
import {compartirLogro} from './compartir.js';
import {medir} from './medicion.js';
import {homeHTML} from './views/home.js';
import {lessonHTML,resultHTML,failHTML} from './views/lesson.js';
import {simHTML,simInfo,simValid,simSave,simHist,simulate,SIM_PLACE} from './views/sim.js';
import {calcHTML,calcOutHTML,histOutHTML,historia,CALC_CTRL,aportaciones} from './views/calc.js';
import {legalHTML,privacidadHTML,LEGAL_V} from './views/legal.js';
import {statsHTML,statRecord,STATS_L,flojos} from './views/stats.js';
import {guiaHTML,abrirGuia,guiaPendiente,guiaVista} from './views/guia.js';
import {glosarioHTML,listaGlosario} from './views/glosario.js';
import {itinerariosHTML} from './views/itinerarios.js';
import {ITINERARIOS,itinActual} from './itinerarios.js';
import {termino,glos} from './glosario.js';
import {t} from './textos.js';

const SRS_L={id:'srs',title:t.repasoDia,kind:'srs'};
const RETO_L={id:'reto',title:t.retoDia,kind:'reto'};
// Mercado de la semana: preguntas generadas cada sábado con datos reales (mercado.json). No entran en el repaso.
const MERCADO_L={id:'mercado',title:t.mercadoTitulo,kind:'mercado'};
// Test de nivel: con TEST_PASS aciertos o más se abren las demás rutas; cada unidad con sus dos preguntas
// acertadas queda marcada como completada.
const TEST_L={id:'test',title:t.testNivel,kind:'test'};
const TEST_PASS=10;

const VISTAS={home:homeHTML,legal:()=>legalHTML(false),sim:simHTML,calc:calcHTML,lesson:lessonHTML,result:resultHTML,fail:failHTML,stats:statsHTML,guia:guiaHTML,glosario:glosarioHTML,itinerarios:itinerariosHTML,privacidad:privacidadHTML};
function render(){
  termOrigen=null;
  if(ses.view==='home'&&S.legal<LEGAL_V){$app.innerHTML=legalHTML(true);window.scrollTo(0,0);return}
  $app.innerHTML=VISTAS[ses.view]();
  if(ses.view==='home'){
    // Selector de rutas desplazable: la ruta elegida siempre a la vista, sin mover la página.
    const tr=$app.querySelector('.tracks'),act=tr&&tr.querySelector('[aria-pressed="true"]');
    if(act&&(act.offsetLeft+act.offsetWidth>tr.scrollLeft+tr.clientWidth||act.offsetLeft<tr.scrollLeft))tr.scrollLeft=act.offsetLeft-8;
    if(ses.goCur){const n=$app.querySelector('.node.current');if(n)n.scrollIntoView({block:'center'});ses.goCur=false}
    else window.scrollTo(0,ses.homeY);
  }else window.scrollTo(0,0);
  const run=ses.run;
  if(ses.view==='result')contar($app.querySelector('[data-cuenta]'));
  if(ses.view==='lesson'&&!run.checked){const T=TIPOS[run.queue[0].t];if(T.focus)T.focus()}
  // Guía: el foco va al botón principal, así el teclado y los lectores de pantalla siguen la tarjeta nueva.
  if(ses.view==='guia'){const b=$app.querySelector('.gnav .btn.primary');if(b&&b.focus)b.focus({preventScroll:true})}
}
// Resultado: los XP ganados suben de 0 a su valor en medio segundo (no con «reducir movimiento»).
function contar(el){
  if(!el||typeof requestAnimationFrame!=='function'||typeof matchMedia!=='function'||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  const fin=+el.dataset.cuenta,t0=performance.now(),paso=ahora=>{
    if(!el.isConnected)return;
    const k=Math.min(1,(ahora-t0)/500);el.textContent='+'+Math.round(fin*(1-(1-k)*(1-k)));
    if(k<1)requestAnimationFrame(paso);
  };
  if(fin>0)requestAnimationFrame(paso);
}
const ir=v=>{if(ses.view==='home')ses.homeY=window.scrollY;ses.view=v;render()};

// Lección: ejercicios fijos barajados y, al final, un caso real al azar (si hay datos).
// Repaso de unidad: 5 al azar de sus lecciones. Repaso del día: los fallos que tocan hoy.
// Puntos débiles: los ejercicios que más fallas (estadísticas locales).
// Prueba de nivel de una ruta avanzada: dos preguntas por unidad, en orden; se para en la primera unidad con un fallo.
// Se prefieren preguntas de elegir o calcular (las de gráfico dependen más del dibujo que del concepto).
const preguntaNivel=l=>l.ex.find(e=>e.t==='choice'||e.t==='num')||l.ex[0];
const idsNivel=u=>u.lessons.slice(0,2).map(l=>preguntaNivel(l).id);
function preguntasNivel(track){
  return UNITS.filter(u=>trackOf(u)===track&&u.lessons).flatMap(u=>u.lessons.slice(0,2).map(preguntaNivel));
}
// Unidad superada en una prueba: todas sus lecciones y su examen quedan completados (si no lo estaban).
const marcarUnidad=u=>FLAT.filter(l=>l.unit===u).forEach(l=>{if(!S.done[l.id])S.done[l.id]={acc:1,test:true}});
const esPrueba=L=>L.kind==='test'||L.kind==='nivel';
// Variantes: fuera de la lección (examen, repaso, puntos débiles), un ejercicio de cálculo con `variantes` sale al azar
// con sus cifras originales o con las de una variante, para que no se responda de memoria. Conserva su id.
const conVariante=e=>{
  if(!e.variantes||!e.variantes.length)return e;
  const k=Math.floor(Math.random()*(e.variantes.length+1));
  return k?Object.assign({},e,e.variantes[k-1]):e;
};
function startRun(L){
  const ex=L.kind==='test'?shuffle(PLACEMENT.map(u=>EXBYID.get(u)))
    :L.kind==='nivel'?preguntasNivel(L.track)
    :L.kind==='srs'?shuffle(srsDue()).slice(0,SRS_MAX).map(conVariante)
    :L.kind==='reto'?[retoHoy()].filter(Boolean)
    :L.kind==='mercado'?(MERCADO?MERCADO.ex.slice():[])
    :L.kind==='weak'?shuffle(flojos(SRS_MAX)).map(conVariante)
    :L.kind==='review'?shuffle(L.unit.lessons.flatMap(l=>l.ex)).slice(0,EXAMEN_N).map(conVariante)
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
    // El test de nivel solo anota su resultado: no entra en el repaso ni en las estadísticas.
    if(esPrueba(run.L))run.res[ex.id]=ok;else{srsRecord(ex,ok,run.L.kind==='srs');statRecord(ex,ok)}
    if(!ok&&ex.id)medir('fallo',{id:ex.id});
    save();
  }
  if(!ok&&!esPrueba(run.L))run.lives--;
  try{if(typeof navigator!=='undefined'&&navigator.vibrate)navigator.vibrate(ok?12:[30,50,30])}catch(e){}
  render();
}
function next(){
  const run=ses.run,ex=run.queue.shift();
  if(run.ok||esPrueba(run.L))run.done++;else run.queue.push(ex);
  if(run.L.kind==='nivel'&&!run.ok){finishNivel();return}
  if(!run.ok&&run.lives<=0){ses.view='fail';render();return}
  if(run.queue.length===0){finish();return}
  run.sel=null;run.val='';run.checked=false;run.ok=null;render();
}
function finishNivel(){
  const run=ses.run,track=run.L.track,res=run.res,superadas=[];
  for(const u of UNITS.filter(u=>trackOf(u)===track&&u.lessons)){
    if(!idsNivel(u).every(x=>res[x]))break;
    superadas.push(u.title);marcarUnidad(u);
  }
  S.pruebas[track]={unidades:superadas.length,date:today()};
  save();
  ses.lastRes={nivel:true,track,superadas,total:UNITS.filter(u=>trackOf(u)===track&&u.lessons).length,title:run.L.title};
  ses.view='result';render();
}
function finishTest(){
  const res=ses.run.res,score=Object.values(res).filter(Boolean).length,total=PLACEMENT.length,dominadas=[];
  UNITS.filter(u=>trackOf(u)==='basico'&&u.gate!==false&&u.lessons).forEach(u=>{
    const ids=PLACEMENT.filter(x=>u.lessons.some(l=>l.id===EXBYID.get(x).lesson));
    if(ids.length&&ids.every(x=>res[x])){
      dominadas.push(u.title);marcarUnidad(u);
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
  if(run.L.kind==='nivel'){finishNivel();return}
  const right=run.total-run.firstWrong,acc=right/run.total,xp=right*10+(run.firstWrong===0?10:0),hoy=today();
  medir('leccion',{id:run.L.id,tipo:run.L.kind,acc:Math.round(acc*100)});
  const racha=sumarRacha();
  if(racha.usado)toast(t.protectorUsado);else if(racha.ganado)toast(t.protectorGanado);
  if(S.day!==hoy){S.day=hoy;S.dayXp=0}
  S.xp+=xp;S.dayXp+=xp;
  const lec=run.L.kind==='lesson'||run.L.kind==='review';
  if(lec){const prev=S.done[run.L.id];S.done[run.L.id]={acc:Math.max(acc,prev?prev.acc:0)}}
  // Examen de la unidad sin un solo fallo a la primera: unidad dominada.
  const dominada=run.L.kind==='review'&&run.firstWrong===0;
  if(dominada)S.dominadas[run.L.unit.id]=today();
  if(run.L.kind==='reto')S.reto={fecha:hoy,ok:run.firstWrong===0};
  if(run.L.kind==='mercado')S.mercado={semana:MERCADO.semana,ok:right,total:run.total};
  // Tiempo dedicado (minutos, para las estadísticas): se cuenta como mucho media hora por sesión.
  S.stats.min=(S.stats.min||0)+Math.min(30,(Date.now()-run.t0)/60000);
  save();
  ses.lastRes={xp,acc,title:run.L.title,srs:!lec,kind:run.L.kind,dominada};
  ses.view='result';render();
}

let termOrigen=null;
function cerrarTermino(volver){
  const d=$app.querySelector('.glos');if(d)d.remove();
  if(volver&&termOrigen&&termOrigen.isConnected)termOrigen.focus({preventScroll:true});
  termOrigen=null;
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
    if(s==='locked'){toast(!libre(trackOf(L.unit))&&!advancedOpen()?t.bloqueadaBasico:t.bloqueadaAnterior);return}
    ses.homeY=window.scrollY;
    if(guiaPendiente(L)){abrirGuia(L.unit,'inicio',{L});ses.view='guia';render();return}
    startRun(L);
  },
  // Itinerarios: elegir uno, dejarlo y abrir su siguiente lección (sin los bloqueos de las rutas: el orden lo da el itinerario).
  itinerarios(){ir('itinerarios')},
  itinsel(b){if(ITINERARIOS.some(x=>x.id===b.dataset.id)){S.itin=b.dataset.id;if(!S.objetivo)S.objetivo='ninguno';save();ses.view='home';ses.goCur=false;ses.homeY=0;render()}},
  itindejar(){S.itin=null;save();render()},
  itinsig(){
    const a=itinActual();if(!a||!a.sig)return;
    ses.homeY=window.scrollY;
    if(guiaPendiente(a.sig)){abrirGuia(a.sig.unit,'inicio',{L:a.sig});ses.view='guia';render();return}
    startRun(a.sig);
  },
  check(b){if(!b.disabled)check()},
  next,
  retry(){startRun(ses.run.L)},
  quit(){const r=ses.run;if(ses.view==='lesson'&&r)medir('abandono',{id:r.L.id,tipo:r.L.kind,hecho:r.done,total:r.total});ses.simDraft=null;ses.view='home';ses.goCur=false;render()},
  home(){const deSim=['sim','calc','stats','guia','glosario','itinerarios'].includes(ses.view);ses.simDraft=null;ses.view='home';ses.goCur=!deSim;render()},
  sim(){ses.simDraft=null;ir('sim')},
  calc(){ir('calc')},
  stats(){ir('stats')},
  // Guía de la unidad: desde el inicio (consulta) o desde una pregunta fallada (repaso, vuelve a la lección).
  guia(b){const u=UNITS.find(x=>x.id===b.dataset.id);abrirGuia(u,'consulta');ir('guia')},
  // «Teoría de la unidad» en «Hoy»: abre la guía de la lección actual (consulta: al cerrar vuelve al inicio).
  guiahoy(b){const u=UNITS.find(x=>x.id===b.dataset.id);if(!u||!u.guia)return;ses.homeY=window.scrollY;abrirGuia(u,'consulta');ses.view='guia';render()},
  guiarepaso(b){const ex=ses.run.queue[0],u=FLAT.find(l=>l.id===ex.lesson).unit;abrirGuia(u,'repaso',{tarjeta:b.dataset.g});ses.view='guia';render()},
  // Glosario: definición en una hoja inferior sin redibujar la pantalla (no se pierde la respuesta en curso).
  term(b){
    const g=termino(b.dataset.k);if(!g)return;
    cerrarTermino();
    const d=document.createElement('div');d.className='glos';d.setAttribute('role','dialog');d.setAttribute('aria-labelledby','glos-t');
    d.innerHTML=`<b id="glos-t">${esc(g.termino)}</b><p>${esc(g.d)}</p><div class="row"><button class="btn line" data-act="glosario">${t.verGlosario}</button><button class="btn primary" data-act="termcerrar">${t.cerrar}</button></div>`;
    $app.appendChild(d);termOrigen=b;d.querySelector('[data-act=termcerrar]').focus({preventScroll:true});
  },
  termcerrar(){cerrarTermino(true)},
  glosvolver(){const v=ses.glosDesde;ses.glosDesde=null;if(v){ses.view=v;render()}else ACCIONES.home()},
  // Desde una lección o una guía, «Volver» regresa allí (la lección sigue en curso).
  glosario(){cerrarTermino();ses.glosDesde=['lesson','guia'].includes(ses.view)?ses.view:null;ir('glosario');const i=$app.querySelector('#glos-q');if(i)i.focus({preventScroll:true})},
  // «¿Ves un error?»: un correo ya rellenado (si hay CONTACTO) o el aviso copiado al portapapeles.
  reportar(){
    let id,q,r='';
    if(ses.view==='guia'&&ses.guia){const c=ses.guia.unit.guia[ses.guia.i];id=`${ses.guia.unit.id}/${c.id}`;q=c.titulo}
    else{const ex=ses.run.queue[0];id=ex.id||`caso ${ex.caso} (${ses.run.L.id})`;q=ex.q;r=TIPOS[ex.t].answer(ex)}
    const cuerpo=t.reporteCuerpo(id,q,r);
    if(CONTACTO){location.href=`mailto:${CONTACTO}?subject=${encodeURIComponent(t.reporteAsunto(id))}&body=${encodeURIComponent(cuerpo)}`;return}
    const cb=navigator.clipboard;
    if(cb&&cb.writeText)cb.writeText(cuerpo).then(()=>toast(t.reporteCopiado),()=>toast(t.reporteId(id)));else toast(t.reporteId(id));
  },
  // Compartir logros: imagen generada en el dispositivo (menú del sistema o descarga).
  compartir(){
    const r=ses.lastRes,titulo=ses.view==='result'&&r?(r.dominada?t.logroDominada:r.test||r.nivel?r.title:t.logroLeccion):t.logroRacha;
    compartirLogro(titulo).then(res=>{if(res==='descargado')toast(t.compartirDescargado)});
  },
  // Copia de seguridad del progreso (pantalla de estadísticas).
  exportar(){
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([exportar()],{type:'application/json'}));
    a.download=`rango-progreso-${today()}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast(t.copiaDescargada);
  },
  importar(){const i=$app.querySelector('#imp-file');if(i)i.click()},
  impok(){if(!ses.copia)return;importar(ses.copia.estado);ses.copia=null;render();toast(t.copiaHecha)},
  impno(){ses.copia=null;render()},
  guianext(){ses.guia.i++;guiaVista();render()},
  guiaprev(){ses.guia.i--;guiaVista();render()},
  guiafin(){const g=ses.guia;if(g.modo==='inicio'||g.ganado)medir('guia',{unidad:g.unit.id,tarjeta:g.i+1,de:g.unit.guia.length,completa:g.vistas.size===g.unit.guia.length});ses.guia=null;if(g.modo==='inicio')startRun(g.L);else if(g.modo==='repaso'){ses.view='lesson';render();const b=$app.querySelector('[data-act=next],[data-act=guiarepaso]');if(b&&b.focus)b.focus({preventScroll:true})}else{ses.view='home';render()}},
  weak(){ses.homeY=0;startRun(STATS_L)},
  simsave(){if(ses.simDraft&&simValid(ses.simDraft)){simSave();ses.simDraft=null;ses.view='sim';render()}},
  unfold(b){const id=b.dataset.id,ab=ses.abiertas;ab.has(id)?ab.delete(id):ab.add(id);ses.homeY=window.scrollY;render();const nb=$app.querySelector(`[data-act=unfold][data-id="${id}"]`);if(nb)nb.focus({preventScroll:true})},
  legal(){ir('legal')},
  privacidad(){ses.privDesde=ses.view==='stats'?'stats':'home';ir('privacidad')},
  privvolver(){ses.view=ses.privDesde||'home';ses.privDesde=null;render()},
  legalok(){S.legal=LEGAL_V;save();ses.homeY=0;render()},
  srs(){ses.homeY=window.scrollY;startRun(SRS_L)},
  reto(){ses.homeY=window.scrollY;startRun(RETO_L)},
  mercado(){ses.homeY=window.scrollY;startRun(MERCADO_L)},
  test(){ses.homeY=0;startRun(TEST_L)},
  nivel(b){ses.homeY=0;startRun({id:'nivel-'+b.dataset.track,title:t.pruebaNivel,kind:'nivel',track:b.dataset.track})},
  medir(b){S.medir=b.dataset.v==='1';save();render()},
  cuentaenviar(){
    const i=$app.querySelector('#cuenta-email'),email=i?i.value.trim():'';
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){toast(t.cuentaMalCorreo);if(i)i.focus();return}
    enviarEnlace(email,location.origin+location.pathname).then(()=>toast(t.cuentaEnviado),()=>toast(t.cuentaError));
  },
  cuentacerrar(){cerrarSesion().then(()=>{toast(t.cuentaCerrada);render()})},
  cuentaborrar(){
    if(!ses.borrarArm){ses.borrarArm=true;render();setTimeout(()=>{if(ses.borrarArm){ses.borrarArm=false;if(ses.view==='stats')render()}},4000);return}
    ses.borrarArm=false;borrarCuenta().then(()=>{toast(t.cuentaBorrada);render()},()=>{toast(t.cuentaError);render()});
  },
  meta(b){S.meta=+b.dataset.m;save();render()},
  objetivo(b){S.objetivo=b.dataset.track;S.track=b.dataset.track;save();ses.homeY=0;render()},
  noobjetivo(){S.objetivo='ninguno';save();render()},
  nonivel(b){S.pruebas[b.dataset.track]={saltada:true};save();render()},
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
$app.addEventListener('change',e=>{
  if(e.target.dataset&&e.target.dataset.calc&&ses.view==='calc'){save();return}
  if(e.target.id!=='imp-file'||!e.target.files||!e.target.files[0])return;
  const r=new FileReader();
  r.onload=()=>{const c=leerCopia(String(r.result));if(c==='nueva'){toast(t.copiaNueva);return}if(!c){toast(t.copiaMala);return}ses.copia=c;render();const b=$app.querySelector('[data-act=impok]');if(b)b.focus({preventScroll:true})};
  r.readAsText(e.target.files[0]);
});
$app.addEventListener('input',e=>{
  if(e.target.id==='glos-q'){$app.querySelector('#glosLista').innerHTML=listaGlosario(e.target.value);return}
  // Deslizadores del simulador de aportaciones: actualizan solo el resultado, sin redibujar (no se pierde el foco).
  const k=e.target.dataset&&e.target.dataset.calc;
  if((k==='cmp'||k==='crash'||k==='hist'||k==='eur')&&ses.view==='calc'){S.calc[k]=e.target.checked;save();render();const c=$app.querySelector('#calc-'+k);if(c)c.focus({preventScroll:true});return}
  if(k&&ses.view==='calc'){
    S.calc[k]=+e.target.value;  // se guarda al soltar (evento change)
    const c=CALC_CTRL.find(x=>x[0]===k);$app.querySelector('#out-'+k).textContent=c[5](S.calc[k]);
    if(k==='peso'){$app.querySelector('#histOut').innerHTML=histOutHTML();return}
    $app.querySelector('#calcOut').innerHTML=calcOutHTML();return;
  }
  const run=ses.run;
  if(ses.view==='lesson'&&run&&!run.checked){const ex=run.queue[0],T=TIPOS[ex.t];if(T.input)T.input(e,run,ex)}
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&$app.querySelector('.glos')){e.preventDefault();cerrarTermino(true);return}
  // Guía: flechas izquierda y derecha para pasar tarjetas.
  if(ses.view==='guia'&&ses.guia&&!$app.querySelector('.glos')){
    const g=ses.guia,n=g.unit.guia.length;
    if(e.key==='ArrowRight'&&g.i<n-1){e.preventDefault();ACCIONES.guianext()}
    else if(e.key==='ArrowLeft'&&g.i>0){e.preventDefault();ACCIONES.guiaprev()}
    return;
  }
  if(ses.view!=='lesson')return;
  const el=e.target,run=ses.run,T=TIPOS[run.queue[0].t];
  // Teclas 1-9: eligen la opción en esa posición (preguntas de elegir), sin estar escribiendo en un campo.
  if(/^[1-9]$/.test(e.key)&&!run.checked&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!(el.closest&&el.closest('input,textarea'))){
    const b=$app.querySelectorAll('.opts>.opt[data-act=pick]')[+e.key-1];
    if(b){e.preventDefault();b.click()}
    return;
  }
  if((e.key==='Enter'||e.key===' ')&&el.closest&&el.closest('.cd[tabindex],.lv')&&!run.checked){e.preventDefault();if(T.svg)T.svg(el.closest('.cd,.lv'),run);return}
  // Enter mantenido (auto-repetición) no debe comprobar y saltar la explicación de un golpe.
  if(e.key!=='Enter'||e.repeat)return;
  // Enter sobre la opción ya elegida la comprueba; sobre cualquier otro botón, hace lo que haga ese botón.
  const opcion=el.closest&&el.closest('.opts>.opt[data-act=pick]'),elegida=opcion&&!run.checked&&+opcion.dataset.i===run.sel;
  if(el.closest&&el.closest('button')&&!elegida)return;
  if(elegida){e.preventDefault();check();return}
  if(run.checked){e.preventDefault();next()}
  else if(T.enter&&T.enter(el,run)){e.preventDefault();check()}
});

// Guía: deslizar el dedo en horizontal pasa de tarjeta (más de 50 px y más horizontal que vertical).
let toque=null;
$app.addEventListener('pointerdown',e=>{if(ses.view==='guia'&&e.pointerType!=='mouse')toque={x:e.clientX,y:e.clientY}});
$app.addEventListener('pointerup',e=>{
  if(!toque||ses.view!=='guia'||$app.querySelector('.glos')){toque=null;return}
  const dx=e.clientX-toque.x,dy=e.clientY-toque.y,g=ses.guia;toque=null;
  if(Math.abs(dx)<50||Math.abs(dx)<Math.abs(dy)*1.5)return;
  if(dx<0&&g.i<g.unit.guia.length-1)ACCIONES.guianext();else if(dx>0&&g.i>0)ACCIONES.guiaprev();
});

// Enlace directo a la política de privacidad (desde bienvenida.html): «./?privacidad» la abre sin pedir antes el aviso legal.
// «Volver» lleva al inicio, que sí pide aceptar el aviso. Va en la query, no en el fragmento, que usa el retorno de la cuenta.
if(typeof location!=='undefined'&&/[?&]privacidad\b/.test(location.search||'')){ses.view='privacidad';ses.privDesde='home'}
render();

// Cuenta: al volver del enlace del correo se guarda la sesión; con sesión, se fusiona con lo guardado en el servidor.
// Solo se vuelve a dibujar si cambió algo y no hay una lección en curso.
const redibujar=c=>{if(c&&['home','stats'].includes(ses.view))render()};
if(cuentaActiva()&&typeof location!=='undefined'){
  leerRetorno(location.hash,()=>history.replaceState(null,'',location.pathname+location.search),m=>confirm(m))
    .then(nueva=>{if(nueva==='rechazado')toast(t.cuentaAjena);else if(nueva)toast(t.cuentaHecha);return sesion()?sincronizar():false})
    .then(c=>redibujar(c||ses.view==='stats'),()=>{if(ses.view==='stats')render()});
}

// PWA: el service worker solo se registra servido por http(s) (no en file:// ni en los tests).
if(typeof window.addEventListener==='function'){
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();ses.installEvt=e;if(ses.view==='home'){ses.homeY=window.scrollY;render()}});
  window.addEventListener('appinstalled',()=>{ses.installEvt=null;toast(t.instalada)});
}
if(typeof navigator!=='undefined'&&'serviceWorker' in navigator&&typeof location!=='undefined'&&/^https?:$/.test(location.protocol)){
  navigator.serviceWorker.register('sw.js').catch(()=>{});
}

// API mínima para tests (test/smoke.mjs)
export const api={sumarRacha,glos,openGlosario:()=>{ses.view='glosario';render()},migrar,exportar,leerCopia,importar,FLAT,CASOS,SEMANA,MERCADO,PLACEMENT,simulate,simHist,aportaciones,historia,ITINERARIOS,itinActual,
  openCalc:()=>{ses.view='calc';render()},openSim:()=>{ses.simDraft=null;ses.view='sim';render()},
  openStats:()=>{ses.view='stats';render()},act:(a,ds={})=>ACCIONES[a]({dataset:ds}),getView:()=>ses.view,startWeak:()=>startRun(STATS_L),
  simDraftSet:p=>{ses.simDraft=p},simSave,goHome:()=>{ses.view='home';render()},startTest:()=>startRun(TEST_L),startNivel:tr=>startRun({id:'nivel-'+tr,title:t.pruebaNivel,kind:'nivel',track:tr}),srsDue,
  acceptLegal:()=>{S.legal=LEGAL_V},startSrs:()=>startRun(SRS_L),startReto:()=>startRun(RETO_L),retoHoy,ordenFijo,fusionar,configurar,enviarEnlace,leerRetorno,sincronizar,cerrarSesion,borrarCuenta,sesion,setTrack:id=>{S.track=id},skipBasics:()=>{S.skipBasics=true},
  homeHTML,privacidadHTML,legalHTML,startRun,lessonHTML,check,next,resultHTML,failHTML,render,getRun:()=>ses.run,setSel:v=>{ses.run.sel=v},setVal:v=>{ses.run.val=v},getState:()=>S};
