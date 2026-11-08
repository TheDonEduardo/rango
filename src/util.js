// Utilidades y constantes compartidas.
export const KEY='rango.v1';
export const GOAL=40, RH=132, OFFS=[0,14,20,14,0,-14,-20,-14];
export const fmt=(v,d=2)=>Number(v).toLocaleString('es-ES',{minimumFractionDigits:d,maximumFractionDigits:d});
export const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export const dkey=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
export const today=()=>dkey(new Date());
export const yest=()=>{const d=new Date();d.setDate(d.getDate()-1);return dkey(d)};
export const addDays=n=>{const d=new Date();d.setDate(d.getDate()+n);return dkey(d)};
export const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
export function parseNum(s){
  const t=String(s).trim().replace(/[€$%R\s]/gi,'').replace(',','.');
  return /^-?\d+(\.\d+)?$/.test(t)?parseFloat(t):null;
}
// Ejercicio «plan»: tolerancia de cada línea y paso al arrastrar (por defecto 0,10).
export const planTol=p=>p.tol==null?0.1:p.tol;
export const planStep=ex=>ex.step||0.1;
// Texto de ejercicio: escapa y une cada número con su unidad (26,00 €, 12 %, 3R…) para que no se separen al saltar de línea.
export const tx=s=>esc(s).replace(/(\d) (?=(?:M?[€$]|%|R\b|veces\b))/g,'$1 ');
