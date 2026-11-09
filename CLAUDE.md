# Rango

App web gamificada tipo Duolingo para **inversores que ya operan** (bolsa, análisis técnico, gestión de riesgo) y, con la ruta Básico, para quien empieza desde cero. Todo el producto está en español de España. Estado actual: prototipo jugable, sin backend ni framework.

## Comandos

- `npm run dev`: servidor estático en http://localhost:5173 (hace falta servidor: los módulos ES y el `fetch` del JSON no funcionan desde `file://`).
- `npm test`: valida el contenido (unidades y `casos.json`), las rutas, los textos y recorre todas las lecciones (y los repasos) simulando respuestas correctas, incorrectas y la pantalla "Sin vidas"; comprueba además cada caso real, la migración del estado y las estadísticas. Avisa (sin fallar) del contenido con fecha de revisión vencida. Ejecútalo tras cualquier cambio en `src/` o en el contenido.
- `npm run e2e` (`node test/e2e.cjs`): navegador real (Playwright + Chromium) con su propio servidor. Sin opciones, juega una lección de cada ruta y de cada tipo de ejercicio en móvil y escritorio, claro y oscuro, y audita la accesibilidad con axe-core. `--lecciones a,b` juega esas; `--todas` juega todas en móvil claro; `--capturas DIR` guarda capturas. Necesita `playwright` y `axe-core` instalados (en CI se instalan sin tocar package.json; sin axe-core se omite la auditoría).
- CI: `.github/workflows/rango_test.yml` (raíz del repo) ejecuta `npm test`, el test de los generadores y `npm run e2e` en cada cambio de `rango/`.
- `python -I tools/test_casos.py`: prueba el generador de casos con datos simulados (sin red).
- `python tools/semana.py [--fecha AAAA-MM-DD]`: genera la Operación de la semana (`semana.json`); con `--fecha` la prepara como si fuera ese día.
- `python tools/casos.py` (requiere `pip install yfinance`): regenera los casos reales. GitHub Actions lo hace cada sábado (`.github/workflows/rango_casos.yml` en la raíz del repo) y sube el resultado solo si `npm test` pasa.

## Estructura

```
index.html              entrada, carga src/app.js como módulo
src/app.js              arranque, navegación (render y VISTAS), flujo de lección (startRun/check/next/finish) y eventos
src/state.js            progreso guardado: formato y versión (STATE_V + MIGRAR), racha, rutas abiertas, repaso espaciado
src/ui.js               $app, toast, setCheck y `ses` (estado de la sesión que no se guarda: vista, lección en curso…)
src/textos.js           TODOS los textos de la interfaz (preparado para traducir)
src/drag.js             líneas arrastrables (ejercicio plan y Operación de la semana)
src/exercises/          un archivo por tipo de ejercicio + index.js (registro TIPOS y su interfaz)
src/views/              home, lesson (lección y resultados), sim, calc, stats, legal
src/charts.js           SVG: gráfico de velas, línea con media, glifo de vela de la ruta
src/content.js          carga las unidades y casos.json; construye FLAT (lecciones + repasos), EXBYID y las rutas
src/content/units/      contenido fijo (fuente): index.json (orden) y un archivo <id>.json por unidad
src/content/units.json  las unidades juntas, GENERADO con `npm run empaquetar`: es lo único que descarga la app
src/content/casos.json  casos reales GENERADOS por tools/casos.py: no editar a mano
src/content/semana.json Operación de la semana GENERADA por tools/semana.py: no editar a mano
src/util.js             fmt (es-ES), esc, tx, fechas, parseNum, constantes (KEY, GOAL, RH, OFFS)
src/icons.js            iconos SVG inline
src/styles.css          tokens y estilos (claro/oscuro)
tools/contenido.py      ayudas para escribir contenido: nueva_unidad, anadir (asignan ids, renumeran y empaquetan), ch/nm/mt/od/sl
tools/empaquetar.mjs    genera src/content/units.json a partir de src/content/units/
tools/casos.py          genera casos.json con Yahoo Finance para los tickers de ../portfolio_manager.py
test/smoke.mjs          lint de contenido + test de humo sin navegador
test/e2e.cjs            navegador real + accesibilidad (test/contenido.cjs lee el contenido desde Node)
manifest.webmanifest    manifiesto de la PWA (nombre, colores, iconos)
sw.js                   service worker: uso sin conexión (precarga, unidades del índice y fuentes)
icons/                  iconos de la PWA, generados con tools/iconos.cjs a partir del logo
docs/                   persistencia.md (cuentas y servidor), publicar.md (repo propio, datos y tiendas)
```

Cada vista devuelve HTML (`innerHTML`) y los eventos se delegan en `#app`. Las selecciones y los campos mutan clases/valores sin redibujar para no perder el foco.

Tipos de ejercicio (`src/exercises/`): cada tipo es un objeto con `html`, `chart`/`after`, `ready`, `correct`, `answer`/`answerHTML`, `act` (botones `data-act` propios), `input`, `enter`, `svg`, `plan` y `focus` (ver `index.js`). La lección y los eventos no saben nada de cada tipo: para añadir uno, crea su archivo, regístralo en `TIPOS`, añade su instrucción a `t.tipos` en textos.js, su validación en `test/smoke.mjs` y su forma de responder en `test/e2e.cjs`.

Textos: ninguna vista escribe texto fijo; todo sale de `t` (textos.js). Los textos con datos son funciones y los plurales se resuelven allí. El test comprueba que cada `t.clave` usada existe. No uses `t` como nombre de variable local en archivos que importan `t`.

Estado guardado (`S`, localStorage `rango.v1`): lleva `v` (versión). Si cambias su formato, sube `STATE_V` y añade el paso en `MIGRAR` (de n a n+1) con su caso en el test. Los campos nuevos con valor por defecto en `DEF()` no necesitan migración.

## PWA y caché

- `sw.js` precarga la app y las fuentes. Todo lo propio (página, código y contenido) va red primero: con conexión siempre llega la misma versión de todo; sin conexión, la última copia guardada. Las fuentes de Google, caché primero.
- No hace falta subir `CACHE` para publicar código nuevo; súbelo solo para vaciar la caché antigua o cambiar la lista de precarga.
- Si añades un archivo a `src/` (también en subcarpetas), añádelo a `PRECACHE` (el test lo comprueba). El contenido se precarga como `src/content/units.json`.

## Esquema del contenido (`src/content/units/`)

`index.json` es la lista ordenada de ids de unidad; cada unidad está en `<id>.json`. La app no lee estos archivos: carga `src/content/units.json` (una sola petición), que se genera con `npm run empaquetar`; `npm test` falla si no está al día. Escribe contenido con `tools/contenido.py` (`nueva_unidad(unidad(...), despues_de='id')`, `anadir('idLección', [ejercicios])`): asigna los ids, renumera las unidades de la ruta y empaqueta. Si editas un archivo de unidad a mano, ejecuta `npm run empaquetar`. Después, `npm test` y `npm run e2e -- --lecciones ...`. En cada ruta, `n` va 1, 2, 3… en el orden del índice (el test lo comprueba).

Unidad: `{n, id, track?, title, blurb, lessons: [...] | null}` (`null` = "Próximamente"). `track`: `"basico"`, `"pasiva"`, `"fundamental"` o `"tecnico"` (por defecto); el selector del inicio las muestra en ese orden y cada una tiene su numeración `n` y su propia lección actual. Básico es el primer nivel: las otras tres se abren al completar sus unidades (una unidad básica con `"gate": false` sería complementaria y no bloquearía; úsalo si añades unidades a Básico, para no volver a cerrar las rutas a quien ya lo terminó), al pulsar «Ya opero: saltar los básicos» (`S.skipBasics`) o si ya hay progreso en ellas. Un usuario nuevo empieza en Básico. Cada unidad genera automáticamente un nodo "Repaso de la unidad" con 5 ejercicios al azar de sus lecciones.

Guía de la unidad (opcional): `guia: [{id: "g1", titulo, texto, ejemplo?, chart?}]` en la unidad, de 2 a 6 tarjetas de 70 palabras como máximo (texto + ejemplo; el test lo comprueba). Una idea por tarjeta, con un ejemplo numérico que coincida con los ejercicios. Sale sola la primera vez que se entra en la unidad (`S.guias[unidad]`), con «Saltar»; después, botón «Guía» en la cabecera de la unidad. No da XP ni cuenta como lección. Las tarjetas se pasan con los botones, deslizando el dedo o con las flechas del teclado. Cada ejercicio puede llevar `guia: "g2"`: al fallarlo aparece «Repasar la teoría», que abre esa tarjeta y vuelve a la lección. Una tarjeta puede llevar `figura`: un diagrama anotado dibujado en SVG por `src/figuras.js` (velas con llaves, marcas, líneas, franjas, zonas y etiquetas, o curvas con series), con `alt` obligatorio. Úsala cuando el concepto se entiende mejor dibujado (anatomía de una vela, fases, gaps, spring, pago de una put, interés compuesto…); comprueba en el móvil que ninguna etiqueta se corta ni pisa velas o líneas. Se escribe con `poner_guia(unidad, [tarjeta(...)], mapa)` en `tools/contenido.py`. Hechas: las 64 unidades (4 tarjetas cada una) y todos los ejercicios fijos enlazados a su tarjeta. Las unidades nuevas deben llevar guía.

Lección: `{id, title, ex: [...]}`. Los `id` deben ser únicos (se guardan en localStorage).

Cada ejercicio lleva `id: "<lección>-<n>"` fijo (lo usan el repaso espaciado, las estadísticas y el test de nivel). Nunca cambies ni reutilices un id: si sobra un ejercicio, bórralo y su id queda sin usar; los nuevos toman el siguiente número (contenido.py lo hace solo). Reordenar ejercicios ya no rompe nada.

`revisar: "AAAA-MM"` (en la unidad o en el ejercicio): contenido que depende de normas o datos que cambian (tramos fiscales, FOGAIN, SOCIMI, informes SPIVA). El test avisa al llegar la fecha: revisa el texto con la norma vigente y mueve la fecha un año.

Ejercicios (`why` es obligatorio y se muestra como explicación tras responder):

- `choice`: `{t, q, opts[], a: índice, why, chart?}`
- `num`: `{t, q, unit: "€"|"$"|"%"|"R"|"", a: número, tol?: 0.005, why, chart?}`. El usuario puede escribir coma o punto decimal. `a` nunca negativo (el teclado decimal del móvil no tiene signo menos: pregunta «¿cuánto cae?») y mejor por debajo de 1.000 («10.000» se leería como 10).
- Cualquier ejercicio admite `table: {cols:[...], rows:[[...]], note?}` (primera columna = cabecera de fila; celdas como texto ya formateado).
- Casos reales (`casos.json`): `{fuente, fecha, ex: {idLección: [ejercicios con "caso": "Empresa (TICKER)"]}}`. Cada lección añade al final un caso al azar de su lista.
- `tap`: `{t, q, chart: {type:"candles", data}, a: índice de vela (0-based), why}`
- `level`: `{t, q, chart: {type:"candles", data, levels:[{id,y}], lines?:[{y,label}]}, a: "B", why}`
- `match`: `{t, q, pairs: [[término, descripción], ...], why}` (3 o más parejas). Cada término tiene un hueco; el usuario toca descripciones y llenan el primer hueco libre; tocar una colocada la devuelve y deja su hueco vacío sin mover las demás. Mismo mecanismo que `order`.
- `plan`: `{t, q, chart: {type:"candles", data, ...}, place: [{id: "entry"|"stop"|"target", label, a, start, tol?: 0.1}], step?: 0.1, why}`. Líneas que se arrastran (ratón, dedo, flechas o botones − / +). `start` debe estar a más de `tol` de `a` (el test lo comprueba). El enunciado da las cifras necesarias: se evalúa calcular y colocar, no adivinar un precio a ojo.
- `zone`: como `plan`, pero `place` son dos líneas `{id:"top", label:"Techo"}` y `{id:"bottom", label:"Suelo"}` (`top.a > bottom.a`) y la franja entre ambas se sombrea. Para marcar un rango lateral, un rango de Wyckoff o la última contracción de una base. El enunciado dice qué máximos y mínimos cuentan (p. ej., «sin contar la sacudida»).
- `slide`: `{t, q, label, min, max, step, start, a, tol?: step/2, unit?, show?: [{label, k, b?, unit?, dec?: 0}], why}`. Deslizador con botones − / +; cada fila de `show` muestra `b + valor × k` y se recalcula al moverlo (riesgo total, peso en cartera…), para que el usuario vea la consecuencia de su elección. `a` y `start` deben caer en un paso y `start` lejos de `a` (el test lo comprueba). Úsalo para elegir una cantidad con una regla (tamaño de posición, venta para rebalancear, precio máximo), no para cálculos sin consecuencia visible.
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
- Elemento distintivo: la ruta de lecciones es una línea de precio y cada lección es una vela. Hecha = vela verde con cuerpo proporcional a la precisión; actual = vela ámbar con pulso; bloqueada = doji gris. Una unidad completada se muestra plegada (cabecera con «Completada» y «Ver lecciones»); el estado desplegado no se guarda. Cuando la lección actual ya no está en la primera unidad, el inicio muestra arriba el atajo «Continuar».
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
- Repaso espaciado (`S.srs`): cada ejercicio fallado a la primera vuelve al día siguiente; cada acierto en el «Repaso del día» lo aplaza 3, 7 y 14 días y luego sale de la lista; un fallo lo reinicia. Máximo 10 por sesión; no suma lección completada. Los ejercicios se identifican por su `id` fijo. Los casos reales no entran en el repaso.
- Test de nivel (`S.placement`): se ofrece en Básico a quien no ha hecho ninguna lección. 12 preguntas (`PLACEMENT` en content.js: dos ids de ejercicio por unidad obligatoria de Básico; si añades una unidad obligatoria, añade dos de sus ejercicios). Sin vidas ni repaso espaciado. Cada unidad con sus dos preguntas acertadas queda completada (`{acc:1,test:true}`); con `TEST_PASS` (10) aciertos o más se abren Técnico y Fundamental.
- Operación de la semana (`S.sim`, `semana.json`): en Técnico, con la ruta abierta. Cada sábado `tools/semana.py` elige un valor de la cartera (rota por semana ISO) con sus 30 últimas sesiones y pasa la semana anterior a `prev` con hasta 5 sesiones posteriores. El usuario coloca entrada (compra en ruptura, por encima del último cierre), stop y objetivo; la semana siguiente ve el resultado en R. `simulate()` (app.js) usa reglas conservadoras: hueco a la apertura, stop antes que objetivo el mismo día, valoración al último cierre si sigue abierta. Sus casos límite están en el test. Como `semana.json` solo trae una semana pasada, `simRecord()` guarda su resultado en el plan (`S.sim[semana].res`) al arrancar: con dos semanas o más, la tarjeta muestra el historial (operaciones, en positivo, R total) y la vista del resultado lo lista.
- Simulador de aportaciones (`S.calc`): en Pasiva, con la ruta abierta. Deslizadores de capital inicial, aportación mensual, años, rentabilidad y comisión; cálculo mensual con aportación a final de mes y comisión restada de la rentabilidad (`aportaciones()` en app.js, con valores de referencia en el test). Avisa de que supone rentabilidad constante. La casilla «Comparar con otra comisión» añade una segunda cartera (`ter2`) al gráfico y al resumen.
- Casos reales de Pasiva (`casos_indices()` en tools/casos.py): crecimiento a 10 años (bg1) y mayor caída desde máximos (pr1) del ETF iShares Core MSCI World de acumulación en euros (EUNL.DE) y del S&P 500 desde 2000 (índice sin dividendos, y así se indica). Bonos de EE. UU. (`casos_bonos()`, Yahoo da la rentabilidad en %): efecto en el precio de un bono de duración 8 del cambio del 10 años en el último año (bh2) y pendiente 10 años − 3 meses en puntos básicos (f8b, «inversión» si es negativa).
- Estadísticas (`S.stats`, vista `stats`, botón de barras en la cabecera): `ex[id] = {n, f, u}` (veces respondido, fallos a la primera, último primer intento correcto) y `min` (minutos de estudio, máximo 30 por sesión). «Puntos débiles» = ejercicios con `u: 0`, ordenados por fallos; «Practicar» lanza hasta 10 (sin guardar lección; acertar los saca de la lista y fallar los manda también al repaso).
- Botones «Desbloquear todo» y «Reiniciar progreso»: solo aparecen con `?dev` en la dirección.

## Estado y tareas pendientes

Hecho: cuatro rutas de 16 unidades (2 lecciones × 4 ejercicios; 193 lecciones contando repasos, unas 520 preguntas fijas más los casos reales), guía teórica en las 64 unidades (256 tarjetas, 28 con figura), nueve tipos de ejercicio (choice, num, tap, level, order, match, plan, slide, zone), repaso espaciado, test de nivel, estadísticas y puntos débiles, Operación de la semana con historial, simulador de aportaciones, PWA instalable y sin conexión, aviso legal, CI con navegador y accesibilidad.

- Básico: 6 unidades obligatorias (acciones y órdenes, rentabilidad y riesgo, leer un gráfico, ETF e índices, impuestos en España, cuenta y bróker) y 10 complementarias (`gate: false`): errores del principiante, cómo funciona la bolsa, el dinero y el interés, ahorro y presupuesto, deudas y tarjetas, fondos de inversión, tipos de activos, leer noticias financieras, estafas y chiringuitos, criptomonedas.
- Pasiva: inversión pasiva, renta fija, reparto de activos, rebalanceo, carteras modelo, retirada sostenible, fiscalidad a largo plazo, psicología del inversor pasivo, fondos y ETF por dentro, por qué indexarse, objetivos, inflación, factores, inmobiliario y oro, divisa, revisión anual. Casos reales de índices y bonos.
- Fundamental: F1-F16 (tabla más abajo); F1-F3, F5, F6, F8 y F9 con casos reales. No usar las acciones en circulación de Yahoo para medir recompras: no son fiables.
- Técnico: velas, tendencia, riesgo, catalizadores binarios, Wyckoff/VSA, VCP, salidas escalonadas, riesgo de cartera, cortos y Fase 4, mercado general, fuerza relativa, techos y temporalidades, grupos y gaps, psicología y diario, opciones para cubrir, backtesting.

Pendiente (por orden sugerido):
1. Decisiones del propietario: persistencia real con cuentas (comparativa y recomendación, Supabase, en `docs/persistencia.md`; se añade `src/sync.js` sin cambiar de stack) y, después, monetización. Los avisos de racha (push) dependen del servidor.
2. Antes de cobrar: datos con licencia en lugar de Yahoo Finance (`docs/publicar.md`) y revisión del aviso legal por un profesional.
3. Publicación: repositorio propio, dominio, Google Play (TWA) y App Store (Capacitor), en `docs/publicar.md`.
4. Mantenimiento anual: el test avisa del contenido con `revisar` vencido (fiscalidad, FOGAIN, SOCIMI, SPIVA).
5. Ideas: retos del día y avisos por Telegram con el bot del repo; bono español a 10 años si aparece una fuente fiable; simular una caída en el simulador de aportaciones; mostrar cuántos ejercicios están «aprendidos» en el repaso; más figuras en las guías donde un dibujo aclare.
6. Traducción: textos de interfaz en `src/textos.js`; el contenido es específico de España (ver `docs/publicar.md`).
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
| F9 Dividendos y recompras | Rentabilidad, payout y ex-dividendo | Recompras: efecto en el BPA, dilución y precio |
| F10 Guía y expectativas | Leer la guía frente al consenso | Revisiones de estimaciones |
| F11 Descuento de flujos | Valor actual, perpetuidad y valor por acción | Sensibilidad y margen de seguridad |
| F12 Señales de alerta contables | Cobros, inventario y caja | Ajustes, fondo de comercio y otras señales |
| F13 Análisis de un sector: chips | El ciclo de los chips | Leer el ciclo |
| F14 Valoración relativa | Múltiplos frente a comparables | Elegir el múltiplo |
| F15 Gestión y gobierno corporativo | Directivos y accionistas | Incentivos y decisiones |
| F16 Economía de la unidad | Captar y retener | Recuperar la inversión |

Decisiones tomadas:
- Ruta separada con selector Técnico / Fundamental: quien viene a por fundamental no pasa antes por la técnica, y cada ruta guarda su progreso.
- Dos capas por lección: ejercicios fijos con números limpios para enseñar el concepto (en `src/content/units/`) y, al final, un caso real de los valores de la cartera del bot (en `casos.json`).
- Los casos reales son solo de cálculo y se generan con código: la respuesta se calcula con las mismas cifras redondeadas que ve el usuario y el `why` solo afirma hechos verificables con los datos (comparaciones con umbrales del marco o con el trimestre anterior). Nada de valoraciones ni de «compra/vende»: cada caso indica fuente y fecha y el inicio lo marca como formación.
- Si una plantilla puede dar un resultado negativo, se reformula o se descarta el caso (ver regla de `num`).
- Filtra los datos absurdos o distorsionados en vez de explicarlos: PER mayor de 200 (BPA casi nulo), EV/EBITDA de 100 o más, rentabilidad por flujo de caja libre de 8 % o más (en negocios financieros el flujo operativo incluye fondos de clientes). El flujo de caja libre se suma de 4 trimestres consecutivos del estado de flujos, no del campo `freeCashflow` de Yahoo, que no es fiable. La cobertura de intereses usa el beneficio operativo, no el «EBIT» de Yahoo (incluye plusvalías). Las plantillas de F3 excluyen el sector financiero: en bancos, deuda y caja son la materia prima del negocio.
- Sorpresas frente al consenso (F5): solo trimestres con BPA ajustado («normalized» en Yahoo). En el contable, Yahoo compara a veces con un consenso no comparable y salen sorpresas enormes y engañosas. «Batir» cuenta con las cifras redondeadas que ve el usuario.

## Convenciones de trabajo

- Responde en español, directo, con datos y sin relleno.
- Entrega archivos completos listos para pegar cuando se pida código.
- Antes de dar una tarea por terminada: `npm test` en verde y revisión visual en móvil (390 px) y en escritorio, en claro y oscuro.
