// Líneas arrastrables sobre un gráfico de velas (ratón, dedo, flechas del teclado o botones − / +).
// Las usan el ejercicio «plan» y la Operación de la semana: cada uno da su contexto con setPlanCtx.
import {fmt,esc} from './util.js';
import {$app} from './ui.js';

let getCtx=()=>null,drag=null;
// getter → {place, step, vals, after?} o null si ahora no hay líneas que mover.
export function setPlanCtx(getter){getCtx=getter}

export function fineHTML(place){
  return `<div class="pfine">${place.map(p=>`<div class="pf pl-${p.id}"><span>${esc(p.label)}</span><button data-act="pstep" data-id="${p.id}" data-d="-1" aria-label="Bajar ${esc(p.label)}">−</button><button data-act="pstep" data-id="${p.id}" data-d="1" aria-label="Subir ${esc(p.label)}">+</button></div>`).join('')}</div>`;
}
function planSet(g,v){
  const ctx=getCtx();if(!ctx)return;
  const svg=g.ownerSVGElement,d=svg.dataset,lo=+d.lo,hi=+d.hi;
  const st=ctx.step;v=Math.round(Math.min(hi,Math.max(lo,v))/st)*st;v=Math.round(v*100)/100;
  const id=g.dataset.id,p=ctx.place.find(q=>q.id===id);
  ctx.vals[id]=v;
  g.setAttribute('transform',`translate(0 ${(+d.top+(hi-v)/(hi-lo)*+d.ph).toFixed(1)})`);
  g.querySelector('.pt').textContent=p.label+' '+fmt(v);
  g.setAttribute('aria-valuenow',v);g.setAttribute('aria-valuetext',p.label+' '+fmt(v));
  if(ctx.after)ctx.after();
}
function planMove(e){
  const g=drag.g,svg=g.ownerSVGElement,d=svg.dataset,pt=svg.createSVGPoint();
  pt.x=e.clientX;pt.y=e.clientY;
  const sy=pt.matrixTransform(svg.getScreenCTM().inverse()).y;
  planSet(g,+d.hi-(sy-+d.top)/+d.ph*(+d.hi-+d.lo));
}
$app.addEventListener('pointerdown',e=>{
  const g=e.target.closest&&e.target.closest('.pl');
  if(!g||!getCtx())return;
  e.preventDefault();drag={g};g.classList.add('drag');
  try{g.setPointerCapture(e.pointerId)}catch(_){}
  planMove(e);
});
$app.addEventListener('pointermove',e=>{if(drag){e.preventDefault();planMove(e)}});
const endDrag=()=>{if(drag){drag.g.classList.remove('drag');drag=null}};
$app.addEventListener('pointerup',endDrag);$app.addEventListener('pointercancel',endDrag);
$app.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('[data-act=pstep]'),c=b&&getCtx();if(!c)return;
  const g=$app.querySelector(`.pl[data-id="${b.dataset.id}"]`);if(g)planSet(g,c.vals[b.dataset.id]+(+b.dataset.d)*c.step);
});
document.addEventListener('keydown',e=>{
  const pg=e.target.closest&&e.target.closest('.pl'),pc=pg&&getCtx();if(!pc)return;
  const k={ArrowUp:1,ArrowRight:1,ArrowDown:-1,ArrowLeft:-1,PageUp:10,PageDown:-10}[e.key];
  if(k){e.preventDefault();planSet(pg,pc.vals[pg.dataset.id]+k*pc.step)}
});
