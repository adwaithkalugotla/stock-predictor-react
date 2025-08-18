# api/lib/analysis.py

from __future__ import annotations

import time
from typing import Dict, List, Any

import numpy as np
import pandas as pd
import yfinance as yf
from statsmodels.tsa.arima.model import ARIMA

# -----------------------------------------------------------------------------
# Simple in-memory cache (serverless-friendly). Lives for the life of the
# function instance; entries expire after CACHE_TTL seconds.
# -----------------------------------------------------------------------------
_CACHE: Dict[tuple, tuple] = {}  # key -> (expiry_ts, pd.Series)
CACHE_TTL = 300  # 5 minutes


def _cache_get(key: tuple) -> pd.Series | None:
    hit = _CACHE.get(key)
    if not hit:
        return None
    expiry, val = hit
    if time.time() > expiry:
        _CACHE.pop(key, None)
        return None
    return val


def _cache_set(key: tuple, val: pd.Series) -> None:
    _CACHE[key] = (time.time() + CACHE_TTL, val)


# -----------------------------------------------------------------------------
# Data fetch & indicators (matches your backend/app.py semantics)
# -----------------------------------------------------------------------------
def fetch_close(symbol: str, start: str | None, end: str | None) -> pd.Series:
    """
    Fetch 'Close' prices for a ticker, falling back to last 60 days if empty.
    (Same behavior as backend/app.py, plus a small in-memory cache.)
    """
    cache_key = (symbol, start or "", end or "")
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    tkr = yf.Ticker(symbol)
    if start and end:
        # yfinance end is exclusive → bump one day to include the end date
        ed = pd.to_datetime(end) + pd.Timedelta(days=1)
        hist = tkr.history(start=start, end=ed.strftime("%Y-%m-%d"))["Close"]
        if hist.dropna().empty:
            hist = tkr.history(period="60d")["Close"]
    else:
        hist = tkr.history(period="60d")["Close"]

    out = hist.dropna()
    _cache_set(cache_key, out)
    return out


def compute_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    """
    Compute the 14-day RSI (unchanged).
    """
    delta = series.diff()
    gain = delta.clip(lower=0).rolling(window=period).mean()
    loss = (-delta).clip(lower=0).rolling(window=period).mean()
    rs = gain.div(loss).replace([np.inf, -np.inf], np.nan)
    return 100 - (100 / (1 + rs))


def analyze_symbol(symbol: str, start: str, end: str, spy0: float) -> dict | None:
    """
    Matches your original analyze_symbol:
      • history (cached)
      • SMA20, RSI14
      • ARIMA(5,1,0) forecast 7d
      • AIC/BIC
      • Buy/Sell/None for 1/7/14d
      • Normalized vs SPY, summary stats
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
    df = pd.DataFrame({"close": close, "sma20": sma20, "rsi14": rsi14}).dropna()
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
        "bic": float(round(res.bic, 2)),
    }

    # 5) 7-day forecast
    fc = res.forecast(7)  # pandas Series
    last_dt = df.index[-1]
    predictions = [
        {
            "date": (last_dt + pd.Timedelta(days=i)).strftime("%Y-%m-%d"),
            "predicted": float(round(val, 2)),
        }
        for i, val in enumerate(fc, start=1)
    ]

    # 6) action advice at 1,7,14 days
    last_close = df["close"].iat[-1]
    actions: Dict[str, Dict[str, Any]] = {}
    for days in (1, 7, 14):
        price = float(round(fc.iloc[min(days - 1, len(fc) - 1)], 2))
        if price >= last_close * 1.02:
            act = "Buy"
        elif price <= last_close * 0.98:
            act = "Sell"
        else:
            act = "None"
        actions[str(days)] = {"price": price, "action": act}

    # 7) normalization vs SPY
    norm_vals = (close / spy0).round(3).tolist()
    norm_dates = [d.strftime("%Y-%m-%d") for d in close.index]
    summary = {
        "mean": float(round(np.mean(norm_vals), 2)),
        "median": float(round(np.median(norm_vals), 2)),
        "std": float(round(np.std(norm_vals), 2)),
    }

    # 8) Bollinger bands
    roll_sma = close.rolling(20).mean()
    roll_std = close.rolling(20).std()
    upper = [
        float(round(v, 2)) if not pd.isna(v) else None for v in (roll_sma + 2 * roll_std)
    ]
    lower = [
        float(round(v, 2)) if not pd.isna(v) else None for v in (roll_sma - 2 * roll_std)
    ]
    bb_close = [float(round(x, 2)) for x in close.tolist()]

    return {
        "predictions": predictions,
        "evalScores": eval_scores,
        "actions": actions,
        "normalized": {"dates": norm_dates, "values": norm_vals},
        "summaryStats": summary,
        "bollinger": {"dates": norm_dates, "upper": upper, "lower": lower, "close": bb_close},
    }


def run_analysis(symbols: List[str], start: str, end: str) -> Dict[str, Any]:
    """
    Public API called by api/analyze.py.
    - Enforces 1–4 symbols.
    - Auto-includes SPY first (baseline).
    - Returns dict keyed by symbol, same as your original /analyze.
    """
    if not isinstance(symbols, list) or not (1 <= len(symbols) <= 4):
        raise ValueError("Provide between 1–4 symbols")

    all_syms = ["SPY"] + [s.upper() for s in symbols]

    # Fetch SPY baseline
    spy_hist = fetch_close("SPY", start, end)
    if spy_hist.empty:
        raise ValueError("No SPY data")
    spy0 = float(spy_hist.iat[0])

    out: Dict[str, Any] = {}
    for sym in all_syms:
        result = analyze_symbol(sym, start, end, spy0)
        if result is None:
            raise ValueError(f"No data for {sym}")
        out[sym] = result

    return out
