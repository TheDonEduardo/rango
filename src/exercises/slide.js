// Deslizador con botones − / + y, opcional, cifras que se recalculan al moverlo
// (show: [{label, k, b?, unit?, dec?}] → b + valor × k), para ver la consecuencia de cada elección.
import {fmt,esc} from '../util.js';
import {$app} from '../ui.js';
const dec=st=>{const t=String(st).split('.')[1];return t?t.length:0};
const f=(v,d,u)=>fmt(v,d)+(u?' '+u:'');
const showHTML=(ex,v)=>(ex.show||[]).map(s=>`<div><dt>${esc(s.label)}</dt><dd>${f((s.b||0)+v*s.k,s.dec==null?0:s.dec,s.unit)}</dd></div>`).join('');
function set(ex,run,v){
  v=Math.min(ex.max,Math.max(ex.min,v));v=Math.round(Math.round((v-ex.min)/ex.step)*ex.step*1e6)/1e6+ex.min;
  run.sel=Math.round(v*1e6)/1e6;
  const vt=f(run.sel,dec(ex.step),ex.unit),i=$app.querySelector('#slIn');
  if(i){if(+i.value!==run.sel)i.value=run.sel;i.setAttribute('aria-valuetext',vt)}
  const o=$app.querySelector('#slOut');if(o)o.textContent=vt;
  const d=$app.querySelector('#slShow');if(d)d.innerHTML=showHTML(ex,run.sel);
}
export default {
  kind:'Mueve el deslizador',
  html(ex,run){
    if(run.sel===null)run.sel=ex.start;
    const c=run.checked?(run.ok?' good':' bad'):'',dis=run.checked?' disabled':'',vt=f(run.sel,dec(ex.step),ex.unit);
    return `<div class="slide${c}"><label class="sl-h" for="slIn"><span>${esc(ex.label)}</span><output id="slOut">${vt}</output></label><div class="sl-row"><button class="sl-b" data-act="sstep" data-d="-1" aria-label="Bajar ${esc(ex.label)}"${dis}>−</button><input type="range" id="slIn" min="${ex.min}" max="${ex.max}" step="${ex.step}" value="${run.sel}" aria-valuetext="${esc(vt)}"${dis}><button class="sl-b" data-act="sstep" data-d="1" aria-label="Subir ${esc(ex.label)}"${dis}>+</button></div>${ex.show?`<dl class="simk" id="slShow" aria-live="polite">${showHTML(ex,run.sel)}</dl>`:''}</div>`;
  },
  ready:()=>true,
  correct:(ex,run)=>Math.abs(run.sel-ex.a)<=(ex.tol==null?ex.step/2:ex.tol)+1e-9,
  answer:ex=>ex.label+': '+f(ex.a,dec(ex.step),ex.unit),
  act:{sstep(b,run,ex){set(ex,run,run.sel+(+b.dataset.d)*ex.step)}},
  input(e,run,ex){if(e.target.id!=='slIn')return false;set(ex,run,+e.target.value);return true},
  enter:t=>t.id==='slIn',
};
