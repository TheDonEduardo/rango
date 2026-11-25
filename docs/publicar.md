# Publicar Rango: repositorio propio, datos y tiendas

Pasos que dependen de decisiones o cuentas del propietario. El código ya está preparado para cada uno.

## 1. Repositorio propio

Hecho: Rango vive en https://github.com/TheDonEduardo/rango (historial separado con `git subtree split --prefix=rango`). Los workflows están en `.github/workflows/`, `.claude/` en la raíz y los generadores leen los valores de `RANGO_TICKERS` o de `tools/tickers.txt` (copia de la lista del bot). Comprobación tras cualquier cambio: `npm test`, `python -I tools/test_casos.py`, `python -I tools/test_semana.py`, `node test/e2e.cjs` y `python .claude/skills/nueva-unidad/recuentos.py --comprobar`.

## 1 ter. Web en GitHub Pages

Settings → Pages → Deploy from a branch → `main` y carpeta `/ (root)`. La web queda en `https://thedoneduardo.github.io/rango/`. `.nojekyll` desactiva Jekyll. Un repositorio privado necesita un plan de GitHub que admita Pages privado; si no, hay que hacerlo público (comprueba antes que no hay datos que no quieras publicar).

## 1 bis. Web en Cloudflare Pages

1. En dash.cloudflare.com → Workers y Pages → Crear → Pages → Conectar con Git, elige este repositorio y la rama `main`.
2. Configuración de compilación: sin framework, **sin comando de compilación** y directorio de salida `/` (la app ya es estática).
3. Cada push a `main` publica la web; cada rama o pull request tiene su propia dirección de vista previa.
4. Las cabeceras de seguridad y de caché están en `_headers`. Si cambias la política de seguridad de index.html o bienvenida.html, cámbiala también allí.
5. Dominio propio: en el proyecto de Pages → Dominios personalizados → añade el dominio (y `www`). Si el dominio está en Cloudflare, los registros DNS se crean solos; si no, añade el registro CNAME que te indique Cloudflare en tu registrador.
6. Con la dirección definitiva, ponla en Supabase (Authentication → URL Configuration: Site URL y Redirect URLs).

Al tener dominio: en index.html y bienvenida.html, cambia `og:image` a la dirección completa (`https://tu-dominio/icons/og.png`) para que la vista previa salga en todas las redes.

Antes o después, en el repositorio del bot: el bot ya no usa Gemini, pero la clave antigua sigue en el historial de git. Anúlala en Google AI Studio.

## 2. Datos de mercado con licencia

Los casos reales y la Operación de la semana usan Yahoo Finance a través de `yfinance`, que no es una API oficial y cuyas condiciones no permiten el uso comercial. Vale para el prototipo gratuito. **Antes de cobrar**, cambia a un proveedor con licencia para mostrar datos en una app.

Qué necesita Rango del proveedor (para comparar ofertas):
- Velas diarias (apertura, máximo, mínimo, cierre y volumen) de acciones de EE. UU., índices y algún ETF europeo.
- Estados financieros trimestrales y anuales: ventas, beneficio operativo, BPA ajustado, flujo de caja operativo, capex, deuda y caja.
- Consenso de BPA y sorpresas trimestrales; rentabilidad de los bonos de EE. UU. a 3 meses y 10 años.
- Derecho a **mostrar** los datos a usuarios finales (redistribución), no solo uso interno.

Candidatos a evaluar: Financial Modeling Prep, EODHD, Polygon (Massive), Twelve Data. Comprueba precio y licencia de visualización vigentes; cambian a menudo.

El cambio de proveedor solo toca `tools/casos.py` y `tools/semana.py` (las funciones que leen de `yf.Ticker`); el formato de `casos.json` y `semana.json` y la app no cambian. La clave del proveedor irá como secreto del workflow, nunca en el código.

## 3. Tiendas de aplicaciones

Orden recomendado:

1. **Dominio y PWA publicada** con HTTPS (GitHub Pages o Cloudflare Pages sirven tal cual: la app no necesita compilación). Es la base de todo lo demás.
2. **Google Play** con Trusted Web Activity (Bubblewrap o PWABuilder). Play pide un AAB, no un APK; las herramientas lo generan. Hay que publicar `/.well-known/assetlinks.json` en el dominio. Cuenta de desarrollador (pago único), política de privacidad, cuestionario de contenido y declaración de funciones financieras. Las cuentas personales nuevas deben hacer antes una prueba cerrada con varios probadores durante dos semanas.
3. **Servidor de cuentas y pagos** (ver `persistencia.md`): necesario para cobrar y para que el progreso no se pierda.
4. **App Store** con Capacitor (Apple no admite TWA). Necesita Apple Developer Program (cuota anual) y un Mac o un servicio de compilación en la nube. Apple rechaza las webs «solo empaquetadas»: ayuda añadir funciones nativas (avisos de racha, vibración). Si hay suscripción digital, pago dentro de la app.

Con cuentas de usuario, las dos tiendas exigen poder borrar la cuenta desde la propia app.

Comprueba requisitos, cuotas y comisiones en las páginas oficiales antes de empezar: cambian a menudo.

## 4. Configuración antes de publicar (`src/config.js`)

- `CONTACTO`: correo que recibe los avisos de «¿Ves un error?» (y la lista de espera si no hay formulario).
- `LISTA_ESPERA`: dirección de un formulario que acepte POST con un campo `email` (Formspree, Tally, Google Forms…) para `bienvenida.html`.
- `MEDICION_URL`: servicio que recibe los eventos anónimos de `src/medicion.js` (por ejemplo, una función propia o Plausible/Umami con eventos personalizados). Es opcional para el usuario y debe figurar en la política de privacidad.

`bienvenida.html` es la página de presentación: publícala en la raíz del dominio (o como `/`) y deja la app en una ruta propia si quieres separarlas; ahora la enlaza con `./`.

## 5. Idiomas

Los textos de la interfaz están en `src/textos.js`: para traducir la interfaz basta otro archivo con las mismas claves. El contenido es más trabajo: unas 550 preguntas fijas, las plantillas de `tools/casos.py` y unas 20 unidades específicas de España (fiscalidad, bróker, CNMV, FOGAIN, SOCIMI) que habría que adaptar por país, no traducir. Recomendación: validar primero en España, después Latinoamérica con módulos fiscales por país, y el inglés si los datos lo justifican.
