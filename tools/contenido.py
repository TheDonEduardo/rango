"""Ayudas para escribir contenido en src/content/units/ (un archivo JSON por unidad + index.json con el orden).

Uso desde otro script o una consola de Python:

    import sys; sys.path.insert(0, 'tools'); from contenido import *
    nueva_unidad(unidad(17, 'mi-unidad', 'pasiva', 'Título', 'Subtítulo.', [
        ('mu1', 'Lección 1', [ch('¿Pregunta?', ['Bien', 'Mal', 'Mal 2', 'Mal 3'], 0, 'Porque 2 + 2 = 4.'), ...]),
        ('mu2', 'Lección 2', [...]),
    ]), despues_de='revision')
    anadir('r2', [sl(...)])          # añade ejercicios al final de una lección existente
    poner_guia('velas', [tarjeta('Título', 'Texto.', 'Ejemplo.'), ...], '1223 4444')  # guía de la unidad

Los ids de ejercicio («lección-n») se asignan solos y nunca se reutilizan: no edites ni reordenes ids a mano.
Al insertar una unidad se renumeran las de su ruta (n = 1, 2, 3… en el orden del índice) y se regenera
src/content/units.json (el archivo que carga la app) con node tools/empaquetar.mjs.
Después: npm test (valida reglas de contenido) y node test/e2e.cjs --lecciones mu1,mu2.
"""
import json
import re
import subprocess
from pathlib import Path

DIR = Path(__file__).resolve().parent.parent / 'src' / 'content' / 'units'


def ch(q, opts, a, why, **k): return dict(t='choice', q=q, opts=opts, a=a, why=why, **k)
def nm(q, unit, a, why, **k): return dict(t='num', q=q, unit=unit, a=a, why=why, **k)
def mt(q, pairs, why): return dict(t='match', q=q, pairs=pairs, why=why)
def od(q, items, why): return dict(t='order', q=q, items=items, why=why)


def sl(q, label, mn, mx, step, start, a, unit, why, show=None, **k):
    d = dict(t='slide', q=q, label=label, min=mn, max=mx, step=step, start=start, a=a, unit=unit, why=why, **k)
    if show:
        d['show'] = show
    return d


def unidad(n, id, track, title, blurb, lessons, **k):
    """lessons = [(id, título, [ejercicios])]. k: gate=False para unidades complementarias de Básico."""
    d = {'n': n, 'id': id, 'track': track, 'title': title, 'blurb': blurb}
    d.update(k)
    d['lessons'] = [{'id': i, 'title': t, 'ex': ex} for i, t, ex in lessons]
    return d


def _fmt(obj):
    out = json.dumps(obj, ensure_ascii=False, indent=2)
    # Velas y series en una línea para que los archivos sigan siendo legibles.
    out = re.sub(r'\[\s+(-?[\d.]+),\s+(-?[\d.]+),\s+(-?[\d.]+),\s+(-?[\d.]+)\s+\]', r'[\1,\2,\3,\4]', out)
    out = re.sub(r'"(data|ma|vol)": \[\s+([^\]\[]*?)\s+\]',
                 lambda m: '"%s": [%s]' % (m.group(1), re.sub(r'\s+', '', m.group(2))), out)
    return out + '\n'


def indice():
    return json.loads((DIR / 'index.json').read_text(encoding='utf-8'))


def leer(uid):
    return json.loads((DIR / f'{uid}.json').read_text(encoding='utf-8'))


def guardar(u):
    (DIR / f"{u['id']}.json").write_text(_fmt(u), encoding='utf-8')


def todas():
    return [leer(i) for i in indice()]


def _con_ids(lid, exs, desde):
    # El id va primero para que se lea bien en el JSON.
    return [dict([('id', f'{lid}-{desde + i}')] + [(k, v) for k, v in e.items() if k != 'id']) for i, e in enumerate(exs)]


def _siguiente(l):
    # «ultimo» guarda el mayor número asignado nunca en la lección: aunque se borre el último ejercicio,
    # su id no se vuelve a usar (el progreso guardado de los usuarios apunta a él).
    return max([int(e['id'].rsplit('-', 1)[1]) for e in l['ex']] + [l.get('ultimo', 0)]) + 1


def empaquetar():
    subprocess.run(['node', str(DIR.parent.parent.parent / 'tools' / 'empaquetar.mjs')], check=True)


def _renumerar(idx, track):
    n = 0
    for uid in idx:
        u = leer(uid)
        if (u.get('track') or 'tecnico') == track:
            n += 1
            if u['n'] != n:
                u['n'] = n
                guardar(u)


def nueva_unidad(u, despues_de):
    idx = indice()
    assert u['id'] not in idx, 'id de unidad repetido: ' + u['id']
    usadas = {l['id'] for x in todas() for l in x.get('lessons') or []}
    for l in u['lessons']:
        assert l['id'] not in usadas, 'id de lección repetido: ' + l['id']
        l['ex'] = _con_ids(l['id'], l['ex'], 1)
        l['ultimo'] = len(l['ex'])
    guardar(u)
    idx.insert(idx.index(despues_de) + 1, u['id'])
    (DIR / 'index.json').write_text(json.dumps(idx, ensure_ascii=False).replace(', ', ',') + '\n', encoding='utf-8')
    _renumerar(idx, u.get('track') or 'tecnico')
    empaquetar()


def anadir(lesson_id, exs):
    for uid in indice():
        u = leer(uid)
        for l in u.get('lessons') or []:
            if l['id'] == lesson_id:
                desde = _siguiente(l)
                l['ex'] += _con_ids(lesson_id, exs, desde)
                l['ultimo'] = desde + len(exs) - 1
                guardar(u)
                empaquetar()
                return
    raise KeyError('lección inexistente: ' + lesson_id)


def tarjeta(titulo, texto, ejemplo):
    """Tarjeta de la guía de una unidad (texto + ejemplo: 70 palabras como máximo)."""
    return dict(titulo=titulo, texto=texto, ejemplo=ejemplo)


def poner_guia(uid, tarjetas, mapa):
    """Pone la guía de una unidad. mapa: número de tarjeta de cada ejercicio, por lección y separadas por
    espacios (p. ej. '1223 4444'): al fallar ese ejercicio, «Repasar la teoría» abre esa tarjeta."""
    u = leer(uid)
    cards = [dict(id=f'g{i + 1}', **c) for i, c in enumerate(tarjetas)]
    partes = mapa.split()
    assert len(partes) == len(u['lessons']), f'{uid}: el mapa tiene {len(partes)} lecciones'
    for l, m in zip(u['lessons'], partes):
        assert len(m) == len(l['ex']), f"{uid}/{l['id']}: el mapa tiene {len(m)} ejercicios y la lección {len(l['ex'])}"
        for e, k in zip(l['ex'], m):
            assert 1 <= int(k) <= len(cards), f'{uid}: tarjeta {k} inexistente'
            e['guia'] = f'g{k}'
    u2 = {k: v for k, v in u.items() if k not in ('lessons', 'guia')}
    u2['guia'] = cards
    u2['lessons'] = u['lessons']
    guardar(u2)
    empaquetar()


def poner_porque(P):
    """P = {id_ejercicio: [explicación de cada opción incorrecta, en el orden de las opciones]}.
    Guarda ex['porque'] con null en la opción correcta. Al fallar, la app muestra la de la opción elegida."""
    pend = dict(P)
    for uid in indice():
        u = leer(uid); cambio = False
        for l in u.get('lessons') or []:
            for e in l['ex']:
                if e['id'] not in pend:
                    continue
                malas = pend.pop(e['id'])
                assert e['t'] == 'choice' and len(malas) == len(e['opts']) - 1, f"{e['id']}: {len(malas)} explicaciones para {len(e['opts']) - 1} opciones incorrectas"
                it = iter(malas)
                e['porque'] = [None if k == e['a'] else next(it) for k in range(len(e['opts']))]
                cambio = True
        if cambio:
            guardar(u)
    assert not pend, 'ejercicios inexistentes: ' + ', '.join(pend)
    empaquetar()
