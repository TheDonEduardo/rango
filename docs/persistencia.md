# Persistencia real: opciones y recomendación

Estado actual: todo el progreso (XP, racha, lecciones hechas, repaso espaciado) vive en `localStorage` (`rango.v1`). Se pierde al borrar los datos del navegador o cambiar de dispositivo, y no permite avisos de racha.

## Qué necesita Rango

- **Cuentas** sencillas: enlace mágico por correo y, opcionalmente, Google o Apple.
- **Guardar un objeto pequeño por usuario** (el estado `S`, unos pocos KB) y sincronizarlo entre dispositivos.
- **Seguir funcionando sin conexión** (es una PWA): localStorage como caché y sincronización cuando haya red.
- **Avisos de racha** (web push): requieren un servidor que envíe la notificación a la hora adecuada.
- **RGPD**: datos alojados en la UE, política de privacidad y borrado de cuenta.

El volumen es mínimo: con 10.000 usuarios activos, cada uno sincronizando unas pocas veces al día, hablamos de decenas de miles de escrituras diarias y unos pocos cientos de MB.

## Comparativa

Precios de 2026 según fuentes de terceros (ver al final). **Confírmalos en la página oficial antes de contratar.**

| | Supabase | Firebase | Cloudflare Workers + D1 | Backend propio (VPS + PocketBase) |
|---|---|---|---|---|
| Base de datos | PostgreSQL | Firestore (documentos) | SQLite gestionado | SQLite |
| Cuentas incluidas | Sí (correo, enlace mágico, Google, Apple) | Sí (correo, Google, Apple) | No: hay que montarlas o usar otro servicio | Sí (PocketBase las trae) |
| Plan gratuito | 500 MB de base de datos, 50.000 usuarios activos/mes; **el proyecto se pausa tras una semana sin actividad** | Firestore 1 GiB, 50.000 lecturas y 20.000 escrituras al día; al agotar la cuota deja de responder hasta el día siguiente | 5 GB, 5 M filas leídas y 100.000 escritas al día | No hay: pagas el servidor |
| Plan de pago | Pro: 25 $/mes | Blaze: pago por uso (céntimos a esta escala) | Workers Paid: ~5 $/mes | VPS: ~5 €/mes |
| Avisos de racha | Edge Functions + tareas programadas (pg_cron) con web push | Cloud Messaging (gratis) + Cloud Functions programadas (requiere Blaze) | Workers con cron | Tarea programada en el servidor |
| Alojamiento en la UE | Sí (región Frankfurt, entre otras) | Sí (ubicaciones europeas) | Sí, con restricción de jurisdicción | Donde elijas |
| Código en la app | Cliente JS oficial o llamadas REST; seguridad con políticas por fila | SDK de Firebase (pesado) | Todo a medida | SDK pequeño |
| Dependencia del proveedor | Baja: es Postgres estándar, exportable | Alta: modelo y SDK propios | Media | Ninguna |
| Mantenimiento | Bajo | Bajo | Medio (más código propio) | Alto (copias, actualizaciones, seguridad) |
| Esfuerzo de integración | Bajo | Bajo-medio | Alto | Medio |

## Recomendación: Supabase

1. **Encaja con la app tal como es**: front estático sin servidor propio; las políticas de seguridad por fila permiten que cada usuario lea y escriba solo su fila directamente desde el navegador.
2. **Cuentas resueltas** con enlace mágico, sin contraseñas que gestionar.
3. **Datos en la UE** (Frankfurt) para el RGPD.
4. **Sin atarse**: es PostgreSQL; si algún día conviene, se exporta y se lleva a cualquier sitio.
5. **Coste**: gratis para probar con un grupo cerrado; 25 $/mes en cuanto haya usuarios reales. El plan Pro hace falta antes del lanzamiento porque el gratuito **pausa el proyecto tras una semana sin actividad**.

Firebase sería la alternativa si los avisos push fueran lo prioritario (Cloud Messaging es gratis y muy probado), a cambio de más dependencia de Google y un SDK más pesado.

## Stack: no hace falta migrar

La persistencia no exige cambiar a Vite + TypeScript. Se añade un módulo `src/sync.js` (unas 200 líneas) y la app sigue en JavaScript sin dependencias de compilación. Migrar el stack es una decisión aparte, para cuando el código crezca.

## Diseño de la sincronización (propuesta)

- **Tabla** `progreso (user_id, estado jsonb, actualizado timestamptz)`, una fila por usuario, con política «solo el propio usuario».
- **Sin conexión primero**: la app sigue escribiendo en localStorage; al haber red, sube el estado con unos segundos de retraso para agrupar cambios.
- **Fusión** al entrar desde otro dispositivo, campo a campo para no perder nada:
  - `done`: unión, con la mejor precisión de cada lección.
  - `xp`: el mayor de los dos.
  - `srs`: por ejercicio, el registro con la fecha de repaso más reciente.
  - Racha y meta diaria: la del último día con actividad.
- **Cuenta opcional**: se puede usar sin registrarse, como ahora; al crear cuenta, el progreso local se sube.
- **Borrado de cuenta** desde la app (RGPD).

## Qué hace falta de ti

1. Elegir proveedor (recomendado: Supabase).
2. Crear el proyecto en la región de Frankfurt y darme la URL del proyecto y la clave pública («anon key»). La clave pública está pensada para ir en el navegador; la de servicio nunca debe compartirse ni subirse al repo.
3. Decidir el nombre y el remitente de los correos de acceso.
4. Una política de privacidad (la redacto como borrador; conviene que la revise un profesional, igual que el aviso legal).

## Fuentes

- Supabase: [Jetadmin, guía de precios 2026](https://www.jetadmin.io/blog/supabase-pricing-2026-guide-to-plans-limits-and-real-world-costs/), [MakerKit](https://makerkit.dev/blog/saas/supabase-pricing), [Costbench, plan gratuito](https://costbench.com/software/database-as-service/supabase/free-plan/). Oficial: supabase.com/pricing.
- Firebase: [Activepieces, precios 2026](https://www.activepieces.com/blog/firebase-pricing-2026-plans-costs-and-free-limits.md), [Magora](https://magora-systems.com/firebase-pricing/), [DEV Community, Spark frente a Blaze](https://dev.to/androve2k/spark-vs-blaze-the-firebase-pricing-guide-i-wish-id-read-sooner-onb). Oficial: firebase.google.com/pricing.
- Cloudflare: [documentación de precios de D1](https://9a51ac8b.previews.developers.cloudflare.com/d1/platform/pricing/index.md), [Cloud Pricing Tracker](https://cloud-pricing-tracker.pages.dev/services), [Activepieces, precios de Workers](https://www.activepieces.com/blog/cloudflare-workers-pricing-2026-free-vs-paid-plans.md). Oficial: developers.cloudflare.com/d1/platform/pricing.
