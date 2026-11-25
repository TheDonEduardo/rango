"""Genera src/content/semana.json: la «Operación de la semana», un ejercicio RETROSPECTIVO con velas reales de Yahoo Finance.

Uso:  python tools/semana.py [--fecha AAAA-MM-DD]   (requiere yfinance)
- Elige un valor de la cartera del bot (rota cada semana ISO, sin repetir el de la semana anterior).
- Formato: 30 sesiones diarias («data», «vol») que terminan 5 sesiones antes del último cierre disponible
  y esas 5 sesiones siguientes («despues»). El usuario ve solo el gráfico hasta «hasta»; al comprobar su plan,
  la app dibuja «despues» y calcula el resultado. Nunca se pide planificar sobre el precio actual de un valor real.
- No hay «prev»: cada semana es autocontenida (el historial vive en el dispositivo, S.sim).
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
    """Tramo pasado de tk: SESIONES sesiones y las DESPUES siguientes (las últimas disponibles, o hasta la fecha dada)."""
    t = yf.Ticker(tk)
    info = t.info or {}
    sym = CUR.get(info.get("currency") or "")
    if not sym:
        return None
    h = t.history(period="6mo", interval="1d").dropna(subset=["Open", "High", "Low", "Close"])
    if hasta:
        h = h[h.index.date <= dt.date.fromisoformat(hasta)]
    h = h.tail(SESIONES + DESPUES)
    if len(h) < SESIONES + DESPUES:
        return None
    previo, post = h.iloc[:SESIONES], h.iloc[SESIONES:]
    return {
        "ticker": tk, "nombre": limpio(info.get("shortName") or tk), "moneda": sym,
        "hasta": previo.index[-1].date().isoformat(), "data": velas(previo),
        "vol": [int(v // 1000) for v in previo["Volume"]], "step": paso(float(previo["Close"].iloc[-1])),
        "despues": velas(post),
    }


def main():
    # --fecha AAAA-MM-DD genera la operación como si fuera ese día (sirve para preparar la semana anterior).
    hoy = dt.date.fromisoformat(sys.argv[sys.argv.index("--fecha") + 1]) if "--fecha" in sys.argv else dt.date.today()
    corte = hoy.isoformat() if "--fecha" in sys.argv else None
    sem = semana_id(hoy)
    lista = tickers()
    anterior = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else None

    # Rota por número de semana y evita repetir el valor de la semana anterior.
    _, w, _ = hoy.isocalendar()
    ultimo = anterior.get("ticker") if anterior and anterior.get("semana") != sem else None
    actual = None
    for i in range(len(lista)):
        tk = lista[(w + i) % len(lista)]
        if tk == ultimo:
            continue
        actual = grafico(tk, corte)
        if actual:
            break
    if not actual:
        sys.exit("Sin datos para la operación de la semana: no se sobrescribe semana.json.")

    data = {"semana": sem, "fuente": "Yahoo Finance", **actual}
    OUT.write_text(json.dumps(data, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"semana.json: {sem} {actual['ticker']} hasta {actual['hasta']} (+{len(actual['despues'])} sesiones siguientes)")


if __name__ == "__main__":
    main()
