"""Prueba el generador de casos (tools/casos.py) con datos simulados, sin red.
Uso: python -I tools/test_casos.py
"""
import importlib.util
import sys
import types
from pathlib import Path

import pandas as pd

AQUI = Path(__file__).resolve().parent
fallos = []


def cargar(fake_yf):
    sys.modules["yfinance"] = fake_yf
    spec = importlib.util.spec_from_file_location("casos", AQUI / "casos.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def ticker(earnings):
    fechas = pd.to_datetime(["2026-09-30", "2026-06-30", "2026-03-31", "2025-12-31", "2025-09-30"])
    q = pd.DataFrame([[1000e6, 950e6, 900e6, 850e6, 800e6], [600e6, 560e6, 530e6, 500e6, 470e6]],
                     index=["Total Revenue", "Gross Profit"], columns=fechas)
    t = types.SimpleNamespace()
    t.info = {"shortName": "Prueba Inc.", "financialCurrency": "USD", "currency": "USD", "currentPrice": 100.0,
              "trailingEps": 4.0, "regularMarketTime": 1794268800, "sector": "Technology"}
    t.quarterly_income_stmt = q
    t.quarterly_cashflow = pd.DataFrame()
    t.earnings_history = earnings
    return t


def fake(earnings):
    return types.SimpleNamespace(Ticker=lambda tk: ticker(earnings))


idx = pd.to_datetime(["2025-12-31", "2026-03-31", "2026-06-30", "2026-09-30"])

# 1) Sin columna methodology: no se genera ningún caso de sorpresas (no se sabe si es ajustado).
sin_metodo = pd.DataFrame({"epsActual": [1.1, 1.2, 1.3, 1.4], "epsEstimate": [1.0, 1.1, 1.2, 1.3]}, index=idx)
out = cargar(fake(sin_metodo)).casos_de("TEST")
if out["f5a"]:
    fallos.append("sin methodology genera casos de sorpresas")

# 2) Estimaciones vacías: no se cae y conserva los demás casos de la empresa.
vacio = pd.DataFrame({"epsActual": [None] * 4, "epsEstimate": [None] * 4, "methodology": ["normalized"] * 4}, index=idx)
try:
    out = cargar(fake(vacio)).casos_de("TEST")
    if not out["f1a"] or not out["f6a"]:
        fallos.append("sin estimaciones se pierden los demás casos")
except Exception as e:
    fallos.append(f"sin estimaciones lanza {type(e).__name__}: {e}")

# 3) Ajustado completo: genera la sorpresa y el recuento; precio fechado al cierre de mercado, no hoy.
ok = pd.DataFrame({"epsActual": [1.1, 1.0, 1.3, 1.4], "epsEstimate": [1.0, 1.1, 1.2, 1.3],
                   "methodology": ["normalized"] * 4}, index=idx)
mod = cargar(fake(ok))
out = mod.casos_de("TEST")
recuento = [e for e in out["f5a"] if "table" in e]
if len(out["f5a"]) != 2 or not recuento or recuento[0]["a"] != 3:
    fallos.append(f"ajustado: se esperaban 2 casos y 3 batidas, hay {out['f5a']}")
per = [e for e in out["f2a"] if "cierre del" in e["q"]]
if not per:
    fallos.append("el PER no se fecha al cierre de mercado")
if set(out) != set(mod.LECCIONES_CASOS):
    fallos.append("casos_de no usa LECCIONES_CASOS")

# 4) ROIC y revisiones de estimaciones: cuentas con las cifras que ve el usuario y plural correcto.
f4 = pd.to_datetime(["2026-09-30", "2026-06-30", "2026-03-31", "2025-12-31"])
qi = pd.DataFrame([[250e6] * 4, [50e6] * 4, [200e6] * 4], index=["Operating Income", "Tax Provision", "Pretax Income"], columns=f4)
bs = pd.DataFrame([[400e6], [100e6], [700e6]], index=["Total Debt", "Cash Cash Equivalents And Short Term Investments", "Stockholders Equity"],
                  columns=pd.to_datetime(["2026-09-30"]))
trend = pd.DataFrame({"current": [5.5], "90daysAgo": [5.0]}, index=["0y"])
revs = pd.DataFrame({"upLast30days": [1], "downLast30days": [3]}, index=["0y"])
rt = types.SimpleNamespace(info={"shortName": "Prueba Inc.", "financialCurrency": "USD", "sector": "Technology"},
                           quarterly_income_stmt=qi, quarterly_balance_sheet=bs, eps_trend=trend, eps_revisions=revs)
mod = cargar(types.SimpleNamespace(Ticker=lambda tk: rt))
out = mod.casos_roic_estimaciones("TEST")
# 1.000 × (1 − 0,25) = 750; capital invertido 400 + 700 − 100 = 1.000 → 75 %
if [e["a"] for e in out["f7a"]] != [75.0]:
    fallos.append(f"ROIC mal calculado: {out['f7a']}")
if [e["a"] for e in out["f10b"]] != [10.0, 25.0] or "1 analista subió" not in out["f10b"][1]["q"]:
    fallos.append(f"revisiones mal calculadas: {[(e['a'], e['q']) for e in out['f10b']]}")
rt.info = dict(rt.info, sector="Financial Services")
if mod.casos_roic_estimaciones("TEST")["f7a"]:
    fallos.append("ROIC en un banco")

# 5) Casos técnicos con velas simuladas: cifras coherentes, nada negativo y tamaño redondeado hacia abajo.
import numpy as np
dias = pd.bdate_range("2024-11-01", periods=300, tz="America/New_York")
cierre = pd.Series(np.linspace(50, 80, 300), index=dias)
velas = pd.DataFrame({"Open": cierre.shift(1).fillna(50), "High": cierre + 1, "Low": cierre - 1, "Close": cierre}, index=dias)
velas.iloc[200, velas.columns.get_loc("Open")] = cierre.iloc[199] * 1.08  # hueco del 8 %, que se cierra al día siguiente
velas.iloc[200, velas.columns.get_loc("Low")] = cierre.iloc[199] * 1.07
tec = types.SimpleNamespace(info={"shortName": "Prueba Inc.", "currency": "USD"}, history=lambda **k: velas)
mod = cargar(types.SimpleNamespace(Ticker=lambda tk: tec))
indice = pd.Series(np.linspace(4000, 4400, 300), index=dias)
out = mod.casos_tecnicos("TEST", indice)
for k in ("t1", "t2", "r1", "r2", "rs1", "g2"):
    if not out[k]:
        fallos.append(f"casos técnicos: sin casos de {k}")
    for e in out[k]:
        if e["a"] < 0 or e["a"] >= 1000:
            fallos.append(f"casos técnicos: respuesta fuera de rango en {k}: {e['a']}")
if out["r2"]:
    atr = float(out["r2"][0]["q"].split("es de ")[1].split(" ")[0].replace(",", "."))
    if out["r2"][0]["a"] != int(500 // (2 * atr)):
        fallos.append(f"casos técnicos: tamaño mal redondeado ({out['r2'][0]['a']} con ATR {atr})")
if out["g2"] and ("8,0 %" not in out["g2"][0]["why"] or "11/08/2025 el precio volvió" not in out["g2"][0]["why"]):
    fallos.append(f"casos técnicos: hueco mal medido: {out['g2'][0]['why']}")
if out["t2"] and "lo cumple" not in out["t2"][-1]["why"]:
    fallos.append("casos técnicos: +60 % sobre el mínimo debería cumplir el criterio de Minervini")

# Básico: resultado de un año (subida y caída) y recuperación tras la mayor caída.
dias = pd.date_range("2024-01-01", "2026-11-06", freq="B")
n = len(dias)
sube = pd.DataFrame({"Close": [100 + 50 * i / (n - 1) for i in range(n)]}, index=dias)
baja = pd.DataFrame({"Close": [100 - 40 * i / (n - 1) for i in range(n)]}, index=dias)
for nombre_s, datos, verbo in (("sube", sube, "subió"), ("baja", baja, "cayó")):
    m = cargar(types.SimpleNamespace(Ticker=lambda tk, d=datos: types.SimpleNamespace(
        info={"shortName": "Prueba Inc.", "currency": "USD"}, history=lambda **k: d)))
    m.tickers = lambda: ["TEST"]
    ob = m.casos_basico()
    if not ob["ba1"] or verbo not in ob["ba1"][0]["q"] or not (0 < ob["ba1"][0]["a"] < 1000):
        fallos.append(f"casos básico ({nombre_s}): ba1 mal generado: {ob['ba1'][:1]}")
    if not ob["bd1"] or verbo not in ob["bd1"][0]["q"]:
        fallos.append(f"casos básico ({nombre_s}): bd1 mal generado")
    if nombre_s == "baja":
        if not ob["bb1"]:
            fallos.append("casos básico: falta bb1 con una caída del 40 %")
        else:
            e = ob["bb1"][0]
            if abs(e["a"] - 66.7) > 0.11 or "40,0 %" not in e["q"]:
                fallos.append(f"casos básico: recuperación mal calculada: {e['a']} · {e['q']}")
    elif ob["bb1"]:
        fallos.append("casos básico: bb1 sin caída relevante")

if fallos:
    print("FALLOS:\n- " + "\n- ".join(fallos))
    sys.exit(1)
print("OK: generador de casos (sin methodology, sin estimaciones, ajustado, fecha de cierre, ROIC, revisiones, técnicos, básico)")
