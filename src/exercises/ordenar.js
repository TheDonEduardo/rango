// Ordenar (order) y emparejar (match) comparten mecánica: el usuario toca elementos de la lista y llenan
// el primer hueco libre; run.sel[k] = índice del elemento en el hueco k, o null si está vacío. Quitar uno
// deja su hueco libre sin mover los demás (en match, cada hueco es de un término).
import {esc,tx,shuffle} from '../util.js';
import {$app,setCheck} from '../ui.js';
const items=ex=>ex.t==='match'?ex.pairs.map(p=>p[1]):ex.items;
function ordHTML(ex,run){
  const its=items(ex),labels=ex.t==='match'?ex.pairs.map(p=>p[0]):null,n=its.length,sel=run.sel||Array(n).fill(null);
  const next=sel.indexOf(null);
  if(!run.perm.has(ex)){let p;do{p=shuffle(its.map((_,i)=>i))}while(p.every((v,i)=>v===i));run.perm.set(ex,p)}
  let h=`<ol class="ord-ans" aria-label="${labels?'Tus parejas':'Tu orden'}">`;
  for(let k=0;k<n;k++){
    const mark=labels?`<span class="mt">${tx(labels[k])}</span>`:`<span class="n">${k+1}</span>`;
    if(sel[k]!=null){
      const c=run.checked?(sel[k]===k?'good':'bad'):'filled';
      h+=`<li>${labels?mark:''}<button class="opt ${c}" data-act="ounpick" data-k="${k}"${run.checked?' disabled':` aria-label="Quitar: ${esc(its[sel[k]])}"`}>${labels?'':mark}${tx(its[sel[k]])}</button></li>`;
    }else h+=`<li>${labels?mark:''}<div class="slot${k===next?' next':''}" aria-hidden="true">${labels?(k===next?'Toca su descripción':''):mark}</div></li>`;
  }
  h+='</ol>';
  if(!run.checked){
    const rest=run.perm.get(ex).filter(i=>!sel.includes(i));
    if(rest.length)h+='<div class="opts ord-pool">'+rest.map(i=>`<button class="opt" data-act="opick" data-i="${i}">${tx(its[i])}</button>`).join('')+'</div>';
  }
  return h;
}
const ready=(ex,run)=>!!run.sel&&run.sel.length===items(ex).length&&run.sel.every(v=>v!=null);
function update(ex,run){
  $app.querySelector('.ord').innerHTML=ordHTML(ex,run);
  setCheck(ready(ex,run));
  const f=$app.querySelector('.ord-pool .opt')||$app.querySelector('[data-act=check]');if(f&&f.focus)f.focus({preventScroll:true});
}
const tipo=(kind,answer,answerHTML)=>({
  kind,
  html:(ex,run)=>`<div class="ord${ex.t==='match'?' match':''}">${ordHTML(ex,run)}</div>`,
  ready,
  correct:(ex,run)=>ready(ex,run)&&run.sel.every((v,k)=>v===k),
  answer,answerHTML,
  act:{
    opick(b,run,ex){if(!run.sel)run.sel=Array(items(ex).length).fill(null);const k=run.sel.indexOf(null);if(k>=0){run.sel[k]=+b.dataset.i;update(ex,run)}},
    ounpick(b,run,ex){run.sel[+b.dataset.k]=null;update(ex,run)},
  },
});
export const order=tipo('Ordena los pasos',ex=>ex.items.map((t,i)=>(i+1)+'. '+t).join('  '),
  ex=>`<div class="ans">Orden correcto:<ol>${ex.items.map(t=>`<li>${tx(t)}</li>`).join('')}</ol></div>`);
export const match=tipo('Empareja cada uno con su descripción',ex=>ex.pairs.map(p=>p[0]+': '+p[1]).join('  '),
  ex=>`<div class="ans">Parejas correctas:<ul>${ex.pairs.map(p=>`<li>${tx(p[0])}: ${tx(p[1])}</li>`).join('')}</ul></div>`);
