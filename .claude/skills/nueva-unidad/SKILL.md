---
name: nueva-unidad
description: Añade a Rango una tanda de unidades nuevas (2 lecciones × 5 ejercicios, guía de 4 tarjetas y «porque» en los choice) con tools/contenido.py; las prueba, las verifica con verificador-cifras, actualiza los recuentos, hace commit y push, publica el artefacto y vigila el PR. Úsala cuando pidan «sigue con N unidades más», «más contenido» o añadir unidades a una ruta.
disable-model-invocation: true
argument-hint: "[número de unidades] [rutas o temas opcionales]"
---

# Nueva unidad de Rango

Argumentos: `$ARGUMENTS` (por defecto, 4 unidades en rutas distintas a las de la tanda anterior).
Antes de nada lee `CLAUDE.md`: el esquema del contenido y las reglas de escritura mandan sobre esta guía.

Los scripts de esta carpeta se ejecutan desde la raíz del repositorio (`python .claude/skills/nueva-unidad/<script>`), incluidos `plantilla.py` y `corregir.py`, que importan `tools/contenido.py` con ruta relativa.

## 1. Preparar

```bash
git fetch origin <rama> && git merge --ff-only FETCH_HEAD   # otras sesiones también suben a la rama
npm test | tail -1                               # partir de verde
node -e "require('axe-core')" 2>/dev/null || npm install --no-save axe-core@4.10.2
```

Si la sesión empezó en otra rama, Claude Code no habrá cargado esta habilidad ni el subagente `verificador-cifras`: sigue este archivo a mano y, en el paso 4, lanza un subagente de uso general que lea y siga `.claude/agents/verificador-cifras.md`. El resultado es el mismo.

## 2. Elegir temas

```bash
python .claude/skills/nueva-unidad/estado.py                              # unidades por ruta, última tanda, siguiente op
python .claude/skills/nueva-unidad/estado.py --buscar "mariposa|butterfly" "puentes?"
python .claude/skills/nueva-unidad/estado.py --prefijos cp au ow          # prefijos de lección libres
```

- `--buscar` usa límites de palabra y enseña el fragmento: decide tú si el tema está cubierto o solo se menciona de pasada.
- Reparte la tanda entre rutas y rota respecto a la última (el script la muestra). Las rutas más cortas son las que más lo agradecen.
- Evita temas con normas cambiantes o casos límite. Si son normativos o fiscales: solo reglas estables, `revisar='AAAA-MM'` a un año vista y «Compruébalo con la norma vigente».
- Prefijo de lección: dos letras libres más número (`cp1`, `cp2`). En Opciones son correlativos (`op33`, `op34`…).
- Coloca cada unidad con `despues_de=`, siempre antes del caso final (`caso: true`). En Básico, `gate=False`.

## 3. Escribir

Copia `plantilla.py` al scratchpad, rellénala y ejecútala desde la raíz del repositorio. Escribe las cifras a la vez que el texto y recalcúlalas con `python3 -c` antes de ejecutar: es mucho más barato que corregir después.

**Teoría primero.** Escribe las 4 tarjetas de la guía antes que los ejercicios y revísalas: cada concepto, regla, fórmula o término que un ejercicio pregunte tiene que estar explicado en la tarjeta a la que apunta ese ejercicio (`guia: gN`), con el mismo vocabulario y, si hay cuenta, un ejemplo con números del mismo tipo. Si un ejercicio necesita algo que la guía no enseña, añádelo a la tarjeta o cambia el ejercicio. El usuario ve la guía antes de la primera lección y «Repasar la teoría» al fallar: un ejercicio sin teoría detrás se percibe como trampa.

Reglas que el test exige o que ya han fallado:
- **Cifras**: cada `a`, cada cifra del `why` y cada ejemplo de la guía, recalculados. Los ejemplos de la guía usan los mismos números que los ejercicios.
- **`num`**: `a` nunca negativo (pregunta «¿cuánto cae?») y por debajo de 1.000, porque «1.060» se lee como 1,06. Elige los datos del enunciado para que salga así desde el principio (una base de 500 €, no de 1.000 €). Para cantidades mayores, usa `'mil €'` o `'mill. $'`. Si redondeas, `tol=0.06` para un decimal y `tol=0.01` para dos.
- **`choice`**:
  - la correcta no puede pasar de 1,25 veces la longitud de la opción más larga del resto: mide con `len()`;
  - varía su posición entre ejercicios;
  - si todas las opciones empiezan por la misma palabra o miden 8 caracteres o menos, no se barajan: entonces no pongas la correcta la primera;
  - cada distractor debe ser **falso**, no solo «menos importante». «Que la red de origen deje de crear bloques» es un riesgo real aunque no sea el principal: el verificador lo marcará como defendible.
- **`porque`**: todos los `choice` llevan uno, con una razón por cada opción incorrecta y en orden; 35 palabras como máximo.
- **Guía**: 4 tarjetas de 70 palabras como máximo (texto más ejemplo). El mapa tiene un dígito por ejercicio y un bloque por lección: `'11223 33444'`.
- **`slide`**: `start` lejos de `a` y los dos en un paso exacto. `show` enseña la consecuencia; `b` puede ser negativo; `dec` para decimales.
- **`table`**: ponla en todos los ejercicios que la mencionan, porque en repasos y exámenes salen sueltos.
- **Enunciados**: cada `q` es único en todo el contenido y se entiende suelto (repite los datos; nada de «con esa mariposa»). Formato español: `24,50 €`, `7,4 %`.
- **Normas**: di a quién se aplica la regla. «La retención del 15 %» es solo de actividades profesionales; «el 7 %», del profesional que empieza y que no ejerció el año anterior. Sin el ámbito, la frase es falsa para muchos lectores.
- **Contenido**: datos ficticios o hechos estables. Nunca «compra» o «vende» un valor real. No nombres marcas de herramientas.
- **Glosario**:
  - añade los términos nuevos (el script de la plantilla los agrega al final);
  - «spread» a secas es la horquilla: escribe «spread vertical»;
  - «nominal» es el de un bono: en Opciones di «lo que cubre un contrato»;
  - un término nuevo puede convertirse en botón dentro de textos antiguos: revisa que el test siga verde.

`revisar` es un argumento de `unidad(...)`, no de `nueva_unidad(...)`: `nueva_unidad(unidad(..., [lecciones], revisar='2027-11'), despues_de='x')`.

Si el script falla a medias, las unidades anteriores ya están guardadas y volver a ejecutarlo chocaría con ellas. Desde la raíz, deshaz y repite entero:

```bash
git checkout -- src/content && git clean -fq src/content && python3 <scratchpad>/nuevas.py
```

## 4. Probar y verificar

```bash
npm test                                        # lint de contenido y recorrido de todas las lecciones
node test/e2e.cjs --lecciones a1,a2,b1,b2 --capturas <scratchpad>/caps
```
Mira al menos dos capturas en móvil (slide, tap, tabla o match) y comprueba que nada se corta.

Lanza el subagente `verificador-cifras` con los ids de las unidades nuevas, en segundo plano mientras corre el e2e. Si la unidad es normativa o cita hechos (cifras de redes, sucesos históricos), dile cuáles para que los compruebe.

Corrige cada **Error** y cada **Dudoso** que proceda con `corregir.py` (desde la raíz, con un JSON de operaciones: su cabecera tiene los formatos) o con `leer`/`guardar` de `tools/contenido.py` seguido de `empaquetar()`. Después, `npm test` otra vez.

## 5. Documentar

- Añade cada unidad a la descripción de su ruta en `CLAUDE.md` («Básico: …», «Finanzas: …»), con su id y lo que enseña. Junto a una unidad que ya esté en la frase, para que el orden tenga sentido.
- Actualiza en el «Traspaso» la línea de contenido verificado con las unidades de la tanda.
- Recuentos: `python .claude/skills/nueva-unidad/recuentos.py` actualiza `CLAUDE.md`, `README.md` y `bienvenida.html`. Con `--comprobar` solo verifica.

## 6. Entregar

1. `npm test` de nuevo. Después, commit en `main` (o en la rama de trabajo) con el mensaje «Rango: cuatro unidades nuevas (título 1, título 2, …)» y push.
2. Publica en el artefacto del proyecto (https://claude.ai/artifact/38d8rWCEaWpkVizHbCfHh4):
   - `python .claude/skills/nueva-unidad/artefacto.py HEAD~1` lista lo que cambió desde el commit anterior, con su hash en ese commit y en local, y el mapa `files`.
   - Lista los archivos del artefacto (`action: "list"`, `scope: "files"`) y compara: si los hashes publicados coinciden con la columna del commit anterior, nadie subió nada que no tengas.
   - En una sesión nueva, lee el artefacto (`action: "read"`) antes de publicar.
   - Publica con `file_path` = `artefacto.html` de esta carpeta (el `index.html` sin la política de seguridad) y el mapa `files` del script.
   - Si el artefacto rechaza la publicación por una versión más nueva o los hashes no coinciden, alguien subió contenido que no tienes: intégralo antes de publicar.
3. Si trabajas en una rama con PR, vigílalo con `subscribe_pr_activity` y revisa su estado:
   - CI en rojo: arregla la causa, no la prueba.
   - `mergeable_state: dirty` es un conflicto con `main`: fusiona `main` en la rama (nunca rebase ni force-push), resuelve conservando lo de los dos lados, `npm test` y push.
4. Resume en español: unidades (tabla con ruta, id, lecciones y contenido), lo que corrigió el verificador, pruebas, commit, versión del artefacto y estado del CI.
