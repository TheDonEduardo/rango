// Carga el contenido (src/content/units.json) y construye la lista plana de lecciones.
export const UNITS = await (await fetch(new URL('./content/units.json', import.meta.url))).json();
export const FLAT=[];
UNITS.forEach(u=>{
  if(!u.lessons) return;
  u.lessons.forEach(l=>FLAT.push(Object.assign({},l,{unit:u,kind:'lesson'})));
  FLAT.push({id:u.id+'-rev',title:'Repaso de la unidad',unit:u,kind:'review'});
});
export const exCount=l=>l.kind==='review'?5:l.ex.length;
