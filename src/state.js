// Progreso guardado en el dispositivo (localStorage): formato, migraciones, racha, rutas y repaso espaciado.
import {KEY,today,yest,addDays} from './util.js';
import {FLAT,EXBYID,TRACKS,trackOf,libre} from './content.js';

// Versión del formato guardado. Cada cambio de formato añade un paso a MIGRAR (de la versión n a la n+1),
// así el progreso de quien ya usa la app se convierte en vez de perderse.
export const STATE_V=3;
export const DEF=()=>({v:STATE_V,xp:0,streak:0,last:null,day:null,dayXp:0,done:{},all:false,track:'basico',skipBasics:false,legal:0,srs:{},sim:{},calc:null,itin:null,mercado:null,stats:{ex:{},min:0},guias:{},leidas:{},aprendidos:{},dominadas:{},pruebas:{},meta:40,protector:0,objetivo:null,medir:false,reto:null,mod:0});
// Meta diaria elegible y máximo de protectores (antes de load(), que sanea el estado al leerlo).
export const META_OPC=[20,40,80], PROTECTOR_MAX=2;
const MIGRAR={
  // 1 → 2: el repaso espaciado identificaba los ejercicios por posición («lección#índice», desde 0);
  // ahora cada ejercicio tiene un id estable («lección-n», desde 1).
  1:j=>{const srs={};for(const k in j.srs||{}){const m=/^(.+)#(\d+)$/.exec(k);srs[m?m[1]+'-'+(+m[2]+1):k]=j.srs[k]}j.srs=srs;return j},
  // 2 → 3: la Operación de la semana pasa a ser retrospectiva y se resuelve al comprobar (el plan lleva siempre `res`).
  // Los planes pendientes de la versión anterior (sin resultado) se descartan: ya no hay datos para resolverlos.
  2:j=>{const sim={};if(j.sim&&typeof j.sim==='object'&&!Array.isArray(j.sim))for(const k in j.sim){const g=j.sim[k];if(g&&typeof g==='object'&&g.res)sim[k]=g}j.sim=sim;return j},
};
export function migrar(j){
  let v=Number.isInteger(j.v)&&j.v>=1?j.v:1;  // un v corrupto (1.5, -1, "abc") se trata como la versión 1
  while(v<STATE_V){if(!MIGRAR[v])break;j=MIGRAR[v](j);v++}
  j.v=STATE_V;return j;
}
// Estado completo a partir de lo guardado (cualquier versión): rellena lo que falte con los valores por defecto.
export const completar=j=>{const s=Object.assign(DEF(),migrar(j));s.stats=Object.assign({ex:{},min:0},s.stats);return limpiarEscalares(s)};
const obj=v=>!!v&&typeof v==='object'&&!Array.isArray(v), num=v=>typeof v==='number'&&Number.isFinite(v);
// Colección de entradas: se descartan las que no cumplen `ok` (en vez de fallar al usarlas) y las claves peligrosas.
const filtrar=(o,ok)=>{const r={};if(obj(o))for(const k of Object.keys(o))if(k!=='__proto__'&&ok(o[k]))r[k]=o[k];return r};
// Saneado común de las colecciones que la app recorre al arrancar (load, leerCopia y estado remoto pasan por aquí).
function limpiarColecciones(s){
  s.srs=filtrar(s.srs,v=>obj(v)&&Number.isInteger(v.step)&&v.step>=0&&fechaValida(v.due));
  s.done=filtrar(s.done,v=>obj(v)&&num(v.acc)&&v.acc>=0&&v.acc<=1);
  s.aprendidos=filtrar(s.aprendidos,fechaValida);
  const st=obj(s.stats)?s.stats:{};
  s.stats=Object.assign({},st,{ex:filtrar(st.ex,v=>obj(v)&&num(v.n)&&v.n>=0&&num(v.f)&&v.f>=0&&num(v.u)),min:num(st.min)&&st.min>=0?st.min:0});
}
// Los escalares de una copia o de un estado remoto acaban en el HTML: solo se aceptan valores de su tipo y rango;
// lo demás vuelve al valor por defecto (como calcLimpio en views/calc.js).
const FECHA=/^\d{4}-\d{2}-\d{2}$/;
export const fechaValida=v=>typeof v==='string'&&FECHA.test(v);
export function limpiarEscalares(s){
  const d=DEF(),ent=(v,max)=>typeof v==='number'&&Number.isInteger(v)&&v>=0&&(max==null||v<=max);
  for(const k of ['xp','streak','dayXp','legal','mod'])if(!ent(s[k]))s[k]=d[k];
  if(!ent(s.protector,PROTECTOR_MAX))s.protector=d.protector;
  for(const k of ['last','day'])if(s[k]!==null&&!fechaValida(s[k]))s[k]=d[k];
  if(!TRACKS.some(r=>r.id===s.track))s.track=d.track;
  if(!META_OPC.includes(s.meta))s.meta=d.meta;
  limpiarColecciones(s);
  return s;
}
// Si lo guardado no se puede leer, se copia el texto crudo antes de que un guardado lo pise. El primer respaldo
// no se sobrescribe (es el más cercano a lo que se perdió); si ya hay uno distinto, el nuevo va a un segundo hueco.
export const RESPALDO=KEY+'.respaldo';
function respaldar(crudo){
  try{
    const a=localStorage.getItem(RESPALDO);
    if(a==null)localStorage.setItem(RESPALDO,crudo);
    else if(a!==crudo)localStorage.setItem(RESPALDO+'2',crudo);
  }catch(e){}
}
// Solo lectura: lo guardado es de una versión más nueva de Rango. Se arranca con un estado vacío en memoria pero
// sin escribir (ni subir a la cuenta) hasta que el usuario importe una copia o reinicie; así no se degrada su progreso.
let soloLect=false;
export const soloLectura=()=>soloLect;
function load(){
  let crudo=null;
  try{crudo=localStorage.getItem(KEY)}catch(e){}
  if(crudo==null)return DEF();
  try{
    const j=JSON.parse(crudo);
    if(obj(j)){
      if((j.v||1)>STATE_V){respaldar(crudo);soloLect=true;return DEF()}
      return completar(j);
    }
  }catch(e){}
  respaldar(crudo);
  return DEF();
}
export let S=load();
// alGuardar: funciones que se avisan tras cada guardado (la sincronización con la cuenta, si está activa).
export const alGuardar=new Set();
export function save(){if(soloLect)return;S.mod=Date.now();try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}alGuardar.forEach(f=>f())}
export function resetState(){soloLect=false;S=DEF();save()}
// Aplica un estado fusionado con la cuenta: se guarda tal cual (conserva su `mod`) y no dispara la subida.
export function reemplazar(estado){if(soloLect)return;S=estado;try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}

// Copia de seguridad: archivo JSON con el estado y su versión. Se puede recuperar en otro dispositivo.
export const exportar=()=>JSON.stringify({app:'rango',v:STATE_V,fecha:today(),estado:S});
// Lee una copia y devuelve {estado, resumen} o null si no es una copia válida de Rango (no toca el progreso).
export function leerCopia(texto){
  try{
    const j=JSON.parse(texto),e=j&&j.estado,obj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
    if(!j||j.app!=='rango'||!obj(e)||typeof e.xp!=='number'||!obj(e.done))return null;
    // Los campos que sean colecciones tienen que serlo (una copia retocada con null rompería la app).
    if(['srs','sim','stats','guias','leidas','aprendidos','dominadas','pruebas'].some(k=>k in e&&!obj(e[k]))||(obj(e.stats)&&'ex' in e.stats&&!obj(e.stats.ex)))return null;
    // Copia hecha con una versión más nueva de Rango: no se puede convertir hacia atrás.
    if((e.v||1)>STATE_V)return 'nueva';
    const estado=completar(JSON.parse(JSON.stringify(j.estado)));
    return {estado,resumen:{fecha:fechaValida(j.fecha)?j.fecha:'',xp:estado.xp,lecciones:Object.keys(estado.done).length}};
  }catch(e){return null}
}
export function importar(estado){soloLect=false;S=estado;save()}

// Racha: sigue viva si practicaste hoy o ayer, o anteayer con un protector disponible (se gastará al practicar).
export const streakNow=()=>(S.last===today()||S.last===addDays(1)||S.last===yest()||(S.last===addDays(-2)&&S.protector>0))?S.streak:0;
// Protectores de racha: uno por cada 7 días seguidos, como mucho PROTECTOR_MAX guardados.
export function sumarRacha(){
  const hoy=today();if(S.last===hoy||S.last===addDays(1))return {};  // addDays(1): el último día es «mañana» (otro huso): ya cuenta
  let usado=false,ganado=false;
  if(S.last===yest())S.streak++;
  else if(S.last===addDays(-2)&&S.protector>0){S.protector--;S.streak++;usado=true}
  else S.streak=1;
  S.last=hoy;
  if(S.streak%7===0&&S.protector<PROTECTOR_MAX){S.protector++;ganado=true}
  return {usado,ganado};
}
export const dayXpNow=()=>S.day===today()?S.dayXp:0;

// Las rutas avanzadas se abren al completar los básicos obligatorios, al saltarlos o si ya hay progreso en ellas.
export function advancedOpen(){
  if(S.all||S.skipBasics)return true;
  // Las unidades básicas con gate:false (complementarias) no cuentan para abrir las otras rutas.
  const basic=FLAT.filter(l=>trackOf(l.unit)==='basico'&&l.unit.gate!==false);
  if(basic.every(l=>S.done[l.id]))return true;
  return FLAT.some(l=>!libre(trackOf(l.unit))&&S.done[l.id]);
}
// Estado de cada lección por id. Cada ruta tiene su propia lección actual.
export function statuses(){
  const st={},cur={},adv=advancedOpen();
  FLAT.forEach(l=>{
    const t=trackOf(l.unit);
    if(S.done[l.id])st[l.id]='done';
    else if(!cur[t]){cur[t]=1;st[l.id]=(libre(t)||adv)?'current':'locked'}
    else st[l.id]=S.all?'open':'locked';
  });
  return st;
}

// Repaso espaciado: días hasta la siguiente aparición tras cada acierto. Tras el último, sale de la lista.
export const SRS_STEPS=[1,3,7,14], SRS_MAX=10;
export function srsDue(){
  const t=today();
  return Object.keys(S.srs).filter(u=>S.srs[u]&&S.srs[u].due<=t&&EXBYID.has(u)).map(u=>EXBYID.get(u));
}
// Reto del día: una pregunta (de elegir o calcular) de las lecciones que ya has completado, la misma todo el día.
// Se elige con la fecha, así no hace falta guardarla; S.reto = {fecha, ok} anota que hoy ya está hecho.
export function retoHoy(){
  const pool=FLAT.filter(l=>l.kind==='lesson'&&S.done[l.id]).flatMap(l=>l.ex).filter(e=>e.id&&(e.t==='choice'||e.t==='num'));
  if(!pool.length)return null;
  let h=0;for(const c of today())h=(h*31+c.charCodeAt(0))>>>0;
  return pool[h%pool.length];
}
export const retoHecho=()=>!!(S.reto&&S.reto.fecha===today());
export const srsResumen=()=>({enRepaso:Object.keys(S.srs).filter(u=>EXBYID.has(u)).length,aprendidos:Object.keys(S.aprendidos).filter(u=>EXBYID.has(u)).length});
// Un fallo lo programa para mañana; un acierto dentro del «Repaso del día» lo aplaza al siguiente intervalo.
export function srsRecord(ex,ok,enRepaso){
  if(!ex.id)return;
  // Aprendido: superó todos los intervalos del repaso. Si vuelve a fallarse, deja de estarlo y vuelve al repaso.
  if(!ok){S.srs[ex.id]={step:0,due:addDays(SRS_STEPS[0])};delete S.aprendidos[ex.id];return}
  const r=S.srs[ex.id];
  if(!r||!enRepaso)return;
  const st=r.step+1;
  if(st>=SRS_STEPS.length){delete S.srs[ex.id];S.aprendidos[ex.id]=today()}
  else S.srs[ex.id]={step:st,due:addDays(SRS_STEPS[st])};
}
