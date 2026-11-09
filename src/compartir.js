// Compartir logros: dibuja una tarjeta (1080 × 1080) con la racha y el progreso, y la comparte con el
// menú del sistema (móvil) o la descarga como PNG. No envía nada a ningún servidor.
import {UNITS,FLAT,TRACKS,trackOf} from './content.js';
import {S,streakNow} from './state.js';
import {t} from './textos.js';

const C={bg:'#12202F',ink:'#F2F6FA',ink2:'#9AA9BA',up:'#2BC48A',acc:'#F5B82E',line:'#26364A'};
const fuente=(peso,px)=>`${peso} ${px}px "Bricolage Grotesque", "IBM Plex Sans", system-ui, sans-serif`;

export function lienzoLogro(titulo){
  const cv=document.createElement('canvas');cv.width=1080;cv.height=1080;
  const g=cv.getContext('2d');
  g.fillStyle=C.bg;g.fillRect(0,0,1080,1080);
  // Logo: vela con mecha.
  g.strokeStyle=C.up;g.lineWidth=8;g.beginPath();g.moveTo(130,96);g.lineTo(130,204);g.stroke();
  g.fillStyle=C.up;g.beginPath();g.roundRect?g.roundRect(104,124,52,52,10):g.rect(104,124,52,52);g.fill();
  g.fillStyle=C.ink;g.font=fuente(800,64);g.fillText('Rango',190,174);
  g.fillStyle=C.acc;g.font=fuente(700,44);g.fillText(titulo,96,330);
  const sk=streakNow();
  g.fillStyle=C.ink;g.font=fuente(800,220);g.fillText(String(sk),96,560);
  g.fillStyle=C.ink2;g.font=fuente(600,48);g.fillText(t.diasRacha(sk),96,630);
  // Progreso por ruta.
  let y=740;
  TRACKS.forEach(r=>{
    const ls=FLAT.filter(l=>l.kind==='lesson'&&trackOf(l.unit)===r.id),h=ls.filter(l=>S.done[l.id]).length;
    g.fillStyle=C.ink;g.font=fuente(600,36);g.fillText(r.title,96,y);
    g.fillStyle=C.line;g.fillRect(420,y-24,560,20);
    g.fillStyle=C.up;g.fillRect(420,y-24,560*h/ls.length,20);
    y+=72;
  });
  g.fillStyle=C.ink2;g.font=fuente(500,32);
  g.fillText(t.compartirPie(S.xp,UNITS.filter(u=>S.dominadas[u.id]).length),96,1030);
  return cv;
}

export async function compartirLogro(titulo){
  const cv=lienzoLogro(titulo);
  const blob=await new Promise(r=>cv.toBlob(r,'image/png'));
  const archivo=new File([blob],'rango-logro.png',{type:'image/png'});
  if(navigator.canShare&&navigator.canShare({files:[archivo]})){
    try{await navigator.share({files:[archivo],title:'Rango',text:t.compartirTexto});return 'compartido'}catch(e){if(e&&e.name==='AbortError')return 'cancelado'}
  }
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='rango-logro.png';
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  return 'descargado';
}
