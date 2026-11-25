"""Plantilla para añadir una unidad a Rango. Cópiala al scratchpad, rellénala y ejecútala DESDE la raíz del repositorio:

    python3 <ruta>/nuevas.py

Repite el bloque de unidad (nueva_unidad + poner_guia + poner_porque) por cada unidad de la tanda.
Antes de rellenar, lee las reglas de SKILL.md: cada cifra se recalcula a mano antes de guardar.
"""
import sys, json
sys.path.insert(0, 'tools')
from contenido import *  # ch, nm, mt, od, sl, unidad, nueva_unidad, poner_guia, tarjeta, poner_porque

# Tabla opcional: si varios ejercicios la usan, ponla en TODOS (en repasos y exámenes salen sueltos).
# TABLA = {'cols': ['Dato', 'Valor'], 'rows': [['Precio', '24,50 €']], 'note': 'Empresa ficticia.'}

nueva_unidad(unidad(0, 'IDUNIDAD', 'RUTA', 'Título corto', 'Subtítulo de una frase: qué aprende el usuario.', [
    # RUTA: basico (añade gate=False abajo), personal, pasiva, fundamental, tecnico, derivados, cripto.
    ('xx1', 'Título de la lección 1', [
        nm('Enunciado con todas las cifras necesarias. ¿Pregunta?', '€', 0,
           'Cuenta con las cifras del enunciado = resultado. Una frase de criterio.'),
        ch('¿Pregunta de criterio?',
           ['Distractor creíble', 'Respuesta correcta', 'Otro distractor', 'Otro más'], 1,
           'Por qué la correcta lo es, con las cifras del enunciado.'),
        # sl('Enunciado…', 'Etiqueta', mín, máx, paso, inicio, respuesta, '€', 'why…',
        #    show=[{'label': 'Consecuencia', 'k': 10, 'b': 0, 'unit': '€'}]),
        # mt('Empareja…', [['Término', 'Descripción'], ...], 'why…'),   # 3 parejas o más
        # od('Ordena…', ['Paso 1', 'Paso 2', ...], 'why…'),              # solo órdenes defendibles
        # dict(t='tap', q='…', chart={'type': 'candles', 'data': [...], 'vol': [...], 'h': 270,
        #      'lines': [{'y': 50, 'label': ''}], 'alt': 'Sin revelar la respuesta'}, a=7, why='…'),
    ]),
    ('xx2', 'Título de la lección 2', [
        # 5 ejercicios
    ]),
]), despues_de='ID_DE_LA_UNIDAD_ANTERIOR')  # siempre antes del caso final de la ruta
# Normativa o fiscal: revisar va DENTRO de unidad(...), tras la lista de lecciones; nueva_unidad no lo acepta:
#   nueva_unidad(unidad(0, 'id', 'ruta', 'Título', 'Subtítulo', [...lecciones...], revisar='AAAA-MM'), despues_de='x')
# En Básico, igual con gate=False.

poner_guia('IDUNIDAD', [
    tarjeta('Título 1', 'Texto de la idea.', 'Ejemplo numérico que coincide con los ejercicios.'),
    tarjeta('Título 2', '…', '…'),
    tarjeta('Título 3', '…', '…'),
    tarjeta('Título 4', '…', '…'),
], '11223 33444')  # tarjeta de cada ejercicio, por lección, separadas por espacio

poner_porque({
    # Por cada choice: una razón por opción INCORRECTA, en el orden de las opciones (35 palabras como máximo).
    'xx1-2': ['Por qué falla el distractor 1.', 'Por qué falla el 3.', 'Por qué falla el 4.'],
})

# Glosario: solo términos nuevos que aparezcan en algún texto (el test avisa si no aparecen).
p = 'src/content/glosario.json'
g = json.load(open(p, encoding='utf-8')); existentes = {x['termino'] for x in g}
for n in [
    # {'termino': 'término', 'alias': ['plural'], 'no': ['frase donde significa otra cosa'], 'd': 'Definición breve.'},
]:
    assert n['termino'] not in existentes, n['termino']
    g.append(n)
open(p, 'w', encoding='utf-8').write(json.dumps(g, ensure_ascii=False, indent=1) + '\n')
print('ok')
