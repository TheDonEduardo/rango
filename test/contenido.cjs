// Lee el contenido como la app (para las pruebas de navegador y las herramientas en Node).
const fs = require('fs'), path = require('path');
const leer = f => JSON.parse(fs.readFileSync(f, 'utf8'));
exports.unidades = root => leer(path.join(root, 'src/content/units.json'));
exports.casos = root => { try { return leer(path.join(root, 'src/content/casos.json')); } catch (e) { return {ex: {}}; } };
