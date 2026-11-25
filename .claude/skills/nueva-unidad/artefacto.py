"""Qué archivos subir al artefacto de Rango tras una tanda.

Uso (desde cualquier carpeta del repositorio):
    python .claude/skills/nueva-unidad/artefacto.py <commit-anterior>

<commit-anterior> es el último commit que se publicó en el artefacto (normalmente HEAD~1 si acabas de
hacer el commit de la tanda). Imprime, para cada archivo publicable que ha cambiado desde ese commit,
el hash corto (32 cifras) en ese commit y en local, y el mapa `files` listo para la llamada al artefacto.

Compara la columna «en <commit>» con la lista del artefacto (`action: "list"`, `scope: "files"`):
si coinciden, nadie ha publicado nada que no tengas y puedes subir solo lo que cambió.
"""
import hashlib
import json
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
RANGO = REPO
# El artefacto sirve la raíz del repositorio: estos son los archivos que la app descarga.
FIJOS = ['src/content/units.json', 'src/content/glosario.json', 'src/content/units/index.json', 'bienvenida.html']


def h(b):
    return hashlib.sha256(b).hexdigest()[:32]


def en_commit(commit, ruta):
    r = subprocess.run(['git', 'show', f'{commit}:{ruta}'], cwd=REPO, capture_output=True)
    return h(r.stdout) if r.returncode == 0 else '(no existía)'


def main(commit):
    cambiados = subprocess.run(['git', 'diff', '--name-only', commit, '--', 'src', 'fonts',
                                'bienvenida.html'], cwd=REPO, capture_output=True, text=True,
                               check=True).stdout.split()
    rutas = list(cambiados)
    # Los archivos de unidad sueltos no los descarga la app (lee units.json): no hace falta subirlos.
    rutas = [r for r in rutas if r in FIJOS or not r.startswith('src/content/units/')]
    if not rutas:
        print('Nada que publicar desde', commit)
        return
    print(f'{"archivo":40} {"en " + commit:34} local')
    for r in rutas:
        local = h((RANGO / r).read_bytes()) if (RANGO / r).exists() else '(borrado)'
        print(f'{r:40} {en_commit(commit, r):34} {local}')
    print('\nfiles =', json.dumps({r: str(RANGO / r) if (RANGO / r).exists() else None for r in rutas},
                                  ensure_ascii=False, indent=1))
    if any(r.startswith('src/') and not r.startswith('src/content/') for r in rutas):
        print('\nHay código de src/ cambiado: súbelo también (ya va en el mapa).')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
