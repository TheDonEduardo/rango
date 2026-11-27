// Escribir un número (coma o punto decimal; se ignoran €, $, % y R).
import {fmt,esc,parseNum} from '../util.js';
import {$app,setCheck} from '../ui.js';
import {t} from '../textos.js';
// Pista tras fallar un cálculo: la primera heurística que aplique (o ninguna). No da la respuesta.
// Las tolerancias se escalan con el factor: al multiplicar por 100 o 1000 el margen crece igual.
export function pista(ex,val){
  const v=parseNum(val),a=ex.a,tol=ex.tol==null?0.005:ex.tol;
  if(v===null||!(v>0)||!(a>0))return '';
  const cerca=(x,y,m)=>Math.abs(x-y)<=m;
  if(cerca(v,a/100,tol)||cerca(v,a*100,tol*100))return t.pistaDecimal;
  const d=Math.abs(v-a);
  if(d>tol&&d<=10*tol)return t.pistaRedondeo;
  if(cerca(v,a/1000,tol)||cerca(v,a*1000,tol*1000))return t.pistaMiles;
  return '';
}
export default {
  html(ex,run){
    const c=run.checked?(run.ok?'good':'bad'):'';
    return `<div class="numrow"><input id="numIn" class="num ${c}" type="text" inputmode="decimal" autocomplete="off" aria-label="${t.tuRespuesta}" value="${esc(run.val)}"${run.checked?' disabled':''}>${ex.unit?`<span class="suffix">${ex.unit}</span>`:''}</div>`;
  },
  fallo:(ex,run)=>{const p=pista(ex,run.val);return p?`<p class="porque">${p}</p>`:''},
  ready:(ex,run)=>run.val.trim()!=='',
  correct(ex,run){const v=parseNum(run.val);return v!==null&&Math.abs(v-ex.a)<=(ex.tol==null?0.005:ex.tol)},
  answer:ex=>fmt(ex.a,Number.isInteger(ex.a)?0:2)+(ex.unit?' '+ex.unit:''),
  input(e,run){if(e.target.id!=='numIn')return false;run.val=e.target.value;setCheck(run.val.trim()!=='');return true},
  enter:(el,run)=>el.id==='numIn'&&run.val.trim()!=='',
  focus(){const i=$app.querySelector('#numIn');if(i)i.focus({preventScroll:true})},
};
