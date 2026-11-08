// Tocar una vela (tap) o una línea horizontal (level) del gráfico.
import {$app,setCheck} from '../ui.js';
import {t} from '../textos.js';
const tipo=(sel,clase,leer,answer)=>({
  chart:(ex,run)=>({mode:sel,sel:run.sel,checked:run.checked,a:ex.a}),
  ready:(ex,run)=>run.sel!==null,
  correct:(ex,run)=>run.sel===ex.a,
  answer,
  // Clic o Enter/Espacio sobre un elemento del gráfico.
  svg(el,run){run.sel=leer(el);$app.querySelectorAll(clase).forEach(g=>g.classList.toggle('sel',g===el));setCheck(true)},
});
export const tap=tipo('tap','.cd',el=>+el.dataset.i,ex=>t.vela(ex.a+1));
export const level=tipo('level','.lv',el=>el.dataset.id,ex=>t.nivel(ex.a));
