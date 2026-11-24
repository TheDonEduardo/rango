"""Prueba el generador de la Operación de la semana (tools/semana.py) con datos simulados, sin red.
Uso: python -I tools/test_semana.py
Escribe en un archivo temporal: nunca toca src/content/semana.json.
"""
import importlib.util
import json
import os
import sys
import tempfile
import types
from pathlib import Path

import pandas as pd

AQUI = Path(__file__).resolve().parent
fallos = []


def historia(desde, n, base=100.0):
    """n sesiones diarias (días laborables) desde una fecha, con precios que suben 1 al día."""
    idx = pd.bdate_range(desde, periods=n)
    c = [base + i for i in range(n)]
    return pd.DataFrame({"Open": [x - 0.5 for x in c], "High": [x + 1 for x in c], "Low": [x - 1 for x in c],
                         "Close": c, "Volume": [1_500_000 + i * 1000 for i in range(n)]}, index=idx)


def fake_yf(datos, moneda="USD"):
    """datos: {ticker: DataFrame}. Un ticker sin datos devuelve una tabla vacía."""
    def ticker(tk):
        t = types.SimpleNamespace()
        t.info = {"currency": moneda, "shortName": f"{tk} Inc."}
        t.history = lambda period=None, interval=None: datos.get(tk, historia("2026-01-05", 0)).copy()
        return t
    return types.SimpleNamespace(Ticker=ticker)


def cargar(yf, salida):
    sys.modules["yfinance"] = yf
    for nombre in ("casos", "semana"):
        sys.modules.pop(nombre, None)
    spec = importlib.util.spec_from_file_location("semana", AQUI / "semana.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    mod.OUT = salida
    return mod


def ejecutar(mod, fecha):
    sys.argv = ["semana.py", "--fecha", fecha]
    mod.main()
    return json.loads(mod.OUT.read_text(encoding="utf-8"))


os.environ["RANGO_TICKERS"] = "AAA,BBB,CCC"
tmp = Path(tempfile.mkdtemp()) / "semana.json"
datos = {tk: historia("2026-01-05", 120, base) for tk, base in (("AAA", 50.0), ("BBB", 100.0), ("CCC", 400.0))}
mod = cargar(fake_yf(datos), tmp)

# 1) Paso de arrastre: el valor «redondo» más cercano a un 0,25 % del precio.
for precio, esperado in ((100, 0.2), (400, 1), (20, 0.05)):
    if mod.paso(precio) != esperado:
        fallos.append(f"paso({precio}) = {mod.paso(precio)}, se esperaba {esperado}")

# 2) Gráfico: 30 sesiones hasta la fecha de corte, con volumen en miles y nombre limpio.
g = mod.grafico("AAA", "2026-04-10")
if not g or len(g["data"]) != mod.SESIONES or len(g["vol"]) != mod.SESIONES:
    fallos.append("grafico no devuelve 30 sesiones con su volumen")
elif g["hasta"] != "2026-04-10" or g["nombre"] != "AAA" or g["moneda"] != "$" or g["vol"][0] < 1000:
    fallos.append(f"grafico con datos inesperados: hasta {g['hasta']}, nombre {g['nombre']}, moneda {g['moneda']}")

# 3) Sin moneda conocida o con menos de 30 sesiones: no hay gráfico.
if cargar(fake_yf(datos, moneda="JPY"), tmp).grafico("AAA", "2026-04-10") is not None:
    fallos.append("grafico acepta una moneda sin símbolo")
mod = cargar(fake_yf({"AAA": historia("2026-01-05", 20)}), tmp)
if mod.grafico("AAA", None) is not None:
    fallos.append("grafico acepta menos de 30 sesiones")

# 4) Primera semana: sin «prev».
mod = cargar(fake_yf(datos), tmp)
s1 = ejecutar(mod, "2026-04-10")
if "prev" in s1 or s1.get("semana") != "2026-W15" or s1.get("ticker") not in datos:
    fallos.append(f"primera semana inesperada: {s1.get('semana')} {s1.get('ticker')} prev={'prev' in s1}")

# 5) Semana siguiente: la anterior pasa a «prev» con hasta 5 sesiones posteriores, y no repite valor.
s2 = ejecutar(mod, "2026-04-17")
prev = s2.get("prev") or {}
if prev.get("semana") != s1["semana"] or prev.get("ticker") != s1["ticker"]:
    fallos.append("la semana anterior no pasa a prev")
elif not 1 <= len(prev.get("despues", [])) <= mod.DESPUES:
    fallos.append(f"prev con {len(prev.get('despues', []))} sesiones después (se esperaban de 1 a {mod.DESPUES})")
elif prev["despues"][0][3] <= prev["data"][-1][3]:
    fallos.append("las sesiones de después no son posteriores a las del gráfico")
if s2.get("ticker") == s1["ticker"]:
    fallos.append("repite el valor de la semana anterior")

# 6) Misma semana regenerada: conserva la anterior.
s3 = ejecutar(mod, "2026-04-16")
if (s3.get("prev") or {}).get("semana") != s1["semana"]:
    fallos.append("al regenerar la misma semana se pierde prev")

# 7) Sin datos de ningún valor: sale con error y no sobrescribe el archivo.
antes = tmp.read_text(encoding="utf-8")
mod = cargar(fake_yf({}), tmp)
try:
    ejecutar(mod, "2026-04-24")
    fallos.append("sin datos no sale con error")
except SystemExit:
    pass
if tmp.read_text(encoding="utf-8") != antes:
    fallos.append("sin datos sobrescribe semana.json")

if fallos:
    print("FALLOS:\n- " + "\n- ".join(fallos))
    sys.exit(1)
print("OK: generador de la operación de la semana (paso, gráfico, semana nueva, prev con sesiones posteriores, sin datos)")
