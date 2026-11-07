# Rango

App web gamificada tipo Duolingo para **inversores que ya operan** (bolsa, análisis técnico, gestión de riesgo) y, con la ruta Básico, para quien empieza desde cero. Todo el producto está en español de España. Estado actual: prototipo jugable, sin backend ni framework.

## Comandos

- `npm run dev`: servidor estático en http://localhost:5173 (hace falta servidor: los módulos ES y el `fetch` del JSON no funcionan desde `file://`).
- `npm test`: valida el contenido (`units.json` y `casos.json`), las dos rutas y recorre todas las lecciones (y los repasos) simulando respuestas correctas, incorrectas y la pantalla "Sin vidas"; comprueba además cada caso real. Ejecútalo tras cualquier cambio en `src/` o en el contenido.
- `python tools/casos.py` (requiere `pip install yfinance`): regenera los casos reales. GitHub Actions lo hace cada sábado (`.github/workflows/rango_casos.yml` en la raíz del repo) y sube el resultado solo si `npm test` pasa.

## Estructura

```
index.html            entrada, carga src/app.js como módulo
src/app.js            estado, vistas (home/lección/resultado/sin vidas), lógica y eventos
src/charts.js         SVG: gráfico de velas, línea con media, glifo de vela de la ruta
src/content.js        carga units.json y casos.json; construye FLAT (lecciones + repasos) y define las rutas
src/content/units.json  TODO el contenido didáctico fijo (unidades, lecciones, ejercicios)
src/content/casos.json  casos reales GENERADOS por tools/casos.py: no editar a mano
tools/casos.py        genera casos.json con Yahoo Finance para los tickers de ../portfolio_manager.py
src/util.js           fmt (es-ES), esc, fechas, parseNum, constantes (KEY, GOAL, RH, OFFS)
src/icons.js          iconos SVG inline
src/styles.css        tokens y estilos (claro/oscuro)
test/smoke.mjs        lint de contenido + test de humo sin navegador
```

`app.js` re-renderiza con `innerHTML` por vista y usa delegación de eventos en `#app`. Las selecciones (opción, vela, nivel) y el input numérico mutan clases/valores sin re-render para no perder el foco. Si `app.js` crece, el siguiente paso natural es separar `state.js` y `views.js`.

## Esquema del contenido (`units.json`)

Unidad: `{n, id, track?, title, blurb, lessons: [...] | null}` (`null` = "Próximamente"). `track`: `"basico"`, `"tecnico"` (por defecto) o `"fundamental"`; cada ruta tiene su selector en el inicio, su numeración `n` y su propia lección actual. Básico es el primer nivel: Técnico y Fundamental se abren al completarlo, al pulsar «Ya opero: saltar los básicos» (`S.skipBasics`) o si ya hay progreso en ellas. Un usuario nuevo empieza en Básico. Cada unidad genera automáticamente un nodo "Repaso de la unidad" con 5 ejercicios al azar de sus lecciones.

Lección: `{id, title, ex: [...]}`. Los `id` deben ser únicos (se guardan en localStorage).

Ejercicios (`why` es obligatorio y se muestra como explicación tras responder):

- `choice`: `{t, q, opts[], a: índice, why, chart?}`
- `num`: `{t, q, unit: "€"|"$"|"%"|"R"|"", a: número, tol?: 0.005, why, chart?}`. El usuario puede escribir coma o punto decimal. `a` nunca negativo (el teclado decimal del móvil no tiene signo menos: pregunta «¿cuánto cae?») y mejor por debajo de 1.000 («10.000» se leería como 10).
- Cualquier ejercicio admite `table: {cols:[...], rows:[[...]], note?}` (primera columna = cabecera de fila; celdas como texto ya formateado).
- Casos reales (`casos.json`): `{fuente, fecha, ex: {idLección: [ejercicios con "caso": "Empresa (TICKER)"]}}`. Cada lección añade al final un caso al azar de su lista.
- `tap`: `{t, q, chart: {type:"candles", data}, a: índice de vela (0-based), why}`
- `level`: `{t, q, chart: {type:"candles", data, levels:[{id,y}], lines?:[{y,label}]}, a: "B", why}`
- `order`: `{t, q, items: [...en el orden correcto], why}`. Se muestran barajados; el usuario los toca en orden y puede devolver uno a la lista tocándolo. Solo para secuencias con un orden defendible (causa-efecto, proceso o esquema canónico), nunca para listas cuyo orden sea opinable.

Gráficos (`chart`):
- `{type:"candles", data:[[apertura,máximo,mínimo,cierre],...], vol?:[...], h?, annot?, lines?, levels?, alt}`; `annot:true` solo para una vela suelta. `vol` (mismo largo que `data`, unidades relativas) dibuja barras de volumen bajo el precio; súbele `h` a ~270.
- `{type:"line", data:[...], ma:[...], alt}` (precio + media de 30 semanas).
- El `alt` nunca debe revelar la respuesta.

## Reglas para escribir lecciones

- Datos reales y cálculos verificados: recalcula cada cifra de `a` y de `why` antes de guardar. Una cuenta mal hecha rompe la confianza del producto.
- Nivel de usuario: en Técnico y Fundamental ya conoce los conceptos básicos; se enseña criterio operativo (qué hacer, a qué nivel, con qué riesgo), no definiciones de manual. En Básico se permiten definiciones, pero siempre con un ejemplo numérico o práctico, y cada concepto apunta a dónde se usará después (ATR, R, velas).
- Marco de referencia: Weinstein (fases, MA 30 semanas), Minervini (Trend Template, VCP), Wyckoff/VSA, ATR para stops y tamaño, múltiplos R, salidas escalonadas.
- Cada ejercicio enseña una sola cosa. `why` explica el porqué con las cifras del enunciado, en 1-2 frases.
- Varía la posición de la respuesta correcta en los `choice`.
- Formato numérico en texto: coma decimal y símbolo tras espacio (`17,60 €`, `7,36 %`).
- Tono directo, sin relleno ni advertencias legales dentro de los ejercicios. Es formación, no recomendación de inversión; el aviso va en una pantalla aparte (pendiente).

## Diseño

Sistema de tokens en `src/styles.css` (`:root`, con variante oscura por `prefers-color-scheme` y `data-theme`).

- Papel azul-gris (`--bg`), tinta navy (`--ink`), verde/rojo de mercado para velas y feedback (`--up`/`--down`), ámbar (`--accent`) para la acción principal y azul (`--sel`) para la selección.
- Tipografía: Bricolage Grotesque (títulos, números grandes) y IBM Plex Sans (texto y cifras con `tabular-nums`).
- Elemento distintivo: la ruta de lecciones es una línea de precio y cada lección es una vela. Hecha = vela verde con cuerpo proporcional a la precisión; actual = vela ámbar con pulso; bloqueada = doji gris.
- No añadir: emojis como iconos, degradados decorativos, tarjetas idénticas con sombra, etiquetas en mayúsculas. El gráfico y la vela son el protagonista; el resto, discreto.
- Móvil primero (columna máx. 520 px), respeta `safe-area-inset-*` y `prefers-reduced-motion`.

## Estado actual y limitaciones conocidas

- Progreso, XP, racha y meta diaria (40 XP) en `localStorage` (clave `rango.v1`). Las vidas son por lección (3 fallos).
- Un fallo reencola el ejercicio al final; la lección solo termina con todos acertados.
- XP: 10 por acierto a la primera + 10 de bonus sin fallos.
- La racha cuenta días naturales en la zona horaria del navegador.
- Sin cuentas, sin sincronización, sin ligas, sin repaso espaciado.
- Botones "Desbloquear todo" y "Reiniciar progreso" al final del inicio: solo para desarrollo, retirar antes de publicar.

## Tareas pendientes (por orden sugerido)

0. Ruta Básico: 4 unidades hechas (acciones y órdenes, rentabilidad y riesgo, leer un gráfico, ETF e índices). Posibles ampliaciones: fiscalidad básica en España, tipos de cuenta y bróker.
1. Ampliar contenido técnico: unidades 4 (catalizadores binarios), 5 (Wyckoff/VSA) y 6 (VCP) hechas. Siguiente: salidas escalonadas y riesgo de cartera.
1b. Ruta fundamental: F1-F4 hechas (F1-F3 con casos reales). Ideas siguientes: sectores, lectura de un informe de resultados real.
2. Nuevos tipos de ejercicio: «ordenar pasos» hecho (`order`). Faltan: arrastrar entrada/stop/objetivo sobre el gráfico y emparejar patrón con descripción.
3. Repaso espaciado: guardar ejercicios fallados y reintroducirlos días después.
4. Persistencia real (cuentas, sincronización) y decidir stack: vanilla actual frente a Vite + TypeScript. Migrar solo cuando el contenido y los tipos de ejercicio se estabilicen.
5. PWA instalable y avisos de racha.
6. Pantalla de aviso legal (formación, no asesoramiento financiero).
7. Fuera de Rango, en el bot del repo: `portfolio_manager.py` lleva la clave de Gemini escrita en el código. Revocarla, crear otra, guardarla como secreto de GitHub y leerla del entorno.

## Ruta fundamental

Principio: el análisis fundamental decide **qué** comprar; el técnico, **cuándo** y **cuánto**. Una tesis sin criterio de invalidación es como una entrada sin stop. Marco: O'Neil (CAN SLIM: C y A), Minervini (aceleración de BPA, ventas y márgenes), valoración por múltiplos y caja, y tesis escrita con catalizador e invalidación.

Unidades propuestas (2 lecciones × 4 ejercicios cada una, como la ruta técnica):

| Unidad | Lección 1 | Lección 2 |
|---|---|---|
| F1 Crecimiento del beneficio | BPA y ventas: crecimiento interanual y aceleración trimestral | Calidad del beneficio: márgenes, partidas no recurrentes, sorpresas y revisiones de estimaciones |
| F2 Valoración | PER, PER adelantado y PEG: cuánto pagas por el crecimiento | EV/EBITDA, rentabilidad por flujo de caja libre y qué expectativas descuenta el precio |
| F3 Balance y caja | Deuda neta/EBITDA y cobertura de intereses | Caja, meses de autonomía y riesgo de dilución (enlaza con la lección b3) |
| F4 Tesis de inversión | Escribir la tesis: motor de beneficio, catalizador, horizonte y qué espera el mercado | Invalidación y seguimiento: qué dato rompe la tesis, revisión tras resultados y cómo convive con el stop técnico |

Decisiones tomadas:
- Ruta separada con selector Técnico / Fundamental: quien viene a por fundamental no pasa antes por la técnica, y cada ruta guarda su progreso.
- Dos capas por lección: ejercicios fijos con números limpios para enseñar el concepto (en `units.json`) y, al final, un caso real de los valores de la cartera del bot (en `casos.json`).
- Los casos reales son solo de cálculo y se generan con código: la respuesta se calcula con las mismas cifras redondeadas que ve el usuario y el `why` solo afirma hechos verificables con los datos (comparaciones con umbrales del marco o con el trimestre anterior). Nada de valoraciones ni de «compra/vende»: cada caso indica fuente y fecha y el inicio lo marca como formación.
- Si una plantilla puede dar un resultado negativo, se reformula o se descarta el caso (ver regla de `num`).
- Filtra los datos absurdos o distorsionados en vez de explicarlos: PER mayor de 200 (BPA casi nulo), EV/EBITDA de 100 o más, rentabilidad por flujo de caja libre de 8 % o más (en negocios financieros el flujo operativo incluye fondos de clientes). El flujo de caja libre se suma de 4 trimestres consecutivos del estado de flujos, no del campo `freeCashflow` de Yahoo, que no es fiable. La cobertura de intereses usa el beneficio operativo, no el «EBIT» de Yahoo (incluye plusvalías). Las plantillas de F3 excluyen el sector financiero: en bancos, deuda y caja son la materia prima del negocio.
- La tesis encaja con el tipo de ejercicio «ordenar pasos» (ya en la lista de pendientes).

## Convenciones de trabajo

- Responde en español, directo, con datos y sin relleno.
- Entrega archivos completos listos para pegar cuando se pida código.
- Antes de dar una tarea por terminada: `npm test` en verde y revisión visual en móvil (390 px) y en escritorio, en claro y oscuro.
