# backend/app.py

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_caching import Cache

import os
import signal
import yfinance as yf
import numpy as np
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA


# ─── Flask Setup ──────────────────────────────────────────────────────────────
app = Flask(__name__)

# Global CORS (important: even errors will return CORS headers)
ALLOWED = os.getenv("ALLOWED_ORIGINS", "*").split(",")
CORS(app, resources={r"/*": {"origins": ALLOWED}})
print("DEBUG CORS ORIGINS:", ALLOWED)


@app.get("/ping")
def ping():
    """Simple health check endpoint."""
    return "pong", 200


# ─── Cache Configuration ──────────────────────────────────────────────────────
app.config["CACHE_TYPE"] = "SimpleCache"
app.config["CACHE_DEFAULT_TIMEOUT"] = 300  # 5 minutes
cache = Cache(app)


# ─── Helper Functions ─────────────────────────────────────────────────────────
@cache.memoize()
def fetch_close(symbol: str, start: str, end: str) -> pd.Series:
    """
    Fetch 'Close' prices for a ticker, falling back to last 60 days if empty.
    """
    tkr = yf.Ticker(symbol)
    try:
        if start and end:
            ed = pd.to_datetime(end) + pd.Timedelta(days=1)  # end is exclusive
            hist = tkr.history(start=start, end=ed.strftime("%Y-%m-%d"))["Close"]
            if hist.dropna().empty:
                hist = tkr.history(period="60d")["Close"]
        else:
            hist = tkr.history(period="60d")["Close"]
        return hist.dropna()
    except Exception as e:
        print(f"⚠️ Error fetching {symbol}: {e}")
        return pd.Series(dtype=float)


def compute_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    """Compute the 14-day RSI."""
    delta = series.diff()
    gain = delta.clip(lower=0).rolling(window=period).mean()
    loss = (-delta).clip(lower=0).rolling(window=period).mean()
    rs = gain.div(loss).replace([np.inf, -np.inf], np.nan)
    return 100 - (100 / (1 + rs))


# Timeout signal for long ARIMA fits
class TimeoutException(Exception):
    pass


def handler(signum, frame):
    raise TimeoutException()


signal.signal(signal.SIGALRM, handler)


def analyze_symbol(symbol: str, start: str, end: str, spy0: float) -> dict | None:
    """
    Analyze a single symbol with technical indicators and ARIMA forecast.
    """
    close = fetch_close(symbol, start, end)
    if close.empty:
        print(f"⚠️ No data for {symbol}")
        return None
    close.index = pd.to_datetime(close.index)

    sma20 = close.rolling(20).mean()
    rsi14 = compute_rsi(close)
    df = pd.DataFrame({"close": close, "sma20": sma20, "rsi14": rsi14}).dropna()

    if len(df) < 20:
        print(f"⚠️ Insufficient data for {symbol}")
        return None

    # ─── Limit data length and fit lightweight ARIMA ───────────────────────────
    try:
        # Limit data length for Render (RAM-safe)
        if len(df) > 300:
            df = df.tail(300)

        signal.alarm(15)  # 15-second timeout limit

        mod = ARIMA(df["close"], order=(1, 1, 1))
        res = mod.fit(method_kwargs={"maxiter": 50})

        signal.alarm(0)  # cancel alarm
    except TimeoutException:
        print(f"⏰ ARIMA timed out for {symbol}")
        return None
    except Exception as e:
        print(f"⚠️ ARIMA failed for {symbol}: {e}")
        return None

    # ─── Evaluation Scores ─────────────────────────────────────────────────────
    eval_scores = {
        "aic": float(round(res.aic, 2)),
        "bic": float(round(res.bic, 2))
    }

    # ─── 7-Day Forecast ────────────────────────────────────────────────────────
    fc = res.forecast(7)
    last_dt = df.index[-1]
    predictions = [
        {
            "date": (last_dt + pd.Timedelta(days=i)).strftime("%Y-%m-%d"),
            "predicted": float(round(val, 2))
        }
        for i, val in enumerate(fc, start=1)
    ]

    # ─── Buy/Sell/None Recommendations ─────────────────────────────────────────
    last_close = df["close"].iat[-1]
    actions = {}
    for days in (1, 7, 14):
        price = float(round(fc.iloc[min(days - 1, len(fc) - 1)], 2))
        if price >= last_close * 1.02:
            act = "Buy"
        elif price <= last_close * 0.98:
            act = "Sell"
        else:
            act = "None"
        actions[str(days)] = {"price": price, "action": act}

    # ─── Normalized vs SPY ─────────────────────────────────────────────────────
    norm_vals = (close / spy0).round(3).tolist()
    norm_dates = [d.strftime("%Y-%m-%d") for d in close.index]
    summary = {
        "mean": float(round(np.mean(norm_vals), 2)),
        "median": float(round(np.median(norm_vals), 2)),
        "std": float(round(np.std(norm_vals), 2)),
    }

    # ─── Bollinger Bands ───────────────────────────────────────────────────────
    roll_sma = close.rolling(20).mean()
    roll_std = close.rolling(20).std()
    upper = [
        float(round(v, 2)) if not pd.isna(v) else None
        for v in (roll_sma + 2 * roll_std)
    ]
    lower = [
        float(round(v, 2)) if not pd.isna(v) else None
        for v in (roll_sma - 2 * roll_std)
    ]
    bb_close = [float(round(x, 2)) for x in close.tolist()]

    return {
        "predictions": predictions,
        "evalScores": eval_scores,
        "actions": actions,
        "normalized": {"dates": norm_dates, "values": norm_vals},
        "summaryStats": summary,
        "bollinger": {
            "dates": norm_dates,
            "upper": upper,
            "lower": lower,
            "close": bb_close
        },
    }


# ─── Analyze Route ────────────────────────────────────────────────────────────
@app.route("/analyze", methods=["POST"])
def analyze():
    body = request.get_json() or {}
    syms = body.get("symbols", [])
    start = body.get("start")
    end = body.get("end")

    if not isinstance(syms, list) or not (1 <= len(syms) <= 4):
        return jsonify({"error": "Provide between 1–4 symbols"}), 400

    all_syms = ["SPY"] + [s.upper() for s in syms]

    spy_hist = fetch_close("SPY", start, end)
    if spy_hist.empty:
        return jsonify({"error": "No SPY data"}), 404
    spy0 = float(spy_hist.iat[0])

    out = {}
    for sym in all_syms:
        result = analyze_symbol(sym, start, end, spy0)
        if result is None:
            out[sym] = {"error": "Computation failed or timed out"}
        else:
            out[sym] = result

    return jsonify(out)


# ─── Run ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\n=== URL MAP ===")
    print(app.url_map)
    print("================\n")
    app.run(port=5000, debug=True)
