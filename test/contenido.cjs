// Lee el contenido desde Node (tests, e2e y tools/empaquetar.mjs).
// Fuente: src/content/units/index.json (orden) + un archivo por unidad. La app carga src/content/units.json,
// que es esas unidades juntas, generado con npm run empaquetar.
const fs = require('fs'), path = require('path');
const leer = f => JSON.parse(fs.readFileSync(f, 'utf8'));
exports.dirUnidades = root => path.join(root, 'src/content/units');
exports.paquete = root => path.join(root, 'src/content/units.json');
exports.indice = root => leer(path.join(exports.dirUnidades(root), 'index.json'));
exports.unidades = root => exports.indice(root).map(id => leer(path.join(exports.dirUnidades(root), id + '.json')));
exports.casos = root => { try { return leer(path.join(root, 'src/content/casos.json')); } catch (e) { return {ex: {}}; } };
