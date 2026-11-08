# Rango

App web gamificada tipo Duolingo para **inversores que ya operan** (bolsa, análisis técnico, gestión de riesgo) y, con la ruta Básico, para quien empieza desde cero. Todo el producto está en español de España. Estado actual: prototipo jugable, sin backend ni framework.

## Comandos

- `npm run dev`: servidor estático en http://localhost:5173 (hace falta servidor: los módulos ES y el `fetch` del JSON no funcionan desde `file://`).
- `npm test`: valida el contenido (`units.json` y `casos.json`), las dos rutas y recorre todas las lecciones (y los repasos) simulando respuestas correctas, incorrectas y la pantalla "Sin vidas"; comprueba además cada caso real. Ejecútalo tras cualquier cambio en `src/` o en el contenido.
- `python -I tools/test_casos.py`: prueba el generador de casos con datos simulados (sin red).
- `python tools/semana.py [--fecha AAAA-MM-DD]`: genera la Operación de la semana (`semana.json`); con `--fecha` la prepara como si fuera ese día.
- `python tools/casos.py` (requiere `pip install yfinance`): regenera los casos reales. GitHub Actions lo hace cada sábado (`.github/workflows/rango_casos.yml` en la raíz del repo) y sube el resultado solo si `npm test` pasa.

## Estructura

```
index.html            entrada, carga src/app.js como módulo
src/app.js            estado, vistas (home/lección/resultado/sin vidas), lógica y eventos
src/charts.js         SVG: gráfico de velas, línea con media, glifo de vela de la ruta
src/content.js        carga units.json y casos.json; construye FLAT (lecciones + repasos) y define las rutas
src/content/units.json  TODO el contenido didáctico fijo (unidades, lecciones, ejercicios)
src/content/casos.json  casos reales GENERADOS por tools/casos.py: no editar a mano
src/content/semana.json Operación de la semana GENERADA por tools/semana.py: no editar a mano
tools/casos.py        genera casos.json con Yahoo Finance para los tickers de ../portfolio_manager.py
src/util.js           fmt (es-ES), esc, fechas, parseNum, constantes (KEY, GOAL, RH, OFFS)
src/icons.js          iconos SVG inline
src/styles.css        tokens y estilos (claro/oscuro)
test/smoke.mjs        lint de contenido + test de humo sin navegador
manifest.webmanifest  manifiesto de la PWA (nombre, colores, iconos)
sw.js                 service worker: uso sin conexión (precarga, fuentes incluidas)
icons/                iconos de la PWA, generados con tools/iconos.cjs a partir del logo
```

`app.js` re-renderiza con `innerHTML` por vista y usa delegación de eventos en `#app`. Las selecciones (opción, vela, nivel) y el input numérico mutan clases/valores sin re-render para no perder el foco. Si `app.js` crece, el siguiente paso natural es separar `state.js` y `views.js`.

## PWA y caché

- `sw.js` precarga la app y las fuentes. Todo lo propio (página, código y contenido) va red primero: con conexión siempre llega la misma versión de todo; sin conexión, la última copia guardada. Las fuentes de Google, caché primero.
- No hace falta subir `CACHE` para publicar código nuevo; súbelo solo para vaciar la caché antigua o cambiar la lista de precarga.
- Si añades un archivo a `src/`, añádelo a `PRECACHE` (el test lo comprueba).

## Esquema del contenido (`units.json`)

Unidad: `{n, id, track?, title, blurb, lessons: [...] | null}` (`null` = "Próximamente"). `track`: `"basico"`, `"pasiva"`, `"fundamental"` o `"tecnico"` (por defecto); el selector del inicio las muestra en ese orden y cada una tiene su numeración `n` y su propia lección actual. Básico es el primer nivel: las otras tres se abren al completar sus unidades (una unidad básica con `"gate": false` sería complementaria y no bloquearía; úsalo si añades unidades a Básico, para no volver a cerrar las rutas a quien ya lo terminó), al pulsar «Ya opero: saltar los básicos» (`S.skipBasics`) o si ya hay progreso en ellas. Un usuario nuevo empieza en Básico. Cada unidad genera automáticamente un nodo "Repaso de la unidad" con 5 ejercicios al azar de sus lecciones.

Lección: `{id, title, ex: [...]}`. Los `id` deben ser únicos (se guardan en localStorage).

Ejercicios (`why` es obligatorio y se muestra como explicación tras responder):

- `choice`: `{t, q, opts[], a: índice, why, chart?}`
- `num`: `{t, q, unit: "€"|"$"|"%"|"R"|"", a: número, tol?: 0.005, why, chart?}`. El usuario puede escribir coma o punto decimal. `a` nunca negativo (el teclado decimal del móvil no tiene signo menos: pregunta «¿cuánto cae?») y mejor por debajo de 1.000 («10.000» se leería como 10).
- Cualquier ejercicio admite `table: {cols:[...], rows:[[...]], note?}` (primera columna = cabecera de fila; celdas como texto ya formateado).
- Casos reales (`casos.json`): `{fuente, fecha, ex: {idLección: [ejercicios con "caso": "Empresa (TICKER)"]}}`. Cada lección añade al final un caso al azar de su lista.
- `tap`: `{t, q, chart: {type:"candles", data}, a: índice de vela (0-based), why}`
- `level`: `{t, q, chart: {type:"candles", data, levels:[{id,y}], lines?:[{y,label}]}, a: "B", why}`
- `match`: `{t, q, pairs: [[término, descripción], ...], why}` (3 o más parejas). Cada término tiene un hueco; el usuario toca descripciones y llenan el primer hueco libre; tocar una colocada la devuelve y deja su hueco vacío sin mover las demás. Mismo mecanismo que `order`.
- `plan`: `{t, q, chart: {type:"candles", data, ...}, place: [{id: "entry"|"stop"|"target", label, a, start, tol?: 0.1}], step?: 0.1, why}`. Líneas que se arrastran (ratón, dedo, flechas o botones − / +). `start` debe estar a más de `tol` de `a` (el test lo comprueba). El enunciado da las cifras necesarias: se evalúa calcular y colocar, no adivinar un precio a ojo.
- `order`: `{t, q, items: [...en el orden correcto], why}`. Se muestran barajados; el usuario los toca en orden y puede devolver uno a la lista tocándolo (su hueco queda libre y lo llena el siguiente que toque). Solo para secuencias con un orden defendible (causa-efecto, proceso o esquema canónico), nunca para listas cuyo orden sea opinable.

Gráficos (`chart`):
- `{type:"candles", data:[[apertura,máximo,mínimo,cierre],...], vol?:[...], h?, annot?, lines?, levels?, alt}`; `annot:true` solo para una vela suelta. `vol` (mismo largo que `data`, unidades relativas) dibuja barras de volumen bajo el precio; súbele `h` a ~270.
- `{type:"line", data:[...], ma:[...], alt}` (precio + media de 30 semanas).
- El `alt` nunca debe revelar la respuesta.

## Reglas para escribir lecciones

- Datos reales y cálculos verificados: recalcula cada cifra de `a` y de `why` antes de guardar. Una cuenta mal hecha rompe la confianza del producto.
- Nivel de usuario: en Técnico y Fundamental ya conoce los conceptos básicos; se enseña criterio operativo (qué hacer, a qué nivel, con qué riesgo), no definiciones de manual. En Básico se permiten definiciones, pero siempre con un ejemplo numérico o práctico, y cada concepto apunta a dónde se usará después (ATR, R, velas).
- Marco de referencia: Weinstein (fases, MA 30 semanas), Minervini (Trend Template, VCP), Wyckoff/VSA, ATR para stops y tamaño, múltiplos R, salidas escalonadas.
- Cada ejercicio enseña una sola cosa. `why` explica el porqué con las cifras del enunciado, en 1-2 frases.
- Varía la posición de la respuesta correcta en los `choice` y que no sea la más larga: los distractores deben ser igual de creíbles y de largos (el test falla si la correcta supera 1,5 veces a la más larga del resto). La justificación va en `why`, no en la opción.
- Formato numérico en texto: coma decimal y símbolo tras espacio (`17,60 €`, `7,36 %`).
- Cada enunciado (`q`) es único en todo el contenido (el test lo comprueba).
- Contenido fiscal o normativo: solo reglas estables y bien establecidas, sin casos límite; las tablas de tramos llevan «Compruébalos cada año».
- Tono directo, sin relleno ni advertencias legales dentro de los ejercicios. Es formación, no recomendación de inversión; el aviso va en su propia pantalla (aviso legal).

## Diseño

Sistema de tokens en `src/styles.css` (`:root`, con variante oscura por `prefers-color-scheme` y `data-theme`).

- Papel azul-gris (`--bg`), tinta navy (`--ink`), verde/rojo de mercado para velas y feedback (`--up`/`--down`), ámbar (`--accent`) para la acción principal y azul (`--sel`) para la selección.
- Tipografía: Bricolage Grotesque (títulos, números grandes) y IBM Plex Sans (texto y cifras con `tabular-nums`).
- Elemento distintivo: la ruta de lecciones es una línea de precio y cada lección es una vela. Hecha = vela verde con cuerpo proporcional a la precisión; actual = vela ámbar con pulso; bloqueada = doji gris.
- No añadir: emojis como iconos, degradados decorativos, tarjetas idénticas con sombra, etiquetas en mayúsculas. El gráfico y la vela son el protagonista; el resto, discreto.
- Móvil primero (columna máx. 520 px), respeta `safe-area-inset-*` y `prefers-reduced-motion`.
- Accesibilidad (auditoría con axe-core sin incidencias en 15 pantallas, claro y oscuro): `#app` es la región principal (`<main>`); cada pantalla tiene un `h1` (el nombre en el inicio, el enunciado en lecciones y simuladores); barras de progreso con nombre; un gráfico con controles dentro es `role="group"`, no `img`. Texto de color sobre el fondo o con etiqueta: usa las variantes `--up-ink`/`--down-ink` (contraste ≥ 4,5), no `--up`/`--down`.

## Estado actual y limitaciones conocidas

- Progreso, XP, racha y meta diaria (40 XP) en `localStorage` (clave `rango.v1`). Las vidas son por lección (3 fallos).
- Un fallo reencola el ejercicio al final; la lección solo termina con todos acertados.
- XP: 10 por acierto a la primera + 10 de bonus sin fallos.
- La racha cuenta días naturales en la zona horaria del navegador.
- Sin cuentas, sin sincronización, sin ligas.
- Aviso legal: se acepta en el primer uso (`S.legal`, versión `LEGAL_V` en app.js; súbela si cambia el texto) y queda enlazado en el pie del inicio.
- Repaso espaciado (`S.srs`): cada ejercicio fallado a la primera vuelve al día siguiente; cada acierto en el «Repaso del día» lo aplaza 3, 7 y 14 días y luego sale de la lista; un fallo lo reinicia. Máximo 10 por sesión; no suma lección completada. Los ejercicios se identifican por `idLección#índice` (`uid`, en content.js): no reordenes ni borres ejercicios de lecciones publicadas, añade al final. Los casos reales no entran en el repaso.
- Test de nivel (`S.placement`): se ofrece en Básico a quien no ha hecho ninguna lección. 12 preguntas (`PLACEMENT` en content.js: dos `uid` por unidad obligatoria de Básico; si añades una unidad obligatoria, añade dos de sus ejercicios). Sin vidas ni repaso espaciado. Cada unidad con sus dos preguntas acertadas queda completada (`{acc:1,test:true}`); con `TEST_PASS` (10) aciertos o más se abren Técnico y Fundamental.
- Operación de la semana (`S.sim`, `semana.json`): en Técnico, con la ruta abierta. Cada sábado `tools/semana.py` elige un valor de la cartera (rota por semana ISO) con sus 30 últimas sesiones y pasa la semana anterior a `prev` con hasta 5 sesiones posteriores. El usuario coloca entrada (compra en ruptura, por encima del último cierre), stop y objetivo; la semana siguiente ve el resultado en R. `simulate()` (app.js) usa reglas conservadoras: hueco a la apertura, stop antes que objetivo el mismo día, valoración al último cierre si sigue abierta. Sus casos límite están en el test.
- Simulador de aportaciones (`S.calc`): en Pasiva, con la ruta abierta. Deslizadores de capital inicial, aportación mensual, años, rentabilidad y comisión; cálculo mensual con aportación a final de mes y comisión restada de la rentabilidad (`aportaciones()` en app.js, con valores de referencia en el test). Avisa de que supone rentabilidad constante. La casilla «Comparar con otra comisión» añade una segunda cartera (`ter2`) al gráfico y al resumen.
- Casos reales de Pasiva (`casos_indices()` en tools/casos.py): crecimiento a 10 años (bg1) y mayor caída desde máximos (pr1) del ETF iShares Core MSCI World de acumulación en euros (EUNL.DE) y del S&P 500 desde 2000 (índice sin dividendos, y así se indica). Bonos de EE. UU. (`casos_bonos()`, Yahoo da la rentabilidad en %): efecto en el precio de un bono de duración 8 del cambio del 10 años en el último año (bh2) y pendiente 10 años − 3 meses en puntos básicos (f8b, «inversión» si es negativa).
- Botones "Desbloquear todo" y "Reiniciar progreso" al final del inicio: solo para desarrollo, retirar antes de publicar.

## Tareas pendientes (por orden sugerido)

0. Ruta Básico: 6 unidades (acciones y órdenes, rentabilidad y riesgo, leer un gráfico, ETF e índices, impuestos en España, cuenta y bróker).
0b. Ruta Pasiva: 6 unidades (inversión pasiva, renta fija, reparto de activos, rebalanceo, carteras modelo, retirada sostenible), con casos reales de índices y bonos y simulador de aportaciones con comparación de comisiones. Ideas siguientes: bono español a 10 años si aparece una fuente fiable (Yahoo no lo cubre bien), simular una caída en el simulador. Revisar cada año los tramos y normas fiscales de la unidad «Impuestos en España» y «Cuenta y bróker».
1. Contenido técnico: unidades 1-15 hechas (velas, tendencia, riesgo, catalizadores binarios, Wyckoff/VSA, VCP, salidas escalonadas, riesgo de cartera, cortos y Fase 4, mercado general, fuerza relativa, techos y temporalidades, grupos y gaps, psicología y diario, opciones para cubrir). Ideas siguientes: backtesting de un sistema.
1b. Ruta fundamental: F1-F8 hechas (F1-F3, F5 y F6 con casos reales; F8 macro). Ideas siguientes: dividendos y recompras, lectura de la guía de la empresa.
1c. Ideas de producto: retos del día y avisos de racha por Telegram con el bot del repo; historial de resultados del simulador (R acumulado).
2. Tipos de ejercicio: `order`, `match` y `plan` hechos. Ideas: marcar una zona (rango, base) arrastrando dos líneas, o elegir el tamaño de posición con un deslizador.
3. Repaso espaciado: hecho. Posible mejora: avisar de la racha de repaso y mostrar cuántos ejercicios están «aprendidos».
4. Persistencia real (cuentas, sincronización): comparativa y recomendación (Supabase) en `docs/persistencia.md`, pendiente de decisión. No exige cambiar de stack: se añade `src/sync.js` y se sigue en vanilla.
5. PWA instalable: hecho (manifiesto, iconos, uso sin conexión, botón de instalar). Avisos de racha: necesitan notificaciones push con servidor; van con el punto 4.
6. Aviso legal: hecho. Revisarlo con un profesional antes de publicar.
7. Fuera de Rango, en el bot del repo: `portfolio_manager.py` lleva la clave de Gemini escrita en el código. Revocarla, crear otra, guardarla como secreto de GitHub y leerla del entorno.

## Ruta fundamental

Principio: el análisis fundamental decide **qué** comprar; el técnico, **cuándo** y **cuánto**. Una tesis sin criterio de invalidación es como una entrada sin stop. Marco: O'Neil (CAN SLIM: C y A), Minervini (aceleración de BPA, ventas y márgenes), valoración por múltiplos y caja, y tesis escrita con catalizador e invalidación.

Unidades (2 lecciones × 4 ejercicios cada una, como la ruta técnica):

| Unidad | Lección 1 | Lección 2 |
|---|---|---|
| F1 Crecimiento del beneficio | BPA y ventas: crecimiento interanual y aceleración trimestral | Calidad del beneficio: márgenes, partidas no recurrentes, sorpresas y revisiones de estimaciones |
| F2 Valoración | PER, PER adelantado y PEG: cuánto pagas por el crecimiento | EV/EBITDA, rentabilidad por flujo de caja libre y qué expectativas descuenta el precio |
| F3 Balance y caja | Deuda neta/EBITDA y cobertura de intereses | Caja, meses de autonomía y riesgo de dilución (enlaza con la lección b3) |
| F4 Tesis de inversión | Escribir la tesis: motor de beneficio, catalizador, horizonte y qué espera el mercado | Invalidación y seguimiento: qué dato rompe la tesis, revisión tras resultados y cómo convive con el stop técnico |
| F5 Informe de resultados | Sorpresas frente al consenso, BPA ajustado frente a contable y previsiones | La cuenta de resultados de arriba abajo: márgenes y BPA |
| F6 Sectores | Cíclicos, defensivos y sensibles (Morningstar) | Qué métrica mirar en cada sector |
| F7 Calidad del negocio | ROIC frente al coste del capital y reinversión | Ventajas competitivas y su erosión |
| F8 Macro para inversores | Tipos, inflación y valor de los beneficios futuros | Curva de tipos y rotación sectorial |

Decisiones tomadas:
- Ruta separada con selector Técnico / Fundamental: quien viene a por fundamental no pasa antes por la técnica, y cada ruta guarda su progreso.
- Dos capas por lección: ejercicios fijos con números limpios para enseñar el concepto (en `units.json`) y, al final, un caso real de los valores de la cartera del bot (en `casos.json`).
- Los casos reales son solo de cálculo y se generan con código: la respuesta se calcula con las mismas cifras redondeadas que ve el usuario y el `why` solo afirma hechos verificables con los datos (comparaciones con umbrales del marco o con el trimestre anterior). Nada de valoraciones ni de «compra/vende»: cada caso indica fuente y fecha y el inicio lo marca como formación.
- Si una plantilla puede dar un resultado negativo, se reformula o se descarta el caso (ver regla de `num`).
- Filtra los datos absurdos o distorsionados en vez de explicarlos: PER mayor de 200 (BPA casi nulo), EV/EBITDA de 100 o más, rentabilidad por flujo de caja libre de 8 % o más (en negocios financieros el flujo operativo incluye fondos de clientes). El flujo de caja libre se suma de 4 trimestres consecutivos del estado de flujos, no del campo `freeCashflow` de Yahoo, que no es fiable. La cobertura de intereses usa el beneficio operativo, no el «EBIT» de Yahoo (incluye plusvalías). Las plantillas de F3 excluyen el sector financiero: en bancos, deuda y caja son la materia prima del negocio.
- Sorpresas frente al consenso (F5): solo trimestres con BPA ajustado («normalized» en Yahoo). En el contable, Yahoo compara a veces con un consenso no comparable y salen sorpresas enormes y engañosas. «Batir» cuenta con las cifras redondeadas que ve el usuario.

## Convenciones de trabajo

- Responde en español, directo, con datos y sin relleno.
- Entrega archivos completos listos para pegar cuando se pida código.
- Antes de dar una tarea por terminada: `npm test` en verde y revisión visual en móvil (390 px) y en escritorio, en claro y oscuro.
