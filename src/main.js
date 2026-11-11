// Entrada de la app: carga app.js y, si falla (sin red y sin copia guardada, contenido que no llega…),
// muestra un mensaje con «Reintentar» en vez de una pantalla en blanco. La pantalla de carga está en index.html.
import {t} from './textos.js';
const $app=document.getElementById('app'),$toast=document.getElementById('toast');
let arrancada=false,avisado=false;
function fallo(){
  $app.innerHTML=`<div class="res"><div class="res-main"><div class="res-top"><div><h1>${t.cargaError}</h1><p>${t.cargaErrorNota}</p></div></div></div><div><button class="btn primary" id="reintentar">${t.reintentarCarga}</button></div></div>`;
  $app.querySelector('#reintentar').addEventListener('click',()=>location.reload());
}
// Error inesperado con la app ya en marcha: aviso discreto, una vez, para que la pantalla no se quede muerta sin explicación.
function aviso(){
  if(!arrancada||avisado||!$toast)return;
  avisado=true;$toast.textContent=t.errorInesperado;$toast.hidden=false;setTimeout(()=>{$toast.hidden=true},6000);
}
window.addEventListener('error',aviso);
window.addEventListener('unhandledrejection',aviso);
import('./app.js').then(()=>{arrancada=true},fallo);
