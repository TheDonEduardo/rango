// Textos de la interfaz (español de España). El contenido didáctico está en src/content/.
// Para traducir la app: copia este archivo (p. ej. textos.en.js) con las mismas claves y elige cuál importar.
// Los textos con datos son funciones; los plurales se resuelven aquí, no en las vistas.
const pl=(n,uno,varios)=>n===1?uno:varios;

export const t={
  // Comunes
  continuar:'Continuar', volver:'Volver', volverInicio:'Volver al inicio', abrir:'Abrir', formacion:'Es formación, no una recomendación.',

  // Rutas y repasos
  rutas:{basico:'Básico',pasiva:'Pasiva',fundamental:'Fundamental',tecnico:'Técnico'}, repasoUnidad:'Repaso de la unidad',
  // Gráficos
  graficoVelas:'Gráfico de velas', graficoPrecio:'Gráfico de precio', vol:'Vol.', despues:'Después', precio:'Precio', media30:'Media de 30 semanas',

  // Inicio
  racha:n=>`Racha de ${n} ${pl(n,'día','días')}`,
  xpTotal:n=>`${n} XP en total`,
  verProgreso:'Tu progreso y puntos débiles',
  metaDiaria:'Meta diaria', metaHoy:'Meta de hoy',
  ruta:'Ruta',
  bloqueoRuta:'Esta ruta se abre al completar la ruta <b>Básico</b>.',
  irBasicos:'Ir a los básicos', saltarBasicos:'Ya opero: saltar los básicos',
  testNivel:'Test de nivel', testPregunta:'¿Ya sabes de bolsa?',
  testExplica:n=>`Haz el test de nivel: ${n} preguntas, unos 5 minutos. Marcaremos lo que ya dominas y, si aciertas casi todo, se abren las demás rutas.`,
  hacerTest:'Hacer el test', desdeCero:'Empezar desde cero',
  calcTitulo:'Simulador de aportaciones', calcExplica:'Mira cómo crece una cartera aportando cada mes, y cuánto se llevan las comisiones.',
  siguienteLeccion:'Siguiente lección', unidadN:n=>`Unidad ${n}`,
  repasoDia:'Repaso del día', aprendidos:n=>`${n} ${n===1?'aprendido':'aprendidos'}`,
  repasoTitulo:'Repaso espaciado', enRepaso:'En repaso', aprendidosT:'Aprendidos',
  repasoNota:'Un ejercicio fallado vuelve al día siguiente y luego a los 3, 7 y 14 días. Si lo aciertas en todos, queda aprendido.', repasoPendiente:n=>`${n} ${pl(n,'ejercicio que fallaste','ejercicios que fallaste')}`, repasar:'Repasar',
  proximamente:'Próximamente', completada:'Completada', plegar:'Plegar', verLecciones:'Ver lecciones',
  precision:p=>`Precisión ${p} %`, bloqueada:'Bloqueada', nEjercicios:n=>`${n} ejercicios`,
  estadoNodo:{done:'completada',locked:'bloqueada',current:'disponible',open:'disponible'},
  fuenteCasos:(f,d)=>`Casos reales con datos de ${f} a ${d}. Es formación, no una recomendación de inversión.`,
  pie:'Prototipo. El progreso se guarda solo en este navegador.', avisoLegal:'Aviso legal',
  instalar:'Instalar Rango en este dispositivo', instalarIos:'Para instalar Rango en tu iPhone: botón Compartir y «Añadir a pantalla de inicio».',
  desbloquear:'Desbloquear todo', rebloquear:'Volver a bloquear', reiniciar:'Reiniciar progreso', reiniciarConfirma:'Pulsa de nuevo para borrar',

  // Avisos breves
  bloqueadaBasico:'Completa antes la ruta Básico.', bloqueadaAnterior:'Completa antes la lección anterior.',
  planGuardado:'Plan guardado. El sábado que viene verás el resultado.',
  rutasAbiertas:'Rutas Pasiva, Fundamental y Técnico abiertas.', instalada:'Rango instalado.',

  // Guía de la unidad
  guia:'Guía', verGuia:u=>`Guía de la unidad: ${u}`, guiaDe:u=>`Guía · ${u}`, progresoGuia:'Progreso de la guía',
  saltar:'Saltar', saltarGuia:'Saltar la guía', cerrarGuia:'Cerrar la guía', cerrar:'Cerrar', ejemplo:'Ejemplo',
  anterior:'Anterior', siguiente:'Siguiente', empezarLeccion:'Empezar la lección', volverLeccion:'Volver a la lección',
  repasarTeoria:'Repasar la teoría',
  glosario:'Glosario', glosarioTitulo:'Glosario', glosarioBuscar:'Buscar un término', glosarioNada:'No hay ningún término con esa búsqueda.', cerrarDef:'Cerrar la definición', verGlosario:'Ver todo el glosario',
  verError:'¿Ves un error?', reporteAsunto:id=>`Error en Rango: ${id}`,
  reporteCuerpo:(id,q,r)=>`Ejercicio o tarjeta: ${id}\n${q}\n${r?`Respuesta de la app: ${r}\n`:''}\nQué está mal:\n`,
  reporteCopiado:'Aviso copiado: pégalo en un correo o mensaje a quien mantiene Rango.', reporteId:id=>`Anota este código para avisar del error: ${id}`,

  // Lección
  salirLeccion:'Salir de la lección', progresoLeccion:'Progreso de la lección', vidas:n=>`${n} vidas`,
  casoReal:c=>`Caso real: ${c} · `, comprobar:'Comprobar', correcto:'Correcto', incorrecto:'Incorrecto', respuesta:'Respuesta',
  tipos:{choice:'Elige una respuesta',num:'Escribe el resultado',tap:'Toca una vela del gráfico',level:'Toca una línea del gráfico',
    order:'Ordena los pasos',match:'Empareja cada uno con su descripción',plan:'Arrastra las líneas del gráfico',slide:'Mueve el deslizador',zone:'Marca la zona: arrastra el techo y el suelo'},
  tuRespuesta:'Tu respuesta', tusParejas:'Tus parejas', tuOrden:'Tu orden', tocaDescripcion:'Toca su descripción', quitar:x=>`Quitar: ${x}`,
  ordenCorrecto:'Orden correcto:', parejasCorrectas:'Parejas correctas:', vela:n=>`Vela ${n}`, nivel:n=>`Nivel ${n}`,
  bajar:x=>`Bajar ${x}`, subir:x=>`Subir ${x}`, valorCorrecto:(l,v)=>`${l} correcto: ${v}`,

  // Resultados
  leccionCompletada:'Lección completada', repasoCompletado:'Repaso completado', xpGanados:'XP ganados', precisionM:'Precisión',
  diasRacha:n=>pl(n,'día de racha','días de racha'),
  notaDebiles:'Los que has acertado salen de tus puntos débiles; los que has fallado siguen en la lista y vuelven mañana al repaso.',
  notaRepaso:'Los que has acertado volverán dentro de unos días; los que has fallado, mañana.',
  notaVela:acc=>`El cuerpo de tu vela es proporcional a tu precisión. ${acc===1?'Vela llena: sin un solo fallo.':'Repite la lección para llenarla.'}`,
  testCompletado:'Test completado', aciertos:(a,n)=>`${a} de ${n} aciertos`, yaDominas:'Ya dominas',
  testAbre:'Pasiva, Fundamental y Técnico quedan abiertas. Puedes volver a los básicos cuando quieras.',
  testDomina:'Las unidades que dominas quedan marcadas como completadas: sigue por la primera pendiente de Básico.',
  testNada:'Empieza por Básico: en pocas lecciones tendrás la base para el resto.',
  sinVidas:'Sin vidas', sinVidasExplica:'Has agotado los 3 fallos de esta lección.',
  sinVidasNota:'Repasa las explicaciones y vuelve a intentarlo. Las preguntas se barajan de nuevo.', reintentar:'Reintentar lección',

  // Aviso legal
  legalPrimero:'Antes de empezar', legalEntendido:'Entendido, empezar',
  legalTexto:[
    'Rango es una herramienta de formación. Nada de lo que ves es asesoramiento financiero ni una recomendación de comprar o vender ningún valor.',
    'Los casos con empresas reales usan datos públicos de Yahoo Finance, con su fecha. Pueden contener errores o estar desactualizados, y que una empresa aparezca no implica ninguna opinión sobre ella.',
    'Invertir en bolsa conlleva riesgo de perder parte o todo el capital. Las rentabilidades pasadas no garantizan las futuras.',
    'La información fiscal es general y simplificada: las normas cambian y dependen de tu situación. Consulta con un profesional antes de decidir.',
    'Las decisiones de inversión son tuyas y bajo tu responsabilidad.',
  ],

  // Operación de la semana
  simTitulo:'Operación de la semana', simResTitulo:'Resultado de la semana pasada',
  entrada:'Entrada', stop:'Stop', objetivo:'Objetivo',
  simOrden:'Coloca el stop por debajo de la entrada y el objetivo por encima.',
  simRuptura:c=>`La entrada es una compra en ruptura: ponla por encima del último cierre (${c}).`,
  riesgoAccion:'Riesgo por acción', benefRiesgo:'Beneficio/riesgo',
  historial:(s,n,p,tot)=>`Tu historial: ${s} semanas, ${n} ${pl(n,'operación','operaciones')} con entrada, ${p} en positivo. Total: ${tot}`,
  semanaN:(a,w)=>`${a} · semana ${w}`, sinEntrada:'sin entrada',
  semanaPasada:n=>`Semana pasada, ${n}: `, verResultado:'Ver resultado',
  planGuardadoCard:n=>`Tu plan para ${n} está guardado. El resultado, el próximo sábado.`,
  montaPlan:(n,tk)=>`Monta tu operación sobre el gráfico real de ${n} (${tk}).`, verCambiar:'Ver o cambiar', empezar:'Empezar',
  simAlt:n=>`Gráfico diario de ${n} con las líneas de tu plan`, simResAlt:n=>`Gráfico diario de ${n} con tu plan y las sesiones posteriores`,
  simIntro:'Plan de compra en ruptura: coloca la entrada por encima del último cierre, el stop y el objetivo. El sábado que viene verás qué habría pasado con las velas reales.',
  simFuente:(f,d,c)=>`Velas diarias de ${f} hasta el ${d}. Último cierre: ${c}. Es formación, no una recomendación.`,
  guardarCambios:'Guardar cambios', guardarPlan:'Guardar mi plan',
  sesionN:i=>`la sesión ${i}`,
  resSinEntrada:e=>`El precio no llegó a tu entrada de ${e}: la orden no se ejecutó. Ni ganas ni pierdes.`,
  resStop:(f,d1,d2,x)=>`Entraste a ${f} en ${d1} y saltó el stop en ${d2}, a ${x}.`,
  resObjetivo:(f,d1,d2,x)=>`Entraste a ${f} en ${d1} y alcanzaste el objetivo en ${d2}, a ${x}.`,
  resAbierta:(f,d1,x)=>`Entraste a ${f} en ${d1} y al último cierre (${x}) la operación seguía abierta.`,
  resNota:(n,d)=>`${n} sesiones reales después del ${d}. Si un día tocaba stop y objetivo, se cuenta el stop; con hueco, se ejecuta a la apertura.`,

  // Simulador de aportaciones
  calcPregunta:'¿Cuánto tendrías?',
  calcCtrl:{inicial:'Capital inicial',mensual:'Aportación mensual',anos:'Años',rent:'Rentabilidad anual',ter:'Comisión anual',ter2:'Comisión de la otra cartera',caida:'Tamaño de la caída',anoCaida:'Año de la caída'},
  simularCaida:'Simular una caída de la bolsa',
  caidaRes:(c,a,v,d)=>`Con una caída del ${c} % en el año ${a} acabarías con <b>${v} €</b>: ${d} € menos que sin ella. Si sigues aportando, durante la caída compras más barato.`,
  anos:n=>`${n} ${pl(n,'año','años')}`, mil:x=>`${x} mil`, anoN:n=>`Año ${n}`,
  calcAlt:'Valor de la cartera y dinero aportado año a año', comparar:'Comparar con otra comisión',
  comparacion:(t2,v,dif,mas,t1)=>`Con un ${t2} % de comisión tendrías <b>${v} €</b>: ${dif} € ${mas?'más':'menos'} que con un ${t1} %.`,
  valorFinal:'Valor final', aportado:'Aportado', rendimientos:'Rendimientos', comisiones:'Se llevan las comisiones',
  carteraCon:x=>`Cartera con un ${x} %`, dineroAportado:'Dinero aportado',
  calcNota:'Supone una rentabilidad constante cada año, algo que nunca ocurre: habrá años de fuertes caídas. Es una herramienta de formación, no una previsión ni una recomendación.',

  // Estadísticas
  estadisticas:'Estadísticas', tuProgreso:'Tu progreso', xp:'XP', rachaM:'Racha', dias:n=>`${n} ${pl(n,'día','días')}`,
  aciertoPrimera:'Acierto a la primera', tiempoEstudio:'Tiempo de estudio',
  tiempo:m=>m<60?`${Math.round(m)} min`:`${Math.floor(m/60)} h ${Math.round(m%60)} min`,
  leccionesRuta:(h,n,acc)=>`${h} / ${n} lecciones${acc==null?'':` · ${acc} % de precisión`}`, leccionesDe:r=>`Lecciones de ${r}`,
  puntosDebiles:'Tus puntos débiles', debilesTitulo:'Puntos débiles', fallado:n=>`fallado ${n} ${pl(n,'vez','veces')}`,
  practicar:n=>`Practicar ${n} ${pl(n,'ejercicio','ejercicios')}`,
  sinDebiles:'Aún no hay ejercicios pendientes: los que falles aparecerán aquí hasta que los aciertes a la primera.',
  copiaTitulo:'Copia de seguridad', copiaNota:'Tu progreso se guarda solo en este navegador. Descarga una copia para no perderlo o para pasarlo a otro dispositivo.',
  copiaGuardar:'Descargar copia', copiaRecuperar:'Recuperar copia', copiaSustituir:'Sustituir mi progreso', cancelar:'Cancelar',
  copiaResumen:(f,xp,l)=>`Copia del ${f}: ${xp} XP y ${l} lecciones completadas. Sustituirá tu progreso actual.`,
  copiaMala:'Ese archivo no es una copia de Rango.', copiaHecha:'Progreso recuperado.', copiaDescargada:'Copia descargada.',
  statsNota:'Estadísticas guardadas solo en este dispositivo. Cuentan desde que se añadieron, no desde tu primera lección.',
};
