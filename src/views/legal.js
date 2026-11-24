// Aviso legal y política de privacidad (en dos capas). Los datos del titular salen de config.js (TITULAR).
import {t} from '../textos.js';
import {CONTACTO,TITULAR} from '../config.js';
import {esc} from '../util.js';
// Sube LEGAL_V si cambia el texto del aviso: se vuelve a pedir la aceptación.
export const LEGAL_V=2;
// Correo del responsable: el del titular o, si falta, el de contacto.
export const correoTitular=()=>TITULAR.correo||CONTACTO;
// Datos del titular que faltan por rellenar (el test avisa de ellos).
export const titularFalta=()=>[['nombre',TITULAR.nombre],['nif',TITULAR.nif],['domicilio',TITULAR.domicilio],['correo',correoTitular()]].filter(x=>!x[1]).map(x=>x[0]);
const dato=v=>v?esc(v):t.privPendiente;
const titular=()=>t.titularLinea(dato(TITULAR.nombre),dato(TITULAR.nif),dato(TITULAR.domicilio),dato(correoTitular()));
export function legalHTML(first){
  return `<div class="res legal"><div class="res-main"><h1>${first?t.legalPrimero:t.avisoLegal}</h1>
  ${t.legalTexto.map(p=>`<p>${p}</p>`).join('\n  ')}
  <p>${t.legalTitular(dato(TITULAR.nombre),dato(TITULAR.nif),dato(TITULAR.domicilio),dato(correoTitular()))}</p></div>
  <div><button class="btn primary" data-act="${first?'legalok':'home'}">${first?t.legalEntendido:t.volver}</button></div></div>`;
}
// Política de privacidad: primera capa (lo esencial) y segunda (por tratamiento). «Volver» regresa a la pantalla desde la que se abrió.
export function privacidadHTML(){
  return `<div class="res legal"><div class="res-main"><h1>${t.privTitulo}</h1>
  <h2>${t.privCapa1}</h2>
  ${t.privResumen(titular(),dato(correoTitular())).map(p=>`<p>${p}</p>`).join('\n  ')}
  <h2>${t.privCapa2}</h2>
  ${t.privSecciones.map(([h,ps])=>`<h3>${h}</h3>\n  ${ps.map(p=>`<p>${p}</p>`).join('\n  ')}`).join('\n  ')}</div>
  <div><button class="btn primary" data-act="privvolver">${t.volver}</button></div></div>`;
}
