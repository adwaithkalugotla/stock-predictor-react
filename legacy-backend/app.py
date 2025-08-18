# backend/app.py

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_caching import Cache

import yfinance as yf
import numpy as np
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA

app = Flask(__name__)

# ─── CORS ───────────────────────────────────────────────────────────────────
CORS(app, resources={r"/analyze": {"origins": "*"}})

# ─── Simple in-memory cache for history fetch ────────────────────────────────
app.config["CACHE_TYPE"]            = "SimpleCache"
app.config["CACHE_DEFAULT_TIMEOUT"] = 300   # 5 minutes
cache = Cache(app)


@cache.memoize()
def fetch_close(symbol: str, start: str, end: str) -> pd.Series:
    """
    Fetch 'Close' prices for a ticker, falling back to last 60 days if empty.
    """
    tkr = yf.Ticker(symbol)
    if start and end:
        # yfinance end is exclusive→ bump one day
        ed = pd.to_datetime(end) + pd.Timedelta(days=1)
        hist = tkr.history(
            start=start,
            end=ed.strftime("%Y-%m-%d")
        )["Close"]
        if hist.dropna().empty:
            hist = tkr.history(period="60d")["Close"]
    else:
        hist = tkr.history(period="60d")["Close"]

    return hist.dropna()


def compute_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    """
    Compute the 14-day RSI.
    """
    delta = series.diff()
    gain  = delta.clip(lower=0).rolling(window=period).mean()
    loss  = (-delta).clip(lower=0).rolling(window=period).mean()
    rs    = gain.div(loss).replace([np.inf, -np.inf], np.nan)
    return 100 - (100 / (1 + rs))


def analyze_symbol(symbol: str, start: str, end: str, spy0: float) -> dict | None:
    """
    For a single symbol:
      • Fetch history (cached)
      • Build indicators (SMA20, RSI14)
      • Fit ARIMA(5,1,0) & forecast 7 days
      • Compute AIC/BIC as evalScores
      • Generate Buy/Sell/None advice
      • Normalize vs SPY, summary stats
      • Bollinger bands
    """
    # 1) history
    close = fetch_close(symbol, start, end)
    if close.empty:
        return None
    close.index = pd.to_datetime(close.index)

    # 2) indicators
    sma20 = close.rolling(20).mean()
    rsi14 = compute_rsi(close)
    df    = pd.DataFrame({"close": close, "sma20": sma20, "rsi14": rsi14}).dropna()
    if len(df) < 20:
        return None

    # 3) fit ARIMA(5,1,0)
    try:
        mod = ARIMA(df["close"], order=(5, 1, 0))
        res = mod.fit()
    except Exception:
        return None

    # 4) evaluation scores
    eval_scores = {
        "aic": float(round(res.aic, 2)),
        "bic": float(round(res.bic, 2))
    }

    # 5) 7-day forecast
    fc = res.forecast(7)  # pandas Series
    last_dt = df.index[-1]
    predictions = [
        {
            "date":      (last_dt + pd.Timedelta(days=i)).strftime("%Y-%m-%d"),
            "predicted": float(round(val, 2))
        }
        for i, val in enumerate(fc, start=1)
    ]

    # 6) action advice at 1,7,14 days
    last_close = df["close"].iat[-1]
    actions = {}
    for days in (1, 7, 14):
        price = float(round(fc.iloc[min(days-1, len(fc)-1)], 2))
        if   price >= last_close * 1.02: act = "Buy"
        elif price <= last_close * 0.98: act = "Sell"
        else:                              act = "None"
        actions[str(days)] = {"price": price, "action": act}

    # 7) normalization vs SPY
    norm_vals  = (close / spy0).round(3).tolist()
    norm_dates = [d.strftime("%Y-%m-%d") for d in close.index]
    summary = {
        "mean":   float(round(np.mean(norm_vals), 2)),
        "median": float(round(np.median(norm_vals), 2)),
        "std":    float(round(np.std(norm_vals), 2)),
    }

    # 8) Bollinger bands
    roll_sma = close.rolling(20).mean()
    roll_std = close.rolling(20).std()
    upper    = [
        float(round(v, 2)) if not pd.isna(v) else None
        for v in (roll_sma + 2*roll_std)
    ]
    lower    = [
        float(round(v, 2)) if not pd.isna(v) else None
        for v in (roll_sma - 2*roll_std)
    ]
    bb_close = [float(round(x, 2)) for x in close.tolist()]

    return {
        "predictions":  predictions,
        "evalScores":   eval_scores,
        "actions":      actions,
        "normalized":   {"dates": norm_dates, "values": norm_vals},
        "summaryStats": summary,
        "bollinger":    {"dates": norm_dates, "upper": upper, "lower": lower, "close": bb_close}
    }


@app.route("/analyze", methods=["POST"])
def analyze():
    body    = request.get_json() or {}
    syms    = body.get("symbols", [])
    start   = body.get("start")
    end     = body.get("end")

    # must pick 1–4
    if not isinstance(syms, list) or not (1 <= len(syms) <= 4):
        return jsonify({"error": "Provide between 1–4 symbols"}), 400

    # include SPY first
    all_syms = ["SPY"] + [s.upper() for s in syms]

    # fetch SPY baseline
    spy_hist = fetch_close("SPY", start, end)
    if spy_hist.empty:
        return jsonify({"error": "No SPY data"}), 404
    spy0 = float(spy_hist.iat[0])

    out = {}
    for sym in all_syms:
        result = analyze_symbol(sym, start, end, spy0)
        if result is None:
            return jsonify({"error": f"No data for {sym}"}), 404
        out[sym] = result

    return jsonify(out)


if __name__ == "__main__":
    print("\n=== URL MAP ===")
    print(app.url_map)
    print("================\n")
    app.run(port=5000, debug=True)
