// Elegir una opción. Las opciones se barajan en cada lección (la posición no delata la correcta), salvo que
// su orden tenga sentido: etiquetas cortas (A, B, C, Ninguna) o todas empiezan igual (Fase 1, Fase 2…).
import {tx,shuffle} from '../util.js';
import {t} from '../textos.js';
import {glos} from '../glosario.js';
import {$app,setCheck} from '../ui.js';
export const ordenFijo=o=>o.every(x=>x.length<=8)||o.every(x=>x.split(' ')[0]===o[0].split(' ')[0]);
// Orden en que se muestran (índices de ex.opts), el mismo durante toda la lección.
function orden(ex,run){
  if(!run.perm)return ex.opts.map((_,i)=>i);
  if(!run.perm.has(ex))run.perm.set(ex,ordenFijo(ex.opts)?ex.opts.map((_,i)=>i):shuffle(ex.opts.map((_,i)=>i)));
  return run.perm.get(ex);
}
export default {
  html(ex,run){
    return '<div class="opts">'+orden(ex,run).map(i=>{
      let c='';
      if(run.checked){if(i===ex.a)c='good';else if(i===run.sel)c='bad'}else if(i===run.sel)c='sel';
      return `<button class="opt ${c}" data-act="pick" data-i="${i}"${run.checked?' disabled':''}>${tx(ex.opts[i])}</button>`;
    }).join('')+'</div>';
  },
  ready:(ex,run)=>run.sel!==null,
  enter:(el,run)=>run.sel!==null,
  correct:(ex,run)=>run.sel===ex.a,
  answer:ex=>ex.opts[ex.a],
  // Por qué no es correcta la opción elegida (porque[i], null en la correcta), si el ejercicio lo trae.
  fallo:(ex,run)=>ex.porque&&run.sel!==ex.a&&ex.porque[run.sel]?`<p class="porque"><b>${t.porQueNo(tx(ex.opts[run.sel]))}</b> ${glos(tx(ex.porque[run.sel]))}</p>`:'',
  act:{pick(b,run){const i=+b.dataset.i;run.sel=i;$app.querySelectorAll('.opt').forEach(x=>x.classList.toggle('sel',+x.dataset.i===i));setCheck(true)}},
};
