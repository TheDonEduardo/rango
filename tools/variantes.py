"""Variantes numéricas de ejercicios de cálculo: el mismo ejercicio con otras cifras.

El examen de la unidad elige al azar entre el ejercicio original y sus variantes, para que no se apruebe de memoria.
Cada entrada de V es: id del ejercicio -> (función(parámetros) -> (enunciado, respuesta, explicación), [juegos de parámetros]).
La respuesta y las cifras de la explicación se calculan aquí, nunca a mano.

Uso:  python -I tools/variantes.py     (escribe `variantes` en los archivos de unidad y empaqueta)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from contenido import indice, leer, guardar, empaquetar  # noqa: E402


def e(v, d=2):
    """Número en formato español: 1234.5 -> 1.234,50; sin ceros de más si d=None."""
    if d is None:
        d = 0 if float(v).is_integer() else (1 if float(v * 10).is_integer() else 2)
    return f"{v:,.{d}f}".replace(",", "X").replace(".", ",").replace("X", ".")


n = lambda v: e(v, None)   # número «natural»: los decimales que hagan falta
r1 = lambda v: round(v + 1e-9, 1)
r2 = lambda v: round(v + 1e-9, 2)

V = {
 # ---- Básico
 'ba1-2': (lambda a, p: (f"Una empresa tiene {a} millones de acciones y cada una cotiza a {e(p)} €. ¿Cuántos millones de € vale en bolsa?", a * p,
                         f"{a} millones × {e(p)} € = {n(a * p)} millones de €. Es la capitalización: lo que el mercado paga hoy por toda la empresa."),
           [(40, 8.0), (25, 30.0)]),
 'bc2-2': (lambda q, en, s: (f"Compras {q} acciones a {e(en)} € con el stop en {e(s)} €. Si salta, ¿cuánto pierdes?", r2((en - s) * q),
                             f"({e(en)} − {e(s)}) × {q} = {n(r2((en - s) * q))} €. Conocer esa cifra antes de entrar es lo que te permite elegir el tamaño."),
           [(40, 15.0, 13.5), (80, 30.0, 28.0)]),
 'bd1-2': (lambda a, b, c: (f"Un índice ponderado por capitalización tiene tres empresas: A vale {a} M€, B {b} M€ y C {c} M€. ¿Cuánto pesa A en el índice?", a / (a + b + c) * 100,
                            f"{a} ÷ ({a} + {b} + {c}) = {a} ÷ {e(a + b + c, 0)} = {n(a / (a + b + c) * 100)} %. En los índices ponderados por capitalización, como el S&P 500, las mayores empresas mueven buena parte del índice."),
           [(450, 350, 200), (800, 150, 50)]),
 'be1-1': (lambda q, c, v, g: (f"Compras {q} acciones a {e(c)} € y las vendes a {e(v)} €. Entre compra y venta pagaste {g} € de comisiones. ¿Qué ganancia declaras?", q * v - q * c - g,
                               f"Venta {e(q * v, 0)} € − compra {e(q * c, 0)} € − {g} € de gastos = {n(q * v - q * c - g)} €. Las comisiones de compra y venta reducen la ganancia que declaras."),
           [(50, 30.0, 38.0, 12), (200, 10.0, 12.5, 20)]),
 'bf1-2': (lambda imp, pct, mn: (f"El bróker cobra un {n(pct)} % por operación, con un mínimo de {mn} €. Compras {e(imp, 0)} € de acciones. ¿Cuánto pagas de comisión?", max(imp * pct / 100, mn),
                                 (f"{e(imp, 0)} × {n(pct)} % = {n(imp * pct / 100)} €, pero el mínimo es {mn} €: pagas {mn} €, un {n(r2(mn / imp * 100))} % de la compra. Con órdenes pequeñas manda el mínimo."
                                  if imp * pct / 100 < mn else
                                  f"{e(imp, 0)} × {n(pct)} % = {n(imp * pct / 100)} €, más que el mínimo de {mn} €: pagas {n(imp * pct / 100)} €. El mínimo solo manda en las órdenes pequeñas.")),
           [(1500, 0.1, 3), (8000, 0.1, 4)]),
 'bi1-1': (lambda imp, c: (f"Inviertes {e(imp, 0)} € y pagas {e(c)} € de comisión al comprar y otros {e(c)} € al vender. ¿Cuánto tiene que subir solo para cubrir las comisiones? Redondea a 2 decimales.", r2(2 * c / imp * 100),
                           f"({e(c)} + {e(c)}) ÷ {e(imp, 0)} = {e(r2(2 * c / imp * 100))} %. Con importes pequeños, las comisiones fijas se comen buena parte de la ganancia: busca un bróker barato o aporta menos veces y más cantidad."),
           [(500, 4.95), (2500, 7.5)]),
 'bk1-1': (lambda cap, i, a: (f"Depositas {e(cap, 0)} € al {i} % de interés simple durante {a} años. ¿Cuántos euros de intereses cobras?", cap * i / 100 * a,
                              f"{e(cap, 0)} × {i} % = {n(cap * i / 100)} € cada año; {n(cap * i / 100)} × {a} = {n(cap * i / 100 * a)} €."),
           [(2000, 4, 2), (3000, 3, 5)]),
 'bl1-1': (lambda ing: (f"Ingresas {e(ing, 0)} € al mes. Con la regla 50/30/20, ¿cuánto destinas al ahorro?", ing * 0.2,
                        f"El 20 % de {e(ing, 0)} € son {n(ing * 0.2)} € al mes."),
           [(2100,), (1350,)]),
 'bm1-2': (lambda d, i: (f"Debes {e(d, 0)} € en una tarjeta al {i} % anual. ¿Cuántos euros de intereses pagas en un año si no devuelves nada?", d * i / 100,
                         f"{e(d, 0)} × {i} % = {n(d * i / 100)} € al año."),
           [(1500, 24), (3000, 18)]),
 'bn1-2': (lambda imp, vl: (f"Inviertes {e(imp, 0)} € en un fondo con un valor liquidativo de {n(vl)} €. ¿Cuántas participaciones recibes?", imp / vl,
                            f"{e(imp, 0)} / {n(vl)} = {n(imp / vl)} participaciones."),
           [(2400, 12), (900, 22.5)]),
 'bp1-2': (lambda idx, c: (f"El IBEX está en {e(idx, 0)} puntos y cae un {n(c)} %. ¿Cuántos puntos pierde?", idx * c / 100,
                           f"{e(idx, 0)} × {n(c)} % = {n(idx * c / 100)} puntos."),
           [(12000, 0.8), (15000, 2.4)]),
 'bh1-1': (lambda p: (f"Compras una Letra del Tesoro a 12 meses por {p} € y al vencimiento recibes 1.000 €. ¿Qué rentabilidad obtienes? Redondea a 2 decimales.", r2((1000 - p) / p * 100),
                      f"(1.000 − {p}) ÷ {p} = {1000 - p} ÷ {p} = {e(r2((1000 - p) / p * 100))} %. Las letras no pagan cupón: se compran por debajo de su nominal y la ganancia es la diferencia."),
           [(980,), (965,)]),
 # ---- Pasiva
 'pr1-1': (lambda a, ca, sb: (f"Tu cartera es {a} % acciones y {100 - a} % bonos. Las acciones caen un {ca} % y los bonos suben un {sb} %. ¿Cuánto cae la cartera completa? Redondea a 1 decimal.", r1(a * ca / 100 - (100 - a) * sb / 100),
                              f"{e(a / 100)} × (−{ca} %) + {e((100 - a) / 100)} × {sb} % = −{n(a * ca / 100)} % + {n((100 - a) * sb / 100)} % = −{e(r1(a * ca / 100 - (100 - a) * sb / 100), 1)} %. Los bonos amortiguan, pero con un {a} % en acciones la caída sigue siendo fuerte."),
           [(80, 35, 4), (50, 40, 6)]),
 'rb1-1': (lambda cap, a, s: (f"Empiezas con {e(cap, 0)} € al {a}/{100 - a}. Las acciones suben un {s} % y los bonos no se mueven. ¿Qué peso tienen ahora las acciones? Redondea a 1 decimal.",
                              r1(cap * a / 100 * (1 + s / 100) / (cap * a / 100 * (1 + s / 100) + cap * (100 - a) / 100) * 100),
                              f"Acciones: {e(cap * a / 100, 0)} × {e(1 + s / 100)} = {e(cap * a / 100 * (1 + s / 100), 0)} €; total {e(cap * a / 100 * (1 + s / 100), 0)} + {e(cap * (100 - a) / 100, 0)} = {e(cap * a / 100 * (1 + s / 100) + cap * (100 - a) / 100, 0)} €. "
                              f"{e(cap * a / 100 * (1 + s / 100), 0)} ÷ {e(cap * a / 100 * (1 + s / 100) + cap * (100 - a) / 100, 0)} = {e(r1(cap * a / 100 * (1 + s / 100) / (cap * a / 100 * (1 + s / 100) + cap * (100 - a) / 100) * 100), 1)} %: la cartera es ahora más arriesgada de lo que elegiste."),
           [(20000, 50, 40), (10000, 70, 20)]),
 'cm1-2': (lambda cap: (f"En la cartera permanente con {e(cap, 0)} €, ¿cuántos euros van a oro?", cap / 4,
                        f"Son cuatro partes iguales: {e(cap, 0)} × 25 % = {n(cap / 4)} € en acciones, en bonos largos, en oro y en liquidez."),
           [(2800,), (1600,)]),
 'rt1-1': (lambda g: (f"Quieres retirar {e(g, 0)} € al año. Con la regla del 4 %, ¿cuántos miles de euros necesitas tener invertidos?", g / 0.04 / 1000,
                      f"{e(g, 0)} ÷ 0,04 = {e(g / 0.04, 0)} €, es decir, 25 veces tu gasto anual."),
           [(30000,), (16000,)]),
 'pd1-2': (lambda i, f: (f"El índice sube un {e(i)} % en el año y el fondo, un {e(f)} %. ¿Cuál es la diferencia de seguimiento, en puntos?", r2(i - f),
                         f"{e(i)} − {e(f)} = {e(r2(i - f))} puntos. Incluye la comisión y otros costes; a veces el préstamo de valores la compensa en parte."),
           [(8.0, 7.82), (12.5, 12.1)]),
 'ix1-2': (lambda m, c: (f"El mercado sube un {n(m)} % y el fondo activo medio lo iguala antes de costes, pero cobra un {n(c)} % de comisión. ¿Qué rentabilidad neta obtiene su partícipe?", r2(m - c),
                         f"{n(m)} − {n(c)} = {n(r2(m - c))} %. Tras costes, el gestor activo medio queda por detrás del índice justo en lo que cobra."),
           [(6, 1.8), (10, 1.25)]),
 'ob1-3': (lambda m, a: (f"Quieres reunir {e(m, 0)} € en {a} años sin contar rentabilidad. ¿Cuánto debes ahorrar al mes?", m / (a * 12),
                         f"{e(m, 0)} / {a * 12} meses = {n(m / (a * 12))} € al mes."),
           [(18000, 4), (21600, 3)]),
 'in1-1': (lambda rr, i: (f"Tu cartera rinde un {n(rr)} % y la inflación es del {n(i)} %. ¿Cuál es la rentabilidad real aproximada?", r2(rr - i),
                          f"{n(rr)} − {n(i)} = {n(r2(rr - i))} %: es lo que crece de verdad tu poder de compra."),
           [(5, 2), (6.5, 4)]),
 'io1-2': (lambda p, d: (f"Una SOCIMI cotiza a {n(p)} € y reparte {e(d)} € de dividendo anual. ¿Cuál es su rentabilidad por dividendo?", r2(d / p * 100),
                         f"{e(d)} / {n(p)} = {e(d / p, 3).rstrip('0')}: un {n(r2(d / p * 100))} %."),
           [(12, 0.72), (25, 1.0)]),
 'dv1-1': (lambda s, c: (f"Un ETF de EE. UU. sube un {s} % en dólares, pero el dólar cae un {c} % frente al euro. ¿Cuánto ganas en euros?", r2(((1 + s / 100) * (1 - c / 100) - 1) * 100),
                         f"{e(1 + s / 100)} × {e(1 - c / 100)} = {e((1 + s / 100) * (1 - c / 100), 3)}: un {n(r2(((1 + s / 100) * (1 - c / 100) - 1) * 100))} % en euros."),
           [(20, 10), (15, 4)]),
 'rv1-3': (lambda a, b, obj: (f"Tu reparto objetivo es {obj}/{100 - obj} y hoy tienes {e(a, 0)} € en acciones y {e(b, 0)} € en bonos. ¿Cuántos puntos se ha desviado la parte de acciones?", r1(a / (a + b) * 100 - obj),
                              f"{e(a, 0)} / {e(a + b, 0)} = {n(r1(a / (a + b) * 100))} %: {n(r1(a / (a + b) * 100))} − {obj} = {n(r1(a / (a + b) * 100 - obj))} puntos por encima."),
           [(66000, 34000, 60), (45000, 5000, 80)]),
 # ---- Técnico
 'v2-4': (lambda mx, mn: (f"Un martillo tiene máximo {e(mx)} y mínimo {e(mn)}. Entras a {e(mx + 0.1)} (máximo + 0,10) con stop en {e(mn - 0.1)} (mínimo − 0,10). ¿Riesgo por acción?", r2(mx - mn + 0.2),
                          f"{e(mx + 0.1)} − {e(mn - 0.1)} = {e(r2(mx - mn + 0.2))} € por acción. Esa distancia es 1R y fija el tamaño de la posición y el objetivo."),
          [(25.4, 23.1), (61.9, 58.6)]),
 't2-2': (lambda mx: (f"Máximo de 52 semanas: {mx} €. El precio debe estar a menos del 25 % del máximo. ¿Precio mínimo aceptable?", mx * 0.75,
                      f"{mx} × (1 − 0,25) = {n(mx * 0.75)} €. Por debajo, el valor está demasiado lejos de sus máximos."),
          [(120,), (48,)]),
 'r1-2': (lambda en, atr, k: (f"Entrada a {e(en)} €. ATR(14) = {e(atr)} €. Stop a {n(k)}×ATR. ¿En qué precio colocas el stop?", r2(en - k * atr),
                              f"{e(en)} − {n(k)} × {e(atr)} = {e(r2(en - k * atr))} €. Riesgo por acción: {e(r2(k * atr))} €."),
          [(52.0, 2.4, 2), (18.5, 0.9, 1.5)]),
 'b1-1': (lambda c, a: (f"Cierre previo a resultados: {e(c)} €. Al día siguiente abre a {e(a)} €. ¿De qué tamaño es el gap?", r2((a - c) / c * 100),
                        f"({e(a)} − {e(c)}) ÷ {e(c)} = {e(r2(a - c))} ÷ {e(c)} = {n(r2((a - c) / c * 100))} %. El gap se mide siempre desde el cierre previo."),
          [(25.0, 27.0), (60.0, 66.0)]),
 'w1-4': (lambda lo, hi: (f"Rango de acumulación entre {e(lo)} € y {e(hi)} €. Proyecta la altura del rango sobre la resistencia. ¿Objetivo mínimo?", r2(2 * hi - lo),
                          f"Altura = {e(hi)} − {e(lo)} = {e(r2(hi - lo))} €; objetivo = {e(hi)} + {e(r2(hi - lo))} = {e(r2(2 * hi - lo))} €."),
          [(31.5, 35.0), (12.4, 14.0)]),
 'vcp1-2': (lambda mx, mn: (f"Primera contracción de la base: del máximo de {e(mx)} € al mínimo de {e(mn)} €. ¿Qué profundidad tiene?", r1((mx - mn) / mx * 100),
                            f"({e(mx)} − {e(mn)}) ÷ {e(mx)} = {n(r2(mx - mn))} ÷ {n(mx)} = {n(r1((mx - mn) / mx * 100))} %. Se mide del máximo de cada contracción a su mínimo."),
            [(80.0, 64.0), (50.0, 41.0)]),
 'c1-1': (lambda k, rr: (f"Tienes {k} posiciones abiertas y cada una arriesga un {n(rr)} % del capital hasta su stop. Si saltan todos los stops, ¿qué porcentaje del capital pierdes?", r2(k * rr),
                         f"{k} × {n(rr)} % = {n(r2(k * rr))} %. Es tu riesgo abierto: lo que cuesta el peor día si todo sale mal a la vez."),
          [(8, 0.5), (4, 1.5)]),
 'k1-1': (lambda q, v, c: (f"Vendes en corto {q} acciones a {e(v)} € y las recompras a {e(c)} €. ¿Cuánto ganas?", r2((v - c) * q),
                           f"({e(v)} − {e(c)}) × {q} = {n(r2((v - c) * q))} €. En un corto vendes primero, con acciones prestadas, y ganas si recompras más barato."),
          [(200, 30.0, 27.5), (50, 80.0, 71.0)]),
 'm1-4': (lambda a, h: (f"El índice cerró ayer en {e(a, 0)} puntos y hoy cierra en {e(h, 0)}, con más volumen que ayer. ¿Cuánto ha caído?", r2((a - h) / a * 100),
                        f"({e(a, 0)} − {e(h, 0)}) ÷ {e(a, 0)} = {n(r2((a - h) / a * 100))} %. Supera el 0,2 % y con más volumen, así que cuenta como día de distribución."),
          [(6000, 5970), (4000, 3984)]),
 'rs1-2': (lambda p0, p1, i0, i1: (f"La acción sube de {p0} a {p1} € (+{n(r1((p1 / p0 - 1) * 100))} %) y el índice de {e(i0, 0)} a {e(i1, 0)} (+{n(r1((i1 / i0 - 1) * 100))} %). ¿Cuánto sube su línea RS? Redondea a 1 decimal.",
                                   r1(((p1 / i1) / (p0 / i0) - 1) * 100),
                                   f"({p1} ÷ {e(i1, 0)}) ÷ ({p0} ÷ {e(i0, 0)}) = {e((p1 / i1) / (p0 / i0), 3)}: la línea RS sube un {e(r1(((p1 / i1) / (p0 / i0) - 1) * 100), 1)} %. "
                                   f"No es {n(r1((p1 / p0 - 1) * 100))} − {n(r1((i1 / i0 - 1) * 100))} = {n(r1((p1 / p0 - 1) * 100 - (i1 / i0 - 1) * 100))}: la fuerza relativa es un cociente, no una resta."),
           [(50, 70, 4000, 4200), (20, 25, 6000, 6300)]),
 'wd1-4': (lambda lo, hi: (f"El rango de distribución va de {e(lo)} € a {e(hi)} €. Proyecta su altura por debajo del soporte. ¿Objetivo mínimo de caída?", r2(2 * lo - hi),
                           f"Altura = {e(hi)} − {e(lo)} = {e(r2(hi - lo))} €; objetivo = {e(lo)} − {e(r2(hi - lo))} = {e(r2(2 * lo - hi))} €. Es la misma proyección de la acumulación, pero hacia abajo."),
           [(44.0, 48.5), (15.2, 17.0)]),
 'g2-3': (lambda b, g: (f"La ruptura de la base fue en {e(b)} € y aparece un gap de continuación en {e(g)} €. Si ese gap marca la mitad del movimiento, ¿cuál es el objetivo?", r2(2 * g - b),
                        f"{e(g)} − {e(b)} = {e(r2(g - b))} €; {e(g)} + {e(r2(g - b))} = {e(r2(2 * g - b))} €. Es una estimación clásica (gap de medición), no una garantía: úsala para planificar ventas parciales."),
          [(50.0, 57.5), (12.0, 15.0)]),
 'p1-4': (lambda rr, p: (f"Planeaste perder como mucho 1R ({rr} €), pero bajaste el stop y acabaste perdiendo {p} €. ¿Cuántos R perdiste?", r2(p / rr),
                         f"{p} ÷ {rr} = {n(r2(p / rr))}R. Mover el stop convirtió una pérdida pequeña y prevista en una grande: la disciplina se mide en R."),
          [(200, 700), (150, 270)]),
 'o1-2': (lambda p: (f"Un contrato de opciones sobre acciones de EE. UU. cubre 100 acciones y la prima es de {e(p)} $ por acción. ¿Cuánto pagas por un contrato?", r2(100 * p),
                     f"100 × {e(p)} = {n(r2(100 * p))} $. Las primas se cotizan por acción, pero se pagan por contrato."),
          [(2.35,), (0.8,)]),
 'bt1-1': (lambda g, p: (f"En la prueba, las operaciones ganadoras suman {e(g, 0)} € y las perdedoras, {e(p, 0)} €. ¿Cuál es el factor de beneficio (ganancias ÷ pérdidas)?", r2(g / p),
                         f"{e(g, 0)} ÷ {e(p, 0)} = {n(r2(g / p))}: por cada euro perdido se ganan {e(r2(g / p))} €. Por debajo de 1 el sistema pierde dinero; con costes reales, conviene que quede bastante por encima."),
           [(15000, 6000), (9000, 7500)]),
 # ---- Fundamental
 'f1a-1': (lambda a, b: (f"BPA del 2T 2025: {e(a)} $. BPA del 2T 2026: {e(b)} $. ¿Crecimiento interanual del BPA?", r1((b / a - 1) * 100),
                         f"{e(b)} ÷ {e(a)} − 1 = {n(r1((b / a - 1) * 100))} %. Se compara con el mismo trimestre del año anterior para eliminar la estacionalidad."),
           [(1.2, 1.5), (0.5, 0.72)]),
 'f2a-1': (lambda p, b: (f"Una acción cotiza a {e(p)} $ y su BPA de los últimos 12 meses es de {e(b)} $. ¿PER?", r2(p / b),
                         f"{e(p)} ÷ {e(b)} = {n(r2(p / b))}: pagas {n(r2(p / b))} veces el beneficio de un año. Solo, no dice si es caro o barato; falta saber cuánto crecerá."),
           [(120.0, 5.0), (45.0, 2.5)]),
 'f3a-1': (lambda d, c, eb: (f"Deuda: {e(d, 0)} M$. Caja: {e(c, 0)} M$. EBITDA anual: {e(eb, 0)} M$. ¿Deuda neta/EBITDA?", r2((d - c) / eb),
                             f"({e(d, 0)} − {e(c, 0)}) ÷ {e(eb, 0)} = {n(r2((d - c) / eb))} veces: necesitaría {n(r2((d - c) / eb))} años de EBITDA íntegro para pagar la deuda neta. Cuanto más alto, menos margen tiene si el negocio se frena."),
           [(4000, 1000, 2000), (9000, 1000, 2000)]),
 'f4a-3': (lambda c, per, t: (f"El consenso espera un BPA de {e(c)} $ y cotiza a un PER adelantado de {per}. Tu tesis estima {e(t)} $. Si el PER se mantiene, ¿qué potencial tiene si aciertas?", r1((t / c - 1) * 100),
                              f"Hoy: {per} × {e(c)} = {n(r2(per * c))} $. Si aciertas: {per} × {e(t)} = {n(r2(per * t))} $, un {n(r1((t / c - 1) * 100))} % más. Tu ventaja está solo en la diferencia con el consenso, no en que la empresa crezca."),
           [(4.0, 20, 4.6), (1.5, 30, 1.95)]),
 'f5a-1': (lambda c, p: (f"El consenso de analistas esperaba un BPA de {e(c)} $ y la empresa publica {e(p)} $. ¿De cuánto es la sorpresa?", r1((p - c) / c * 100),
                         f"({e(p)} − {e(c)}) ÷ {e(c)} = {e(r2(p - c))} ÷ {e(c)} = {n(r1((p - c) / c * 100))} %. El precio reacciona a la diferencia con lo esperado, no al dato en sí."),
           [(2.0, 2.3), (0.8, 0.84)]),
 'f7a-1': (lambda b, c: (f"Beneficio operativo después de impuestos: {e(b, 0)} M$. Capital invertido en el negocio: {e(c, 0)} M$. ¿ROIC?", r1(b / c * 100),
                         f"{e(b, 0)} ÷ {e(c, 0)} = {n(r1(b / c * 100))} %: cada 100 $ invertidos en el negocio generan {n(r1(b / c * 100))} $ al año. Es la rentabilidad del negocio en sí, se financie como se financie."),
           [(240, 2000), (90, 400)]),
 'f9a-1': (lambda p, d: (f"Una acción cotiza a {e(p)} $ y paga {e(d)} $ de dividendo al año. ¿Cuál es su rentabilidad por dividendo?", r2(d / p * 100),
                         f"{e(d)} ÷ {e(p)} = {n(r2(d / p * 100))} %. Si el precio cae y el dividendo se mantiene, la rentabilidad sube: mira siempre si ese dividendo es sostenible."),
           [(80.0, 2.0), (25.0, 1.5)]),
 'f11a-1': (lambda f, i: (f"Recibirás {e(f, 0)} € dentro de un año. Si exiges un {i} % de rentabilidad, ¿cuánto vale ese dinero hoy?", r2(f / (1 + i / 100)),
                          f"{e(f, 0)} ÷ {e(1 + i / 100)} = {n(r2(f / (1 + i / 100)))} €. Descontar es el interés compuesto al revés: dinero futuro vale menos que dinero de hoy."),
            [(525, 5), (648, 8)]),
 'fa1-1': (lambda v, c: (f"Ventas anuales: {e(v, 0)} M$. Cuentas por cobrar: {e(c, 0)} M$. ¿Cuántos días tarda de media en cobrar (cobros ÷ ventas × 365)?", r1(c / v * 365),
                         f"{e(c, 0)} ÷ {e(v, 0)} × 365 = {n(r1(c / v * 365))} días. El dato importa por su evolución: compáralo con años anteriores y con la competencia."),
           [(1460, 180), (365, 90)]),
 'fra-1': (lambda per, b: (f"Sus comparables cotizan a un PER medio de {per} y tu empresa tiene un BPA de {e(b)} $. ¿Qué precio implica ese múltiplo?", r2(per * b),
                           f"{per} × {e(b)} = {n(r2(per * b))} $. Es el precio si el mercado la valorase como a la media de su grupo, no una garantía de que llegue ahí."),
           [(18, 2.5), (30, 1.2)]),
 'fva-1': (lambda f, v, ex: (f"Una empresa sin deuda neta generará {f} M$ de flujo de caja libre el próximo año y vale {e(v, 0)} M$ en bolsa. Exiges un {ex} %. ¿Qué crecimiento anual para siempre descuenta el precio?", r1(ex - f / v * 100),
                             f"{f} ÷ {e(v, 0)} = {n(r1(f / v * 100))} % de rentabilidad por caja libre; {ex} % − {n(r1(f / v * 100))} % = {n(r1(ex - f / v * 100))} %. Si no crees que pueda crecer un {n(r1(ex - f / v * 100))} % al año para siempre, el precio es exigente."),
           [(60, 1000, 9), (30, 1500, 8)]),
 'fga-3': (lambda a, t: (f"Los fundadores tienen {a} M de las {t} M de acciones. ¿Qué porcentaje de la empresa controlan?", r1(a / t * 100),
                         f"{a} ÷ {t} = {n(r1(a / t * 100))} %. Que los fundadores sigan dentro alinea sus intereses con los tuyos, aunque también les da mucho poder en las votaciones."),
           [(90, 600), (50, 125)]),
 'fua-1': (lambda g, c: (f"Una empresa gasta {e(g, 0)} € en marketing y ventas y consigue {e(c, 0)} clientes nuevos. ¿Cuánto le cuesta captar cada uno?", r2(g / c),
                         f"{e(g, 0)} ÷ {e(c, 0)} = {n(r2(g / c))} € por cliente (CAC). Por sí solo no dice nada: hay que compararlo con lo que deja cada cliente."),
           [(450000, 3000), (1200000, 2500)]),
}


def main():
    pend = dict(V)
    total = 0
    for uid in indice():
        u = leer(uid)
        cambio = False
        for l in u.get('lessons') or []:
            for ex in l['ex']:
                if ex['id'] not in pend:
                    continue
                fn, juegos = pend.pop(ex['id'])
                assert ex['t'] == 'num', ex['id']
                vs = []
                for j in juegos:
                    q, a, why = fn(*j)
                    a = round(float(a), 4)
                    a = int(a) if a.is_integer() else a
                    assert 0 <= a < 1000 and q != ex['q'], (ex['id'], a)
                    vs.append({'q': q, 'a': a, 'why': why})
                ex['variantes'] = vs
                total += len(vs)
                cambio = True
        if cambio:
            guardar(u)
    assert not pend, 'ejercicios inexistentes: ' + ', '.join(pend)
    empaquetar()
    print(f'{total} variantes en {len(V)} ejercicios')


if __name__ == '__main__':
    main()
