// Herramientas formativas con las cifras que mete el usuario (nunca datos de valores reales):
// calculadora de tamaño de posición (Técnico) y curva de pago de opciones al vencimiento (Opciones).
// Solo cálculo y saneado del estado: sin DOM ni textos, para que lo usen las vistas, el estado y el test.

const num=v=>typeof v==='number'&&Number.isFinite(v);
const r6=x=>Math.round(x*1e6)/1e6;

// ---------- Tamaño de posición ----------
// Límites de los controles [mín, máx, paso].
export const TAM_LIM={capital:[1000,200000,500],riesgo:[0.25,3,0.25],entrada:[5,500,0.5],stop:[1,500,0.5],atr:[0.1,25,0.1],mult:[0.5,5,0.5],objetivoR:[1,5,0.5],tope:[5,100,5]};
export const TAM_DEF=()=>({capital:20000,riesgo:1,entrada:50,stop:46,atr:2,mult:2,objetivoR:2,tope:25,usarAtr:false});
// Un estado manipulado (copia o servidor) solo puede traer números dentro de los límites y un booleano.
export const tamanoLimpio=c=>{
  const d=TAM_DEF(),o={};
  for(const k of Object.keys(d)){
    const v=(c||{})[k];
    if(typeof d[k]==='boolean'){o[k]=v===true;continue}
    if(!num(v)){o[k]=d[k];continue}
    const [mi,ma]=TAM_LIM[k];o[k]=Math.min(ma,Math.max(mi,v));
  }
  return o;
};
// Posición larga. El tamaño final es el menor del que permite el riesgo y del que permite el peso máximo; siempre hacia abajo.
// Devuelve {ok:false, motivo:'stop'|'cero'} si el stop no sirve (no está por debajo de la entrada, o queda en 0 o menos).
export function tamanoPosicion({capital,riesgo,entrada,stop,atr,mult,usarAtr,objetivoR,tope}){
  const stopEf=usarAtr?r6(entrada-mult*atr):stop;
  if(!(stopEf>0))return {ok:false,motivo:'cero',stop:stopEf};
  if(!(stopEf<entrada))return {ok:false,motivo:'stop',stop:stopEf};
  const riesgoEur=capital*riesgo/100,porAccion=entrada-stopEf,EPS=1e-9;
  const porRiesgo=Math.floor(riesgoEur/porAccion+EPS),porPeso=Math.floor(capital*tope/100/entrada+EPS);
  const acciones=Math.min(porRiesgo,porPeso),importe=acciones*entrada;
  return {ok:true,stop:stopEf,riesgoEur,porAccion,porRiesgo,porPeso,acciones,manda:porPeso<porRiesgo?'peso':'riesgo',
    importe,peso:importe/capital*100,pesoRiesgo:porRiesgo*entrada/capital*100,riesgoReal:acciones*porAccion,
    objetivo:entrada+objetivoR*porAccion,ganancia:acciones*objetivoR*porAccion};
}

// ---------- Curva de pago de opciones ----------
export const PAGO_EST=['callc','putc','cubierta','putv','spread','collar','condor'];
// Campos de cada estrategia (clave del estado) en el orden en que se muestran; precio va siempre primero.
export const PAGO_CAMPOS={
  callc:['k1','p1'],putc:['k1','p1'],cubierta:['k1','p1'],putv:['k1','p1'],
  spread:['k1','p1','k2','p2'],collar:['k1','p1','k2','p2'],condor:['k1','k2','k3','k4','p1']
};
export const PAGO_LIM={precio:[10,300,1],k1:[5,300,1],k2:[5,300,1],k3:[5,300,1],k4:[5,300,1],p1:[0,30,0.05],p2:[0,30,0.05]};
// Valores de partida de cada estrategia con la acción a 100 (coinciden con los ejemplos de las unidades de Opciones).
const PRE={
  callc:{k1:100,p1:4},putc:{k1:100,p1:3.5},cubierta:{k1:105,p1:2},putv:{k1:95,p1:2},
  spread:{k1:100,p1:5,k2:110,p2:2},collar:{k1:90,p1:2.5,k2:110,p2:2},condor:{k1:85,k2:90,k3:110,k4:115,p1:2}
};
export const pagoPreset=(est,precio=100)=>Object.assign({est,precio,k1:100,k2:110,k3:120,k4:130,p1:0,p2:0},PRE[est]);
export const PAGO_DEF=()=>pagoPreset('callc');
export const pagoLimpio=c=>{
  const est=PAGO_EST.includes((c||{}).est)?c.est:'callc',d=pagoPreset(est),o={est};
  for(const k of Object.keys(PAGO_LIM)){
    const v=(c||{})[k];
    if(!num(v)){o[k]=d[k];continue}
    const [mi,ma]=PAGO_LIM[k];o[k]=Math.min(ma,Math.max(mi,v));
  }
  return o;
};
// Cambia de estrategia conservando el precio de la acción.
export const pagoCambiar=(c,est)=>pagoPreset(PAGO_EST.includes(est)?est:'callc',(c||{}).precio);

// Resultado por acción al vencimiento para un precio final s. La acción (cubierta y collar) se compró al precio actual.
const FUN={
  callc:(s,p)=>Math.max(s-p.k1,0)-p.p1,
  putc:(s,p)=>Math.max(p.k1-s,0)-p.p1,
  cubierta:(s,p)=>(s-p.precio)+p.p1-Math.max(s-p.k1,0),
  putv:(s,p)=>p.p1-Math.max(p.k1-s,0),
  spread:(s,p)=>Math.max(s-p.k1,0)-Math.max(s-p.k2,0)-(p.p1-p.p2),
  collar:(s,p)=>(s-p.precio)+Math.max(p.k1-s,0)-p.p1-Math.max(s-p.k2,0)+p.p2,
  condor:(s,p)=>p.p1-Math.max(p.k2-s,0)+Math.max(p.k1-s,0)-Math.max(s-p.k3,0)+Math.max(s-p.k4,0)
};
const ORDEN={spread:['k1','k2'],collar:['k1','k2'],condor:['k1','k2','k3','k4']};
// Resultado en $ por contrato (100 acciones) al vencimiento. Devuelve {ok:false, motivo} si las cifras no forman la estrategia
// ('orden': los ejercicios no están en el orden debido; 'debito': en el spread vertical alcista la prima comprada ha de superar a la vendida).
// perdidaMax y gananciaMax son positivos o Infinity; equilibrios, la lista de precios donde el resultado es 0.
export function pagoEstrategia(est,p){
  const f=FUN[est];if(!f)return {ok:false,motivo:'estrategia'};
  const ks=ORDEN[est]||['k1'];
  for(let i=1;i<ks.length;i++)if(!(p[ks[i-1]]<p[ks[i]]))return {ok:false,motivo:'orden'};
  if(est==='spread'&&!(p.p1>p.p2))return {ok:false,motivo:'debito'};
  const g=s=>r6(f(s,p)*100);
  const bps=[0,...ks.map(k=>p[k])];  // puntos donde cambia la pendiente
  const vals=bps.map(g),ult=bps[bps.length-1],pend=g(ult+1)-g(ult);
  const max=pend>0?Infinity:Math.max(...vals),min=pend<0?-Infinity:Math.min(...vals);
  const eq=[];
  const poner=x=>{if(!eq.some(y=>Math.abs(y-x)<1e-6))eq.push(r6(x))};
  for(let i=0;i<bps.length-1;i++){
    const a=vals[i],b=vals[i+1];
    if(a===0)poner(bps[i]);
    else if(a*b<0)poner(bps[i]+(bps[i+1]-bps[i])*(-a/(b-a)));
  }
  const v=vals[vals.length-1];
  if(v===0)poner(ult);else if(pend!==0&&v*pend<0)poner(ult-v/pend);
  eq.sort((a,b)=>a-b);
  return {ok:true,f:g,bps,perdidaMax:Math.max(0,-min),gananciaMax:Math.max(0,max),equilibrios:eq,alPrecio:g(p.precio)};
}
