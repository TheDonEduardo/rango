"""Vuelca unidades de Rango en texto legible para revisarlas y hace comprobaciones mecánicas de formato.

Uso (desde la raíz del repositorio):
    python .claude/skills/nueva-unidad/extraer.py escisiones crfirmas      # unidades concretas
    python .claude/skills/nueva-unidad/extraer.py --desde 96ae27a          # unidades añadidas desde ese commit

Lo usa el subagente verificador-cifras. Las comprobaciones de aquí son solo las mecánicas que el test
(npm test) no hace: el cálculo y el criterio los revisa el subagente.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
UNITS = REPO / 'src' / 'content' / 'units'

# Punto decimal en vez de coma (1.000 tiene 3 cifras tras el punto y no salta).
PUNTO_DECIMAL = re.compile(r'(?<![\d.])\d+\.\d{1,2}(?![\d.])')
# Símbolo pegado a la cifra: «17,60€» o «5%».
SIN_ESPACIO = re.compile(r'\d(?:€|%|\$)')


def nuevas_desde(commit):
    out = subprocess.run(['git', 'diff', '--name-only', '--diff-filter=A', commit, '--', 'src/content/units/'],
                         cwd=REPO, capture_output=True, text=True, check=True).stdout.split()
    return [Path(p).stem for p in out if p.endswith('.json') and not p.endswith('index.json')]


def avisos_texto(donde, texto, avisos):
    if not isinstance(texto, str):
        return
    for m in PUNTO_DECIMAL.finditer(texto):
        avisos.append(f'{donde}: punto decimal «{m.group()}» (usa coma)')
    for m in SIN_ESPACIO.finditer(texto):
        avisos.append(f'{donde}: símbolo sin espacio «{m.group()}»')


def volcar(uid):
    u = json.loads((UNITS / f'{uid}.json').read_text(encoding='utf-8'))
    avisos, L = [], []
    L.append(f"# {uid} · {u.get('track') or 'tecnico'} · {u['title']}" + (f" · revisar {u['revisar']}" if u.get('revisar') else ''))
    L.append(u['blurb'])
    for g in u.get('guia') or []:
        L.append(f"\n[{g['id']}] {g['titulo']}\n  {g['texto']}\n  Ejemplo: {g.get('ejemplo', '')}")
        for k in ('titulo', 'texto', 'ejemplo'):
            avisos_texto(f"{uid}/{g['id']}", g.get(k), avisos)
    for l in u.get('lessons') or []:
        L.append(f"\n## {l['id']} · {l['title']}")
        for e in l['ex']:
            eid, t = e['id'], e['t']
            L.append(f"\n- {eid} [{t}] (guía {e.get('guia', '—')})\n  q: {e['q']}")
            if e.get('table'):
                tb = e['table']
                L.append('  tabla: ' + ' | '.join(tb['cols']) + ' ‖ ' + ' ; '.join(' | '.join(r) for r in tb['rows']))
            if t == 'choice':
                for i, o in enumerate(e['opts']):
                    marca = '✔' if i == e['a'] else ' '
                    pq = '' if i == e['a'] else f"  → porque: {(e.get('porque') or [None] * len(e['opts']))[i]}"
                    L.append(f'   {marca} {i}. {o}{pq}')
            elif t == 'num':
                L.append(f"  a = {e['a']} {e.get('unit', '')} (tol {e.get('tol', 0.005)})")
                if e['a'] < 0 or e['a'] >= 1000:
                    avisos.append(f'{eid}: a = {e["a"]} fuera de 0-999 (regla de num)')
                # Variantes: misma pregunta con otras cifras (exámenes y repasos); se revisan igual que la base.
                for k, v in enumerate(e.get('variantes') or [], 1):
                    L.append(f"  variante {k}: q: {v['q']}\n    a = {v['a']} · why: {v['why']}")
                    for c in ('q', 'why'):
                        avisos_texto(f'{eid}/variante {k}', v.get(c), avisos)
            elif t == 'slide':
                L.append(f"  slide {e['label']}: {e['min']}..{e['max']} paso {e['step']}, inicio {e['start']}, a = {e['a']} {e.get('unit', '')}")
                for s in e.get('show') or []:
                    L.append(f"   muestra «{s['label']}» = {s.get('b', 0)} + valor × {s['k']} {s.get('unit', '')}")
            elif t in ('match',):
                L.extend(f'   {a} ↔ {b}' for a, b in e['pairs'])
            elif t == 'order':
                L.extend(f'   {i + 1}. {x}' for i, x in enumerate(e['items']))
            elif t in ('tap', 'level', 'plan', 'zone'):
                ch = e.get('chart', {})
                L.append(f"  gráfico ({len(ch.get('data', []))} velas), alt: {ch.get('alt', '')}")
                L.append(f"  a = {e.get('a', e.get('place'))}")
            L.append(f"  why: {e['why']}")
            for k in ('q', 'why'):
                avisos_texto(eid, e.get(k), avisos)
            for o in e.get('opts') or []:
                avisos_texto(eid, o, avisos)
    return '\n'.join(L), avisos


def main():
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    ids = nuevas_desde(args[1]) if args[0] == '--desde' else args
    if not ids:
        sys.exit('No hay unidades nuevas en ese rango.')
    todos = []
    for uid in ids:
        texto, avisos = volcar(uid)
        print(texto, end='\n\n')
        todos += avisos
    print('# Comprobaciones mecánicas')
    print('\n'.join('- ' + a for a in todos) if todos else 'Sin avisos de formato.')


if __name__ == '__main__':
    main()
