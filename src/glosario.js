// Glosario: los términos de src/content/glosario.json se vuelven tocables en enunciados, explicaciones y guías.
// Cada entrada: {termino, alias?, no?, d}. Se marca solo la primera aparición de cada término en cada bloque de texto,
// y nunca dentro de otro término (se buscan primero los más largos: «línea RS» antes que «RS»).
// no: frases en las que el término no tiene ese significado («larga duración»).
import {esc} from './util.js';
import {GLOSARIO} from './content.js';

const reEsc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
// En el texto ya escapado los espacios ante unidades son de no separación y & es &amp;.
const patron=a=>reEsc(esc(a)).replace(/ /g,'[ \\u00a0]');
const ENTRADAS=(GLOSARIO||[]).map((g,k)=>{
  const formas=[g.termino,...(g.alias||[])].sort((a,b)=>b.length-a.length);
  // Siglas y nombres propios distinguen mayúsculas; las palabras comunes, no.
  const flags=/[a-záéíóúñ]/.test(g.termino)&&g.termino!==g.termino.toUpperCase()&&!/^[A-Z]/.test(g.termino)?'giu':'gu';
  return {k,g,largo:Math.max(...formas.map(f=>f.length)),re:new RegExp(`(?<![\\p{L}\\p{N}])(?:${formas.map(patron).join('|')})(?![\\p{L}\\p{N}])`,flags),
    no:(g.no||[]).map(n=>new RegExp(patron(n),'iu'))};
}).sort((a,b)=>b.largo-a.largo);
export const termino=k=>GLOSARIO[+k];

// html: texto ya escapado (sin etiquetas). Devuelve el mismo texto con botones en los términos.
export function glos(html){
  if(!ENTRADAS.length)return html;
  let partes=[{s:html,term:false}];
  for(const e of ENTRADAS){
    let hecho=false;
    partes=partes.flatMap(p=>{
      if(hecho||p.term)return [p];
      e.re.lastIndex=0;let m;
      while((m=e.re.exec(p.s))){
        const desde=Math.max(0,m.index-20),cerca=p.s.slice(desde,m.index+m[0].length+20);
        if(e.no.some(r=>r.test(cerca)))continue;
        hecho=true;
        return [{s:p.s.slice(0,m.index),term:false},{s:`<button class="term" data-act="term" data-k="${e.k}">${m[0]}</button>`,term:true},{s:p.s.slice(m.index+m[0].length),term:false}];
      }
      return [p];
    });
  }
  return partes.map(p=>p.s).join('');
}
