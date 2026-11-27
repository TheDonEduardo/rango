# Rango

Web: https://thedoneduardo.github.io/rango/

App gamificada tipo Duolingo para aprender a invertir, con siete rutas y 259 unidades: Básico, Finanzas personales, Inversión pasiva, Análisis fundamental, Análisis técnico, Opciones y Cripto. Incluye casos con datos reales, simuladores, repaso espaciado y estadísticas.

## Ejecutar y probar

```bash
npm run dev     # http://localhost:5173
npm test        # valida contenido y recorre todas las lecciones
npm run e2e     # navegador real y accesibilidad (requiere playwright y axe-core)
python -I tools/test_casos.py && python -I tools/test_semana.py   # generadores, con datos simulados
```

Hace falta un servidor estático (los módulos ES y el `fetch` del contenido no funcionan desde `file://`). La app usa solo rutas relativas, así que también funciona servida en un subdirectorio, como en GitHub Pages.

Es una PWA: desde el móvil se puede instalar («Añadir a pantalla de inicio») y funciona sin conexión.

Necesita Node 20+ (solo para el servidor estático, los tests y `npm run empaquetar`; la app no tiene dependencias).

## Trabajar con Claude Code

```bash
claude
```

Claude Code lee `CLAUDE.md` al iniciar: ahí están la estructura, el esquema del contenido, las reglas de diseño y el trabajo siguiente.

Contenido nuevo: un archivo por unidad en `src/content/units/` (orden en `index.json`); escríbelo con `tools/contenido.py`, que asigna los ids de los ejercicios. Textos de la interfaz: `src/textos.js`.

Publicación (repositorio propio, datos con licencia, tiendas e idiomas): `docs/publicar.md`.

## Publicación

La web se publica con GitHub Pages desde la rama `main` (carpeta raíz). Cada sábado, un workflow (`.github/workflows/rango_casos.yml`) regenera los casos reales, la operación y el mercado de la semana con datos de Yahoo Finance y los sube si los tests pasan. Más detalles en `CLAUDE.md` y `docs/publicar.md`.
