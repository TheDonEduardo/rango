# Publicar Rango: repositorio propio, datos y tiendas

Pasos que dependen de decisiones o cuentas del propietario. El código ya está preparado para cada uno.

## 1. Repositorio propio

Rango vive en `rango/` dentro del repositorio del bot. Para separarlo:

1. Crea un repositorio nuevo en GitHub (por ejemplo, `rango`), privado.
2. Copia el contenido de `rango/` a la raíz del nuevo repositorio. Para conservar el historial:
   `git subtree split --prefix=rango -b rango-solo` en este repositorio y sube esa rama al nuevo como `main`.
3. Mueve los dos workflows a `.github/workflows/` del nuevo repositorio y quita el prefijo `rango/`:
   - `rango_test.yml`: borra `defaults.run.working-directory` y los filtros `paths`.
   - `rango_casos.yml`: cambia `rango/tools/...` por `tools/...` y `rango/src/content/...` por `src/content/...`; quita `working-directory: rango`.
4. Valores de los casos reales: sin el bot al lado, crea `tools/tickers.txt` (un ticker por línea) o define la variable `RANGO_TICKERS` en el workflow. `tools/casos.py` y `tools/semana.py` los leen en ese orden antes de buscar `../portfolio_manager.py`.
5. Nada más depende del bot.

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

Los textos de la interfaz están en `src/textos.js`: para traducir la interfaz basta otro archivo con las mismas claves. El contenido es más trabajo: unas 540 preguntas fijas, las plantillas de `tools/casos.py` y unas 20 unidades específicas de España (fiscalidad, bróker, CNMV, FOGAIN, SOCIMI) que habría que adaptar por país, no traducir. Recomendación: validar primero en España, después Latinoamérica con módulos fiscales por país, y el inglés si los datos lo justifican.
