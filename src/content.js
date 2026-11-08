// Carga el contenido (src/content/units.json + casos.json) y construye la lista plana de lecciones.
const get=async f=>(await fetch(new URL('./content/'+f,import.meta.url))).json();
// En paralelo: casos.json (generado por tools/casos.py) es opcional; si falta, las lecciones funcionan igual.
export const [UNITS,CASOS]=await Promise.all([get('units.json'),get('casos.json').catch(()=>null)]);
// La ruta «basico» es el primer nivel: desbloquea las otras dos (o se salta desde el inicio).
export const TRACKS=[{id:'basico',title:'Básico'},{id:'tecnico',title:'Técnico'},{id:'fundamental',title:'Fundamental'}];
export const trackOf=u=>u.track||'tecnico';
// uid = «idLección#índice»: identifica cada ejercicio fijo en el repaso espaciado (los casos reales no tienen).
export const EXBYID=new Map();
UNITS.forEach(u=>(u.lessons||[]).forEach(l=>l.ex.forEach((e,i)=>{e.uid=l.id+'#'+i;EXBYID.set(e.uid,e)})));
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
