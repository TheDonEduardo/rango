// Lee el contenido como la app (para las pruebas de navegador y las herramientas en Node).
const fs = require('fs'), path = require('path');
const leer = f => JSON.parse(fs.readFileSync(f, 'utf8'));
exports.unidades = root => { const d = path.join(root, 'src/content/units'); return leer(path.join(d, 'index.json')).map(id => leer(path.join(d, id + '.json'))); };
exports.casos = root => { try { return leer(path.join(root, 'src/content/casos.json')); } catch (e) { return {ex: {}}; } };
