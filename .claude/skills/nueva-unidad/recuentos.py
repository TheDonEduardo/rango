"""Recalcula los recuentos de contenido de Rango y los escribe en CLAUDE.md, README.md y bienvenida.html.

Uso (desde la raíz del repositorio):
    python .claude/skills/nueva-unidad/recuentos.py              # actualiza los tres archivos
    python .claude/skills/nueva-unidad/recuentos.py --comprobar  # solo avisa; sale con 1 si algo está desfasado

Solo toca las cifras. Las descripciones de cada ruta en CLAUDE.md («Básico: …», «Técnico: …») se escriben a mano.
"""
import json
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[3]
UNITS = RAIZ / 'src' / 'content' / 'units'
RUTAS = [('basico', 'Básico'), ('personal', 'Finanzas'), ('pasiva', 'Pasiva'), ('fundamental', 'Fundamental'),
         ('tecnico', 'Técnico'), ('derivados', 'Opciones'), ('cripto', 'Cripto')]


def contar():
    idx = json.loads((UNITS / 'index.json').read_text(encoding='utf-8'))
    por_ruta = {k: 0 for k, _ in RUTAS}
    lecciones = preguntas = tarjetas = figuras = 0
    for uid in idx:
        u = json.loads((UNITS / f'{uid}.json').read_text(encoding='utf-8'))
        por_ruta[u.get('track') or 'tecnico'] += 1
        ls = u.get('lessons') or []
        lecciones += len(ls)
        preguntas += sum(len(l['ex']) for l in ls)
        guia = u.get('guia') or []
        tarjetas += len(guia)
        figuras += sum(1 for g in guia if g.get('figura'))
    casos = json.loads((RAIZ / 'src' / 'content' / 'casos.json').read_text(encoding='utf-8'))
    return dict(unidades=len(idx), por_ruta=por_ruta,
                # Cada unidad con lecciones añade un nodo «Repaso de la unidad».
                lecciones=lecciones + sum(1 for _ in idx), preguntas=preguntas,
                casos=sum(len(v) for v in casos['ex'].values()), tarjetas=tarjetas, figuras=figuras)


def sustituciones(c):
    r = c['por_ruta']
    rutas = ', '.join(f'{r[k]} en {n}' for k, n in RUTAS[1:-1])
    return {
        'CLAUDE.md': [
            (r'\(\d+ unidades en Básico, [^)]*\)',
             f"({r['basico']} unidades en Básico, {rutas} y {r['cripto']} en Cripto)"),
            (r'\(\d+ lecciones contando repasos, \d+ preguntas fijas más \d+ casos reales\)',
             f"({c['lecciones']} lecciones contando repasos, {c['preguntas']} preguntas fijas más {c['casos']} casos reales)"),
            (r'guía teórica en las \d+ unidades \(\d+ tarjetas, \d+ con figura\)',
             f"guía teórica en las {c['unidades']} unidades ({c['tarjetas']} tarjetas, {c['figuras']} con figura)"),
            (r'La ruta tiene \d+ unidades\. Hacer lecciones de Finanzas',
             f"La ruta tiene {r['personal']} unidades. Hacer lecciones de Finanzas"),
        ],
        'README.md': [(r'siete rutas y \d+ unidades', f"siete rutas y {c['unidades']} unidades")],
        'bienvenida.html': [(r'Siete rutas, \d+ unidades', f"Siete rutas, {c['unidades']} unidades")],
    }


def main():
    comprobar = '--comprobar' in sys.argv
    c = contar()
    desfasados = []
    for nombre, pares in sustituciones(c).items():
        f = RAIZ / nombre
        s = f.read_text(encoding='utf-8')
        nuevo = s
        for patron, texto in pares:
            nuevo, n = re.subn(patron, texto, nuevo)
            if n != 1:
                sys.exit(f'{nombre}: el patrón {patron!r} aparece {n} veces (se esperaba 1). Revisa el texto a mano.')
        if nuevo != s:
            desfasados.append(nombre)
            if not comprobar:
                f.write_text(nuevo, encoding='utf-8')
    r = c['por_ruta']
    print(f"{c['unidades']} unidades ({', '.join(f'{n} {r[k]}' for k, n in RUTAS)}), "
          f"{c['lecciones']} lecciones con repasos, {c['preguntas']} preguntas, {c['tarjetas']} tarjetas")
    if comprobar and desfasados:
        sys.exit('Desfasados: ' + ', '.join(desfasados))
    print(('Actualizados: ' + ', '.join(desfasados)) if desfasados else 'Todo al día.')


if __name__ == '__main__':
    main()
