// Carga el contenido (src/content/units.json + casos.json) y construye la lista plana de lecciones.
const get=async f=>(await fetch(new URL('./content/'+f,import.meta.url))).json();
// En paralelo: casos.json (generado por tools/casos.py) es opcional; si falta, las lecciones funcionan igual.
// semana.json (tools/semana.py) es la «Operación de la semana»; también opcional.
export const [UNITS,CASOS,SEMANA]=await Promise.all([get('units.json'),get('casos.json').catch(()=>null),get('semana.json').catch(()=>null)]);
// La ruta «basico» es el primer nivel: desbloquea las demás (o se salta desde el inicio).
export const TRACKS=[{id:'basico',title:'Básico'},{id:'pasiva',title:'Pasiva'},{id:'fundamental',title:'Fundamental'},{id:'tecnico',title:'Técnico'}];
export const trackOf=u=>u.track||'tecnico';
// uid = «idLección#índice»: identifica cada ejercicio fijo en el repaso espaciado (los casos reales no tienen).
export const EXBYID=new Map();
UNITS.forEach(u=>(u.lessons||[]).forEach(l=>l.ex.forEach((e,i)=>{e.uid=l.id+'#'+i;EXBYID.set(e.uid,e)})));
// Test de nivel: dos ejercicios (uid) de cada unidad obligatoria de Básico. Si se añade una unidad obligatoria,
// añade aquí dos de sus ejercicios (el test comprueba que cada unidad tiene los suyos).
export const PLACEMENT=['ba1#0','ba2#3','bb1#0','bb2#2','bc1#0','bc2#2','bd1#0','bd2#1','be1#0','be2#2','bf1#1','bf2#2'];
export const FLAT=[];
UNITS.forEach(u=>{
  if(!u.lessons) return;
  u.lessons.forEach(l=>{
    const casos=(CASOS&&CASOS.ex&&CASOS.ex[l.id])||[];
    FLAT.push(Object.assign({},l,{unit:u,kind:'lesson',casos}));
  });
  FLAT.push({id:u.id+'-rev',title:'Repaso de la unidad',unit:u,kind:'review'});
});
export const exCount=l=>l.kind==='review'?5:l.ex.length+(l.casos.length?1:0);
