// Progreso guardado en el dispositivo (localStorage): formato, migraciones, racha, rutas y repaso espaciado.
import {KEY,today,yest,addDays} from './util.js';
import {FLAT,EXBYID,trackOf} from './content.js';

// Versión del formato guardado. Cada cambio de formato añade un paso a MIGRAR (de la versión n a la n+1),
// así el progreso de quien ya usa la app se convierte en vez de perderse.
export const STATE_V=2;
export const DEF=()=>({v:STATE_V,xp:0,streak:0,last:null,day:null,dayXp:0,done:{},all:false,track:'basico',skipBasics:false,legal:0,srs:{},sim:{},calc:null,stats:{ex:{},min:0}});
const MIGRAR={
  // 1 → 2: el repaso espaciado identificaba los ejercicios por posición («lección#índice», desde 0);
  // ahora cada ejercicio tiene un id estable («lección-n», desde 1).
  1:j=>{const srs={};for(const k in j.srs||{}){const m=/^(.+)#(\d+)$/.exec(k);srs[m?m[1]+'-'+(+m[2]+1):k]=j.srs[k]}j.srs=srs;return j},
};
export function migrar(j){
  let v=j.v||1;
  while(v<STATE_V){j=MIGRAR[v](j);v++}
  j.v=STATE_V;return j;
}
function load(){
  try{const j=JSON.parse(localStorage.getItem(KEY));if(j&&typeof j==='object'){const s=Object.assign(DEF(),migrar(j));s.stats=Object.assign({ex:{},min:0},s.stats);return s}}catch(e){}
  return DEF();
}
export let S=load();
export function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
export function resetState(){S=DEF();save()}

export const streakNow=()=>(S.last===today()||S.last===yest())?S.streak:0;
export const dayXpNow=()=>S.day===today()?S.dayXp:0;

// Las rutas avanzadas se abren al completar los básicos obligatorios, al saltarlos o si ya hay progreso en ellas.
export function advancedOpen(){
  if(S.all||S.skipBasics)return true;
  // Las unidades básicas con gate:false (complementarias) no cuentan para abrir las otras rutas.
  const basic=FLAT.filter(l=>trackOf(l.unit)==='basico'&&l.unit.gate!==false);
  if(basic.every(l=>S.done[l.id]))return true;
  return FLAT.some(l=>trackOf(l.unit)!=='basico'&&S.done[l.id]);
}
// Estado de cada lección por id. Cada ruta tiene su propia lección actual.
export function statuses(){
  const st={},cur={},adv=advancedOpen();
  FLAT.forEach(l=>{
    const t=trackOf(l.unit);
    if(S.done[l.id])st[l.id]='done';
    else if(!cur[t]){cur[t]=1;st[l.id]=(t==='basico'||adv)?'current':'locked'}
    else st[l.id]=S.all?'open':'locked';
  });
  return st;
}

// Repaso espaciado: días hasta la siguiente aparición tras cada acierto. Tras el último, sale de la lista.
export const SRS_STEPS=[1,3,7,14], SRS_MAX=10;
export function srsDue(){
  const t=today();
  return Object.keys(S.srs).filter(u=>S.srs[u].due<=t&&EXBYID.has(u)).map(u=>EXBYID.get(u));
}
// Un fallo lo programa para mañana; un acierto dentro del «Repaso del día» lo aplaza al siguiente intervalo.
export function srsRecord(ex,ok,enRepaso){
  if(!ex.id)return;
  if(!ok){S.srs[ex.id]={step:0,due:addDays(SRS_STEPS[0])};return}
  const r=S.srs[ex.id];
  if(!r||!enRepaso)return;
  const st=r.step+1;
  if(st>=SRS_STEPS.length)delete S.srs[ex.id];
  else S.srs[ex.id]={step:st,due:addDays(SRS_STEPS[st])};
}
