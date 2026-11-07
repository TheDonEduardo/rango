// Carga el contenido (src/content/units.json + casos.json) y construye la lista plana de lecciones.
const get=async f=>(await fetch(new URL('./content/'+f,import.meta.url))).json();
export const UNITS=await get('units.json');
// Casos reales generados por tools/casos.py (opcional: si falta, las lecciones funcionan igual).
export const CASOS=await get('casos.json').catch(()=>null);
export const TRACKS=[{id:'tecnico',title:'Técnico'},{id:'fundamental',title:'Fundamental'}];
export const trackOf=u=>u.track||'tecnico';
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
