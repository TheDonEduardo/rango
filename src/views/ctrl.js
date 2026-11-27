// Control de las herramientas formativas (tamaño de posición y curva de pago): deslizador con botones − / +.
import {esc} from '../util.js';
import {t} from '../textos.js';

// def = [clave, etiqueta, mín, máx, paso, formato]; ns = nombre de la vista (y del estado: S.tamano, S.pago).
export const ctrlHTML=(ns,estado,[k,l,mi,ma,st,f])=>{
  const v=estado[k],id=`ctl-${ns}-${k}`,b=(d,s)=>`<button type="button" class="sl-b" data-act="ctlstep" data-ns="${ns}" data-k="${k}" data-d="${d}" aria-label="${(d>0?t.subir:t.bajar)(esc(l))}">${s}</button>`;
  return `<div class="cs"><label class="sl-h" for="${id}"><span>${esc(l)}</span><output id="out-${ns}-${k}">${f(v)}</output></label><div class="sl-row">${b(-1,'−')}<input type="range" id="${id}" data-ctl="${ns}:${k}" min="${mi}" max="${ma}" step="${st}" value="${v}" aria-valuetext="${esc(f(v))}">${b(1,'+')}</div></div>`;
};
