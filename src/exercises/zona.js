// Marcar una zona (rango, base) arrastrando dos líneas: place = [{id:'top', …}, {id:'bottom', …}].
// Misma mecánica que «plan» (drag.js), con la franja entre ambas sombreada.
import plan from './plan.js';
export default {
  ...plan,
  chart(ex,run){return {...plan.chart(ex,run),zona:true}},
  correct:(ex,run)=>run.sel.top>run.sel.bottom&&plan.correct(ex,run),
};
