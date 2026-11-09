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
export const ses={view:'home',run:null,lastRes:null,homeY:0,goCur:false,resetArm:false,installEvt:null,abiertas:new Set(),simDraft:null,guia:null,copia:null};
// Activa o desactiva «Comprobar» sin redibujar (no se pierde el foco).
export function setCheck(on){const c=$app.querySelector('[data-act=check]');if(c)c.disabled=!on}
