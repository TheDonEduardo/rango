"""Genera src/content/historico.json: rentabilidad anual real de acciones y bonos para el simulador de cartera.

En dólares: ETF SPY (S&P 500) e IEF (deuda de EE. UU. a 7-10 años), ajustados por dividendos y cupones.
En euros: ETF de acumulación EUNL.DE (MSCI World) y XGLE.DE (deuda pública de la zona euro).
Rentabilidad total de cierre de año a cierre de año; solo años naturales completos. Datos de Yahoo Finance.
Uso: python tools/historico.py   (una vez al año, en enero; requiere yfinance)
"""
import datetime as dt
import json
import sys
from pathlib import Path

import yfinance as yf

OUT = Path(__file__).resolve().parent.parent / "src" / "content" / "historico.json"


def anuales(tk):
    h = yf.Ticker(tk).history(period="max", interval="1d", auto_adjust=True)["Close"].dropna()
    fin = h.groupby(h.index.year).last()   # último cierre ajustado de cada año
    return {int(a): round((fin[a] / fin[a - 1] - 1) * 100, 1) for a in fin.index if a - 1 in fin.index}


def serie(acciones, bonos, minimo):
    acc, bon = anuales(acciones), anuales(bonos)
    ultimo = dt.date.today().year - 1   # el año en curso no está completo
    anos = [a for a in sorted(set(acc) & set(bon)) if a <= ultimo]
    if len(anos) < minimo or anos != list(range(anos[0], anos[-1] + 1)):
        sys.exit(f"Datos insuficientes de {acciones}/{bonos}: no se sobrescribe historico.json")
    return {"anos": anos, "acciones": [acc[a] for a in anos], "bonos": [bon[a] for a in anos]}


def main():
    # Dólares: S&P 500 (SPY) y deuda de EE. UU. a 7-10 años (IEF). Euros: MSCI World de acumulación (EUNL.DE)
    # y deuda pública de la zona euro de acumulación (XGLE.DE); cotizan desde 2009, así que la serie es más corta.
    data = {"fuente": "Yahoo Finance", "fecha": dt.date.today().strftime("%d/%m/%Y")}
    data.update(serie("SPY", "IEF", 15))
    data["eur"] = serie("EUNL.DE", "XGLE.DE", 12)
    OUT.write_text(json.dumps(data, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"historico.json: {data['anos'][0]}-{data['anos'][-1]} en dólares, {data['eur']['anos'][0]}-{data['eur']['anos'][-1]} en euros")


if __name__ == "__main__":
    main()
