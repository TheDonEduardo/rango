// Genera los iconos de la PWA (icons/*.png) a partir del logo: vela verde sobre fondo azul marino.
// Uso: node tools/iconos.cjs   (requiere Playwright con Chromium)
const {chromium} = require('playwright');
const fs = require('fs');
const path = require('path');
const out = path.join(__dirname, '..', 'icons');

// escala = fracción del lado que ocupa la vela (la versión «maskable» deja margen de seguridad para el recorte de Android).
const svg = (escala, redondeo) => {
  const h = 100 * escala, w = h * 18 / 26, x = 50 - w / 2, y = 50 - h / 2, k = h / 26;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<rect width="100" height="100" rx="${redondeo}" fill="#12202F"/>
<line x1="50" x2="50" y1="${y + k}" y2="${y + 25 * k}" stroke="#E8EEF5" stroke-width="${2 * k}" stroke-linecap="round"/>
<rect x="${x + 2 * k}" y="${y + 7 * k}" width="${14 * k}" height="${12 * k}" rx="${3 * k}" fill="#2BC48A"/>
</svg>`;
};

const iconos = [
  ['icon-192.png', 192, svg(0.62, 0)],
  ['icon-512.png', 512, svg(0.62, 0)],
  ['maskable-512.png', 512, svg(0.5, 0)],
  ['apple-touch-icon.png', 180, svg(0.62, 0)],
];

(async () => {
  fs.mkdirSync(out, {recursive: true});
  fs.writeFileSync(path.join(out, 'icon.svg'), svg(0.62, 22));
  const b = await chromium.launch();
  for (const [nombre, lado, src] of iconos) {
    const p = await b.newPage({viewport: {width: lado, height: lado}, deviceScaleFactor: 1});
    await p.setContent(`<style>html,body{margin:0}svg{display:block;width:${lado}px;height:${lado}px}</style>${src}`);
    await p.screenshot({path: path.join(out, nombre), omitBackground: false});
    await p.close();
  }
  await b.close();
  console.log('Iconos generados en', out);
})();
