// Pantalla del glosario: todos los términos por orden alfabético, con buscador.
import {esc} from '../util.js';
import {icoX} from '../icons.js';
import {GLOSARIO} from '../content.js';
import {t} from '../textos.js';

const orden=()=>(GLOSARIO||[]).map((g,k)=>({g,k})).sort((a,b)=>a.g.termino.localeCompare(b.g.termino,'es',{sensitivity:'base'}));
const sinTildes=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
export function listaGlosario(filtro=''){
  const f=sinTildes(filtro.trim());
  const items=orden().filter(({g})=>!f||sinTildes([g.termino,...(g.alias||[]),g.d].join(' ')).includes(f));
  return items.length?`<dl class="glist">${items.map(({g})=>`<div><dt>${esc(g.termino)}</dt><dd>${esc(g.d)}</dd></div>`).join('')}</dl>`:`<p class="note">${t.glosarioNada}</p>`;
}
export function glosarioHTML(){
  return `<div class="lesson sim-view"><div class="lbar"><button class="x" data-act="glosvolver" aria-label="${t.volver}">${icoX}</button><p class="kind">${t.glosario}</p></div>
  <div class="qwrap"><h1 class="q">${t.glosarioTitulo}</h1>
  <label class="gbusca" for="glos-q"><span>${t.glosarioBuscar}</span><input id="glos-q" type="search" autocomplete="off"></label>
  <div id="glosLista" aria-live="polite">${listaGlosario()}</div></div>
  <div><button class="btn line" data-act="glosvolver">${t.volver}</button></div></div>`;
}
