"""Genera src/content/casos.json: ejercicios de «caso real» con datos de Yahoo Finance.

Uso:  pip install yfinance && python tools/casos.py
Los tickers salen de la cartera del bot (../portfolio_manager.py, lista PORTFOLIO);
si no se encuentra, se usa FALLBACK. Solo genera ejercicios de cálculo: la respuesta
se calcula con las mismas cifras redondeadas que ve el usuario en el enunciado.
"""
import datetime as dt
import json
import os
import math
import re
import sys
from pathlib import Path

import yfinance as yf

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "content" / "casos.json"
BOT = ROOT.parent / "portfolio_manager.py"
HOY = dt.date.today().strftime("%d/%m/%Y")
# Lecciones que reciben casos reales (una sola definición para casos_de y main).
LECCIONES_CASOS = ("f1a", "f1b", "f2a", "f2b", "f3a", "f3b", "f5a", "f6a", "bg1", "pr1", "bh2", "f8b", "f9a",
                   "t1", "t2", "r1", "r2", "rs1", "g2", "dv1", "io2")
# Índices y fondos indexados para la ruta Pasiva: (ticker, etiqueta, descripción, unidad, desde, nota sobre dividendos).
INDICES = [
    ("EUNL.DE", "iShares Core MSCI World (EUNL)", "el ETF iShares Core MSCI World de acumulación (en euros)", "€", None,
     "Al ser de acumulación, el precio ya incluye los dividendos reinvertidos."),
    ("^GSPC", "S&P 500", "el índice S&P 500", "puntos", "2000-01-01",
     "Es el índice sin dividendos: con ellos reinvertidos, el resultado habría sido mejor."),
    ("^STOXX50E", "Euro Stoxx 50", "el índice Euro Stoxx 50", "puntos", "2000-01-01",
     "Es el índice sin dividendos: con ellos reinvertidos, el resultado habría sido mejor."),
    ("^IBEX", "IBEX 35", "el IBEX 35", "puntos", "2000-01-01",
     "Es el índice sin dividendos, que en el IBEX pesan mucho: con ellos reinvertidos, el resultado habría sido bastante mejor."),
]
FALLBACK = ["AVGO", "GOOGL", "MELI", "MSFT", "LLY", "CRWD", "NU", "AXON", "META", "NVDA"]
CUR = {"USD": "$", "EUR": "€"}
O_NEIL = 25  # crecimiento mínimo de ventas que pide O'Neil (CAN SLIM)
# Sectores de Yahoo (los de Morningstar) → nombre en español y grupo de Morningstar.
SECTORES = {
    "Basic Materials": ("materiales básicos", "Cíclico"), "Consumer Cyclical": ("consumo discrecional", "Cíclico"),
    "Financial Services": ("servicios financieros", "Cíclico"), "Real Estate": ("inmobiliario", "Cíclico"),
    "Consumer Defensive": ("consumo básico", "Defensivo"), "Healthcare": ("salud", "Defensivo"),
    "Utilities": ("servicios públicos", "Defensivo"), "Communication Services": ("comunicaciones", "Sensible"),
    "Energy": ("energía", "Sensible"), "Industrials": ("industria", "Sensible"), "Technology": ("tecnología", "Sensible"),
}
GRUPOS = ["Cíclico", "Defensivo", "Sensible"]
LECTURA = {"Cíclico": "su beneficio depende mucho de cómo vaya la economía",
           "Defensivo": "vende lo que se sigue comprando en una crisis",
           "Sensible": "depende del ciclo, pero menos que los cíclicos"}


def tickers():
    """Valores de los casos. Por orden: variable RANGO_TICKERS («NVDA,MSFT,...»), tools/tickers.txt
    (uno por línea; permite separar Rango del repositorio del bot), la cartera de ../portfolio_manager.py
    y, si nada de eso existe, FALLBACK."""
    env = [x.strip().upper() for x in os.environ.get("RANGO_TICKERS", "").split(",") if x.strip()]
    if env:
        return env
    fichero = Path(__file__).resolve().parent / "tickers.txt"
    if fichero.exists():
        lst = [x.strip().upper() for x in fichero.read_text(encoding="utf-8").splitlines() if x.strip() and not x.strip().startswith("#")]
        if lst:
            return lst
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


def ultimos4(df, fila):
    """Suma de los 4 últimos trimestres consecutivos de una fila, o None."""
    if df is None or df.empty or fila not in df.index:
        return None, None
    df = df[sorted(df.columns, reverse=True)]
    cc = list(df.columns[:4])
    if len(cc) < 4 or not (250 <= (cc[0] - cc[3]).days <= 290):
        return None, None
    vals = [df.loc[fila][c] for c in cc]
    if not all(ok(v) for v in vals):
        return None, None
    return float(sum(vals)), cc[0]


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
    out = {k: [] for k in LECCIONES_CASOS}
    # Fecha del último cierre del mercado (el script corre en sábado: el precio es el del viernes, no el de hoy).
    t_mercado = info.get("regularMarketTime")
    cierre = fecha(dt.datetime.fromtimestamp(t_mercado)) if isinstance(t_mercado, (int, float)) else HOY
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

    # f2a · PER y PER adelantado (precio y BPA en la misma moneda)
    price = info.get("currentPrice")
    psym = CUR.get(info.get("currency") or "")
    if ok(price) and price > 0 and psym == sym:
        p2 = round(float(price), 2)
        for campo, desc, nota in (
            ("trailingEps", "BPA contable de los últimos 12 meses", "Es el beneficio contable del último año."),
            ("forwardEps", "BPA estimado por los analistas para los próximos 12 meses",
             "Ojo: el BPA estimado suele ser «ajustado» y el pasado, contable; no compares ambos PER sin saberlo."),
        ):
            e = info.get(campo)
            if not ok(e) or e <= 0:
                continue
            e2 = round(float(e), 2)
            per = round(p2 / e2, 1)
            if not (0 < per < 200):  # BPA casi nulo: PER sin sentido
                continue
            nombre_per = "PER" if campo == "trailingEps" else "PER adelantado"
            out["f2a"].append({
                "t": "num", "caso": caso,
                "q": f"Precio de {nombre} al cierre del {cierre}: {es(p2, 2)} {sym}. {desc}: {es(e2, 2)} {sym}. "
                     f"¿{nombre_per}? Redondea a 1 decimal.",
                "unit": "", "a": per, "tol": 0.06,
                "why": f"{es(p2, 2)} ÷ {es(e2, 2)} = {es(per)} veces. {nota}",
            })

    # f2b · EV/EBITDA (EV calculado: capitalización + deuda − caja)
    cap, debt, cash, ebitda = (info.get(k) for k in ("marketCap", "totalDebt", "totalCash", "ebitda"))
    if psym == sym and all(ok(x) for x in (cap, debt, cash, ebitda)) and ebitda > 0:
        (c, dc), (d, dd), (k, dk), (eb, de) = mill(cap), mill(debt), mill(cash), mill(ebitda)
        ev = round(c + d - k, 1)
        mult = round(ev / eb, 1)
        if 0 < mult < 100:
            out["f2b"].append({
                "t": "num", "caso": caso,
                "q": f"{nombre} al cierre del {cierre}: capitalización de {es(c, dc)} M{sym}, deuda de {es(d, dd)} M{sym}, "
                     f"caja de {es(k, dk)} M{sym} y EBITDA de los últimos 12 meses de {es(eb, de)} M{sym}. "
                     f"¿EV/EBITDA? Redondea a 1 decimal.",
                "unit": "", "a": mult, "tol": 0.06,
                "why": f"EV = {es(c, dc)} + {es(d, dd)} − {es(k, dk)} = {es(ev, 0 if abs(ev) >= 1000 else 1)} M{sym}; "
                       f"÷ {es(eb, de)} = {es(mult)} veces.",
            })

    # f2b · rentabilidad por flujo de caja libre (suma de 4 trimestres consecutivos)
    cf = t.quarterly_cashflow
    fcf4, fcf_hasta = ultimos4(cf, "Free Cash Flow")
    if psym == sym and ok(cap) and cap > 0 and fcf4 is not None:
        (f, df), (c, dc) = mill(fcf4), mill(cap)
        y = round(f / c * 100, 1)
        # Por encima de ~8 % suele ser una distorsión (p. ej. fondos de clientes en negocios financieros).
        if 0.1 <= y < 8:
            out["f2b"].append({
                "t": "num", "caso": caso,
                "q": f"{nombre}: flujo de caja libre de los 4 trimestres hasta el {fecha(fcf_hasta)}: {es(f, df)} M{sym}. "
                     f"Capitalización al cierre del {cierre}: {es(c, dc)} M{sym}. ¿Rentabilidad por flujo de caja libre? Redondea a 1 decimal.",
                "unit": "%", "a": y, "tol": 0.06,
                "why": f"{es(f, df)} ÷ {es(c, dc)} = {es(y)} %: la caja que genera el negocio por cada 100 {sym} de capitalización.",
            })

    # f5a · sorpresas frente al consenso (últimos 4 trimestres publicados)
    try:
        eh = t.earnings_history
    except Exception:
        eh = None
    if eh is not None and not eh.empty and {"epsActual", "epsEstimate"} <= set(eh.columns):
        eh = eh.sort_index().dropna(subset=["epsActual", "epsEstimate"]).tail(4)
        # Solo BPA ajustado («normalized»): en el contable, Yahoo compara a veces el dato publicado con un consenso
        # que no es comparable y salen «sorpresas» enormes que enseñarían algo falso.
        filas = [(ix, round(float(r.epsActual), 2), round(float(r.epsEstimate), 2)) for ix, r in eh.iterrows()]
        # Sin la columna methodology no hay forma de saber si es ajustado: entonces no se genera nada.
        metodo = list(eh["methodology"]) if "methodology" in eh.columns else []
        ajustado = len(metodo) == len(filas) and len(filas) > 0 and all(str(m).lower() == "normalized" for m in metodo)
        ultimo_ajustado = len(metodo) == len(filas) and len(filas) > 0 and str(metodo[-1]).lower() == "normalized"
    else:
        filas, ajustado, ultimo_ajustado = [], False, False
    if filas:
        ix, real, est = filas[-1]
        if ultimo_ajustado and est > 0 and real != est:
            sp = round((real - est) / est * 100, 1)
            if 0 < abs(sp) < 100:
                pide = "¿De cuánto es la sorpresa?" if sp > 0 else "¿Cuánto se queda por debajo del consenso?"
                out["f5a"].append({
                    "t": "num", "caso": caso,
                    "q": f"{nombre}, trimestre cerrado el {fecha(ix)}: el consenso esperaba un BPA ajustado de {es(est, 2)} {sym} "
                         f"y publicó {es(real, 2)} {sym}. {pide} Redondea a 1 decimal.",
                    "unit": "%", "a": abs(sp), "tol": 0.06,
                    "why": f"({es(real, 2)} − {es(est, 2)}) ÷ {es(est, 2)} = {es(sp)} %: "
                           + ("batió al consenso." if sp > 0 else "se quedó por debajo del consenso."),
                })
        if len(filas) == 4 and ajustado:
            bates = sum(1 for _, r_, e_ in filas if r_ > e_)
            out["f5a"].append({
                "t": "num", "caso": caso,
                "q": f"Resultados de {nombre} en sus últimos 4 trimestres (BPA ajustado, {sym}). ¿Cuántas veces batió al consenso?",
                "table": {"cols": ["Trimestre", "Consenso", "Publicado"],
                          "rows": [[fecha(i_), es(e_, 2), es(r_, 2)] for i_, r_, e_ in filas]},
                "unit": "", "a": bates,
                "why": f"Batió {bates} de 4 veces: cuenta solo los trimestres en que lo publicado supera al consenso. "
                       f"Batir de forma repetida suele llevar a los analistas a subir sus estimaciones.",
            })

    # f9a · rentabilidad por dividendo y payout con los dividendos pagados en los últimos 12 meses.
    # (Las acciones en circulación de Yahoo no son fiables para medir recompras: no se usan.)
    div = info.get("trailingAnnualDividendRate")
    if ok(div) and div > 0 and ok(price) and price > 0 and psym == sym:
        d2, p2 = round(float(div), 2), round(float(price), 2)
        rd = round(d2 / p2 * 100, 2)
        if rd >= 0.1:
            out["f9a"].append({
                "t": "num", "caso": caso,
                "q": f"{nombre} cotizaba a {es(p2, 2)} {sym} al cierre del {cierre} y pagó {es(d2, 2)} {sym} por acción en dividendos "
                     f"en los últimos 12 meses. ¿Cuál es su rentabilidad por dividendo? Redondea a 2 decimales.",
                "unit": "%", "a": rd, "tol": 0.006,
                "why": f"{es(d2, 2)} ÷ {es(p2, 2)} = {es(rd, 2)} %. "
                       + ("Es un dividendo pequeño: la mayor parte de la caja se reinvierte o se usa para recomprar acciones." if rd < 1.5
                          else "Compárala con la de su sector y comprueba que el payout permite mantenerla."),
            })
        e = info.get("trailingEps")
        if ok(e) and e > 0:
            e2 = round(float(e), 2)
            po = round(d2 / e2 * 100, 1)
            if 0 < po < 200:
                out["f9a"].append({
                    "t": "num", "caso": caso,
                    "q": f"{nombre} pagó {es(d2, 2)} {sym} por acción en dividendos en los últimos 12 meses y su BPA contable fue de "
                         f"{es(e2, 2)} {sym}. ¿Qué porcentaje del beneficio repartió (payout)? Redondea a 1 decimal.",
                    "unit": "%", "a": po, "tol": 0.06,
                    "why": f"{es(d2, 2)} ÷ {es(e2, 2)} = {es(po)} %. "
                           + ("Reparte poco: le queda casi todo el beneficio para crecer o recomprar." if po < 40
                              else "Reparte una parte importante del beneficio." if po < 100
                              else "Reparte más de lo que gana: vigila si es sostenible."),
                })

    # f6a · grupo de Morningstar según el sector
    sec = SECTORES.get(info.get("sector") or "")
    if sec:
        es_sec, grupo = sec
        out["f6a"].append({
            "t": "choice", "caso": caso,
            "q": f"Yahoo Finance clasifica a {nombre} en el sector de {es_sec}. ¿A qué grupo pertenece según Morningstar?",
            "opts": GRUPOS, "a": GRUPOS.index(grupo),
            "why": f"Morningstar incluye {es_sec} en el grupo {grupo.lower()}: {LECTURA[grupo]}.",
        })

    # F3: en bancos y aseguradoras la deuda y la caja son la materia prima del negocio; estas ratios no aplican.
    if info.get("sector") == "Financial Services":
        return out

    # f3a · deuda neta/EBITDA o, si tiene más caja que deuda, caja neta
    if all(ok(x) for x in (debt, cash)):
        (d, dd), (k, dk) = mill(debt), mill(cash)
        neta = round(d - k, 1)
        nd = 0 if abs(neta) >= 1000 else 1
        if neta < 0:
            out["f3a"].append({
                "t": "choice", "caso": caso,
                "q": f"{nombre}, último balance publicado: deuda de {es(d, dd)} M{sym} y caja de {es(k, dk)} M{sym}. ¿Qué tiene?",
                # Alterna la posición de la respuesta según el ticker (estable entre ejecuciones).
                "opts": ["Deuda neta", "Caja neta"] if sum(map(ord, tk)) % 2 else ["Caja neta", "Deuda neta"],
                "a": 1 if sum(map(ord, tk)) % 2 else 0,
                "why": f"{es(d, dd)} − {es(k, dk)} = {es(neta, nd)} M{sym}: tiene más caja que deuda "
                       f"y podría devolverla entera con lo que tiene en caja.",
            })
        elif ok(ebitda) and ebitda > 0:
            eb, de = mill(ebitda)
            r = round(neta / eb, 1)
            if 0 < r < 20:
                out["f3a"].append({
                    "t": "num", "caso": caso,
                    "q": f"{nombre}, último balance publicado: deuda de {es(d, dd)} M{sym}, caja de {es(k, dk)} M{sym} y EBITDA de los últimos "
                         f"12 meses de {es(eb, de)} M{sym}. ¿Deuda neta/EBITDA? Redondea a 1 decimal.",
                    "unit": "", "a": r, "tol": 0.06,
                    "why": f"({es(d, dd)} − {es(k, dk)}) ÷ {es(eb, de)} = {es(neta, nd)} ÷ {es(eb, de)} = {es(r)} veces "
                           f"el EBITDA anual.",
                })

    # f3a · cobertura de intereses con el beneficio operativo (no con el «EBIT» de Yahoo, que incluye plusvalías)
    op4, hasta = ultimos4(q, "Operating Income")
    int4, _ = ultimos4(q, "Interest Expense")
    if op4 is not None and int4 is not None and op4 > 0 and int4 > 0:
        (o, do), (i, di) = mill(op4), mill(int4)
        cov = round(o / i, 1)
        if 0 < cov < 200:
            out["f3a"].append({
                "t": "num", "caso": caso,
                "q": f"{nombre}, 4 trimestres hasta el {fecha(hasta)}: beneficio operativo de {es(o, do)} M{sym} y gastos por "
                     f"intereses de {es(i, di)} M{sym}. ¿Cobertura de intereses? Redondea a 1 decimal.",
                "unit": "", "a": cov, "tol": 0.06,
                "why": f"{es(o, do)} ÷ {es(i, di)} = {es(cov)} veces"
                       + (": el beneficio operativo no alcanza para pagar los intereses del año." if cov < 1
                          else f": el beneficio operativo cubre {es(cov)} veces los intereses del año."),
            })

    # f3b · conversión del beneficio en caja (flujo de caja libre ÷ beneficio neto, 4 trimestres)
    ni4, hasta = ultimos4(q, "Net Income")
    if fcf4 is not None and ni4 is not None and ni4 > 0 and fcf_hasta == hasta:
        (f, df), (n, dn) = mill(fcf4), mill(ni4)
        conv = round(f / n * 100, 1)
        if 0 < conv < 300:
            lect = ("genera más caja que beneficio contable" if conv >= 100 else
                    "parte del beneficio no llega a caja. Revisa si la diferencia viene de inversiones (capex), "
                    "de cobros pendientes o de beneficios contables sin caja, como plusvalías de participadas")
            out["f3b"].append({
                "t": "num", "caso": caso,
                "q": f"{nombre}, 4 trimestres hasta el {fecha(hasta)}: beneficio neto de {es(n, dn)} M{sym} y flujo de caja "
                     f"libre de {es(f, df)} M{sym}. ¿Qué porcentaje del beneficio convierte en caja? Redondea a 1 decimal.",
                "unit": "%", "a": conv, "tol": 0.06,
                "why": f"{es(f, df)} ÷ {es(n, dn)} = {es(conv)} %: {lect}.",
            })
    return out


def casos_indices():
    """Casos de la ruta Pasiva: crecimiento real a 10 años (bg1) y mayor caída desde máximos (pr1)."""
    out = {"bg1": [], "pr1": []}
    for tk, etiqueta, desc, unidad, desde, nota in INDICES:
        h = yf.Ticker(tk).history(period="max", interval="1d")["Close"].dropna()
        if desde:
            h = h[h.index >= desde]
        if len(h) < 300:
            continue
        u = lambda v: f"{es(v, 2)} {unidad}"
        # bg1 · cuánto ha subido en los últimos 10 años
        fin_f, fin_v = h.index[-1], round(float(h.iloc[-1]), 2)
        inicio = h[h.index >= fin_f - dt.timedelta(days=3652)]
        if (fin_f - h.index[0]).days >= 3640 and len(inicio):
            ini_f, ini_v = inicio.index[0], round(float(inicio.iloc[0]), 2)
            g = round((fin_v / ini_v - 1) * 100, 1)
            if 0 < g < 1000:
                out["bg1"].append({
                    "t": "num", "caso": etiqueta,
                    "q": f"{desc[0].upper() + desc[1:]} cerró a {u(ini_v)} el {fecha(ini_f)} y a {u(fin_v)} el {fecha(fin_f)}. "
                         f"¿Cuánto subió en esos 10 años? Redondea a 1 decimal.",
                    "unit": "%", "a": g, "tol": 0.06,
                    "why": f"{es(fin_v, 2)} ÷ {es(ini_v, 2)} − 1 = {es(g)} %. {nota} Por el camino hubo caídas fuertes: la rentabilidad es para quien no vendió.",
                })
        # pr1 · mayor caída desde un máximo (con precios de cierre)
        pico = h.cummax()
        caida = h / pico - 1
        f_min = caida.idxmin()
        f_max = h[:f_min].idxmax()
        v_max, v_min = round(float(h[f_max]), 2), round(float(h[f_min]), 2)
        d = round((1 - v_min / v_max) * 100, 1)
        if 5 < d < 95:
            out["pr1"].append({
                "t": "num", "caso": etiqueta,
                "q": f"{desc[0].upper() + desc[1:]} marcó un máximo de {u(v_max)} el {fecha(f_max)} y cayó hasta {u(v_min)} el {fecha(f_min)}. "
                     f"¿Cuánto cayó? Redondea a 1 decimal.",
                "unit": "%", "a": d, "tol": 0.06,
                "why": f"1 − {es(v_min, 2)} ÷ {es(v_max, 2)} = {es(d)} %. Es la mayor caída de cierre a cierre desde el "
                       f"{fecha(h.index[0])}: antes de elegir cuánto pones en acciones, piensa si aguantarías verla en tu cartera.",
            })
    return out


RIESGO_ATR = 500  # riesgo por operación del caso de tamaño con ATR, en la divisa del valor


def tr_medio(h, n=14):
    """ATR simple: media del rango verdadero de las n últimas sesiones (incluye los huecos)."""
    prev = h["Close"].shift(1)
    tr = (h["High"] - h["Low"]).combine((h["High"] - prev).abs(), max).combine((h["Low"] - prev).abs(), max)
    return float(tr.iloc[-n:].mean())


def casos_tecnicos(tk, indice=None):
    """Casos de la ruta Técnico con las velas diarias del valor: media de 150 sesiones (t1), distancia a máximos y
    mínimos de 52 semanas (t2), stop y tamaño con ATR (r1, r2), fuerza relativa frente al S&P 500 (rs1) y mayor hueco
    al alza del último año (g2). Solo cifras y comparaciones con los umbrales del marco, nunca «compra» o «vende»."""
    out = {k: [] for k in ("t1", "t2", "r1", "r2", "rs1", "g2")}
    t = yf.Ticker(tk)
    info = t.info or {}
    h = t.history(period="2y", interval="1d").dropna(subset=["Open", "High", "Low", "Close"])
    if len(h) < 260:
        return out
    nombre = f"{limpio(info.get('shortName') or tk)} ({tk})"
    cur = CUR.get(info.get("currency"), info.get("currency") or "")
    u = lambda v: f"{es(v, 2)} {cur}"
    cierre = h["Close"]
    f, c = cierre.index[-1], round(float(cierre.iloc[-1]), 2)
    base = {"t": "num", "caso": nombre}

    # t1 · distancia a la media de 150 sesiones (30 semanas) y su pendiente en 20 sesiones
    ma = cierre.rolling(150).mean()
    m, m20 = round(float(ma.iloc[-1]), 2), round(float(ma.iloc[-21]), 2)
    d = round(abs(c / m - 1) * 100, 1)
    if d >= 0.1 and m != m20 and c != m:
        encima = c > m
        sube = m > m20
        if encima and sube:
            lectura = "Precio por encima de una media que sube: las dos condiciones de la Fase 2 de Weinstein."
        elif encima:
            lectura = "Precio por encima, pero la media aún baja: no cumple las dos condiciones de la Fase 2."
        else:
            lectura = "Precio por debajo de la media: Weinstein no compra en esa situación."
        out["t1"].append({**base,
            "q": f"Al cierre del {fecha(f)}, {nombre} cotizaba a {u(c)} y su media de 150 sesiones (unas 30 semanas) estaba en {u(m)}. "
                 f"¿A qué distancia porcentual está el precio de la media? Redondea a 1 decimal.",
            "unit": "%", "a": d, "tol": 0.06,
            "why": f"{es(c, 2)} ÷ {es(m, 2)} − 1 = {'+' if encima else '−'}{es(d)} %. Hace 20 sesiones la media estaba en {es(m20, 2)}: "
                   f"{'sube' if sube else 'baja'}. {lectura}",
        })

    # t2 · distancia al máximo y al mínimo de cierre de las últimas 52 semanas
    ano = cierre.iloc[-252:]
    mx, mn = round(float(ano.max()), 2), round(float(ano.min()), 2)
    dmx = round((1 - c / mx) * 100, 1)
    if dmx >= 0.1:
        out["t2"].append({**base,
            "q": f"{nombre} cerró a {u(c)} el {fecha(f)}. Su cierre más alto de las últimas 52 semanas fue {u(mx)}. "
                 f"¿A qué distancia porcentual está de ese máximo? Redondea a 1 decimal.",
            "unit": "%", "a": dmx, "tol": 0.06,
            "why": f"1 − {es(c, 2)} ÷ {es(mx, 2)} = {es(dmx)} %. Minervini pide menos de un 25 % de distancia al máximo: "
                   + ("lo cumple." if dmx < 25 else "no lo cumple."),
        })
    smn = round((c / mn - 1) * 100, 1)
    if 0.1 <= smn < 1000:
        out["t2"].append({**base,
            "q": f"{nombre} cerró a {u(c)} el {fecha(f)}. Su cierre más bajo de las últimas 52 semanas fue {u(mn)}. "
                 f"¿Cuánto está por encima de ese mínimo? Redondea a 1 decimal.",
            "unit": "%", "a": smn, "tol": 0.06,
            "why": f"{es(c, 2)} ÷ {es(mn, 2)} − 1 = {es(smn)} %. Minervini pide al menos un 30 % sobre el mínimo de 52 semanas: "
                   + ("lo cumple." if smn >= 30 else "no lo cumple."),
        })

    # r1 · stop a 2 ATR bajo el cierre; r2 · acciones con un riesgo fijo y ese stop
    atr = round(tr_medio(h), 2)
    if atr > 0:
        dist = round(2 * atr, 2)
        stop = round(c - dist, 2)
        if 0 < stop < 1000:
            out["r1"].append({**base,
                "q": f"{nombre} cerró a {u(c)} el {fecha(f)} con un ATR(14) de {u(atr)}. Si compras al cierre con el stop a 2 ATR, "
                     f"¿a qué precio va el stop?",
                "unit": cur if cur in ("€", "$") else "", "a": stop, "tol": 0.011,
                "why": f"2 × {es(atr, 2)} = {es(dist, 2)}; {es(c, 2)} − {es(dist, 2)} = {es(stop, 2)}. "
                       f"El stop queda a un {es(dist / c * 100)} % del precio: es el ruido normal de este valor.",
            })
        n = math.floor(RIESGO_ATR / dist + 1e-9)
        if 1 <= n < 1000:
            out["r2"].append({**base,
                "q": f"Quieres arriesgar {es(RIESGO_ATR, 0)} {cur} en {nombre}, con el stop a 2 ATR. Su ATR(14) al {fecha(f)} es de {u(atr)}. "
                     f"¿Cuántas acciones compras como máximo?",
                "unit": "", "a": n, "tol": 0.01,
                "why": f"Distancia al stop: 2 × {es(atr, 2)} = {es(dist, 2)}. {es(RIESGO_ATR, 0)} ÷ {es(dist, 2)} = {es(math.floor(RIESGO_ATR / dist * 100) / 100, 2)}: "
                       f"{n} {'acción' if n == 1 else 'acciones'}, redondeando hacia abajo para no pasar del riesgo.",
            })

    # rs1 · cambio de la línea de fuerza relativa (precio ÷ S&P 500) en unas 13 semanas
    if indice is not None and len(indice):
        comun = cierre.index.intersection(indice.index)
        if len(comun) > 70:
            f0, f1 = comun[-64], comun[-1]
            p0, p1 = round(float(cierre[f0]), 2), round(float(cierre[f1]), 2)
            i0, i1 = round(float(indice[f0]), 2), round(float(indice[f1]), 2)
            rs = round(((p1 / i1) / (p0 / i0) - 1) * 100, 1)
            if abs(rs) >= 0.1:
                out["rs1"].append({**base,
                    "q": f"{nombre} pasó de {u(p0)} el {fecha(f0)} a {u(p1)} el {fecha(f1)}; el S&P 500, de {es(i0, 2)} a {es(i1, 2)} puntos. "
                         f"¿Cuánto {'subió' if rs > 0 else 'bajó'} su línea de fuerza relativa (precio ÷ índice)? Redondea a 1 decimal.",
                    "unit": "%", "a": abs(rs), "tol": 0.06,
                    "why": f"({es(p1, 2)} ÷ {es(i1, 2)}) ÷ ({es(p0, 2)} ÷ {es(i0, 2)}) − 1 = {'+' if rs > 0 else '−'}{es(abs(rs))} %. "
                           + ("Lo hizo mejor que el mercado en ese periodo." if rs > 0 else "Lo hizo peor que el mercado en ese periodo."),
                })

    # g2 · mayor hueco al alza del último año (apertura frente al cierre anterior) y si se ha cerrado después
    ult = h.iloc[-253:]
    gaps = (ult["Open"] / ult["Close"].shift(1) - 1).iloc[1:]
    if len(gaps):
        fg = gaps.idxmax()
        k = ult.index.get_loc(fg)
        prev_c, ap = round(float(ult["Close"].iloc[k - 1]), 2), round(float(ult["Open"].iloc[k]), 2)
        g = round((ap / prev_c - 1) * 100, 1)
        if 3 <= g < 100:
            despues = ult.iloc[k:]
            cerrado = despues[despues["Low"] <= prev_c]
            estado = ("Ese mismo día el precio volvió a " + u(prev_c) + " y cerró el hueco." if len(cerrado) and cerrado.index[0] == fg
                      else f"El {fecha(cerrado.index[0])} el precio volvió a {u(prev_c)} y cerró el hueco." if len(cerrado)
                      else f"Hasta el {fecha(f)} el precio no ha vuelto a {u(prev_c)}: el hueco sigue abierto.")
            out["g2"].append({**base,
                "q": f"El {fecha(fg)}, {nombre} abrió a {u(ap)} tras cerrar la sesión anterior a {u(prev_c)}. "
                     f"Fue su mayor hueco al alza del último año. ¿De cuánto fue? Redondea a 1 decimal.",
                "unit": "%", "a": g, "tol": 0.06,
                "why": f"{es(ap, 2)} ÷ {es(prev_c, 2)} − 1 = {es(g)} %. {estado}",
            })
    return out


def casos_divisa():
    """dv1 · rentabilidad del S&P 500 en dólares y en euros en el último año (EURUSD=X: dólares por euro)."""
    out = {"dv1": []}
    sp, fx = serie("^GSPC"), serie("EURUSD=X")
    # Cada serie viene en la zona horaria de su mercado: se comparan por fecha de calendario.
    for s_ in (sp, fx):
        s_.index = s_.index.tz_localize(None).normalize() if s_.index.tz is not None else s_.index.normalize()
    sp, fx = sp[~sp.index.duplicated()], fx[~fx.index.duplicated()]
    comun = sp.index.intersection(fx.index)
    if len(comun) < 250:
        return out
    f1 = comun[-1]
    hace = comun[comun <= f1 - dt.timedelta(days=365)]
    if not len(hace):
        return out
    f0 = hace[-1]
    i0, i1 = round(float(sp[f0]), 2), round(float(sp[f1]), 2)
    c0, c1 = round(float(fx[f0]), 4), round(float(fx[f1]), 4)
    r_usd = round((i1 / i0 - 1) * 100, 1)
    r_eur = round(((i1 / c1) / (i0 / c0) - 1) * 100, 1)
    if abs(r_eur) < 0.1:
        return out
    gana = r_eur > 0
    cambio = "se abarató" if c1 > c0 else "se encareció"
    out["dv1"].append({
        "t": "num", "caso": "S&P 500 en euros",
        "q": f"Del {fecha(f0)} al {fecha(f1)}, el S&P 500 pasó de {es(i0, 2)} a {es(i1, 2)} puntos y el euro, de {es(c0, 4)} a {es(c1, 4)} dólares. "
             f"Sin cubrir la divisa, ¿cuánto {'ganó' if gana else 'perdió'} en euros un inversor europeo? Redondea a 1 decimal.",
        "unit": "%", "a": abs(r_eur), "tol": 0.06,
        "why": f"({es(i1, 2)} ÷ {es(c1, 4)}) ÷ ({es(i0, 2)} ÷ {es(c0, 4)}) − 1 = {'+' if gana else '−'}{es(abs(r_eur))} %, frente a un "
               f"{'+' if r_usd >= 0 else '−'}{es(abs(r_usd))} % en dólares: el dólar {cambio} frente al euro. Es el índice sin dividendos.",
    })
    return out


def casos_oro():
    """io2 · oro (futuro continuo de Yahoo, GC=F, en dólares por onza): crecimiento a 10 años y mayor caída desde 2000."""
    out = {"io2": []}
    h = yf.Ticker("GC=F").history(period="max", interval="1d")["Close"].dropna()
    h = h[h.index >= "2000-01-01"]
    if len(h) < 3000:
        return out
    u = lambda v: f"{es(v, 2)} $"
    fin_f, fin_v = h.index[-1], round(float(h.iloc[-1]), 2)
    ini = h[h.index >= fin_f - dt.timedelta(days=3652)]
    ini_f, ini_v = ini.index[0], round(float(ini.iloc[0]), 2)
    g = round((fin_v / ini_v - 1) * 100, 1)
    if 0 < g < 1000:
        out["io2"].append({
            "t": "num", "caso": "Oro (futuro, $ por onza)",
            "q": f"La onza de oro cotizaba a {u(ini_v)} el {fecha(ini_f)} y a {u(fin_v)} el {fecha(fin_f)}. ¿Cuánto subió en esos 10 años? Redondea a 1 decimal.",
            "unit": "%", "a": g, "tol": 0.06,
            "why": f"{es(fin_v, 2)} ÷ {es(ini_v, 2)} − 1 = {es(g)} %. El oro no paga dividendos ni intereses: todo su rendimiento es la variación del precio.",
        })
    caida = h / h.cummax() - 1
    f_min = caida.idxmin()
    f_max = h[:f_min].idxmax()
    v_max, v_min = round(float(h[f_max]), 2), round(float(h[f_min]), 2)
    d = round((1 - v_min / v_max) * 100, 1)
    if 5 < d < 95:
        out["io2"].append({
            "t": "num", "caso": "Oro (futuro, $ por onza)",
            "q": f"La onza de oro marcó un máximo de {u(v_max)} el {fecha(f_max)} y cayó hasta {u(v_min)} el {fecha(f_min)}. ¿Cuánto cayó? Redondea a 1 decimal.",
            "unit": "%", "a": d, "tol": 0.06,
            "why": f"1 − {es(v_min, 2)} ÷ {es(v_max, 2)} = {es(d)} %. Es su mayor caída de cierre a cierre desde el {fecha(h.index[0])}: "
                   f"el oro diversifica, pero no es un activo sin riesgo.",
        })
    return out


def serie(tk, periodo="2y"):
    return yf.Ticker(tk).history(period=periodo, interval="1d")["Close"].dropna()


def casos_bonos():
    """Bonos de EE. UU. (Yahoo da la rentabilidad en %): duración (bh2) y pendiente de la curva (f8b)."""
    out = {"bh2": [], "f8b": []}
    diez = serie("^TNX")
    if len(diez) > 260:
        fin_f, fin_v = diez.index[-1], round(float(diez.iloc[-1]), 2)
        hace = diez[diez.index <= fin_f - dt.timedelta(days=365)]
        if len(hace):
            ini_f, ini_v = hace.index[-1], round(float(hace.iloc[-1]), 2)
            cambio = round(fin_v - ini_v, 2)
            if cambio != 0:
                efecto = round(8 * abs(cambio), 1)
                pide = "¿cuánto habría caído su precio, aproximadamente?" if cambio > 0 else "¿cuánto habría subido su precio, aproximadamente?"
                out["bh2"].append({
                    "t": "num", "caso": "Bono de EE. UU. a 10 años",
                    "q": f"La rentabilidad del bono de EE. UU. a 10 años pasó del {es(ini_v, 2)} % el {fecha(ini_f)} al {es(fin_v, 2)} % "
                         f"el {fecha(fin_f)}. Para un bono con duración 8, {pide} Redondea a 1 decimal.",
                    "unit": "%", "a": efecto, "tol": 0.06,
                    "why": f"Los tipos {'subieron' if cambio > 0 else 'bajaron'} {es(abs(cambio), 2)} puntos; 8 × {es(abs(cambio), 2)} = {es(efecto)} %. "
                           f"Cuando suben los tipos, el precio de los bonos que ya existen baja, y al revés.",
                })
    tres = serie("^IRX")
    if len(diez) and len(tres) and diez.index[-1] == tres.index[-1]:
        f = diez.index[-1]
        d10, d3 = round(float(diez.iloc[-1]), 2), round(float(tres.iloc[-1]), 2)
        pb = round((d10 - d3) * 100)
        if pb != 0:
            normal = pb > 0
            out["f8b"].append({
                "t": "num", "caso": "Curva de tipos de EE. UU.",
                "q": f"Al cierre del {fecha(f)}, el bono de EE. UU. a 10 años rendía un {es(d10, 2)} % y la letra a 3 meses, un {es(d3, 2)} %. "
                     + ("¿Cuántos puntos básicos paga de más el plazo largo?" if normal else "¿De cuántos puntos básicos es la inversión de la curva?"),
                "unit": "", "a": abs(pb), "tol": 0.5,
                "why": f"{es(d10, 2)} − {es(d3, 2)} = {es((d10 - d3), 2)} puntos, es decir, {abs(pb)} puntos básicos. "
                       + ("La curva tiene pendiente positiva: el plazo largo paga más, que es lo normal."
                          if normal else "La curva está invertida: el plazo corto paga más que el largo."),
            })
    return out


def main():
    ex = {k: [] for k in LECCIONES_CASOS}
    fallos = []
    try:
        sp = serie("^GSPC", "1y")
    except Exception as e:
        sp, _ = None, fallos.append(f"S&P 500: {e}")
    for tk in tickers():
        for fn in (casos_de, lambda x: casos_tecnicos(x, sp)):
            try:
                for k, v in fn(tk).items():
                    ex[k].extend(v)
            except Exception as e:  # un ticker sin datos no debe tumbar el resto
                fallos.append(f"{tk}: {e}")
    for nombre_f, fn in (("índices", casos_indices), ("bonos", casos_bonos), ("divisa", casos_divisa), ("oro", casos_oro)):
        try:
            for k, v in fn().items():
                ex[k].extend(v)
        except Exception as e:
            fallos.append(f"{nombre_f}: {e}")
    if not any(ex.values()):
        sys.exit("Sin datos: no se sobrescribe casos.json. " + "; ".join(fallos))
    hoy = dt.date.today()
    data = {"fuente": "Yahoo Finance", "fecha": hoy.strftime("%d/%m/%Y"), "ex": ex}
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"casos.json: {sum(len(v) for v in ex.values())} ejercicios", *(f"- aviso {f}" for f in fallos), sep="\n")


if __name__ == "__main__":
    main()
