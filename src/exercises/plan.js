// Arrastrar entrada, stop y objetivo sobre el gráfico (las líneas las mueve drag.js).
import {fmt,planTol,planStep} from '../util.js';
import {fineHTML} from '../drag.js';
const init=(ex,run)=>{if(!run.sel)run.sel=Object.fromEntries(ex.place.map(p=>[p.id,p.start]))};
export default {
  kind:'Arrastra las líneas del gráfico',
  chart(ex,run){init(ex,run);return {mode:'plan',vals:run.sel,checked:run.checked,place:ex.place}},
  after:(ex,run)=>run.checked?'':fineHTML(ex.place),
  ready:()=>true,
  correct:(ex,run)=>ex.place.every(p=>Math.abs(run.sel[p.id]-p.a)<=planTol(p)+1e-9),
  answer:ex=>ex.place.map(p=>p.label+' '+fmt(p.a)).join(' · '),
  // Contexto para drag.js mientras el ejercicio está sin comprobar.
  plan(ex,run){init(ex,run);return {place:ex.place,step:planStep(ex),vals:run.sel}},
};
