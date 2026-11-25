"""Aplica correcciones a unidades de Rango (p. ej., las del verificador-cifras). Desde la raíz del repositorio: python3 .claude/skills/nueva-unidad/corregir.py fix.json
fix.json: lista de operaciones:
  {"id": "zb1-3", "campo": "q", "nuevo": "texto completo"}                 # sustituye el campo entero
  {"id": "fp3-3", "campo": "why", "viejo": "mes. casi", "nuevo": "mes: casi"}  # sustituye un fragmento (debe aparecer 1 vez)
  {"id": "fp6-2", "campo": "porque", "indice": 3, "nuevo": "..."}         # porque de una opción
  {"id": "bx1-2", "campo": "guia", "nuevo": "g1"}
  {"id": "fp2-1", "variante": 2, "campo": "why", "viejo": "910,00", "nuevo": "910"}
  {"unidad": "ibex", "campo": "revisar", "nuevo": "2027-11"}
  {"unidad": "ibex", "tarjeta": "g3", "campo": "texto", "viejo": "...", "nuevo": "..."}
  {"id": "tr2-2", "campo": "pairs", "indice": 3, "lado": 1, "nuevo": "..."}
  {"id": "zc2-5", "campo": "items", "indice": 4, "nuevo": "..."}      # también "opts"
  {"id": "bc2-3", "campo": "q", "todas_variantes": true, "viejo": "...", "nuevo": "..."}
  {"unidad": "vcp", "tarjeta": "g3", "figura": "marcas", "indice": 0, "clave": "i", "nuevo": 10}
  Cualquier otro campo del ejercicio (a, tol, unit, min, max, start, show…) se sustituye entero con "nuevo".
"""
import json, sys
sys.path.insert(0, 'tools')
from contenido import indice, leer, guardar, empaquetar

ops = json.load(open(sys.argv[1], encoding='utf-8'))
unidades = {uid: leer(uid) for uid in indice()}
ex = {e['id']: (uid, e) for uid, u in unidades.items() for l in (u.get('lessons') or []) for e in l['ex']}
tocadas = set()


def poner(obj, campo, op, donde):
    if 'viejo' in op:
        v = obj[campo]
        assert v.count(op['viejo']) == 1, f"{donde}.{campo}: «{op['viejo']}» aparece {v.count(op['viejo'])} veces"
        obj[campo] = v.replace(op['viejo'], op['nuevo'])
    else:
        obj[campo] = op['nuevo']


for op in ops:
    if 'unidad' in op and 'figura' not in op:
        u = unidades[op['unidad']]; tocadas.add(op['unidad'])
        if 'tarjeta' in op:
            t = next(g for g in u['guia'] if g['id'] == op['tarjeta'])
            poner(t, op['campo'], op, f"{op['unidad']}/{op['tarjeta']}")
        elif op['campo'] == 'revisar':
            # revisar va antes de lessons para que el JSON se lea bien
            nuevo = {}
            for k, v in u.items():
                if k == 'lessons':
                    nuevo['revisar'] = op['nuevo']
                if k != 'revisar':
                    nuevo[k] = v
            unidades[op['unidad']] = nuevo
        else:
            poner(u, op['campo'], op, op['unidad'])
        continue
    if 'figura' in op:
        u = unidades[op['unidad']]; tocadas.add(op['unidad'])
        t = next(g for g in u['guia'] if g['id'] == op['tarjeta'])
        t['figura'][op['figura']][op['indice']][op['clave']] = op['nuevo']
        continue
    uid, e = ex[op['id']]; tocadas.add(uid)
    if op.get('todas_variantes'):
        poner(e, op['campo'], op, op['id'])
        for k, v in enumerate(e.get('variantes') or []):
            poner(v, op['campo'], op, f"{op['id']}/v{k + 1}")
    elif op['campo'] == 'alt':
        e['chart']['alt'] = op['nuevo']
    elif op['campo'] == 'opts':
        e['opts'][op['indice']] = op['nuevo']
    elif op['campo'] == 'items':
        e['items'][op['indice']] = op['nuevo']
    elif 'variante' in op:
        poner(e['variantes'][op['variante'] - 1], op['campo'], op, f"{op['id']}/v{op['variante']}")
    elif op['campo'] == 'porque':
        assert e['porque'][op['indice']] is not None, f"{op['id']}: el índice {op['indice']} es la opción correcta"
        if 'viejo' in op:
            assert e['porque'][op['indice']].count(op['viejo']) == 1, op
            e['porque'][op['indice']] = e['porque'][op['indice']].replace(op['viejo'], op['nuevo'])
        else:
            e['porque'][op['indice']] = op['nuevo']
    elif op['campo'] == 'pairs':
        e['pairs'][op['indice']][op['lado']] = op['nuevo']
    else:
        poner(e, op['campo'], op, op['id'])

for uid in tocadas:
    guardar(unidades[uid])
empaquetar()
print(f'{len(ops)} correcciones en {len(tocadas)} unidades: {", ".join(sorted(tocadas))}')
