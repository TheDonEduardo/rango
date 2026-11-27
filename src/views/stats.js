// Estadísticas guardadas en el dispositivo: progreso por ruta, acierto a la primera, tiempo de estudio
// y «puntos débiles» (ejercicios cuyo último primer intento fue un fallo), con un repaso de esos ejercicios.
// S.stats.ex[id] = {n: veces respondido, f: fallos a la primera, u: 1 si el último primer intento fue correcto}.
import {fmt,esc,tx} from '../util.js';
import {icoX} from '../icons.js';
import {UNITS,FLAT,TRACKS,EXBYID,trackOf} from '../content.js';
import {S,streakNow,SRS_MAX,srsResumen,META_OPC,PROTECTOR_MAX} from '../state.js';
import {ses} from '../ui.js';
import {medicionDisponible} from '../medicion.js';
import {cuentaActiva,sesion,estadoCuenta} from '../sync.js';
import {guiasLeidas} from './guia.js';
import {t} from '../textos.js';

export const STATS_L={id:'weak',title:t.debilesTitulo,kind:'weak'};
export function statRecord(ex,ok){
  if(!ex.id)return;
  const r=S.stats.ex[ex.id]||{n:0,f:0,u:1};
  r.n++;if(!ok)r.f++;r.u=ok?1:0;
  S.stats.ex[ex.id]=r;
}
// Los n ejercicios más fallados entre los que fallaste la última vez.
export function flojos(n,destreza){
  const tipos=destreza?DESTREZAS.find(d=>d.id===destreza)?.tipos:null;
  return Object.entries(S.stats.ex).filter(([id,r])=>!r.u&&EXBYID.has(id)&&(!tipos||tipos.includes(EXBYID.get(id).t)))
    .sort((a,b)=>b[1].f-a[1].f||b[1].f/b[1].n-a[1].f/a[1].n).slice(0,n).map(([id])=>EXBYID.get(id));
}
// Destrezas: tipos de ejercicio agrupados. Acierto = 1 − fallos a la primera ÷ veces respondido (mismo dato que el
// «Acierto a la primera» global, así que suma los intentos y no promedia ejercicios). La más floja solo se marca con
// DESTREZA_MIN respuestas en al menos dos destrezas, para comparar con datos y no con ruido.
export const DESTREZAS=[{id:'calculo',tipos:['num','slide']},{id:'graficos',tipos:['tap','level','plan','zone']},{id:'criterio',tipos:['choice','order','match']}];
export const DESTREZA_MIN=10;
export function destrezasStats(reg,byId){
  const out=DESTREZAS.map(d=>({id:d.id,n:0,f:0,ejercicios:0,pct:null,floja:false}));
  for(const [id,r] of Object.entries(reg)){
    const ex=byId.get(id);if(!ex)continue;
    const o=out[DESTREZAS.findIndex(d=>d.tipos.includes(ex.t))];if(!o)continue;
    o.n+=r.n;o.f+=r.f;o.ejercicios++;
  }
  for(const o of out)if(o.n)o.pct=Math.round((1-o.f/o.n)*100);
  const ok=out.filter(o=>o.n>=DESTREZA_MIN);
  if(ok.length>=2){const m=Math.min(...ok.map(o=>1-o.f/o.n));const w=ok.filter(o=>1-o.f/o.n===m);if(w.length===1)w[0].floja=true}
  return out;
}
// Recordatorio diario para el calendario del dispositivo (archivo .ics): no se envía nada a ningún servidor.
const icsEsc=v=>String(v).replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n');
const icsPlegar=l=>{const r=[];let x=Array.from(l);let cur='';for(const c of x){if(new TextEncoder().encode(cur+c).length>(r.length?74:75)){r.push(cur);cur=c}else cur+=c}r.push(cur);return r.map((z,i)=>i?' '+z:z).join('\r\n')};
const d2=n=>String(n).padStart(2,'0');
const icsLocal=d=>`${d.getFullYear()}${d2(d.getMonth()+1)}${d2(d.getDate())}T${d2(d.getHours())}${d2(d.getMinutes())}00`;
const icsUtc=d=>`${d.getUTCFullYear()}${d2(d.getUTCMonth()+1)}${d2(d.getUTCDate())}T${d2(d.getUTCHours())}${d2(d.getUTCMinutes())}${d2(d.getUTCSeconds())}Z`;
export function icsRecordatorio({hora='20:00',laborables=false,url='',hoy=new Date()}={}){
  const m=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(hora)||['','20','00'];
  const ini=new Date(hoy.getFullYear(),hoy.getMonth(),hoy.getDate()+1,+m[1],+m[2]);
  // Con «lunes a viernes», si mañana es fin de semana el primer evento se mueve al lunes (DTSTART debe cumplir la regla).
  while(laborables&&(ini.getDay()===0||ini.getDay()===6))ini.setDate(ini.getDate()+1);
  const fin=new Date(ini.getTime()+10*60000);
  const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Rango//Recordatorio//ES','CALSCALE:GREGORIAN','BEGIN:VEVENT',
    `UID:rango-${hoy.getTime()}-${m[1]}${m[2]}-${laborables?'lv':'td'}@rango`,`DTSTAMP:${icsUtc(hoy)}`,
    `DTSTART:${icsLocal(ini)}`,`DTEND:${icsLocal(fin)}`,
    laborables?'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR':'RRULE:FREQ=DAILY',
    `SUMMARY:${icsEsc(t.recTitulo)}`,`DESCRIPTION:${icsEsc(url?t.recDescripcion(url):t.recDescripcion(''))}`,
    ...(url?[`URL:${url}`]:[]),
    'BEGIN:VALARM','ACTION:DISPLAY',`DESCRIPTION:${icsEsc(t.recTitulo)}`,'TRIGGER:-PT0M','END:VALARM','END:VEVENT','END:VCALENDAR'];
  return L.map(icsPlegar).join('\r\n')+'\r\n';
}
const dom=r=>UNITS.filter(u=>trackOf(u)===r&&S.dominadas[u.id]).length;
// Cuenta (solo si config.js trae el proyecto de Supabase): acceso por enlace mágico, estado y baja.
function cuentaHTML(){
  if(!cuentaActiva())return '';
  const s=sesion();
  if(!s)return `<h2 class="sub">${t.cuentaTitulo}</h2><p class="note">${t.cuentaNota} <button class="link" data-act="privacidad">${t.privTitulo}</button></p>
  <div class="row cuenta"><input type="email" id="cuenta-email" autocomplete="email" inputmode="email" aria-label="${t.cuentaEmail}" placeholder="${t.cuentaEmail}"><button class="btn primary" data-act="cuentaenviar">${t.cuentaEnviar}</button></div>`;
  const h=estadoCuenta.ultima?estadoCuenta.ultima.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}):null;
  return `<h2 class="sub">${t.cuentaTitulo}</h2><p class="note">${t.cuentaConectado(esc(s.user.email))} ${estadoCuenta.error?t.cuentaError:h?t.cuentaSincronizado(h):t.cuentaPendiente}</p>
  <div class="row cuenta"><button class="btn line" data-act="cuentacerrar">${t.cuentaCerrar}</button><button class="btn ghost" data-act="cuentaborrar">${ses.borrarArm?t.cuentaBorrarConfirma:t.cuentaBorrar}</button></div>`;
}
export function statsHTML(){
  const regs=Object.values(S.stats.ex),n=regs.reduce((a,r)=>a+r.n,0),f=regs.reduce((a,r)=>a+r.f,0);
  const rutas=TRACKS.map(ru=>{
    const ls=FLAT.filter(l=>l.kind==='lesson'&&trackOf(l.unit)===ru.id),hechas=ls.filter(l=>S.done[l.id]);
    const acc=hechas.length?hechas.reduce((a,l)=>a+S.done[l.id].acc,0)/hechas.length:null;
    return `<li><div class="st-h"><b>${ru.title}</b><span>${t.leccionesRuta(hechas.length,ls.length,acc==null?null:Math.round(acc*100))}${(d=>d?` · ${t.nDominadas(d)}`:'')(dom(ru.id))}</span></div><div class="bar" role="progressbar" aria-label="${t.leccionesDe(ru.title)}" aria-valuemin="0" aria-valuemax="${ls.length}" aria-valuenow="${hechas.length}"><i style="width:${hechas.length/ls.length*100}%"></i></div></li>`;
  }).join('');
  const todos=flojos(Infinity),fl=todos.slice(0,5),total=todos.length,sr=srsResumen();
  const lecDe=ex=>FLAT.find(l=>l.id===ex.lesson);
  const debiles=fl.length?`<ul class="weak">${fl.map(ex=>`<li><span>${tx(ex.q.length>90?ex.q.slice(0,88)+'…':ex.q)}</span><small>${esc(lecDe(ex).title)} · ${t.fallado(S.stats.ex[ex.id].f)}</small></li>`).join('')}</ul>
    <button class="btn primary" data-act="weak">${t.practicar(Math.min(total,SRS_MAX))}</button>`
    :`<p class="note">${t.sinDebiles}</p>`;
  const dz=destrezasStats(S.stats.ex,EXBYID);
  const destrezas=dz.some(o=>o.n)?`<h2 class="sub">${t.destrezasTitulo}</h2><ul class="st-rutas destrezas">${dz.map(o=>{
    const nom=t.destrezas[o.id],hay=flojos(Infinity,o.id).length;
    return `<li><div class="st-h"><b>${nom}</b><span>${o.n?`${o.pct} % · ${t.nEjercicios(o.ejercicios)}`:t.sinDatos}${o.floja?` · <strong class="floja">${t.masFloja}</strong>`:''}</span></div><div class="bar" role="progressbar" aria-label="${t.aciertoDe(nom)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${o.pct||0}"><i style="width:${o.pct||0}%"></i></div>${hay?`<button class="btn line dz-btn" data-act="weakd" data-d="${o.id}">${t.practicarDestreza(nom)}</button>`:''}</li>`}).join('')}</ul>`:'';
  const rec=S.recordatorio;
  const recordatorio=`<h2 class="sub">${t.recTituloSec}</h2><p class="note">${t.recNota}</p>
  <div class="row rec"><label>${t.recHora}<input type="time" id="rec-hora" value="${rec.hora}" required></label><label>${t.recDias}<select id="rec-dias"><option value="0"${rec.laborables?'':' selected'}>${t.recTodos}</option><option value="1"${rec.laborables?' selected':''}>${t.recLaborables}</option></select></label></div>
  <button class="btn line" data-act="recordatorio">${t.recBoton}</button><p class="src">${t.recAviso}</p>`;
  return `<div class="lesson sim-view estad"><div class="lbar"><button class="x" data-act="home" aria-label="${t.volverInicio}">${icoX}</button><p class="kind">${t.estadisticas}</p></div>
  <div class="qwrap"><h1 class="q">${t.tuProgreso}</h1>
  <dl class="simk"><div><dt>${t.xp}</dt><dd>${S.xp}</dd></div><div><dt>${t.rachaM}</dt><dd>${t.dias(streakNow())}</dd></div>
  <div><dt>${t.aciertoPrimera}</dt><dd>${n?fmt((n-f)/n*100,0)+' %':'—'}</dd></div><div><dt>${t.tiempoEstudio}</dt><dd>${t.tiempo(S.stats.min||0)}</dd></div></dl>
  <h2 class="sub">${t.metaDiaria}</h2><div class="meta-opc" role="group" aria-label="${t.metaDiaria}">${META_OPC.map(m=>`<button class="btn ${S.meta===m?'primary':'line'}" data-act="meta" data-m="${m}" aria-pressed="${S.meta===m}">${t.metaXP(m)}</button>`).join('')}</div>
  <h2 class="sub">${t.sonidos}</h2><p class="note">${t.sonidosNota}</p><button class="btn ${S.sonido!==false?'primary':'line'}" data-act="sonido" aria-pressed="${S.sonido!==false}">${t.sonidosBtn}</button>
  <p class="note">${t.protectores(S.protector,PROTECTOR_MAX)}</p>
  <ul class="st-rutas">${rutas}</ul>
  <p class="note">${(g=>t.guiasLeidasT(g.leidas,g.total))(guiasLeidas())}</p>
  <h2 class="sub">${t.repasoTitulo}</h2><dl class="simk"><div><dt>${t.enRepaso}</dt><dd>${sr.enRepaso}</dd></div><div><dt>${t.aprendidosT}</dt><dd>${sr.aprendidos}</dd></div></dl><p class="note">${t.repasoNota}</p>
  ${destrezas}
  <h2 class="sub">${t.puntosDebiles}</h2>${debiles}
  ${recordatorio}
  ${medicionDisponible()?`<h2 class="sub">${t.medicionTitulo}</h2><p class="note">${t.medicionNota}</p><button class="btn line" data-act="medir" data-v="${S.medir?0:1}" aria-pressed="${S.medir}">${S.medir?t.medicionQuitar:t.medicionActivar}</button>`:''}
  ${cuentaHTML()}
  <h2 class="sub">${t.copiaTitulo}</h2><p class="note">${sesion()?t.copiaNotaCuenta:t.copiaNota}</p>
  <div class="row copia"><button class="btn line" data-act="exportar">${t.copiaGuardar}</button><button class="btn line" data-act="importar">${t.copiaRecuperar}</button><input type="file" id="imp-file" accept="application/json,.json" hidden></div>
  ${ses.copia?`<div class="confirma" role="alert"><p>${t.copiaResumen(esc(ses.copia.resumen.fecha),ses.copia.resumen.xp,ses.copia.resumen.lecciones)}</p><div class="row"><button class="btn primary" data-act="impok">${t.copiaSustituir}</button><button class="btn ghost" data-act="impno">${t.cancelar}</button></div></div>`:''}
  <p class="src">${t.statsNota}</p></div>
  <div class="stack"><button class="btn line" data-act="compartir">${t.compartirProgreso}</button><button class="btn line" data-act="home">${t.volver}</button></div></div>`;
}
