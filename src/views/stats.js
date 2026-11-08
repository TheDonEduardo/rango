// Estadísticas guardadas en el dispositivo: progreso por ruta, acierto a la primera, tiempo de estudio
// y «puntos débiles» (ejercicios cuyo último primer intento fue un fallo), con un repaso de esos ejercicios.
// S.stats.ex[id] = {n: veces respondido, f: fallos a la primera, u: 1 si el último primer intento fue correcto}.
import {fmt,esc,tx} from '../util.js';
import {icoX} from '../icons.js';
import {FLAT,TRACKS,EXBYID,trackOf} from '../content.js';
import {S,streakNow} from '../state.js';

export const STATS_L={id:'weak',title:'Puntos débiles',kind:'weak'};
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
const tiempo=m=>m<60?`${Math.round(m)} min`:`${Math.floor(m/60)} h ${Math.round(m%60)} min`;
export function statsHTML(){
  const regs=Object.values(S.stats.ex),n=regs.reduce((a,r)=>a+r.n,0),f=regs.reduce((a,r)=>a+r.f,0);
  const rutas=TRACKS.map(t=>{
    const ls=FLAT.filter(l=>l.kind==='lesson'&&trackOf(l.unit)===t.id),hechas=ls.filter(l=>S.done[l.id]);
    const acc=hechas.length?hechas.reduce((a,l)=>a+S.done[l.id].acc,0)/hechas.length:null;
    return `<li><div class="st-h"><b>${t.title}</b><span>${hechas.length} / ${ls.length} lecciones${acc==null?'':` · ${Math.round(acc*100)} % de precisión`}</span></div><div class="bar" role="progressbar" aria-label="Lecciones de ${t.title}" aria-valuemin="0" aria-valuemax="${ls.length}" aria-valuenow="${hechas.length}"><i style="width:${hechas.length/ls.length*100}%"></i></div></li>`;
  }).join('');
  const fl=flojos(5),total=flojos(Infinity).length;
  const lecDe=ex=>FLAT.find(l=>l.id===ex.lesson);
  const debiles=fl.length?`<ul class="weak">${fl.map(ex=>`<li><span>${tx(ex.q.length>90?ex.q.slice(0,88)+'…':ex.q)}</span><small>${esc(lecDe(ex).title)} · fallado ${S.stats.ex[ex.id].f} ${S.stats.ex[ex.id].f===1?'vez':'veces'}</small></li>`).join('')}</ul>
    <button class="btn primary" data-act="weak">Practicar ${Math.min(total,10)} ${Math.min(total,10)===1?'ejercicio':'ejercicios'}</button>`
    :'<p class="note">Aún no hay ejercicios pendientes: los que falles aparecerán aquí hasta que los aciertes a la primera.</p>';
  return `<div class="lesson sim-view estad"><div class="lbar"><button class="x" data-act="home" aria-label="Volver al inicio">${icoX}</button><p class="kind">Estadísticas</p></div>
  <div class="qwrap"><h1 class="q">Tu progreso</h1>
  <dl class="simk"><div><dt>XP</dt><dd>${S.xp}</dd></div><div><dt>Racha</dt><dd>${streakNow()} ${streakNow()===1?'día':'días'}</dd></div>
  <div><dt>Acierto a la primera</dt><dd>${n?fmt((n-f)/n*100,0)+' %':'—'}</dd></div><div><dt>Tiempo de estudio</dt><dd>${tiempo(S.stats.min||0)}</dd></div></dl>
  <ul class="st-rutas">${rutas}</ul>
  <h2 class="sub">Tus puntos débiles</h2>${debiles}
  <p class="src">Estadísticas guardadas solo en este dispositivo. Cuentan desde que se añadieron, no desde tu primera lección.</p></div>
  <div><button class="btn line" data-act="home">Volver</button></div></div>`;
}
