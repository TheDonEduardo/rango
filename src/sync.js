// Cuentas y sincronización del progreso con Supabase (API REST, sin dependencias). Solo actúa si config.js
// trae SUPABASE_URL y SUPABASE_ANON; sin ellas, la app funciona como siempre, solo en este dispositivo.
// Acceso con enlace mágico por correo. El estado se guarda en la tabla «progreso» (docs/supabase.sql), una fila
// por usuario, protegida para que cada uno lea y escriba solo la suya. Sin conexión primero: localStorage manda
// y se sube unos segundos después de cada cambio; al entrar desde otro dispositivo, los dos estados se fusionan.
import {SUPABASE_URL,SUPABASE_ANON} from './config.js';
import {S,STATE_V,completar,importar,alGuardar} from './state.js';

const CLAVE='rango.sesion', ESPERA=5000;
let cfg={url:SUPABASE_URL.replace(/\/$/,''),anon:SUPABASE_ANON}, temporizador=null;
export const cuentaActiva=()=>!!(cfg.url&&cfg.anon);
export function configurar(c){cfg={url:c.url.replace(/\/$/,''),anon:c.anon}}  // para los tests
export const estadoCuenta={ultima:null,error:false};

const leerSesion=()=>{try{return JSON.parse(localStorage.getItem(CLAVE))}catch(e){return null}};
const guardarSesion=s=>{try{s?localStorage.setItem(CLAVE,JSON.stringify(s)):localStorage.removeItem(CLAVE)}catch(e){}};
export const sesion=()=>cuentaActiva()?leerSesion():null;

async function pedir(ruta,{method='GET',body,token,headers={}}={}){
  const r=await fetch(cfg.url+ruta,{method,headers:Object.assign({apikey:cfg.anon,'Content-Type':'application/json'},token?{Authorization:'Bearer '+token}:{},headers),body:body==null?undefined:JSON.stringify(body)});
  if(!r.ok)throw new Error(ruta+': '+r.status);
  const txt=await r.text();return txt?JSON.parse(txt):null;
}

// Envía el enlace de acceso; al pulsarlo, Supabase vuelve a esta página con la sesión en el fragmento (#access_token=…).
export function enviarEnlace(email,volver){
  return pedir('/auth/v1/otp?redirect_to='+encodeURIComponent(volver),{method:'POST',body:{email,create_user:true}});
}
// Lee la sesión que trae la dirección al volver del correo y limpia el fragmento.
export async function leerRetorno(hash,limpiar){
  const p=new URLSearchParams((hash||'').replace(/^#/,''));
  if(!p.get('access_token')||!p.get('refresh_token'))return false;
  const token=p.get('access_token'),u=await pedir('/auth/v1/user',{token});
  guardarSesion({access_token:token,refresh_token:p.get('refresh_token'),expires_at:Date.now()+(+p.get('expires_in')||3600)*1000,user:{id:u.id,email:u.email}});
  if(limpiar)limpiar();
  return true;
}
// Token válido, renovándolo si caduca en menos de un minuto.
async function token(){
  const s=leerSesion();if(!s)return null;
  if(s.expires_at-Date.now()>60000)return s;
  const r=await pedir('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:s.refresh_token}});
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
  for(const c of ['guias','dominadas','pruebas','sim'])r[c]=Object.assign({},otro[c],r[c]);
  // Racha: la del dispositivo que practicó más recientemente.
  const ra=(a.last||'')>(b.last||'')||((a.last||'')===(b.last||'')&&(a.streak||0)>=(b.streak||0))?a:b;
  for(const c of ['streak','last','day','dayXp','protector'])r[c]=ra[c];
  r.skipBasics=!!(a.skipBasics||b.skipBasics);r.legal=Math.max(a.legal||0,b.legal||0);
  r.placement=r.placement||otro.placement||null;r.objetivo=r.objetivo||otro.objetivo||null;
  r.mod=Math.max(a.mod||0,b.mod||0);
  return r;
}

// Baja el estado guardado, lo fusiona con el local, lo aplica y sube el resultado. Devuelve true si cambió algo.
export async function sincronizar(){
  const s=await token();if(!s)return false;
  try{
    const filas=await pedir('/rest/v1/progreso?select=estado&user_id=eq.'+s.user.id,{token:s.access_token});
    const remoto=filas&&filas[0]&&filas[0].estado;
    if(remoto&&(remoto.v||1)>STATE_V){estadoCuenta.error=true;return false}  // copia de una versión más nueva: no tocar
    const antes=JSON.stringify(S),nuevo=remoto?fusionar(S,completar(remoto)):S;
    const cambio=JSON.stringify(nuevo)!==antes;
    if(cambio){alGuardar.delete(programar);importar(nuevo);alGuardar.add(programar)}
    await subir(s);
    return cambio;
  }catch(e){estadoCuenta.error=true;throw e}
}
async function subir(s){
  s=s||await token();if(!s)return;
  await pedir('/rest/v1/progreso',{method:'POST',token:s.access_token,headers:{Prefer:'resolution=merge-duplicates'},
    body:{user_id:s.user.id,estado:S,actualizado:new Date().toISOString()}});
  estadoCuenta.ultima=new Date();estadoCuenta.error=false;
}
// Tras cada guardado, sube el estado con unos segundos de espera para agrupar cambios.
function programar(){
  if(!sesion())return;
  clearTimeout(temporizador);
  temporizador=setTimeout(()=>subir().catch(()=>{estadoCuenta.error=true}),ESPERA);
}
alGuardar.add(programar);

export async function cerrarSesion(){
  const s=leerSesion();guardarSesion(null);estadoCuenta.ultima=null;
  if(s)try{await pedir('/auth/v1/logout',{method:'POST',token:s.access_token})}catch(e){}
}
// Borra la cuenta y su progreso en el servidor (función borrar_cuenta de docs/supabase.sql). El progreso local se queda.
export async function borrarCuenta(){
  const s=await token();if(!s)return;
  await pedir('/rest/v1/rpc/borrar_cuenta',{method:'POST',token:s.access_token,body:{}});
  guardarSesion(null);estadoCuenta.ultima=null;
}
