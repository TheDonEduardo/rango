// Aviso legal: se pide aceptarlo en el primer uso y cada vez que cambia su texto.
// Sube LEGAL_V si cambia el texto del aviso: se vuelve a pedir la aceptación.
export const LEGAL_V=1;
export function legalHTML(first){
  return `<div class="res legal"><div class="res-main"><h1>${first?'Antes de empezar':'Aviso legal'}</h1>
  <p>Rango es una herramienta de formación. Nada de lo que ves es asesoramiento financiero ni una recomendación de comprar o vender ningún valor.</p>
  <p>Los casos con empresas reales usan datos públicos de Yahoo Finance, con su fecha. Pueden contener errores o estar desactualizados, y que una empresa aparezca no implica ninguna opinión sobre ella.</p>
  <p>Invertir en bolsa conlleva riesgo de perder parte o todo el capital. Las rentabilidades pasadas no garantizan las futuras.</p>
  <p>La información fiscal es general y simplificada: las normas cambian y dependen de tu situación. Consulta con un profesional antes de decidir.</p>
  <p>Las decisiones de inversión son tuyas y bajo tu responsabilidad.</p></div>
  <div><button class="btn primary" data-act="${first?'legalok':'home'}">${first?'Entendido, empezar':'Volver'}</button></div></div>`;
}
