// Inicio: cabecera, selector de ruta, un aviso como mucho, «Hoy» (meta, siguiente lección y repaso), la herramienta de la ruta y el camino.
import {RH,OFFS,esc} from '../util.js';
import {ico,LOGO} from '../icons.js';
import {glyph} from '../charts.js';
import {UNITS,FLAT,CASOS,SEMANA,MERCADO,TRACKS,PLACEMENT,trackOf,exCount,libre} from '../content.js';
import {S,streakNow,dayXpNow,advancedOpen,statuses,srsDue,srsResumen,retoHoy,retoHecho} from '../state.js';
import {ses} from '../ui.js';
import {simCardHTML} from './sim.js';
import {t} from '../textos.js';
import {itinActual} from '../itinerarios.js';

// Herramientas de desarrollo (desbloquear todo, reiniciar): solo con ?dev en la dirección.
const DEV=typeof location!=='undefined'&&/[?&]dev\b/.test(location.search||'');

export function homeHTML(){
  const st=statuses(),sk=streakNow(),dx=dayXpNow();
  let h=`<header class="top"><h1 class="brand">${LOGO}<span>Rango</span></h1><div class="stats"><span class="chip fire" aria-label="${t.racha(sk)}">${ico('flame')}<b>${sk}</b></span><span class="chip xp" aria-label="${t.xpTotal(S.xp)}">${ico('bolt')}<b>${S.xp}</b></span><button class="chip vstat" data-act="stats" aria-label="${t.verProgreso}">${ico('bars')}</button></div></header><div class="home"><div class="lado">`;
  h+=`<nav class="tracks" aria-label="${t.ruta}">${TRACKS.map(r=>`<button data-act="track" data-track="${r.id}" aria-pressed="${S.track===r.id}">${r.title}</button>`).join('')}</nav>`;
  const TF=FLAT.filter(l=>trackOf(l.unit)===S.track);
  // Orden fijo: como mucho un aviso (objetivo, ruta cerrada, test o prueba de nivel), después «Hoy» y la herramienta de la ruta.
  // En escritorio, «lado» queda fijo a la izquierda y «camino» (las unidades) a la derecha; en móvil van seguidos.
  h+=avisoHTML(TF)+hoyHTML(st,TF,dx)+herramientaHTML()+'</div><div class="camino">';
  UNITS.filter(u=>trackOf(u)===S.track).forEach(u=>{
    if(!u.lessons){
      h+=`<section class="unit soon"><div class="ban"><div><div class="u">${t.unidadN(u.n)}</div><h2>${u.title}</h2><p>${u.blurb}</p></div><span class="cnt">${t.proximamente}</span></div></section>`;
      return;
    }
    const items=FLAT.filter(l=>l.unit===u),doneN=items.filter(l=>S.done[l.id]).length,completa=doneN===items.length,abierta=ses.abiertas.has(u.id);
    const pliegue=completa?`<button class="btn ghost unfold" data-act="unfold" data-id="${u.id}" aria-expanded="${abierta}">${abierta?t.plegar:t.verLecciones}</button>`:'';
    h+=`<section class="unit${completa?' hecha':''}${u.caso?' final':''}" aria-label="${t.unidadN(u.n)}: ${u.title}"><div class="ban"><div><div class="u">${u.caso?`<span class="fin">${t.casoFinal}</span> · `:''}${t.unidadN(u.n)}</div><h2>${u.title}</h2><p>${u.blurb}</p>${u.guia?`<button class="btn ghost unfold" data-act="guia" data-id="${u.id}" aria-label="${t.verGuia(esc(u.title))}">${t.guia}</button>`:''}${pliegue}</div><span class="cnt">${S.dominadas[u.id]?`<span class="dom">${ico('star')} ${t.dominada}</span>`:completa?t.completada:`${doneN} / ${items.length}`}</span>${completa?'':`<i class="uprog" aria-hidden="true" style="--p:${Math.round(doneN/items.length*100)}%"></i>`}</div>`;
    if(completa&&!abierta){h+='</section>';return}
    h+=`<div class="path" style="--n:${items.length}"><svg class="route" viewBox="0 0 100 ${items.length*RH}" preserveAspectRatio="none" aria-hidden="true">`;
    for(let k=0;k<items.length-1;k++){
      const gi=TF.indexOf(items[k]),x1=50+OFFS[gi%OFFS.length],x2=50+OFFS[(gi+1)%OFFS.length];
      const y1=k*RH+44,y2=(k+1)*RH+44,ym=(y1+y2)/2;
      h+=`<path class="${st[items[k].id]==='done'?'done':''}" d="M${x1} ${y1} C${x1} ${ym} ${x2} ${ym} ${x2} ${y2}"/>`;
    }
    h+='</svg>';
    items.forEach((l,k)=>{
      const gi=TF.indexOf(l),s=st[l.id],rec=S.done[l.id],off=OFFS[gi%OFFS.length];
      const sub=s==='done'?(rec.test?t.superadaTest:t.precision(Math.round((rec.acc||0)*100))):s==='locked'?t.bloqueada:t.nEjercicios(exCount(l));
      const stx=t.estadoNodo[s];
      h+=`<button class="node ${s}" style="--i:${k};--off:${off}" data-act="open" data-id="${l.id}" aria-label="${esc(l.title)}, ${stx}"${s==='locked'?' aria-disabled="true"':''}><span class="g">${glyph(s,rec?rec.acc:null)}</span><span class="nt">${esc(l.title)}</span><span class="ns">${sub}</span></button>`;
    });
    h+='</div></section>';
  });
  if(S.track==='fundamental'&&CASOS)h+=`<p class="src">${t.fuenteCasos(esc(CASOS.fuente),esc(CASOS.fecha))}</p>`;
  h+=`</div></div><footer class="foot-home"><p>${t.pie} <button class="link" data-act="legal">${t.avisoLegal}</button> · <button class="link" data-act="privacidad">${t.privacidad}</button> · <button class="link" data-act="glosario">${t.glosario}</button> · <button class="link" data-act="itinerarios">${t.itinerarios}</button></p>${installHTML()}${DEV?`<div class="row"><button class="btn ghost" data-act="unlock">${S.all?t.rebloquear:t.desbloquear}</button><button class="btn ghost" data-act="reset">${ses.resetArm?t.reiniciarConfirma:t.reiniciar}</button></div>`:''}</footer>`;
  return h;
}

// Decisiones de quien empieza: solo la primera que aplique, para no apilar tarjetas.
function avisoHTML(TF){
  if(!S.objetivo&&!Object.keys(S.done).length)return `<section class="objetivo" aria-label="${t.objetivoTitulo}"><b>${t.objetivoTitulo}</b><div class="obj-opc">${['basico','personal','pasiva','fundamental','tecnico','derivados','cripto'].map(r=>`<button class="btn line" data-act="objetivo" data-track="${r}"><b>${t.objetivos[r][0]}</b><span>${t.objetivos[r][1]}</span></button>`).join('')}</div><div class="row"><button class="btn ghost" data-act="itinerarios">${t.itinVer}</button><button class="btn ghost" data-act="noobjetivo">${t.ahoraNo}</button></div></section>`;
  if(!libre(S.track)&&!advancedOpen())return `<section class="gate"><p>${t.bloqueoRuta}</p><div class="row"><button class="btn line" data-act="track" data-track="basico">${t.irBasicos}</button>${S.placement?'':`<button class="btn line" data-act="test">${t.hacerTest}</button>`}<button class="btn ghost" data-act="skipbasics">${t.saltarBasicos}</button></div></section>`;
  if(S.track==='basico'&&!S.placement&&!Object.keys(S.done).length)return `<section class="test" aria-label="${t.testNivel}"><div><b>${t.testPregunta}</b><span>${t.testExplica(PLACEMENT.length)}</span></div><div class="row"><button class="btn primary" data-act="test">${t.hacerTest}</button><button class="btn ghost" data-act="notest">${t.desdeCero}</button></div></section>`;
  // Prueba de nivel de las rutas avanzadas: para quien aún no ha hecho ninguna lección de la ruta.
  if(S.track!=='basico'&&!S.pruebas[S.track]&&!TF.some(l=>S.done[l.id]))return `<section class="test" aria-label="${t.pruebaNivel}"><div><b>${t.nivelPregunta}</b><span>${t.nivelExplica}</span></div><div class="row"><button class="btn primary" data-act="nivel" data-track="${S.track}">${t.hacerPrueba}</button><button class="btn ghost" data-act="nonivel" data-track="${S.track}">${t.desdeCero}</button></div></section>`;
  return '';
}

// «Hoy»: meta diaria, siguiente lección y repaso en una sola tarjeta. Sin nada que hacer ni XP, no sale.
function hoyHTML(st,TF,dx){
  const due=srsDue().length;
  // La siguiente lección, si ya has empezado la ruta y no está a la vista (fuera de la primera unidad).
  const cur=TF.find(l=>st[l.id]==='current'),primera=UNITS.find(u=>trackOf(u)===S.track);
  const sigue=cur&&cur.unit!==primera&&advancedOpenFor(S.track);
  const reto=retoHoy(),hecho=retoHecho();
  const iti=itinActual();
  if(!S.xp&&!due&&!sigue&&!iti)return '';
  let h=`<section class="hoy" aria-label="${t.hoy}"><div class="goal"><div class="goal-h"><span>${t.metaHoy}</span><span>${Math.min(dx,S.meta)} / ${S.meta} XP</span></div><div class="bar" role="progressbar" aria-label="${t.metaHoy}" aria-valuemin="0" aria-valuemax="${S.meta}" aria-valuenow="${Math.min(dx,S.meta)}"><i style="width:${Math.min(100,dx/S.meta*100)}%"></i></div></div>`;
  if(sigue)h+=`<div class="hoy-row cont"><div><span>${t.unidadN(cur.unit.n)} · ${esc(cur.unit.title)}</span><b>${esc(cur.title)}</b></div><button class="btn primary" data-act="open" data-id="${cur.id}">${t.continuar}</button></div>`;
  if(iti)h+=iti.sig?`<div class="hoy-row itin-r"><div><span>${t.itinPaso(esc(t.itin[iti.it.id][0]),iti.hechas+1,iti.total)}</span><b>${esc(iti.sig.title)}</b></div><button class="btn ${sigue?'line':'primary'}" data-act="itinsig">${t.itinSeguir}</button></div>`
    :`<div class="hoy-row itin-r"><div><b>${t.itinHecho}</b><span>${esc(t.itin[iti.it.id][0])}</span></div><button class="btn ${sigue?'line':'primary'}" data-act="itinerarios">${t.itinResumen}</button></div>`;
  if(reto)h+=hecho?`<div class="hoy-row reto"><div><b>${t.retoDia}</b><span>${t.retoHecho(S.reto.ok)}</span></div></div>`
    :`<div class="hoy-row reto"><div><b>${t.retoDia}</b><span>${t.retoExplica}</span></div><button class="btn ${sigue||(iti&&iti.sig)?'line':'primary'}" data-act="reto">${t.responder}</button></div>`;
  if(MERCADO){
    const m=S.mercado&&S.mercado.semana===MERCADO.semana?S.mercado:null;
    h+=m?`<div class="hoy-row merc"><div><b>${t.mercadoTitulo}</b><span>${t.mercadoHecho(m.ok,m.total)}</span></div></div>`
      :`<div class="hoy-row merc"><div><b>${t.mercadoTitulo}</b><span>${t.mercadoExplica(MERCADO.ex.length,esc(MERCADO.hasta))}</span></div><button class="btn line" data-act="mercado">${t.empezar}</button></div>`;
  }
  if(due)h+=`<div class="hoy-row srs"><div><b>${t.repasoDia}</b><span>${t.repasoPendiente(due)}${(n=>n?` · ${t.aprendidos(n)}`:'')(srsResumen().aprendidos)}</span></div><button class="btn ${sigue||(iti&&iti.sig)||(reto&&!hecho)?'line':'primary'}" data-act="srs">${t.repasar}</button></div>`;
  return h+'</section>';
}
const advancedOpenFor=r=>libre(r)||advancedOpen();

// Herramienta propia de la ruta: Operación de la semana (Técnico) o simulador de aportaciones (Pasiva).
function herramientaHTML(){
  if(!advancedOpen())return '';
  if(S.track==='tecnico'&&SEMANA)return simCardHTML();
  if(S.track==='pasiva')return `<section class="sim" aria-label="${t.calcTitulo}"><b>${t.calcTitulo}</b><div class="simrow"><span>${t.calcExplica}</span><button class="btn line" data-act="calc">${t.abrir}</button></div></section>`;
  return '';
}

// Instalar como app: botón cuando el navegador lo ofrece (Android, Chrome); en iPhone/iPad, indicación manual.
function installHTML(){
  if(ses.installEvt)return `<button class="btn line install" data-act="install">${t.instalar}</button>`;
  const nav=typeof navigator!=='undefined'?navigator:null;
  if(nav&&/iP(hone|ad|od)/.test(nav.userAgent||'')&&!nav.standalone)return `<p>${t.instalarIos}</p>`;
  return '';
}
