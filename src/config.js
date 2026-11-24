// Configuración del despliegue (cámbiala al publicar).
// CONTACTO: correo al que llegan los avisos de «¿Ves un error?». Vacío: el aviso se copia al portapapeles
// para que el usuario lo envíe por donde quiera.
export const CONTACTO='';
// LISTA_ESPERA: dirección de un formulario que acepte envíos POST con un campo «email» (Formspree, Tally,
// un formulario de Google…), para la lista de espera de bienvenida.html. Vacío: se usa CONTACTO o no se muestra.
export const LISTA_ESPERA='';
// MEDICION_URL: dirección que recibe los eventos de uso anónimos (ver src/medicion.js). Vacío: no se mide nada.
// Si la pones, añade su dominio a «connect-src» de la política de seguridad (meta Content-Security-Policy de index.html).
export const MEDICION_URL='';
// SUPABASE_URL y SUPABASE_ANON: proyecto de Supabase para las cuentas y la sincronización (ver docs/persistencia.md
// y docs/supabase.sql). La clave «anon» es pública por diseño; la de servicio no va nunca aquí. Vacías: sin cuentas.
export const SUPABASE_URL='';
export const SUPABASE_ANON='';
// TITULAR: datos del responsable del tratamiento (aviso legal y política de privacidad). Rellenar antes de publicar.
// Si falta alguno, la política muestra «(pendiente de completar)» y `npm test` avisa. Si `correo` está vacío se usa CONTACTO.
export const TITULAR={nombre:'', nif:'', domicilio:'', correo:''};
