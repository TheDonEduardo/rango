"""Genera src/content/historico.json: rentabilidad anual real de acciones y bonos para el simulador de cartera.

Acciones: ETF SPY (S&P 500). Bonos: ETF IEF (deuda de EE. UU. a 7-10 años). Precios de Yahoo Finance ajustados por
dividendos y cupones (rentabilidad total), en dólares. Solo años naturales completos.
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


def main():
    acc, bon = anuales("SPY"), anuales("IEF")
    ultimo = dt.date.today().year - 1   # el año en curso no está completo
    anos = [a for a in sorted(set(acc) & set(bon)) if a <= ultimo]
    # El primer año de cada ETF es parcial (empieza a cotizar a mitad de año): se descarta.
    anos = anos[1:]
    if len(anos) < 15 or anos != list(range(anos[0], anos[-1] + 1)):
        sys.exit("Datos insuficientes: no se sobrescribe historico.json")
    data = {"fuente": "Yahoo Finance", "fecha": dt.date.today().strftime("%d/%m/%Y"), "anos": anos,
            "acciones": [acc[a] for a in anos], "bonos": [bon[a] for a in anos]}
    OUT.write_text(json.dumps(data, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"historico.json: {anos[0]}-{anos[-1]}")


if __name__ == "__main__":
    main()
