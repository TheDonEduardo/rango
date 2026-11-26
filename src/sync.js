// Cuentas y sincronización del progreso con Supabase (API REST, sin dependencias). Solo actúa si config.js
// trae SUPABASE_URL y SUPABASE_ANON; sin ellas, la app funciona como siempre, solo en este dispositivo.
// Acceso con enlace mágico por correo. El estado se guarda en la tabla «progreso» (docs/supabase.sql), una fila
// por usuario, protegida para que cada uno lea y escriba solo la suya. Sin conexión primero: localStorage manda
// y se sube unos segundos después de cada cambio; al entrar desde otro dispositivo, los dos estados se fusionan.
import {SUPABASE_URL,SUPABASE_ANON} from './config.js';
import {S,STATE_V,completar,reemplazar,soloLectura,alGuardar} from './state.js';
import {t} from './textos.js';

const CLAVE='rango.sesion', PENDIENTE='rango.pendiente', SUBIR='rango.subirPendiente', VALIDEZ=3600000;
let cfg={url:SUPABASE_URL.replace(/\/$/,''),anon:SUPABASE_ANON}, temporizador=null, espera=5000;
export const cuentaActiva=()=>!!(cfg.url&&cfg.anon);
export function configurar(c){cfg={url:c.url.replace(/\/$/,''),anon:c.anon};if(c.espera!=null)espera=c.espera}  // para los tests
export const estadoCuenta={ultima:null,error:false};

const leerSesion=()=>{try{return JSON.parse(localStorage.getItem(CLAVE))}catch(e){return null}};
const guardarSesion=s=>{try{s?localStorage.setItem(CLAVE,JSON.stringify(s)):localStorage.removeItem(CLAVE)}catch(e){}};
export const sesion=()=>cuentaActiva()?leerSesion():null;

async function pedir(ruta,{method='GET',body,token,headers={}}={}){
  const r=await fetch(cfg.url+ruta,{method,headers:Object.assign({apikey:cfg.anon,'Content-Type':'application/json'},token?{Authorization:'Bearer '+token}:{},headers),body:body==null?undefined:JSON.stringify(body)});
  if(!r.ok){const e=new Error(ruta+': '+r.status);e.status=r.status;throw e}
  const txt=await r.text();return txt?JSON.parse(txt):null;
}

// Envía el enlace de acceso; al pulsarlo, Supabase vuelve a esta página con la sesión en el fragmento (#access_token=…).
// Deja una marca de petición pendiente (en localStorage, porque el enlace se abre en otra pestaña): sin ella,
// al volver no se acepta ninguna sesión, así un enlace con los tokens de otra cuenta no sirve.
export async function enviarEnlace(email,volver){
  await pedir('/auth/v1/otp?redirect_to='+encodeURIComponent(volver),{method:'POST',body:{email,create_user:true}});
  try{localStorage.setItem(PENDIENTE,String(Date.now()))}catch(e){}
}
// Lee la sesión que trae la dirección al volver del correo y limpia el fragmento. Solo la acepta si este
// navegador pidió el enlace hace menos de una hora (lo que dura el enlace de Supabase); la marca se gasta siempre.
// Devuelve true (sesión guardada), false (nada que leer) o 'rechazado' (enlace ajeno, caducado o sin confirmar).
// confirmar(mensaje) decide si se cambia una sesión de otro usuario; sin ella, no se cambia.
export async function leerRetorno(hash,limpiar,confirmar){
  const p=new URLSearchParams((hash||'').replace(/^#/,''));
  if(!p.get('access_token')||!p.get('refresh_token'))return false;
  let marca=0;
  try{marca=+localStorage.getItem(PENDIENTE)||0;localStorage.removeItem(PENDIENTE)}catch(e){}
  if(limpiar)limpiar();
  const ahora=Date.now();
  if(!marca||marca>ahora+60000||ahora-marca>VALIDEZ)return 'rechazado';
  const token=p.get('access_token'),u=await pedir('/auth/v1/user',{token});
  const previa=leerSesion();
  if(previa&&previa.user&&previa.user.id!==u.id){
    if(!(confirmar&&confirmar(t.cuentaCambiar(previa.user.email,u.email))))return 'rechazado';
    limpiarSync();  // otra cuenta: nada de lo pendiente ni de lo fusionado de la anterior vale para esta
  }
  guardarSesion({access_token:token,refresh_token:p.get('refresh_token'),expires_at:ahora+(+p.get('expires_in')||3600)*1000,user:{id:u.id,email:u.email}});
  return true;
}
// Token válido, renovándolo si caduca en menos de un minuto.
// El refresco es único aunque lo pidan varios a la vez (el refresh_token rota: el segundo fallaría). Si el servidor
// lo rechaza (400/401/403: caducado o revocado), se cierra la sesión local, sin tocar el progreso, y devuelve null.
let renovando=null;
async function token(){
  const s=leerSesion();if(!s)return null;
  if(s.expires_at-Date.now()>60000)return s;
  if(!renovando)renovando=renovar(s).finally(()=>{renovando=null});
  return renovando;
}
async function renovar(s){
  let r;
  try{r=await pedir('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:s.refresh_token}})}
  catch(e){if([400,401,403].includes(e.status)){guardarSesion(null);estadoCuenta.ultima=null;limpiarSync();return null}throw e}
  const n=Object.assign(s,{access_token:r.access_token,refresh_token:r.refresh_token,expires_at:Date.now()+(r.expires_in||3600)*1000});
  guardarSesion(n);return n;
}

// Fusión campo a campo: no se pierde lo hecho en ninguno de los dos dispositivos.
const masNuevo=(a,b)=>(b.mod||0)>(a.mod||0)?b:a;
export function fusionar(a,b){
  const nuevo=masNuevo(a,b),otro=nuevo===a?b:a,r=JSON.parse(JSON.stringify(nuevo));
  r.xp=Math.max(a.xp||0,b.xp||0);
  r.done={};for(const x of [a.done,b.done])for(const k in x||{})if(!r.done[k]||(x[k].acc||0)>(r.done[k].acc||0))r.done[k]=x[k];
  r.aprendidos=Object.assign({},b.aprendidos,a.aprendidos);for(const k in b.aprendidos||{})if((b.aprendidos[k]||'')>(r.aprendidos[k]||''))r.aprendidos[k]=b.aprendidos[k];
  r.srs={};for(const x of [a.srs,b.srs])for(const k in x||{}){const v=x[k],w=r.srs[k];if(!w||v.step>w.step||(v.step===w.step&&v.due>w.due))r.srs[k]=v}
  for(const k in r.aprendidos)delete r.srs[k];
  r.stats={ex:{},min:Math.max(a.stats&&a.stats.min||0,b.stats&&b.stats.min||0)};
  for(const x of [a.stats&&a.stats.ex,b.stats&&b.stats.ex])for(const k in x||{})if(!r.stats.ex[k]||x[k].n>r.stats.ex[k].n)r.stats.ex[k]=x[k];
  for(const c of ['guias','leidas','dominadas','pruebas','sim'])r[c]=Object.assign({},otro[c],r[c]);
  // Racha: la del dispositivo que practicó más recientemente.
  const ra=(a.last||'')>(b.last||'')||((a.last||'')===(b.last||'')&&(a.streak||0)>=(b.streak||0))?a:b;
  for(const c of ['streak','last','day','dayXp','protector'])r[c]=ra[c];
  // Contadores del día: si los dos son del mismo día, no se pierde lo ganado en ninguno.
  if(a.day&&a.day===b.day)r.dayXp=Math.max(a.dayXp||0,b.dayXp||0);
  // Reto y mercado: gana la fecha (o semana) más reciente; si coinciden, hecho en cualquiera = hecho (y el mejor resultado).
  const reto=[a.reto,b.reto].filter(x=>x&&x.fecha);
  if(reto.length){const f=reto.map(x=>x.fecha).sort().pop(),m=reto.filter(x=>x.fecha===f);r.reto={fecha:f,ok:m.some(x=>x.ok)}}
  const mer=[a.mercado,b.mercado].filter(x=>x&&x.semana!=null);
  if(mer.length){const w=mer.map(x=>String(x.semana)).sort().pop(),m=mer.filter(x=>String(x.semana)===w);r.mercado=m.reduce((p,x)=>(x.ok||0)>(p.ok||0)?x:p,m[0])}
  r.skipBasics=!!(a.skipBasics||b.skipBasics);r.legal=Math.max(a.legal||0,b.legal||0);
  r.placement=r.placement||otro.placement||null;r.objetivo=r.objetivo||otro.objetivo||null;
  r.mod=Math.max(a.mod||0,b.mod||0);
  return r;
}

// Baja el estado guardado, lo fusiona con el local, lo aplica y sube el resultado. Devuelve true si cambió algo.
// Solo hay una a la vez: si llega otra petición mientras tanto, se repite al terminar (para no perder cambios).
let enCurso=null, repetir=false, fusionado=false, version=0;
// Al cerrar sesión, borrar la cuenta o cambiar de usuario: nada pendiente de la sesión anterior debe subirse a la nueva.
function limpiarSync(){clearTimeout(temporizador);temporizador=null;fusionado=false;repetir=false;version++;marcar(false)}
const canon=o=>JSON.stringify(o,(k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a<b?-1:a>b?1:0)):v);
export function sincronizar(){
  if(enCurso){repetir=true;return enCurso}
  enCurso=(async()=>{
    let cambio=false;
    try{do{repetir=false;cambio=(await sincronizarUna())||cambio}while(repetir)}
    finally{enCurso=null}
    return cambio;
  })();
  return enCurso;
}
async function sincronizarUna(){
  if(soloLectura())return false;
  const s=await token();if(!s)return false;
  try{
    const filas=await pedir('/rest/v1/progreso?select=estado&user_id=eq.'+s.user.id,{token:s.access_token});
    const remoto=filas&&filas[0]&&filas[0].estado;
    if(remoto&&(remoto.v||1)>STATE_V){estadoCuenta.error=true;return false}  // copia de una versión más nueva: no tocar
    const antes=JSON.stringify(S),nuevo=remoto?fusionar(S,completar(remoto)):S;
    const cambio=JSON.stringify(nuevo)!==antes;
    const actual=leerSesion();if(!actual||actual.user.id!==s.user.id)return false;  // se cerró la sesión mientras bajaba
    if(cambio)reemplazar(nuevo);  // conserva `mod` (el máximo de ambos) y no programa otra subida
    fusionado=true;
    // Solo se sube si hace falta: sin remoto, con cambios locales pendientes o si lo fusionado difiere de lo guardado.
    if(!remoto||pendiente()||canon(S)!==canon(remoto))await subir(s);
    else{estadoCuenta.ultima=new Date();estadoCuenta.error=false}
    return cambio;
  }catch(e){estadoCuenta.error=true;throw e}
}
const pendiente=()=>{try{return localStorage.getItem(SUBIR)==='1'}catch(e){return false}};
const marcar=b=>{try{b?localStorage.setItem(SUBIR,'1'):localStorage.removeItem(SUBIR)}catch(e){}};
async function subir(s){
  s=s||await token();if(!s||soloLectura())return;
  const v=version;
  await pedir('/rest/v1/progreso',{method:'POST',token:s.access_token,headers:{Prefer:'resolution=merge-duplicates'},
    body:{user_id:s.user.id,estado:S,actualizado:new Date().toISOString()}});
  if(v===version)marcar(false);  // si se guardó algo mientras subía, sigue pendiente
  estadoCuenta.ultima=new Date();estadoCuenta.error=false;
}
// Al cerrar o ocultar la página: sube lo pendiente con keepalive. Solo si en esta sesión ya se fusionó con el
// servidor (si no, se podría pisar lo de otro dispositivo) y con el token aún válido (no se puede renovar aquí).
export function subirAlSalir(){
  const s=cuentaActiva()?leerSesion():null;
  if(!s||!fusionado||!pendiente()||soloLectura()||!(s.expires_at>Date.now()))return;
  try{
    fetch(cfg.url+'/rest/v1/progreso',{method:'POST',keepalive:true,headers:{apikey:cfg.anon,'Content-Type':'application/json',Authorization:'Bearer '+s.access_token,Prefer:'resolution=merge-duplicates'},
      body:JSON.stringify({user_id:s.user.id,estado:S,actualizado:new Date().toISOString()})}).then(r=>{if(r.ok)marcar(false)},()=>{});
  }catch(e){}
}
export const hayPendiente=()=>!!sesion()&&pendiente();
// Tras cada guardado: queda marcado como pendiente y, tras unos segundos (para agrupar cambios), se sincroniza
// (baja, fusiona y sube), de modo que nunca se sube una fila entera sin haber leído antes la del servidor.
function programar(){
  if(!sesion()||soloLectura())return;
  version++;marcar(true);
  clearTimeout(temporizador);
  temporizador=setTimeout(()=>sincronizar().catch(()=>{estadoCuenta.error=true}),espera);
}
alGuardar.add(programar);

export async function cerrarSesion(){
  const s=leerSesion();guardarSesion(null);estadoCuenta.ultima=null;limpiarSync();
  if(s)try{await pedir('/auth/v1/logout',{method:'POST',token:s.access_token})}catch(e){}
}
// Borra la cuenta y su progreso en el servidor (función borrar_cuenta de docs/supabase.sql). El progreso local se queda.
export async function borrarCuenta(){
  limpiarSync();
  const s=await token();if(!s)return;
  await pedir('/rest/v1/rpc/borrar_cuenta',{method:'POST',token:s.access_token,body:{}});
  guardarSesion(null);estadoCuenta.ultima=null;limpiarSync();
}
