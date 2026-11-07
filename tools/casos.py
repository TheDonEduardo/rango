"""Genera src/content/casos.json: ejercicios de «caso real» con datos de Yahoo Finance.

Uso:  pip install yfinance && python tools/casos.py
Los tickers salen de la cartera del bot (../portfolio_manager.py, lista PORTFOLIO);
si no se encuentra, se usa FALLBACK. Solo genera ejercicios de cálculo: la respuesta
se calcula con las mismas cifras redondeadas que ve el usuario en el enunciado.
"""
import datetime as dt
import json
import math
import re
import sys
from pathlib import Path

import yfinance as yf

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "content" / "casos.json"
BOT = ROOT.parent / "portfolio_manager.py"
FALLBACK = ["AVGO", "GOOGL", "MELI", "MSFT", "LLY", "CRWD", "NU", "AXON", "META", "NVDA"]
CUR = {"USD": "$", "EUR": "€"}
O_NEIL = 25  # crecimiento mínimo de ventas que pide O'Neil (CAN SLIM)


def tickers():
    if BOT.exists():
        found = re.findall(r'"ticker"\s*:\s*"([A-Z.\-]+)"', BOT.read_text(encoding="utf-8"))
        if found:
            return found
    return FALLBACK


def es(v, d=1):
    """Formato es-ES: 1234.5 -> '1.234,5'; signo menos tipográfico."""
    s = f"{v:,.{d}f}"
    return s.replace(",", "X").replace(".", ",").replace("X", ".").replace("-", "−")


def mill(v):
    """Millones mostrados al usuario: sin decimales desde 1.000 M, con uno por debajo."""
    m = v / 1e6
    return (round(m), 0) if abs(m) >= 1000 else (round(m, 1), 1)


def limpio(nombre):
    return re.sub(r",?\s+(Inc\.?|Corporation|Ltd\.?|plc|N\.V\.)$", "", nombre)


def fecha(ts):
    return ts.strftime("%d/%m/%Y")


def row(q, name):
    if name not in q.index:
        return None
    return q.loc[name]


def ok(v):
    return v is not None and not (isinstance(v, float) and math.isnan(v))


def casos_de(tk):
    t = yf.Ticker(tk)
    info = t.info or {}
    sym = CUR.get(info.get("financialCurrency") or "USD")
    if not sym:
        return {}
    nombre = limpio(info.get("shortName") or tk)
    caso = f"{nombre} ({tk})"
    q = t.quarterly_income_stmt
    if q is None or q.empty:
        return {}
    q = q[sorted(q.columns, reverse=True)]  # columna 0 = trimestre más reciente
    cols = list(q.columns)
    out = {"f1a": [], "f1b": []}
    rev, eps = row(q, "Total Revenue"), row(q, "Diluted EPS")
    gp, op = row(q, "Gross Profit"), row(q, "Operating Income")

    # Trimestre de hace un año: mismo mes, año anterior.
    prev = next((c for c in cols[1:] if c.month == cols[0].month and c.year == cols[0].year - 1), None)

    # f1a · crecimiento interanual de ventas
    if prev is not None and rev is not None and ok(rev[cols[0]]) and ok(rev[prev]) and rev[prev] > 0:
        (v1, d1), (v0, d0) = mill(rev[cols[0]]), mill(rev[prev])
        g = round((v1 / v0 - 1) * 100, 1)
        if 0 < g < 500:
            cmp = "supera el" if g >= O_NEIL else "queda por debajo del"
            out["f1a"].append({
                "t": "num", "caso": caso,
                "q": f"Ventas de {nombre} en el trimestre cerrado el {fecha(cols[0])}: {es(v1, d1)} M{sym}. "
                     f"Mismo trimestre del año anterior: {es(v0, d0)} M{sym}. ¿Crecimiento interanual? Redondea a 1 decimal.",
                "unit": "%", "a": g, "tol": 0.06,
                "why": f"{es(v1, d1)} ÷ {es(v0, d0)} − 1 = {es(g)} %. Ese ritmo {cmp} 25 % que pide O'Neil a las ventas.",
            })

    # f1a · crecimiento interanual del BPA (solo si ambos son positivos)
    if prev is not None and eps is not None and ok(eps[cols[0]]) and ok(eps[prev]) and eps[prev] > 0 and eps[cols[0]] > 0:
        e1, e0 = round(float(eps[cols[0]]), 2), round(float(eps[prev]), 2)
        if e0 > 0:
            g = round((e1 / e0 - 1) * 100, 1)
            # El teclado decimal del móvil no tiene signo menos: si cae, se pregunta cuánto cae.
            if g != 0 and -90 < g < 1000:
                pide = "¿Crecimiento interanual?" if g > 0 else "¿Cuánto cae interanualmente?"
                lectura = "" if g > 0 else f": cae un {es(-g)} %"
                out["f1a"].append({
                    "t": "num", "caso": caso,
                    "q": f"BPA diluido contable de {nombre} en el trimestre cerrado el {fecha(cols[0])}: {es(e1, 2)} {sym}. "
                         f"Mismo trimestre del año anterior: {es(e0, 2)} {sym}. {pide} Redondea a 1 decimal.",
                    "unit": "%", "a": abs(g), "tol": 0.06,
                    "why": f"{es(e1, 2)} ÷ {es(e0, 2)} − 1 = {es(g)} %{lectura}. Es el BPA contable: antes de concluir, revisa si incluye partidas puntuales.",
                })

    # f1b · márgenes del último trimestre frente al anterior
    for serie, nom in ((gp, "bruto"), (op, "operativo")):
        if serie is None or rev is None or len(cols) < 2:
            continue
        c0, c1 = cols[0], cols[1]
        if not all(ok(x) for x in (serie[c0], rev[c0], serie[c1], rev[c1])) or rev[c0] <= 0 or rev[c1] <= 0:
            continue
        (r, dr), (b, db) = mill(rev[c0]), mill(serie[c0])
        m = round(b / r * 100, 1)
        m_prev = round(mill(serie[c1])[0] / mill(rev[c1])[0] * 100, 1)
        if not (0 < m < 100):  # márgenes negativos: sin signo menos en el teclado
            continue
        tend = "sube" if m > m_prev else "baja" if m < m_prev else "se mantiene"
        concepto = "beneficio bruto" if nom == "bruto" else "beneficio operativo"
        out["f1b"].append({
            "t": "num", "caso": caso,
            "q": f"{nombre}, trimestre cerrado el {fecha(c0)}: ventas de {es(r, dr)} M{sym} y {concepto} de {es(b, db)} M{sym}. "
                 f"¿Margen {nom}? Redondea a 1 decimal.",
            "unit": "%", "a": m, "tol": 0.06,
            "why": f"{es(b, db)} ÷ {es(r, dr)} = {es(m)} %. En el trimestre anterior fue del {es(m_prev)} %: el margen {tend}.",
        })
    return out


def main():
    ex = {"f1a": [], "f1b": []}
    fallos = []
    for tk in tickers():
        try:
            for k, v in casos_de(tk).items():
                ex[k].extend(v)
        except Exception as e:  # un ticker sin datos no debe tumbar el resto
            fallos.append(f"{tk}: {e}")
    if not any(ex.values()):
        sys.exit("Sin datos: no se sobrescribe casos.json. " + "; ".join(fallos))
    hoy = dt.date.today()
    data = {"fuente": "Yahoo Finance", "fecha": hoy.strftime("%d/%m/%Y"), "ex": ex}
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"casos.json: {sum(len(v) for v in ex.values())} ejercicios", *(f"- aviso {f}" for f in fallos), sep="\n")


if __name__ == "__main__":
    main()
