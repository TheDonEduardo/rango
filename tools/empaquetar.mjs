// Junta src/content/units/ (index.json + un archivo por unidad) en src/content/units.json, el único archivo de
// contenido que descarga la app: una sola petición al arrancar. Los archivos por unidad son la fuente; units.json
// se genera (no se edita a mano) y npm test comprueba que está al día.
// Uso: npm run empaquetar   (tools/contenido.py lo hace solo al guardar)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const {unidades, paquete} = createRequire(import.meta.url)('../test/contenido.cjs');
fs.writeFileSync(paquete(root), JSON.stringify(unidades(root)) + '\n');
console.log('units.json: ' + unidades(root).length + ' unidades');
