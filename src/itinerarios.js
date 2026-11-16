// Itinerarios: recorridos guiados que encadenan lecciones de varias rutas con un objetivo concreto.
// Cada paso es el id de una lección; el orden es el del itinerario, no el de las rutas (no aplica sus bloqueos).
import {FLAT} from './content.js';
import {S} from './state.js';

export const ITINERARIOS=[
  {id:'cartera',pasos:['ba1','bb1','bd1','bd2','bn1','bg1','bg2','pr1','ix1','rb1','zb1','zb2','zp1','zp2']},
  {id:'compra',pasos:['f1a','f2a','f3a','f4a','fm1','t1','t2','r1','r2','zf2','zt1','zt2']},
  {id:'proteger',pasos:['bq1','bq2','bs1','bs2','bm1','lq1','lq2','pp1']},
  {id:'jubilacion',pasos:['ob1','ob2','in1','pr1','rt1','rt2','pf1','pf2','rv1']},
  {id:'resultados',pasos:['f5a','f5b','f1b','f10a','f10b','fa1','fa2']},
  {id:'riesgo',pasos:['r1','r2','s1','s2','c1','c2','p1','p2']},
  {id:'vivienda',pasos:['fp1','fp2','fp3','fp4','fp5','fp6','fp11','zr1','zr2']},
  {id:'cripto',pasos:['cx1','cx2','cb1','cb2','ce1','cy1','ck1','cq1','cf1','zc1','zc2']},
  {id:'opciones',pasos:['op1','op2','op3','op4','op9','op11','op15','op19','zo1','zo2']},
];
// Progreso de un itinerario: lecciones (en orden), cuántas están hechas y la siguiente pendiente (o null).
export function progreso(it){
  const L=it.pasos.map(id=>FLAT.find(l=>l.id===id)).filter(Boolean),hechas=L.filter(l=>S.done[l.id]).length;
  return {L,hechas,total:L.length,sig:L.find(l=>!S.done[l.id])||null};
}
export const itinActual=()=>{const it=ITINERARIOS.find(x=>x.id===S.itin);return it?Object.assign({it},progreso(it)):null};
