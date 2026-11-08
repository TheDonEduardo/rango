// Pantallas de una lección en curso y de su resultado (lección, repaso, test de nivel, sin vidas).
import {esc,tx} from '../util.js';
import {P,icoX,icoOk} from '../icons.js';
import {candlesSVG,lineSVG,glyph} from '../charts.js';
import {streakNow} from '../state.js';
import {ses} from '../ui.js';
import {TIPOS} from '../exercises/index.js';

function chartHTML(ex,run){
  const sp=ex.chart;if(!sp)return'';
  const T=TIPOS[ex.t],st=T.chart?T.chart(ex,run):null;
  return `<figure class="chart">${sp.type==='line'?lineSVG(sp):candlesSVG(sp,st)}</figure>${T.after?T.after(ex,run):''}`;
}
// Tabla de datos (resultados trimestrales, márgenes…): {cols:[...], rows:[[...]], note?}
function tableHTML(ex){
  const tb=ex.table;if(!tb)return'';
  let h='<figure class="chart tbl"><table><thead><tr>'+tb.cols.map(c=>`<th scope="col">${esc(c)}</th>`).join('')+'</tr></thead><tbody>';
  tb.rows.forEach(r=>{h+='<tr>'+r.map((c,i)=>i===0?`<th scope="row">${tx(c)}</th>`:`<td>${tx(c)}</td>`).join('')+'</tr>'});
  h+='</tbody></table>';
  if(tb.note)h+=`<figcaption>${esc(tb.note)}</figcaption>`;
  return h+'</figure>';
}
export function lessonHTML(){
  const run=ses.run,ex=run.queue[0],T=TIPOS[ex.t],pct=Math.round(run.done/run.total*100);
  let hearts='';for(let i=0;i<3;i++)hearts+=`<svg class="heart ${i<run.lives?'on':'off'}" viewBox="0 0 24 24" aria-hidden="true"><path d="${P.heart}" fill="currentColor"/></svg>`;
  let h=`<div class="lesson"><div class="lbar"><button class="x" data-act="quit" aria-label="Salir de la lección">${icoX}</button><div class="prog" role="progressbar" aria-label="Progreso de la lección" aria-valuemin="0" aria-valuemax="${run.total}" aria-valuenow="${run.done}"><i style="width:${pct}%"></i></div>${run.L.kind==='test'?'':`<div class="lives" role="img" aria-label="${run.lives} vidas">${hearts}</div>`}</div>`;
  h+=`<div class="qwrap"><p class="kind">${ex.caso?`Caso real: ${esc(ex.caso)} · `:''}${T.kind}</p><h1 class="q">${tx(ex.q)}</h1>${chartHTML(ex,run)}${tableHTML(ex)}${T.html?T.html(ex,run):''}</div>`;
  if(!run.checked){
    h+=`<div><button class="btn primary" data-act="check"${T.ready(ex,run)?'':' disabled'}>Comprobar</button></div>`;
  }else{
    const ans=run.ok?'':T.answerHTML?T.answerHTML(ex):`<p class="ans">Respuesta: ${tx(T.answer(ex))}</p>`;
    h+=`<div class="fb ${run.ok?'good':'bad'}" role="status"><div class="fb-h">${run.ok?icoOk:icoX}<span>${run.ok?'Correcto':'Incorrecto'}</span></div><p>${tx(ex.why)}</p>${ans}<button class="btn primary" data-act="next">Continuar</button></div>`;
  }
  return h+'</div>';
}
function testResultHTML(r){
  const nota=r.abre?'Pasiva, Fundamental y Técnico quedan abiertas. Puedes volver a los básicos cuando quieras.'
    :r.dominadas.length?'Las unidades que dominas quedan marcadas como completadas: sigue por la primera pendiente de Básico.'
    :'Empieza por Básico: en pocas lecciones tendrás la base para el resto.';
  return `<div class="res"><div class="res-main"><div class="res-top">${glyph('done',r.score/r.total,84,108)}<div><h1>Test completado</h1><p>${r.score} de ${r.total} aciertos</p></div></div>
  ${r.dominadas.length?`<div class="note"><b>Ya dominas</b><ul class="dom">${r.dominadas.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></div>`:''}
  <p class="note">${nota}</p></div>
  <div><button class="btn primary" data-act="home">Continuar</button></div></div>`;
}
export function resultHTML(){
  const r=ses.lastRes,sk=streakNow();
  if(r.test)return testResultHTML(r);
  return `<div class="res"><div class="res-main"><div class="res-top">${glyph('done',r.acc,84,108)}<div><h1>${r.srs?'Repaso completado':'Lección completada'}</h1><p>${esc(r.title)}</p></div></div>
  <div class="metrics"><div><b>+${r.xp}</b><span>XP ganados</span></div><div><b>${Math.round(r.acc*100)} %</b><span>Precisión</span></div><div><b>${sk}</b><span>${sk===1?'día de racha':'días de racha'}</span></div></div>
  <p class="note">${r.kind==='weak'?'Los que has acertado salen de tus puntos débiles; los que has fallado siguen en la lista y vuelven mañana al repaso.':r.srs?'Los que has acertado volverán dentro de unos días; los que has fallado, mañana.':`El cuerpo de tu vela es proporcional a tu precisión. ${r.acc===1?'Vela llena: sin un solo fallo.':'Repite la lección para llenarla.'}`}</p></div>
  <div><button class="btn primary" data-act="home">Continuar</button></div></div>`;
}
export function failHTML(){
  return `<div class="res"><div class="res-main"><div class="res-top">${glyph('locked',null,84,108)}<div><h1>Sin vidas</h1><p>Has agotado los 3 fallos de esta lección.</p></div></div><p class="note">Repasa las explicaciones y vuelve a intentarlo. Las preguntas se barajan de nuevo.</p></div><div class="stack"><button class="btn primary" data-act="retry">Reintentar lección</button><button class="btn line" data-act="home">Volver al inicio</button></div></div>`;
}
