// Escribir un número (coma o punto decimal; se ignoran €, $, % y R).
import {fmt,esc,parseNum} from '../util.js';
import {$app,setCheck} from '../ui.js';
export default {
  kind:'Escribe el resultado',
  html(ex,run){
    const c=run.checked?(run.ok?'good':'bad'):'';
    return `<div class="numrow"><input id="numIn" class="num ${c}" type="text" inputmode="decimal" autocomplete="off" aria-label="Tu respuesta" value="${esc(run.val)}"${run.checked?' disabled':''}>${ex.unit?`<span class="suffix">${ex.unit}</span>`:''}</div>`;
  },
  ready:(ex,run)=>run.val.trim()!=='',
  correct(ex,run){const v=parseNum(run.val);return v!==null&&Math.abs(v-ex.a)<=(ex.tol==null?0.005:ex.tol)},
  answer:ex=>fmt(ex.a,Number.isInteger(ex.a)?0:2)+(ex.unit?' '+ex.unit:''),
  input(e,run){if(e.target.id!=='numIn')return false;run.val=e.target.value;setCheck(run.val.trim()!=='');return true},
  enter:(t,run)=>t.id==='numIn'&&run.val.trim()!=='',
  focus(){const i=$app.querySelector('#numIn');if(i)i.focus({preventScroll:true})},
};
