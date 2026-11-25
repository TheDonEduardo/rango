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

# 2) Gráfico retrospectivo: 30 sesiones y las 5 siguientes (ya conocidas), con el corte 5 sesiones antes de la fecha.
g = mod.grafico("AAA", "2026-04-10")
if not g or len(g["data"]) != mod.SESIONES or len(g["vol"]) != mod.SESIONES:
    fallos.append("grafico no devuelve 30 sesiones con su volumen")
elif g["nombre"] != "AAA" or g["moneda"] != "$" or g["vol"][0] < 1000:
    fallos.append(f"grafico con datos inesperados: nombre {g['nombre']}, moneda {g['moneda']}")
elif g["hasta"] != "2026-04-03" or len(g["despues"]) != mod.DESPUES:
    fallos.append(f"el corte no queda 5 sesiones antes: hasta {g['hasta']}, {len(g.get('despues', []))} sesiones después")
elif g["despues"][0][3] <= g["data"][-1][3]:
    fallos.append("las sesiones de después no son posteriores a las del gráfico")

# 3) Sin moneda conocida o con menos de 35 sesiones: no hay gráfico.
if cargar(fake_yf(datos, moneda="JPY"), tmp).grafico("AAA", "2026-04-10") is not None:
    fallos.append("grafico acepta una moneda sin símbolo")
mod = cargar(fake_yf({"AAA": historia("2026-01-05", 34)}), tmp)
if mod.grafico("AAA", None) is not None:
    fallos.append("grafico acepta menos de 35 sesiones")

# 4) Primera semana: formato plano, sin «prev», con «despues».
mod = cargar(fake_yf(datos), tmp)
s1 = ejecutar(mod, "2026-04-10")
if "prev" in s1 or s1.get("semana") != "2026-W15" or s1.get("ticker") not in datos:
    fallos.append(f"primera semana inesperada: {s1.get('semana')} {s1.get('ticker')} prev={'prev' in s1}")
elif not 1 <= len(s1.get("despues", [])) <= mod.DESPUES or s1.get("fuente") != "Yahoo Finance":
    fallos.append("la semana no trae las sesiones siguientes o la fuente")

# 5) Semana siguiente: otro valor, también retrospectivo y sin «prev».
s2 = ejecutar(mod, "2026-04-17")
if s2.get("ticker") == s1["ticker"]:
    fallos.append("repite el valor de la semana anterior")
if "prev" in s2 or s2["hasta"] <= s1["hasta"] or len(s2["despues"]) != mod.DESPUES:
    fallos.append("la segunda semana no es un tramo pasado nuevo")

# 6) Misma semana regenerada: mismo valor.
s3 = ejecutar(mod, "2026-04-16")
if s3.get("ticker") != s2["ticker"]:
    fallos.append("al regenerar la misma semana cambia el valor")

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
print("OK: generador de la operación de la semana (paso, gráfico, semana nueva, tramo pasado con sesiones siguientes, sin datos)")
