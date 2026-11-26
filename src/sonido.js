// Sonidos de refuerzo generados con Web Audio en el propio navegador: sin archivos ni peticiones.
// El AudioContext se crea la primera vez que suena algo (siempre tras un gesto del usuario);
// si el navegador no lo admite o falla, no suena nada y no hay errores. Se desactiva con S.sonido.
import {S} from './state.js';

let ctx=null,roto=false;
function audio(){
  if(roto||S.sonido===false)return null;
  try{
    if(!ctx){const A=typeof window!=='undefined'&&(window.AudioContext||window.webkitAudioContext);if(!A){roto=true;return null}ctx=new A()}
    if(ctx.state==='suspended'&&ctx.resume)ctx.resume().catch(()=>{});
    return ctx;
  }catch(e){roto=true;return null}
}
// Una nota con envolvente suave (subida de 12 ms y bajada exponencial: sin clics). El timbre lleva un armónico débil, como una campanita.
function nota(c,f,t0,dur,vol,tipo='sine',arm=0){
  const g=c.createGain();g.connect(c.destination);
  g.gain.setValueAtTime(0.0001,t0);
  g.gain.linearRampToValueAtTime(vol,t0+0.012);
  g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
  const o=c.createOscillator();o.type=tipo;o.frequency.setValueAtTime(f,t0);o.connect(g);o.start(t0);o.stop(t0+dur+0.02);
  if(arm){
    const g2=c.createGain();g2.gain.setValueAtTime(0.0001,t0);g2.gain.linearRampToValueAtTime(vol*arm,t0+0.01);g2.gain.exponentialRampToValueAtTime(0.0001,t0+dur*0.7);g2.connect(c.destination);
    const o2=c.createOscillator();o2.type='sine';o2.frequency.setValueAtTime(f*2.01,t0);o2.connect(g2);o2.start(t0);o2.stop(t0+dur+0.02);
  }
}
function tocar(fn){
  try{const c=audio();if(c)fn(c,c.currentTime+0.01)}catch(e){}
}
// Acierto: dos notas ascendentes (Mi6 y La6), unos 220 ms.
export const sonAcierto=()=>tocar((c,t)=>{nota(c,659.25,t,0.14,0.16,'sine',0.25);nota(c,880,t+0.08,0.16,0.16,'sine',0.25)});
// Fallo: un tono grave, suave y corto que baja un poco.
export const sonFallo=()=>tocar((c,t)=>{
  const g=c.createGain();g.connect(c.destination);
  g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(0.13,t+0.02);g.gain.exponentialRampToValueAtTime(0.0001,t+0.22);
  const o=c.createOscillator();o.type='triangle';o.frequency.setValueAtTime(196,t);o.frequency.exponentialRampToValueAtTime(165,t+0.2);o.connect(g);o.start(t);o.stop(t+0.25);
});
// Lección completada: arpegio ascendente de cuatro notas (Do-Mi-Sol-Do), unos 520 ms.
export const sonFin=()=>tocar((c,t)=>{[523.25,659.25,783.99,1046.5].forEach((f,i)=>nota(c,f,t+i*0.1,i===3?0.3:0.18,0.15,'sine',0.2))});
