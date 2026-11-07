# Rango

Prototipo de app gamificada tipo Duolingo para inversores: velas japonesas, fases de Weinstein, Trend Template y gestión de riesgo con ATR.

## Arrancar

```bash
npm run dev     # http://localhost:5173
npm test        # valida contenido y recorre todas las lecciones
```

Necesita Node 18+ (solo para el servidor estático y los tests; la app no tiene dependencias).

## Trabajar con Claude Code

```bash
cd rango
claude
```

Claude Code lee `CLAUDE.md` al iniciar: ahí están la estructura, el esquema del contenido, las reglas de diseño y el trabajo siguiente. Primer mensaje sugerido:

> Lee CLAUDE.md, ejecuta `npm test` y `npm run dev`. Después añade la unidad 4 "Catalizadores binarios" con 2 lecciones de 4 ejercicios cada una (gaps de resultados y sizing con riesgo binario), siguiendo las reglas de contenido. Verifica todas las cuentas y pasa `npm test`.

Contenido nuevo: edita solo `src/content/units.json`.
