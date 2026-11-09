// Elegir una opción.
import {tx} from '../util.js';
import {t} from '../textos.js';
import {glos} from '../glosario.js';
import {$app,setCheck} from '../ui.js';
export default {
  html(ex,run){
    return '<div class="opts">'+ex.opts.map((o,i)=>{
      let c='';
      if(run.checked){if(i===ex.a)c='good';else if(i===run.sel)c='bad'}else if(i===run.sel)c='sel';
      return `<button class="opt ${c}" data-act="pick" data-i="${i}"${run.checked?' disabled':''}>${tx(o)}</button>`;
    }).join('')+'</div>';
  },
  ready:(ex,run)=>run.sel!==null,
  correct:(ex,run)=>run.sel===ex.a,
  answer:ex=>ex.opts[ex.a],
  // Por qué no es correcta la opción elegida (porque[i], null en la correcta), si el ejercicio lo trae.
  fallo:(ex,run)=>ex.porque&&run.sel!==ex.a&&ex.porque[run.sel]?`<p class="porque"><b>${t.porQueNo(tx(ex.opts[run.sel]))}</b> ${glos(tx(ex.porque[run.sel]))}</p>`:'',
  act:{pick(b,run){const i=+b.dataset.i;run.sel=i;$app.querySelectorAll('.opt').forEach((x,k)=>x.classList.toggle('sel',k===i));setCheck(true)}},
};
