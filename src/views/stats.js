// Estadísticas guardadas en el dispositivo: progreso por ruta, acierto a la primera, tiempo de estudio
// y «puntos débiles» (ejercicios cuyo último primer intento fue un fallo), con un repaso de esos ejercicios.
// S.stats.ex[id] = {n: veces respondido, f: fallos a la primera, u: 1 si el último primer intento fue correcto}.
import {fmt,esc,tx} from '../util.js';
import {icoX} from '../icons.js';
import {FLAT,TRACKS,EXBYID,trackOf} from '../content.js';
import {S,streakNow,SRS_MAX,srsResumen} from '../state.js';
import {t} from '../textos.js';

export const STATS_L={id:'weak',title:t.debilesTitulo,kind:'weak'};
export function statRecord(ex,ok){
  if(!ex.id)return;
  const r=S.stats.ex[ex.id]||{n:0,f:0,u:1};
  r.n++;if(!ok)r.f++;r.u=ok?1:0;
  S.stats.ex[ex.id]=r;
}
// Los n ejercicios más fallados entre los que fallaste la última vez.
export function flojos(n){
  return Object.entries(S.stats.ex).filter(([id,r])=>!r.u&&EXBYID.has(id))
    .sort((a,b)=>b[1].f-a[1].f||b[1].f/b[1].n-a[1].f/a[1].n).slice(0,n).map(([id])=>EXBYID.get(id));
}
export function statsHTML(){
  const regs=Object.values(S.stats.ex),n=regs.reduce((a,r)=>a+r.n,0),f=regs.reduce((a,r)=>a+r.f,0);
  const rutas=TRACKS.map(ru=>{
    const ls=FLAT.filter(l=>l.kind==='lesson'&&trackOf(l.unit)===ru.id),hechas=ls.filter(l=>S.done[l.id]);
    const acc=hechas.length?hechas.reduce((a,l)=>a+S.done[l.id].acc,0)/hechas.length:null;
    return `<li><div class="st-h"><b>${ru.title}</b><span>${t.leccionesRuta(hechas.length,ls.length,acc==null?null:Math.round(acc*100))}</span></div><div class="bar" role="progressbar" aria-label="${t.leccionesDe(ru.title)}" aria-valuemin="0" aria-valuemax="${ls.length}" aria-valuenow="${hechas.length}"><i style="width:${hechas.length/ls.length*100}%"></i></div></li>`;
  }).join('');
  const fl=flojos(5),total=flojos(Infinity).length;
  const lecDe=ex=>FLAT.find(l=>l.id===ex.lesson);
  const debiles=fl.length?`<ul class="weak">${fl.map(ex=>`<li><span>${tx(ex.q.length>90?ex.q.slice(0,88)+'…':ex.q)}</span><small>${esc(lecDe(ex).title)} · ${t.fallado(S.stats.ex[ex.id].f)}</small></li>`).join('')}</ul>
    <button class="btn primary" data-act="weak">${t.practicar(Math.min(total,SRS_MAX))}</button>`
    :`<p class="note">${t.sinDebiles}</p>`;
  return `<div class="lesson sim-view estad"><div class="lbar"><button class="x" data-act="home" aria-label="${t.volverInicio}">${icoX}</button><p class="kind">${t.estadisticas}</p></div>
  <div class="qwrap"><h1 class="q">${t.tuProgreso}</h1>
  <dl class="simk"><div><dt>${t.xp}</dt><dd>${S.xp}</dd></div><div><dt>${t.rachaM}</dt><dd>${t.dias(streakNow())}</dd></div>
  <div><dt>${t.aciertoPrimera}</dt><dd>${n?fmt((n-f)/n*100,0)+' %':'—'}</dd></div><div><dt>${t.tiempoEstudio}</dt><dd>${t.tiempo(S.stats.min||0)}</dd></div></dl>
  <ul class="st-rutas">${rutas}</ul>
  <h2 class="sub">${t.repasoTitulo}</h2><dl class="simk"><div><dt>${t.enRepaso}</dt><dd>${srsResumen().enRepaso}</dd></div><div><dt>${t.aprendidosT}</dt><dd>${srsResumen().aprendidos}</dd></div></dl><p class="note">${t.repasoNota}</p>
  <h2 class="sub">${t.puntosDebiles}</h2>${debiles}
  <p class="src">${t.statsNota}</p></div>
  <div><button class="btn line" data-act="home">${t.volver}</button></div></div>`;
}
