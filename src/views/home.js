// Inicio: cabecera, meta diaria, selector de ruta, tarjetas (test, simuladores, continuar, repaso) y camino de lecciones.
import {GOAL,RH,OFFS,esc} from '../util.js';
import {ico,LOGO} from '../icons.js';
import {glyph} from '../charts.js';
import {UNITS,FLAT,CASOS,SEMANA,TRACKS,PLACEMENT,trackOf,exCount} from '../content.js';
import {S,streakNow,dayXpNow,advancedOpen,statuses,srsDue,srsResumen} from '../state.js';
import {ses} from '../ui.js';
import {simCardHTML} from './sim.js';
import {t} from '../textos.js';

// Herramientas de desarrollo (desbloquear todo, reiniciar): solo con ?dev en la dirección.
const DEV=typeof location!=='undefined'&&/[?&]dev\b/.test(location.search||'');

export function homeHTML(){
  const st=statuses(),sk=streakNow(),dx=dayXpNow();
  let h=`<header class="top"><h1 class="brand">${LOGO}<span>Rango</span></h1><div class="stats"><span class="chip fire" aria-label="${t.racha(sk)}">${ico('flame')}<b>${sk}</b></span><span class="chip xp" aria-label="${t.xpTotal(S.xp)}">${ico('bolt')}<b>${S.xp}</b></span><button class="chip vstat" data-act="stats" aria-label="${t.verProgreso}">${ico('bars')}</button></div></header><div class="home">`;
  h+=`<section class="goal" aria-label="${t.metaDiaria}"><div class="goal-h"><span>${t.metaHoy}</span><span>${Math.min(dx,GOAL)} / ${GOAL} XP</span></div><div class="bar" role="progressbar" aria-label="${t.metaHoy}" aria-valuemin="0" aria-valuemax="${GOAL}" aria-valuenow="${Math.min(dx,GOAL)}"><i style="width:${Math.min(100,dx/GOAL*100)}%"></i></div></section>`;
  h+=`<nav class="tracks" aria-label="${t.ruta}">${TRACKS.map(r=>`<button data-act="track" data-track="${r.id}" aria-pressed="${S.track===r.id}">${r.title}</button>`).join('')}</nav>`;
  const TF=FLAT.filter(l=>trackOf(l.unit)===S.track);
  if(S.track!=='basico'&&!advancedOpen())h+=`<section class="gate"><p>${t.bloqueoRuta}</p><div class="row"><button class="btn line" data-act="track" data-track="basico">${t.irBasicos}</button><button class="btn ghost" data-act="skipbasics">${t.saltarBasicos}</button></div></section>`;
  if(S.track==='basico'&&!S.placement&&!Object.keys(S.done).length)h+=`<section class="test" aria-label="${t.testNivel}"><div><b>${t.testPregunta}</b><span>${t.testExplica(PLACEMENT.length)}</span></div><div class="row"><button class="btn primary" data-act="test">${t.hacerTest}</button><button class="btn ghost" data-act="notest">${t.desdeCero}</button></div></section>`;
  if(S.track==='tecnico'&&SEMANA&&advancedOpen())h+=simCardHTML();
  if(S.track==='pasiva'&&advancedOpen())h+=`<section class="sim" aria-label="${t.calcTitulo}"><b>${t.calcTitulo}</b><div class="simrow"><span>${t.calcExplica}</span><button class="btn primary" data-act="calc">${t.abrir}</button></div></section>`;
  // Atajo a la siguiente lección cuando ya no está en la primera unidad (el camino se hace largo).
  const cur=TF.find(l=>st[l.id]==='current'),primera=UNITS.find(u=>trackOf(u)===S.track);
  if(cur&&cur.unit!==primera)h+=`<section class="cont" aria-label="${t.siguienteLeccion}"><div><span>${t.unidadN(cur.unit.n)} · ${esc(cur.unit.title)}</span><b>${esc(cur.title)}</b></div><button class="btn primary" data-act="open" data-id="${cur.id}">${t.continuar}</button></section>`;
  const due=srsDue().length;
  if(due)h+=`<section class="srs" aria-label="${t.repasoDia}"><div><b>${t.repasoDia}</b><span>${t.repasoPendiente(due)}${srsResumen().aprendidos?` · ${t.aprendidos(srsResumen().aprendidos)}`:''}</span></div><button class="btn primary" data-act="srs">${t.repasar}</button></section>`;
  UNITS.filter(u=>trackOf(u)===S.track).forEach(u=>{
    if(!u.lessons){
      h+=`<section class="unit soon"><div class="ban"><div><div class="u">${t.unidadN(u.n)}</div><h2>${u.title}</h2><p>${u.blurb}</p></div><span class="cnt">${t.proximamente}</span></div></section>`;
      return;
    }
    const items=FLAT.filter(l=>l.unit===u),doneN=items.filter(l=>S.done[l.id]).length,completa=doneN===items.length,abierta=ses.abiertas.has(u.id);
    const pliegue=completa?`<button class="btn ghost unfold" data-act="unfold" data-id="${u.id}" aria-expanded="${abierta}">${abierta?t.plegar:t.verLecciones}</button>`:'';
    h+=`<section class="unit${completa?' hecha':''}" aria-label="${t.unidadN(u.n)}: ${u.title}"><div class="ban"><div><div class="u">${t.unidadN(u.n)}</div><h2>${u.title}</h2><p>${u.blurb}</p>${u.guia?`<button class="btn ghost unfold" data-act="guia" data-id="${u.id}" aria-label="${t.verGuia(esc(u.title))}">${t.guia}</button>`:''}${pliegue}</div><span class="cnt">${completa?t.completada:`${doneN} / ${items.length}`}</span></div>`;
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
      const sub=s==='done'?t.precision(Math.round(rec.acc*100)):s==='locked'?t.bloqueada:t.nEjercicios(exCount(l));
      const stx=t.estadoNodo[s];
      h+=`<button class="node ${s}" style="--i:${k};--off:${off}" data-act="open" data-id="${l.id}" aria-label="${esc(l.title)}, ${stx}"${s==='locked'?' aria-disabled="true"':''}><span class="g">${glyph(s,rec?rec.acc:null)}</span><span class="nt">${esc(l.title)}</span><span class="ns">${sub}</span></button>`;
    });
    h+='</div></section>';
  });
  if(S.track==='fundamental'&&CASOS)h+=`<p class="src">${t.fuenteCasos(esc(CASOS.fuente),esc(CASOS.fecha))}</p>`;
  h+=`</div><footer class="foot-home"><p>${t.pie} <button class="link" data-act="legal">${t.avisoLegal}</button> · <button class="link" data-act="glosario">${t.glosario}</button></p>${installHTML()}${DEV?`<div class="row"><button class="btn ghost" data-act="unlock">${S.all?t.rebloquear:t.desbloquear}</button><button class="btn ghost" data-act="reset">${ses.resetArm?t.reiniciarConfirma:t.reiniciar}</button></div>`:''}</footer>`;
  return h;
}

// Instalar como app: botón cuando el navegador lo ofrece (Android, Chrome); en iPhone/iPad, indicación manual.
function installHTML(){
  if(ses.installEvt)return `<button class="btn line install" data-act="install">${t.instalar}</button>`;
  const nav=typeof navigator!=='undefined'?navigator:null;
  if(nav&&/iP(hone|ad|od)/.test(nav.userAgent||'')&&!nav.standalone)return `<p>${t.instalarIos}</p>`;
  return '';
}
