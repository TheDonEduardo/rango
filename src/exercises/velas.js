// Tocar una vela (tap) o una línea horizontal (level) del gráfico.
import {$app,setCheck} from '../ui.js';
const tipo=(kind,sel,clase,leer,answer)=>({
  kind,
  chart:(ex,run)=>({mode:sel,sel:run.sel,checked:run.checked,a:ex.a}),
  ready:(ex,run)=>run.sel!==null,
  correct:(ex,run)=>run.sel===ex.a,
  answer,
  // Clic o Enter/Espacio sobre un elemento del gráfico.
  svg(el,run){run.sel=leer(el);$app.querySelectorAll(clase).forEach(g=>g.classList.toggle('sel',g===el));setCheck(true)},
});
export const tap=tipo('Toca una vela del gráfico','tap','.cd',el=>+el.dataset.i,ex=>'Vela '+(ex.a+1));
export const level=tipo('Toca una línea del gráfico','level','.lv',el=>el.dataset.id,ex=>'Nivel '+ex.a);
