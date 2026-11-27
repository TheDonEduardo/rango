// Piezas compartidas de la interfaz: contenedor, aviso breve y estado de la sesión (lo que no se guarda).
export const $app=document.getElementById('app'), $toast=document.getElementById('toast');
let toastT=0;
export function toast(msg){
  $toast.textContent=msg;$toast.hidden=false;clearTimeout(toastT);
  // Más tiempo para los avisos largos (unos 60 ms por carácter, mínimo 2,4 s).
  toastT=setTimeout(()=>{$toast.hidden=true},Math.max(2400,msg.length*60));
}
// view: pantalla actual · run: lección en curso · lastRes: resultado que se muestra · homeY: scroll del inicio
// goCur: al volver, centrar la lección actual · abiertas: unidades completadas desplegadas · simDraft: plan en edición
export const ses={view:'home',run:null,lastRes:null,homeY:0,goCur:false,resetArm:false,installEvt:null,abiertas:new Set(),simDraft:null,guia:null,copia:null,glosDesde:null};
// Región aria-live persistente (fuera de #app, que se redibuja entera): los lectores de pantalla anuncian su texto al cambiar.
const $anuncio=document.createElement?document.createElement('div'):null;
if($anuncio&&document.body){$anuncio.className='sr-only';$anuncio.setAttribute('role','status');$anuncio.setAttribute('aria-live','polite');document.body.appendChild($anuncio)}
export function anunciar(msg){if($anuncio){$anuncio.textContent='';setTimeout(()=>{$anuncio.textContent=msg},50)}}
// Activa o desactiva «Comprobar» sin redibujar (no se pierde el foco).
export function setCheck(on){const c=$app.querySelector('[data-act=check]');if(c)c.disabled=!on}
