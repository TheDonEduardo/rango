# Rango

App web gamificada tipo Duolingo para **inversores que ya operan** (bolsa, análisis técnico, gestión de riesgo). Todo el producto está en español de España. Estado actual: prototipo jugable, sin backend ni framework.

## Comandos

- `npm run dev`: servidor estático en http://localhost:5173 (hace falta servidor: los módulos ES y el `fetch` del JSON no funcionan desde `file://`).
- `npm test`: valida el contenido (`units.json`) y recorre todas las lecciones (y los repasos) simulando respuestas correctas, incorrectas y la pantalla "Sin vidas". Ejecútalo tras cualquier cambio en `src/` o en el contenido.

## Estructura

```
index.html            entrada, carga src/app.js como módulo
src/app.js            estado, vistas (home/lección/resultado/sin vidas), lógica y eventos
src/charts.js         SVG: gráfico de velas, línea con media, glifo de vela de la ruta
src/content.js        carga units.json y construye FLAT (lista plana de lecciones + repasos)
src/content/units.json  TODO el contenido didáctico (unidades, lecciones, ejercicios)
src/util.js           fmt (es-ES), esc, fechas, parseNum, constantes (KEY, GOAL, RH, OFFS)
src/icons.js          iconos SVG inline
src/styles.css        tokens y estilos (claro/oscuro)
test/smoke.mjs        lint de contenido + test de humo sin navegador
```

`app.js` re-renderiza con `innerHTML` por vista y usa delegación de eventos en `#app`. Las selecciones (opción, vela, nivel) y el input numérico mutan clases/valores sin re-render para no perder el foco. Si `app.js` crece, el siguiente paso natural es separar `state.js` y `views.js`.

## Esquema del contenido (`units.json`)

Unidad: `{n, id, title, blurb, lessons: [...] | null}` (`null` = "Próximamente"). Cada unidad genera automáticamente un nodo "Repaso de la unidad" con 5 ejercicios al azar de sus lecciones.

Lección: `{id, title, ex: [...]}`. Los `id` deben ser únicos (se guardan en localStorage).

Ejercicios (`why` es obligatorio y se muestra como explicación tras responder):

- `choice`: `{t, q, opts[], a: índice, why, chart?}`
- `num`: `{t, q, unit: "€"|"%"|"R"|"", a: número, tol?: 0.005, why, chart?}`. El usuario puede escribir coma o punto decimal.
- `tap`: `{t, q, chart: {type:"candles", data}, a: índice de vela (0-based), why}`
- `level`: `{t, q, chart: {type:"candles", data, levels:[{id,y}], lines?:[{y,label}]}, a: "B", why}`

Gráficos (`chart`):
- `{type:"candles", data:[[apertura,máximo,mínimo,cierre],...], vol?:[...], h?, annot?, lines?, levels?, alt}`; `annot:true` solo para una vela suelta. `vol` (mismo largo que `data`, unidades relativas) dibuja barras de volumen bajo el precio; súbele `h` a ~270.
- `{type:"line", data:[...], ma:[...], alt}` (precio + media de 30 semanas).
- El `alt` nunca debe revelar la respuesta.

## Reglas para escribir lecciones

- Datos reales y cálculos verificados: recalcula cada cifra de `a` y de `why` antes de guardar. Una cuenta mal hecha rompe la confianza del producto.
- Nivel de usuario: ya conoce los conceptos básicos; se enseña criterio operativo (qué hacer, a qué nivel, con qué riesgo), no definiciones de manual.
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

## Siguiente trabajo sugerido (por orden)

1. Ampliar contenido técnico: unidades 4 (catalizadores binarios), 5 (Wyckoff/VSA) y 6 (VCP) hechas. Siguiente: salidas escalonadas y riesgo de cartera.
1b. Ruta fundamental: ver «Ruta fundamental (borrador)». Validar temario y decisiones abiertas antes de escribir contenido.
2. Nuevos tipos de ejercicio: ordenar pasos (fases de Weinstein), arrastrar entrada/stop/objetivo sobre el gráfico, emparejar patrón con descripción.
3. Repaso espaciado: guardar ejercicios fallados y reintroducirlos días después.
4. Persistencia real (cuentas, sincronización) y decidir stack: vanilla actual frente a Vite + TypeScript. Migrar solo cuando el contenido y los tipos de ejercicio se estabilicen.
5. PWA instalable y avisos de racha.
6. Pantalla de aviso legal (formación, no asesoramiento financiero).

## Ruta fundamental (borrador, pendiente de validar)

Principio: el análisis fundamental decide **qué** comprar; el técnico, **cuándo** y **cuánto**. Una tesis sin criterio de invalidación es como una entrada sin stop. Marco: O'Neil (CAN SLIM: C y A), Minervini (aceleración de BPA, ventas y márgenes), valoración por múltiplos y caja, y tesis escrita con catalizador e invalidación.

Unidades propuestas (2 lecciones × 4 ejercicios cada una, como la ruta técnica):

| Unidad | Lección 1 | Lección 2 |
|---|---|---|
| F1 Crecimiento del beneficio | BPA y ventas: crecimiento interanual y aceleración trimestral | Calidad del beneficio: márgenes, partidas no recurrentes, sorpresas y revisiones de estimaciones |
| F2 Valoración | PER, PER adelantado y PEG: cuánto pagas por el crecimiento | EV/EBITDA, rentabilidad por flujo de caja libre y qué expectativas descuenta el precio |
| F3 Balance y caja | Deuda neta/EBITDA y cobertura de intereses | Caja, meses de autonomía y riesgo de dilución (enlaza con la lección b3) |
| F4 Tesis de inversión | Escribir la tesis: motor de beneficio, catalizador, horizonte y qué espera el mercado | Invalidación y seguimiento: qué dato rompe la tesis, revisión tras resultados y cómo convive con el stop técnico |

Necesidades técnicas previstas:
- Ejercicios sobre tablas de resultados trimestrales: campo opcional `table: {cols:[...], rows:[[...]]}` en el ejercicio, renderizado como el `chart`.
- La tesis encaja con el tipo de ejercicio «ordenar pasos» (ya en la lista de pendientes).

Decisiones abiertas:
- ¿Ruta separada (selector Técnico / Fundamental en el inicio) o unidades a continuación de la técnica?
- ¿Empresas reales (datos que caducan y riesgo de parecer recomendación) o ficticias con cifras realistas?
- La regla «datos reales» de arriba se pensó para gráficos; para fundamental habrá que concretarla.

## Convenciones de trabajo

- Responde en español, directo, con datos y sin relleno.
- Entrega archivos completos listos para pegar cuando se pida código.
- Antes de dar una tarea por terminada: `npm test` en verde y revisión visual en móvil (390 px) y en escritorio, en claro y oscuro.
