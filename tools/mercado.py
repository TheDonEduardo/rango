"""Genera src/content/mercado.json: «Mercado de la semana», un repaso corto con lo que pasó de verdad.

Uso:  python tools/mercado.py   (requiere yfinance; GitHub Actions lo ejecuta cada sábado)
Compara el último cierre con el último cierre de la semana anterior (semanas ISO) de varios mercados y
escribe preguntas de cálculo con esas cifras. Como los casos reales: la respuesta se calcula con las cifras
redondeadas que ve el usuario y la explicación solo afirma hechos; nunca recomienda comprar ni vender.
"""
import datetime as dt
import json
import sys
from pathlib import Path

import yfinance as yf

sys.path.insert(0, str(Path(__file__).resolve().parent))
from casos import es, fecha, limpio, tickers  # noqa: E402

OUT = Path(__file__).resolve().parent.parent / "src" / "content" / "mercado.json"
# (ticker, nombre en la etiqueta, nombre en la frase, unidad, decimales)
MERCADOS = [
    ("^GSPC", "S&P 500", "El S&P 500", "puntos", 2),
    ("EUNL.DE", "MSCI World en euros", "El ETF iShares Core MSCI World (en euros)", "€", 2),
    ("^IBEX", "IBEX 35", "El IBEX 35", "puntos", 2),
    ("GC=F", "Oro", "El oro (futuro en dólares por onza)", "$", 2),
]


def semana_de(h):
    """(fecha y cierre del último día, fecha y cierre del último día de la semana ISO anterior) o None."""
    h = h.dropna()
    if len(h) < 6:
        return None
    fin = h.index[-1]
    clave = fin.isocalendar()[:2]
    antes = h[[d.isocalendar()[:2] < clave for d in h.index]]
    if not len(antes) or (fin - antes.index[-1]).days > 12:
        return None
    return fin, float(h.iloc[-1]), antes.index[-1], float(antes.iloc[-1])


def cierres(tk):
    return yf.Ticker(tk).history(period="1mo", interval="1d")["Close"]


def variacion(nombre, frase, unidad, dec, s):
    fin_f, fin_v, ini_f, ini_v = s
    a, b = round(ini_v, dec), round(fin_v, dec)
    g = round((b / a - 1) * 100, 2)
    if abs(g) < 0.05 or abs(g) >= 50:
        return None
    sube = g > 0
    return {
        "t": "num", "caso": nombre,
        "q": f"{frase} cerró a {es(a, dec)} {unidad} el {fecha(ini_f)} y a {es(b, dec)} {unidad} el {fecha(fin_f)}. "
             f"¿Cuánto {'subió' if sube else 'cayó'} en la semana? Redondea a 2 decimales.",
        "unit": "%", "a": abs(g), "tol": 0.006,
        "why": (f"{es(b, dec)} ÷ {es(a, dec)} − 1 = {es(g, 2)} %." if sube else f"1 − {es(b, dec)} ÷ {es(a, dec)} = {es(abs(g), 2)} %.")
               + " Una semana es ruido: sirve para practicar el cálculo, no para sacar conclusiones.",
    }


def generar():
    ex, fechas = [], []
    for tk, nombre, frase, unidad, dec in MERCADOS:
        try:
            s = semana_de(cierres(tk))
        except Exception:
            s = None
        if not s:
            continue
        e = variacion(nombre, frase, unidad, dec, s)
        if e:
            ex.append(e)
            fechas.append(s)

    # Bono de EE. UU. a 10 años: Yahoo da la rentabilidad en %. Se pregunta el cambio en puntos básicos.
    try:
        s = semana_de(cierres("^TNX"))
    except Exception:
        s = None
    if s:
        a, b = round(s[3], 2), round(s[1], 2)
        pb = round((b - a) * 100)
        if 1 <= abs(pb) < 200:
            sube = pb > 0
            ex.append({
                "t": "num", "caso": "Bono de EE. UU. a 10 años",
                "q": f"La rentabilidad del bono de EE. UU. a 10 años pasó del {es(a, 2)} % ({fecha(s[2])}) al {es(b, 2)} % ({fecha(s[0])}). "
                     f"¿Cuántos puntos básicos {'subió' if sube else 'bajó'}?",
                "unit": "pb", "a": abs(pb),
                "why": f"{es(b, 2)} − {es(a, 2)} = {es(b - a, 2)} puntos porcentuales, es decir, {abs(pb)} puntos básicos. "
                       f"Cuando la rentabilidad {'sube' if sube else 'baja'}, el precio de los bonos ya emitidos {'cae' if sube else 'sube'}.",
            })

    # Euro frente al dólar.
    try:
        s = semana_de(cierres("EURUSD=X"))
    except Exception:
        s = None
    if s:
        a, b = round(s[3], 4), round(s[1], 4)
        g = round((b / a - 1) * 100, 2)
        if 0.05 <= abs(g) < 20:
            sube = g > 0
            ex.append({
                "t": "num", "caso": "Euro frente al dólar",
                "q": f"El euro pasó de {es(a, 4)} $ ({fecha(s[2])}) a {es(b, 4)} $ ({fecha(s[0])}). "
                     f"¿Cuánto se {'apreció' if sube else 'depreció'} frente al dólar? Redondea a 2 decimales.",
                "unit": "%", "a": abs(g), "tol": 0.006,
                "why": (f"{es(b, 4)} ÷ {es(a, 4)} − 1 = {es(g, 2)} %." if sube else f"1 − {es(b, 4)} ÷ {es(a, 4)} = {es(abs(g), 2)} %.")
                       + f" Un euro más {'fuerte resta' if sube else 'débil suma'} rentabilidad a quien tiene inversiones en dólares sin cubrir.",
            })

    # La acción de la cartera que más subió en la semana (tabla con cuatro valores).
    filas = []
    for tk in tickers():
        try:
            t = yf.Ticker(tk)
            s = semana_de(t.history(period="1mo", interval="1d")["Close"])
            nombre = limpio((t.info or {}).get("shortName") or tk)
        except Exception:
            continue
        if s:
            a, b = round(s[3], 2), round(s[1], 2)
            filas.append((round((b / a - 1) * 100, 2), nombre, a, b))
    filas.sort(reverse=True)
    if len(filas) >= 4 and filas[0][0] - filas[1][0] >= 0.3:
        mejor = filas[0]
        elegidas = sorted([mejor, filas[len(filas) // 3], filas[2 * len(filas) // 3], filas[-1]], key=lambda f: f[1])
        if len({f[1] for f in elegidas}) == 4:
            ex.append({
                "t": "choice", "caso": "Cartera",
                "q": "Cierres de cuatro acciones al final de la semana anterior y de esta. ¿Cuál subió más en porcentaje?",
                "table": {"cols": ["Acción", "Semana anterior", "Esta semana"],
                          "rows": [[n, f"{es(a, 2)} $", f"{es(b, 2)} $"] for _, n, a, b in elegidas]},
                "opts": [f[1] for f in elegidas], "a": elegidas.index(mejor),
                "why": "; ".join(f"{n}: {es(g, 2).replace('−', '−')} %" for g, n, _, _ in elegidas)
                       + ". Para comparar acciones de precios distintos hay que mirar el porcentaje, no los dólares.",
            })
    return ex, fechas


ORDEN = ["S&P 500", "MSCI World en euros", "Bono de EE. UU. a 10 años", "Euro frente al dólar", "Cartera", "IBEX 35", "Oro"]


def elegir(ex, n=6):
    """Como mucho n preguntas, con variedad: bolsa, bonos, divisa y la tabla de la cartera antes que el resto."""
    return sorted(ex, key=lambda e: ORDEN.index(e["caso"]) if e["caso"] in ORDEN else len(ORDEN))[:n]


def main():
    ex, fechas = generar()
    if len(ex) < 3:
        sys.exit("Datos insuficientes: no se sobrescribe mercado.json")
    fin = max(f[0] for f in fechas)
    iso = fin.isocalendar()
    data = {"semana": f"{iso[0]}-W{iso[1]:02d}", "hasta": fecha(fin), "fuente": "Yahoo Finance",
            "fecha": dt.date.today().strftime("%d/%m/%Y"), "ex": elegir(ex)}
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"mercado.json: semana {data['semana']}, {len(data['ex'])} preguntas")


if __name__ == "__main__":
    main()
