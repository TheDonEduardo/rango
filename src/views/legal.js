// Aviso legal: se pide aceptarlo en el primer uso y cada vez que cambia su texto.
import {t} from '../textos.js';
// Sube LEGAL_V si cambia el texto del aviso: se vuelve a pedir la aceptación.
export const LEGAL_V=1;
export function legalHTML(first){
  return `<div class="res legal"><div class="res-main"><h1>${first?t.legalPrimero:t.avisoLegal}</h1>
  ${t.legalTexto.map(p=>`<p>${p}</p>`).join('\n  ')}</div>
  <div><button class="btn primary" data-act="${first?'legalok':'home'}">${first?t.legalEntendido:t.volver}</button></div></div>`;
}
