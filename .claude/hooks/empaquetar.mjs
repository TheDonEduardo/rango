// Hook PostToolUse (Edit|Write): si se ha editado un archivo de unidad de Rango (src/content/units/*.json),
// regenera src/content/units.json para que npm test no falle por tenerlo desfasado.
// tools/contenido.py ya empaqueta solo; esto cubre las ediciones a mano.
import {execFileSync} from 'node:child_process';
import path from 'node:path';

let entrada = '';
for await (const trozo of process.stdin) entrada += trozo;

let ruta = '';
try { ruta = JSON.parse(entrada)?.tool_input?.file_path || ''; } catch { process.exit(0); }

const norm = ruta.split(path.sep).join('/');
const m = /^(.*)\/src\/content\/units\/[^/]+\.json$/.exec(norm);
if (!m) process.exit(0);

const raiz = m[1];
try {
  const salida = execFileSync('node', [path.join(raiz, 'tools', 'empaquetar.mjs')], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']});
  // Va a la transcripción como contexto: así se sabe que units.json ya está al día.
  console.log(JSON.stringify({hookSpecificOutput: {hookEventName: 'PostToolUse',
    additionalContext: 'Hook: units.json regenerado (' + salida.trim() + ').'}}));
} catch (e) {
  // Exit 2: Claude ve el error (p. ej., un JSON mal formado tras la edición) y puede corregirlo.
  process.stderr.write('No se pudo regenerar units.json: ' + (e.stderr || e.message));
  process.exit(2);
}
