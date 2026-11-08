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

if fallos:
    print("FALLOS:\n- " + "\n- ".join(fallos))
    sys.exit(1)
print("OK: generador de casos (sin methodology, sin estimaciones, ajustado, fecha de cierre)")
