// Itinerarios: lista de recorridos guiados, con su progreso y el botón para seguir uno.
import {esc} from '../util.js';
import {icoX} from '../icons.js';
import {S} from '../state.js';
import {t} from '../textos.js';
import {ITINERARIOS,progreso} from '../itinerarios.js';
import {trackOf} from '../content.js';

export function itinerariosHTML(){
  const items=ITINERARIOS.map(it=>{
    const p=progreso(it),activo=S.itin===it.id,[titulo,resumen]=t.itin[it.id];
    const rutas=[...new Set(p.L.map(l=>t.rutas[trackOf(l.unit)]))].join(', ');
    const boton=activo?`<button class="btn line" data-act="itindejar">${t.itinDejar}</button>`
      :`<button class="btn ${S.itin?'line':'primary'}" data-act="itinsel" data-id="${it.id}">${p.hechas?t.itinRetomar:t.itinEmpezar}</button>`;
    return `<section class="itin${activo?' activo':''}" aria-label="${esc(titulo)}"><h2>${esc(titulo)}</h2><p>${esc(resumen)}</p>
    <p class="itin-m">${t.itinMeta(p.hechas,p.total,rutas)}${activo?` · <b>${t.itinSiguiendo}</b>`:''}</p>
    <ol class="itin-l">${p.L.map(l=>`<li${S.done[l.id]?' class="ok"':''}>${esc(l.title)}</li>`).join('')}</ol>${boton}</section>`;
  }).join('');
  return `<div class="lesson sim-view"><div class="lbar"><button class="x" data-act="home" aria-label="${t.volverInicio}">${icoX}</button><p class="kind">${t.itinerarios}</p></div>
  <div class="qwrap"><h1 class="q">${t.itinTitulo}</h1><p class="note">${t.itinNota}</p>${items}</div>
  <div><button class="btn line" data-act="home">${t.volver}</button></div></div>`;
}
