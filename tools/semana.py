"""Genera src/content/semana.json: la «Operación de la semana» con velas reales de Yahoo Finance.

Uso:  python tools/semana.py   (requiere yfinance)
- Elige un valor de la cartera del bot (rota cada semana ISO) y guarda sus últimas 30 sesiones diarias.
- Si el archivo ya tenía la operación de una semana anterior, la pasa a «prev» y le añade las sesiones
  posteriores («despues», hasta 5): con ellas la app enseña qué habría pasado con el plan del usuario.
"""
import datetime as dt
import json
import math
import sys
from pathlib import Path

import yfinance as yf

sys.path.insert(0, str(Path(__file__).resolve().parent))
from casos import CUR, limpio, tickers  # noqa: E402  (misma cartera y mismos criterios que los casos)

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "content" / "semana.json"
SESIONES = 30
DESPUES = 5
PASOS = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50]


def paso(precio):
    """Paso de arrastre «redondo», cercano a un 0,25 % del precio."""
    objetivo = precio / 400
    return min(PASOS, key=lambda p: abs(math.log(p / objetivo)))


def velas(df):
    return [[round(float(r.Open), 2), round(float(r.High), 2), round(float(r.Low), 2), round(float(r.Close), 2)]
            for r in df.itertuples()]


def semana_id(d):
    y, w, _ = d.isocalendar()
    return f"{y}-W{w:02d}"


def grafico(tk, hasta=None):
    t = yf.Ticker(tk)
    info = t.info or {}
    sym = CUR.get(info.get("currency") or "")
    if not sym:
        return None
    h = t.history(period="6mo", interval="1d").dropna(subset=["Open", "High", "Low", "Close"])
    if hasta:
        h = h[h.index.date <= dt.date.fromisoformat(hasta)]
    h = h.tail(SESIONES)
    if len(h) < SESIONES:
        return None
    ultimo = float(h["Close"].iloc[-1])
    return {
        "ticker": tk, "nombre": limpio(info.get("shortName") or tk), "moneda": sym,
        "hasta": h.index[-1].date().isoformat(), "data": velas(h),
        "vol": [int(v // 1000) for v in h["Volume"]], "step": paso(ultimo),
    }


def despues_de(tk, hasta):
    h = yf.Ticker(tk).history(period="1mo", interval="1d").dropna(subset=["Open", "High", "Low", "Close"])
    h = h[h.index.date > dt.date.fromisoformat(hasta)].head(DESPUES)
    return velas(h)


def main():
    # --fecha AAAA-MM-DD genera la operación como si fuera ese día (sirve para preparar la semana anterior).
    hoy = dt.date.fromisoformat(sys.argv[sys.argv.index("--fecha") + 1]) if "--fecha" in sys.argv else dt.date.today()
    corte = hoy.isoformat() if "--fecha" in sys.argv else None
    sem = semana_id(hoy)
    lista = tickers()
    anterior = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else None

    prev = None
    if anterior and anterior.get("semana") != sem:
        prev = {k: anterior[k] for k in ("semana", "ticker", "nombre", "moneda", "hasta", "data", "vol", "step")}
    elif anterior and anterior.get("prev"):
        prev = anterior["prev"]  # misma semana regenerada: se conserva la anterior
    if prev:
        prev["despues"] = despues_de(prev["ticker"], prev["hasta"])

    # Rota por número de semana y evita repetir el valor de la semana anterior.
    _, w, _ = hoy.isocalendar()
    actual = None
    for i in range(len(lista)):
        tk = lista[(w + i) % len(lista)]
        if prev and tk == prev["ticker"]:
            continue
        actual = grafico(tk, corte)
        if actual:
            break
    if not actual:
        sys.exit("Sin datos para la operación de la semana: no se sobrescribe semana.json.")

    data = {"semana": sem, "fuente": "Yahoo Finance", **actual}
    if prev:
        data["prev"] = prev
    OUT.write_text(json.dumps(data, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"semana.json: {sem} {actual['ticker']} hasta {actual['hasta']}"
          + (f"; anterior {prev['semana']} {prev['ticker']} con {len(prev['despues'])} sesiones después" if prev else ""))


if __name__ == "__main__":
    main()
