// Registro de tipos de ejercicio. Cada tipo es un objeto con:
//   (la instrucción, «Elige una respuesta», está en textos.js → t.tipos)
//   html(ex, run)        controles bajo el enunciado (opcional si el tipo se responde sobre el gráfico)
//   chart(ex, run)       estado para dibujar el gráfico interactivo (tap, level, plan) · after(ex, run): HTML bajo el gráfico
//   ready(ex, run)       si se puede pulsar «Comprobar» · correct(ex, run): si la respuesta es correcta
//   answer(ex)           respuesta en texto · answerHTML(ex): respuesta con formato (opcional)
//   act: {nombre(b, run, ex)}  acciones de los botones data-act del tipo · input(e, run, ex) · enter(el, run) · svg(el, run)
//   plan(ex, run)        contexto de líneas arrastrables (drag.js) · focus(): foco al dibujar
// Para añadir un tipo: créalo aquí, añádelo a TIPOS y a la validación de test/smoke.mjs.
import choice from './choice.js';
import num from './num.js';
import {tap,level} from './velas.js';
import {order,match} from './ordenar.js';
import plan from './plan.js';
import slide from './slide.js';
import zone from './zona.js';
export const TIPOS={choice,num,tap,level,order,match,plan,slide,zone};
