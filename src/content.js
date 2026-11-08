// Carga el contenido (src/content/units/: index.json con el orden y un archivo por unidad, más casos.json)
// y construye la lista plana de lecciones.
const get=async f=>(await fetch(new URL('./content/'+f,import.meta.url))).json();
// En paralelo: casos.json (generado por tools/casos.py) es opcional; si falta, las lecciones funcionan igual.
// semana.json (tools/semana.py) es la «Operación de la semana»; también opcional.
const unidades=async()=>Promise.all((await get('units/index.json')).map(id=>get('units/'+id+'.json')));
export const [UNITS,CASOS,SEMANA]=await Promise.all([unidades(),get('casos.json').catch(()=>null),get('semana.json').catch(()=>null)]);
// La ruta «basico» es el primer nivel: desbloquea las demás (o se salta desde el inicio).
export const TRACKS=[{id:'basico',title:'Básico'},{id:'pasiva',title:'Pasiva'},{id:'fundamental',title:'Fundamental'},{id:'tecnico',title:'Técnico'}];
export const trackOf=u=>u.track||'tecnico';
// Cada ejercicio fijo tiene un id estable («idLección-n», asignado al crearlo y que no cambia aunque se reordene):
// lo usan el repaso espaciado, las estadísticas y el test de nivel. Los casos reales no tienen.
export const EXBYID=new Map();
UNITS.forEach(u=>(u.lessons||[]).forEach(l=>l.ex.forEach(e=>{e.lesson=l.id;EXBYID.set(e.id,e)})));
// Test de nivel: dos ejercicios (id) de cada unidad obligatoria de Básico. Si se añade una unidad obligatoria,
// añade aquí dos de sus ejercicios (el test comprueba que cada unidad tiene los suyos).
export const PLACEMENT=['ba1-1','ba2-4','bb1-1','bb2-3','bc1-1','bc2-3','bd1-1','bd2-2','be1-1','be2-3','bf1-2','bf2-3'];
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
