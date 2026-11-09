// Medición de uso anónima (para saber qué lecciones se abandonan y qué preguntas se fallan entre todos).
// Solo envía algo si hay MEDICION_URL en config.js y el usuario la ha activado en «Tu progreso» (S.medir).
// Nunca envía identificadores del usuario ni del dispositivo: solo el evento, ids de contenido y la fecha.
import {MEDICION_URL} from './config.js';
import {S} from './state.js';

export const medicionDisponible=()=>!!MEDICION_URL;
export function medir(evento,datos={}){
  if(!MEDICION_URL||S.medir!==true||typeof navigator==='undefined')return false;
  const cuerpo=JSON.stringify({e:evento,...datos,d:new Date().toISOString().slice(0,10)});
  try{
    if(navigator.sendBeacon)navigator.sendBeacon(MEDICION_URL,cuerpo);
    else fetch(MEDICION_URL,{method:'POST',body:cuerpo,keepalive:true}).catch(()=>{});
  }catch(e){}
  return true;
}
