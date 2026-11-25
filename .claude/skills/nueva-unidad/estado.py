"""Punto de partida para elegir temas de una tanda nueva de Rango.

Uso (desde cualquier carpeta del repositorio):
    python .claude/skills/nueva-unidad/estado.py                          # unidades por ruta y última tanda
    python .claude/skills/nueva-unidad/estado.py --buscar "mariposa|butterfly" "puente(s)?"  # ¿existe el tema?
    python .claude/skills/nueva-unidad/estado.py --prefijos cp au ow      # ¿están libres esos prefijos?

--buscar usa expresiones regulares con límites de palabra (no confunde «fianza» con «confianza»)
y muestra el fragmento donde aparece cada coincidencia, para descartar falsos positivos.
"""
import json
import re
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
UNITS = REPO / 'src' / 'content' / 'units'
RUTAS = [('basico', 'Básico'), ('personal', 'Finanzas'), ('pasiva', 'Pasiva'), ('fundamental', 'Fundamental'),
         ('tecnico', 'Técnico'), ('derivados', 'Opciones'), ('cripto', 'Cripto')]
NOMBRE = dict(RUTAS)


def unidades():
    idx = json.loads((UNITS / 'index.json').read_text(encoding='utf-8'))
    return [json.loads((UNITS / f'{uid}.json').read_text(encoding='utf-8')) for uid in idx]


def ids_de_leccion(us):
    return [l['id'] for u in us for l in (u.get('lessons') or [])]


def ultima_tanda():
    """Unidades añadidas en el último commit «unidades nuevas» (con su ruta)."""
    log = subprocess.run(['git', 'log', '--format=%h %s', '--grep=unidades nuevas', '-1'],
                         cwd=REPO, capture_output=True, text=True).stdout.strip()
    if not log:
        return None, []
    h = log.split()[0]
    nuevos = subprocess.run(['git', 'show', '--name-status', '--format=', h], cwd=REPO,
                            capture_output=True, text=True).stdout.splitlines()
    ids = [Path(l.split('\t')[1]).stem for l in nuevos
           if l.startswith('A') and '/content/units/' in l and not l.endswith('index.json')]
    return log, ids


def resumen(us):
    por = defaultdict(list)
    for u in us:
        por[u.get('track', 'tecnico')].append(u['id'] + (' (caso final)' if u.get('caso') else ''))
    for k, nombre in RUTAS:
        print(f'{nombre} [{k}], {len(por[k])} unidades: {" ".join(por[k])}')
    log, ids = ultima_tanda()
    if log:
        ruta = {u['id']: u.get('track', 'tecnico') for u in us}
        print(f'\nÚltima tanda: {log}')
        print('  ' + ', '.join(f'{i} ({NOMBRE.get(ruta.get(i), "?")})' for i in ids))
        print('  Rota respecto a estas rutas.')
    ops = [int(m.group(1)) for i in ids_de_leccion(us) for m in [re.fullmatch(r'op(\d+)', i)] if m]
    if ops:
        print(f'\nOpciones: la siguiente lección es op{max(ops) + 1} (prefijos correlativos).')


def buscar(patrones, us):
    for p in patrones:
        re_p = re.compile(rf'(?<!\w)(?:{p})(?!\w)', re.I)
        hallados = []
        for u in us:
            texto = json.dumps(u, ensure_ascii=False)
            for m in re_p.finditer(texto):
                hallados.append((u['id'], texto[max(0, m.start() - 50):m.end() + 50].replace('\n', ' ')))
        print(f'\n«{p}»: ' + (f'{len(hallados)} coincidencias en {len({h[0] for h in hallados})} unidades'
                              if hallados else 'sin coincidencias'))
        for uid, frag in hallados[:8]:
            print(f'  {uid}: …{frag}…')
        if len(hallados) > 8:
            print(f'  … y {len(hallados) - 8} más')


def prefijos(ps, us):
    usados = {re.sub(r'\d+$', '', i) for i in ids_de_leccion(us)}
    for p in ps:
        print(f'{p}: ' + ('OCUPADO' if p in usados else 'libre'))


if __name__ == '__main__':
    us = unidades()
    a = sys.argv[1:]
    if a[:1] == ['--buscar']:
        buscar(a[1:], us)
    elif a[:1] == ['--prefijos']:
        prefijos(a[1:], us)
    else:
        resumen(us)
