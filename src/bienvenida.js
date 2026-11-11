// Página de presentación (bienvenida.html): activa la lista de espera según config.js.
// Lista de espera: con LISTA_ESPERA (dirección de un formulario que acepte POST) se usa el formulario;
// sin ella pero con CONTACTO, un enlace de correo; sin ninguna, la sección no se muestra.
import {LISTA_ESPERA, CONTACTO} from './config.js';
const sec = document.getElementById('espera');
if (LISTA_ESPERA) {
  document.getElementById('espera-form').action = LISTA_ESPERA; sec.hidden = false;
} else if (CONTACTO) {
  document.getElementById('espera-form').hidden = true;
  const a = document.getElementById('espera-mailto');
  a.href = `mailto:${CONTACTO}?subject=${encodeURIComponent('Lista de espera de Rango')}`;
  document.getElementById('espera-correo').hidden = false; sec.hidden = false;
}
