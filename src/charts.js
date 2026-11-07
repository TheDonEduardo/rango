// Gráficos SVG: velas, línea con media y glifo de vela para la ruta.
import {fmt,esc} from './util.js';
export function scaleOf(vals,H,pt,pb){
  let lo=Math.min(...vals),hi=Math.max(...vals);
  const pad=(hi-lo)*0.1||1;lo-=pad;hi+=pad;
  const y=v=>pt+(hi-v)/(hi-lo)*(H-pt-pb);
  const rough=(hi-lo)/4,mag=Math.pow(10,Math.floor(Math.log10(rough)));
  const step=[1,2,2.5,5,10].map(m=>m*mag).find(s=>s>=rough);
  const ticks=[];
  for(let k=Math.ceil(lo/step);k*step<=hi;k++)ticks.push(+(k*step).toFixed(6));
  const dec=Math.abs(Math.round(step)-step)<1e-9?0:(Math.abs(Math.round(step*10)-step*10)<1e-9?1:2);
  return {y,ticks,dec};
}
export function candlesSVG(sp,st){
  const W=360,H=sp.h||230,pt=12,pb=12,pr=46,pl=sp.levels?36:10;
  const d=sp.data,vals=[];
  d.forEach(c=>vals.push(c[1],c[2]));
  (sp.levels||[]).forEach(l=>vals.push(l.y));
  (sp.lines||[]).forEach(l=>vals.push(l.y));
  const VH=sp.vol?48:0,pbP=pb+(VH?VH+14:0),vmax=VH?Math.max(...sp.vol):1;
  const sc=scaleOf(vals,H,pt,pbP),y=sc.y;
  const n=d.length,cw=(W-pl-pr)/n,bw=Math.min(24,cw*0.56);
  const tapMode=st&&st.mode==='tap', lvMode=st&&st.mode==='level';
  const cls=k=>{if(!st)return'';if(st.checked){if(k===st.a)return'good';if(k===st.sel)return'bad';return''}return k===st.sel?'sel':''};
  let s=`<svg class="svg ${tapMode?'tap':''}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(sp.alt||'Gráfico de velas')}">`;
  sc.ticks.forEach(t=>{s+=`<line class="grid" x1="${pl}" x2="${W-pr}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/><text x="${W-pr+6}" y="${(y(t)+3.5).toFixed(1)}">${fmt(t,sc.dec)}</text>`});
  if(VH)s+=`<line class="grid" x1="${pl}" x2="${W-pr}" y1="${H-pb}" y2="${H-pb}"/><text x="${W-pr+6}" y="${(H-pb-VH/2+3.5).toFixed(1)}">Vol.</text>`;
  (sp.lines||[]).forEach(l=>{s+=`<line class="ref" x1="${pl}" x2="${W-pr}" y1="${y(l.y).toFixed(1)}" y2="${y(l.y).toFixed(1)}"/>`});
  d.forEach((c,i)=>{
    const [op,hi,lo,cl]=c,cx=pl+cw*i+cw/2,up=cl>=op;
    const top=y(Math.max(op,cl)),bot=y(Math.min(op,cl)),bh=Math.max(1.6,bot-top);
    s+=`<g class="cd ${up?'up':'dn'} ${tapMode?cls(i):''}" data-i="${i}"${tapMode?` tabindex="0" role="button" aria-label="Vela ${i+1}"`:''}>`;
    if(tapMode)s+=`<rect class="hl" x="${(cx-cw/2+1).toFixed(1)}" y="${pt-4}" width="${(cw-2).toFixed(1)}" height="${H-pt-pb+8}" rx="6"/>`;
    if(VH){const vh=Math.max(1.5,sp.vol[i]/vmax*VH);s+=`<rect class="vol" x="${(cx-bw/2).toFixed(1)}" y="${(H-pb-vh).toFixed(1)}" width="${bw.toFixed(1)}" height="${vh.toFixed(1)}" rx="1.5"/>`}
    s+=`<line class="wick" x1="${cx.toFixed(1)}" x2="${cx.toFixed(1)}" y1="${y(hi).toFixed(1)}" y2="${y(lo).toFixed(1)}"/><rect class="body" x="${(cx-bw/2).toFixed(1)}" y="${top.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="2"/>`;
    if(tapMode)s+=`<rect class="hit" x="${(cx-cw/2).toFixed(1)}" y="0" width="${cw.toFixed(1)}" height="${H}"/>`;
    s+='</g>';
  });
  (sp.lines||[]).forEach(l=>{if(l.label)s+=`<text class="reft" x="${W-pr-4}" y="${(y(l.y)-5).toFixed(1)}">${esc(l.label)}</text>`});
  if(sp.annot){
    const c=d[0],xr=pl+cw/2+bw/2;
    [['H',c[1]],['C',c[3]],['O',c[0]],['L',c[2]]].forEach(([k,v])=>{
      s+=`<line class="lead" x1="${(xr+2).toFixed(1)}" x2="${(xr+22).toFixed(1)}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="lab" x="${(xr+27).toFixed(1)}" y="${(y(v)+4).toFixed(1)}">${k} ${fmt(v)}</text>`;
    });
  }
  (sp.levels||[]).forEach(l=>{
    const yy=y(l.y).toFixed(1);
    s+=`<g class="lv ${lvMode?cls(l.id):''}" data-id="${l.id}" tabindex="0" role="button" aria-label="Nivel ${l.id}"><line class="lvl" x1="${pl}" x2="${W-pr}" y1="${yy}" y2="${yy}"/><rect class="hit" x="0" y="${(y(l.y)-13).toFixed(1)}" width="${W-pr}" height="26"/><g class="tag"><circle cx="18" cy="${yy}" r="11"/><text x="18" y="${(y(l.y)+4).toFixed(1)}">${l.id}</text></g></g>`;
  });
  return s+'</svg>';
}
export function lineSVG(sp){
  const W=360,H=sp.h||220,pl=10,pr=46,pt=30,pb=12;
  const sc=scaleOf(sp.data.concat(sp.ma),H,pt,pb),y=sc.y;
  const n=sp.data.length,dx=(W-pl-pr)/(n-1);
  const pts=a=>a.map((v,i)=>`${(pl+dx*i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  let s=`<svg class="svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(sp.alt||'Gráfico de precio')}">`;
  sc.ticks.forEach(t=>{s+=`<line class="grid" x1="${pl}" x2="${W-pr}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/><text x="${W-pr+6}" y="${(y(t)+3.5).toFixed(1)}">${fmt(t,sc.dec)}</text>`});
  s+=`<polyline class="ma" points="${pts(sp.ma)}"/><polyline class="px" points="${pts(sp.data)}"/>`;
  s+=`<line class="px" x1="${pl}" x2="${pl+20}" y1="12" y2="12"/><text class="lg" x="${pl+26}" y="16">Precio</text><line class="ma" x1="${pl+86}" x2="${pl+106}" y1="12" y2="12"/><text class="lg" x="${pl+112}" y="16">Media de 30 semanas</text>`;
  return s+'</svg>';
}
export function glyph(state,acc,w=56,h=72){
  const bh=state==='done'?22+30*(acc==null?1:acc):state==='locked'?6:40;
  const y=36-bh/2;
  const ic=state==='done'?'<path class="ck" d="M19 36l6 6 12-13"/>':state==='locked'?'':'<path class="pl" d="M24 28v16l14-8z"/>';
  return `<svg class="glyph ${state}" viewBox="0 0 56 72" width="${w}" height="${h}" aria-hidden="true"><line x1="28" x2="28" y1="4" y2="68"/><rect x="9" y="${y.toFixed(1)}" width="38" height="${bh.toFixed(1)}" rx="6"/>${ic}</svg>`;
}
