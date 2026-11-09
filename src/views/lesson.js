// Pantallas de una lección en curso y de su resultado (lección, repaso, test de nivel, sin vidas).
import {esc,tx} from '../util.js';
import {P,icoX,icoOk} from '../icons.js';
import {candlesSVG,lineSVG,glyph} from '../charts.js';
import {streakNow} from '../state.js';
import {ses} from '../ui.js';
import {TIPOS} from '../exercises/index.js';
import {glos} from '../glosario.js';
import {t} from '../textos.js';

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
  let h=`<div class="lesson"><div class="lbar"><button class="x" data-act="quit" aria-label="${t.salirLeccion}">${icoX}</button><div class="prog" role="progressbar" aria-label="${t.progresoLeccion}" aria-valuemin="0" aria-valuemax="${run.total}" aria-valuenow="${run.done}"><i style="width:${pct}%"></i></div>${run.L.kind==='test'||run.L.kind==='nivel'?'':`<div class="lives" role="img" aria-label="${t.vidas(run.lives)}">${hearts}</div>`}</div>`;
  h+=`<div class="qwrap"><p class="kind">${ex.caso?t.casoReal(esc(ex.caso)):''}${t.tipos[ex.t]}</p><h1 class="q">${glos(tx(ex.q))}</h1>${chartHTML(ex,run)}${tableHTML(ex)}${T.html?T.html(ex,run):''}</div>`;
  if(!run.checked){
    h+=`<div><button class="btn primary" data-act="check"${T.ready(ex,run)?'':' disabled'}>${t.comprobar}</button></div>`;
  }else{
    const ans=run.ok?'':(T.answerHTML?T.answerHTML(ex):`<p class="ans">${t.respuesta}: ${tx(T.answer(ex))}</p>`)
      +(ex.guia?`<button class="link teoria" data-act="guiarepaso" data-g="${ex.guia}">${t.repasarTeoria}</button>`:'');
    h+=`<div class="fb ${run.ok?'good':'bad'}" role="status"><div class="fb-h">${run.ok?icoOk:icoX}<span>${run.ok?t.correcto:t.incorrecto}</span></div><p>${glos(tx(ex.why))}</p>${ans}<button class="btn primary" data-act="next">${t.continuar}</button><button class="link reporte" data-act="reportar">${t.verError}</button></div>`;
  }
  return h+'</div>';
}
function testResultHTML(r){
  const nota=r.abre?t.testAbre:r.dominadas.length?t.testDomina:t.testNada;
  return `<div class="res"><div class="res-main"><div class="res-top">${glyph('done',r.score/r.total,84,108)}<div><h1>${t.testCompletado}</h1><p>${t.aciertos(r.score,r.total)}</p></div></div>
  ${r.dominadas.length?`<div class="note"><b>${t.yaDominas}</b><ul class="dom">${r.dominadas.map(d=>`<li>${esc(d)}</li>`).join('')}</ul></div>`:''}
  <p class="note">${nota}</p></div>
  <div class="stack"><button class="btn primary" data-act="home">${t.continuar}</button><button class="btn line" data-act="compartir">${t.compartir}</button></div></div>`;
}
function nivelResultHTML(r){
  const n=r.superadas.length,nota=n===r.total?t.nivelTodo:n?t.nivelParcial(n):t.nivelNada;
  return `<div class="res"><div class="res-main"><div class="res-top">${glyph('done',n/r.total,84,108)}<div><h1>${t.pruebaHecha}</h1><p>${t.nivelSuperadas(n,r.total)}</p></div></div>
  ${n?`<div class="note"><b>${t.yaDominas}</b><ul class="dom">${r.superadas.map(d=>`<li>${esc(d)}</li>`).join('')}</ul></div>`:''}
  <p class="note">${nota}</p></div>
  <div class="stack"><button class="btn primary" data-act="home">${t.continuar}</button><button class="btn line" data-act="compartir">${t.compartir}</button></div></div>`;
}
export function resultHTML(){
  const r=ses.lastRes,sk=streakNow();
  if(r.test)return testResultHTML(r);
  if(r.nivel)return nivelResultHTML(r);
  return `<div class="res"><div class="res-main"><div class="res-top">${glyph('done',r.acc,84,108)}<div><h1>${r.srs?t.repasoCompletado:t.leccionCompletada}</h1><p>${esc(r.title)}</p></div></div>
  <div class="metrics"><div><b>+${r.xp}</b><span>${t.xpGanados}</span></div><div><b>${Math.round(r.acc*100)} %</b><span>${t.precisionM}</span></div><div><b>${sk}</b><span>${t.diasRacha(sk)}</span></div></div>
  <p class="note">${r.dominada?`<b>${t.dominadaNota}</b> `:r.kind==='review'?`${t.examenNota} `:''}${r.kind==='weak'?t.notaDebiles:r.srs?t.notaRepaso:t.notaVela(r.acc)}</p></div>
  <div class="stack"><button class="btn primary" data-act="home">${t.continuar}</button><button class="btn line" data-act="compartir">${t.compartir}</button></div></div>`;
}
export function failHTML(){
  return `<div class="res"><div class="res-main"><div class="res-top">${glyph('locked',null,84,108)}<div><h1>${t.sinVidas}</h1><p>${t.sinVidasExplica}</p></div></div><p class="note">${t.sinVidasNota}</p></div><div class="stack"><button class="btn primary" data-act="retry">${t.reintentar}</button><button class="btn line" data-act="home">${t.volverInicio}</button></div></div>`;
}
