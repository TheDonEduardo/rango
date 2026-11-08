// Inicio: cabecera, meta diaria, selector de ruta, tarjetas (test, simuladores, continuar, repaso) y camino de lecciones.
import {GOAL,RH,OFFS,esc} from '../util.js';
import {ico,LOGO} from '../icons.js';
import {glyph} from '../charts.js';
import {UNITS,FLAT,CASOS,SEMANA,TRACKS,PLACEMENT,trackOf,exCount} from '../content.js';
import {S,streakNow,dayXpNow,advancedOpen,statuses,srsDue} from '../state.js';
import {ses} from '../ui.js';
import {simCardHTML} from './sim.js';

// Herramientas de desarrollo (desbloquear todo, reiniciar): solo con ?dev en la dirección.
const DEV=typeof location!=='undefined'&&/[?&]dev\b/.test(location.search||'');

export function homeHTML(){
  const st=statuses(),sk=streakNow(),dx=dayXpNow();
  let h=`<header class="top"><h1 class="brand">${LOGO}<span>Rango</span></h1><div class="stats"><span class="chip fire" aria-label="Racha de ${sk} ${sk===1?'día':'días'}">${ico('flame')}<b>${sk}</b></span><span class="chip xp" aria-label="${S.xp} XP en total">${ico('bolt')}<b>${S.xp}</b></span><button class="chip vstat" data-act="stats" aria-label="Tu progreso y puntos débiles">${ico('bars')}</button></div></header><div class="home">`;
  h+=`<section class="goal" aria-label="Meta diaria"><div class="goal-h"><span>Meta de hoy</span><span>${Math.min(dx,GOAL)} / ${GOAL} XP</span></div><div class="bar" role="progressbar" aria-label="Meta de hoy" aria-valuemin="0" aria-valuemax="${GOAL}" aria-valuenow="${Math.min(dx,GOAL)}"><i style="width:${Math.min(100,dx/GOAL*100)}%"></i></div></section>`;
  h+=`<nav class="tracks" aria-label="Ruta">${TRACKS.map(t=>`<button data-act="track" data-track="${t.id}" aria-pressed="${S.track===t.id}">${t.title}</button>`).join('')}</nav>`;
  const TF=FLAT.filter(l=>trackOf(l.unit)===S.track);
  if(S.track!=='basico'&&!advancedOpen())h+=`<section class="gate"><p>Esta ruta se abre al completar la ruta <b>Básico</b>.</p><div class="row"><button class="btn line" data-act="track" data-track="basico">Ir a los básicos</button><button class="btn ghost" data-act="skipbasics">Ya opero: saltar los básicos</button></div></section>`;
  if(S.track==='basico'&&!S.placement&&!Object.keys(S.done).length)h+=`<section class="test" aria-label="Test de nivel"><div><b>¿Ya sabes de bolsa?</b><span>Haz el test de nivel: ${PLACEMENT.length} preguntas, unos 5 minutos. Marcaremos lo que ya dominas y, si aciertas casi todo, se abren las demás rutas.</span></div><div class="row"><button class="btn primary" data-act="test">Hacer el test</button><button class="btn ghost" data-act="notest">Empezar desde cero</button></div></section>`;
  if(S.track==='tecnico'&&SEMANA&&advancedOpen())h+=simCardHTML();
  if(S.track==='pasiva'&&advancedOpen())h+=`<section class="sim" aria-label="Simulador de aportaciones"><b>Simulador de aportaciones</b><div class="simrow"><span>Mira cómo crece una cartera aportando cada mes, y cuánto se llevan las comisiones.</span><button class="btn primary" data-act="calc">Abrir</button></div></section>`;
  // Atajo a la siguiente lección cuando ya no está en la primera unidad (el camino se hace largo).
  const cur=TF.find(l=>st[l.id]==='current'),primera=UNITS.find(u=>trackOf(u)===S.track);
  if(cur&&cur.unit!==primera)h+=`<section class="cont" aria-label="Siguiente lección"><div><span>Unidad ${cur.unit.n} · ${esc(cur.unit.title)}</span><b>${esc(cur.title)}</b></div><button class="btn primary" data-act="open" data-id="${cur.id}">Continuar</button></section>`;
  const due=srsDue().length;
  if(due)h+=`<section class="srs" aria-label="Repaso del día"><div><b>Repaso del día</b><span>${due} ${due===1?'ejercicio que fallaste':'ejercicios que fallaste'}</span></div><button class="btn primary" data-act="srs">Repasar</button></section>`;
  UNITS.filter(u=>trackOf(u)===S.track).forEach(u=>{
    if(!u.lessons){
      h+=`<section class="unit soon"><div class="ban"><div><div class="u">Unidad ${u.n}</div><h2>${u.title}</h2><p>${u.blurb}</p></div><span class="cnt">Próximamente</span></div></section>`;
      return;
    }
    const items=FLAT.filter(l=>l.unit===u),doneN=items.filter(l=>S.done[l.id]).length,completa=doneN===items.length,abierta=ses.abiertas.has(u.id);
    const pliegue=completa?`<button class="btn ghost unfold" data-act="unfold" data-id="${u.id}" aria-expanded="${abierta}">${abierta?'Plegar':'Ver lecciones'}</button>`:'';
    h+=`<section class="unit${completa?' hecha':''}" aria-label="Unidad ${u.n}: ${u.title}"><div class="ban"><div><div class="u">Unidad ${u.n}</div><h2>${u.title}</h2><p>${u.blurb}</p>${pliegue}</div><span class="cnt">${completa?'Completada':`${doneN} / ${items.length}`}</span></div>`;
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
      const sub=s==='done'?`Precisión ${Math.round(rec.acc*100)} %`:s==='locked'?'Bloqueada':`${exCount(l)} ejercicios`;
      const stx=s==='done'?'completada':s==='locked'?'bloqueada':'disponible';
      h+=`<button class="node ${s}" style="--i:${k};--off:${off}" data-act="open" data-id="${l.id}" aria-label="${esc(l.title)}, ${stx}"${s==='locked'?' aria-disabled="true"':''}><span class="g">${glyph(s,rec?rec.acc:null)}</span><span class="nt">${esc(l.title)}</span><span class="ns">${sub}</span></button>`;
    });
    h+='</div></section>';
  });
  if(S.track==='fundamental'&&CASOS)h+=`<p class="src">Casos reales con datos de ${esc(CASOS.fuente)} a ${esc(CASOS.fecha)}. Es formación, no una recomendación de inversión.</p>`;
  h+=`</div><footer class="foot-home"><p>Prototipo. El progreso se guarda solo en este navegador. <button class="link" data-act="legal">Aviso legal</button></p>${installHTML()}${DEV?`<div class="row"><button class="btn ghost" data-act="unlock">${S.all?'Volver a bloquear':'Desbloquear todo'}</button><button class="btn ghost" data-act="reset">${ses.resetArm?'Pulsa de nuevo para borrar':'Reiniciar progreso'}</button></div>`:''}</footer>`;
  return h;
}

// Instalar como app: botón cuando el navegador lo ofrece (Android, Chrome); en iPhone/iPad, indicación manual.
function installHTML(){
  if(ses.installEvt)return '<button class="btn line install" data-act="install">Instalar Rango en este dispositivo</button>';
  const nav=typeof navigator!=='undefined'?navigator:null;
  if(nav&&/iP(hone|ad|od)/.test(nav.userAgent||'')&&!nav.standalone)return '<p>Para instalar Rango en tu iPhone: botón Compartir y «Añadir a pantalla de inicio».</p>';
  return '';
}
