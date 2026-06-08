# legacy-backend/app.py

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_caching import Cache

import os
import signal
import platform

import numpy as np
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA

from services.market_data import get_close_prices, MarketDataError


# ─── Flask Setup ──────────────────────────────────────────────────────────────
app = Flask(__name__)


# ─── Global CORS ──────────────────────────────────────────────────────────────
raw_origins = os.getenv("ALLOWED_ORIGINS", "*")

ALLOWED = [
    origin.strip().rstrip("/")
    for origin in raw_origins.replace("\n", ",").replace("\r", ",").split(",")
    if origin.strip()
]

if not ALLOWED:
    ALLOWED = ["*"]

CORS(app, resources={r"/*": {"origins": ALLOWED}})
print("DEBUG CORS ORIGINS:", ALLOWED)


# ─── Cache Configuration ──────────────────────────────────────────────────────
app.config["CACHE_TYPE"] = "SimpleCache"
app.config["CACHE_DEFAULT_TIMEOUT"] = int(os.getenv("CACHE_TTL_SECONDS", "900"))  # 15 minutes
cache = Cache(app)


# ─── Health Check Routes ──────────────────────────────────────────────────────
@app.get("/")
def home():
    return jsonify({
        "status": "ok",
        "service": "stock-predictor-backend",
        "message": "Backend is running"
    }), 200


@app.get("/ping")
def ping():
    return jsonify({
        "status": "ok",
        "message": "pong"
    }), 200


@app.get("/health")
def health_check():
    return jsonify({
        "status": "ok",
        "service": "stock-predictor-backend"
    }), 200


# ─── Helper Functions ─────────────────────────────────────────────────────────
@cache.memoize()
def fetch_close(symbol: str, start: str, end: str) -> tuple[pd.Series, str]:
    """
    Fetch Close prices using Polygon first, then yfinance fallback.

    Returns:
        close_prices, data_source
    """
    try:
        return get_close_prices(symbol, start, end)
    except MarketDataError as e:
        print(f"⚠️ Market data error for {symbol}: {e}")
        return pd.Series(dtype=float), "failed"


def compute_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    """
    Compute RSI using rolling average gains/losses.
    """
    delta = series.diff()
    gain = delta.clip(lower=0).rolling(window=period).mean()
    loss = (-delta).clip(lower=0).rolling(window=period).mean()
    rs = gain.div(loss).replace([np.inf, -np.inf], np.nan)
    return 100 - (100 / (1 + rs))


def build_signal_recommendations(
    close: pd.Series,
    df: pd.DataFrame,
    forecast: pd.Series
) -> dict:
    """
    Build Buy/Sell/Hold recommendations with confidence scores.

    Uses:
    - ARIMA forecast expected return
    - RSI
    - 20-day SMA
    - Bollinger Band position
    """
    last_close = float(df["close"].iat[-1])
    last_sma20 = float(df["sma20"].iat[-1])
    last_rsi14 = float(df["rsi14"].iat[-1])

    latest_roll_sma = close.rolling(20).mean()
    latest_roll_std = close.rolling(20).std()
    latest_upper_band = latest_roll_sma + 2 * latest_roll_std
    latest_lower_band = latest_roll_sma - 2 * latest_roll_std

    valid_upper = latest_upper_band.dropna()
    valid_lower = latest_lower_band.dropna()

    if valid_upper.empty or valid_lower.empty:
        last_upper_band = None
        last_lower_band = None
    else:
        last_upper_band = float(valid_upper.iat[-1])
        last_lower_band = float(valid_lower.iat[-1])

    actions = {}

    for days in (1, 7, 14):
        forecast_index = min(days - 1, len(forecast) - 1)
        forecast_price = float(round(forecast.iloc[forecast_index], 2))

        expected_return = ((forecast_price - last_close) / last_close) * 100

        bullish_score = 0
        bearish_score = 0
        reasons = []

        # 1. Forecast trend signal
        if expected_return >= 2:
            bullish_score += 35
            reasons.append(
                f"Forecasted price is {round(expected_return, 2)}% above the latest close."
            )
        elif expected_return <= -2:
            bearish_score += 35
            reasons.append(
                f"Forecasted price is {round(abs(expected_return), 2)}% below the latest close."
            )
        else:
            reasons.append(
                "Forecasted price is close to the latest close, suggesting limited short-term movement."
            )

        # 2. RSI signal
        if last_rsi14 < 30:
            bullish_score += 25
            reasons.append(
                f"RSI is {round(last_rsi14, 2)}, which may indicate the stock is oversold."
            )
        elif last_rsi14 > 70:
            bearish_score += 25
            reasons.append(
                f"RSI is {round(last_rsi14, 2)}, which may indicate the stock is overbought."
            )
        else:
            reasons.append(
                f"RSI is {round(last_rsi14, 2)}, which is in a neutral range."
            )

        # 3. SMA signal
        if last_close > last_sma20:
            bullish_score += 20
            reasons.append(
                "Latest close is above the 20-day moving average."
            )
        elif last_close < last_sma20:
            bearish_score += 20
            reasons.append(
                "Latest close is below the 20-day moving average."
            )
        else:
            reasons.append(
                "Latest close is near the 20-day moving average."
            )

        # 4. Bollinger Band signal
        if last_upper_band is not None and last_lower_band is not None:
            if last_close <= last_lower_band:
                bullish_score += 20
                reasons.append(
                    "Price is near or below the lower Bollinger Band."
                )
            elif last_close >= last_upper_band:
                bearish_score += 20
                reasons.append(
                    "Price is near or above the upper Bollinger Band."
                )
            else:
                reasons.append(
                    "Price is trading within the Bollinger Bands."
                )
        else:
            reasons.append(
                "Bollinger Band signal was unavailable due to limited rolling-window data."
            )

        net_score = bullish_score - bearish_score

        if net_score >= 25:
            signal = "Buy"
            confidence = min(100, 50 + net_score)
        elif net_score <= -25:
            signal = "Sell"
            confidence = min(100, 50 + abs(net_score))
        else:
            signal = "Hold"
            confidence = max(40, 60 - abs(net_score))

        actions[str(days)] = {
            "price": forecast_price,
            "action": signal,
            "confidence": int(round(confidence)),
            "expectedReturnPercent": float(round(expected_return, 2)),
            "bullishScore": int(bullish_score),
            "bearishScore": int(bearish_score),
            "reasons": reasons
        }

    return actions


# ─── Timeout Handling ─────────────────────────────────────────────────────────
class TimeoutException(Exception):
    pass


def timeout_handler(signum, frame):
    raise TimeoutException()


SUPPORTS_SIGALRM = platform.system() != "Windows"

if SUPPORTS_SIGALRM:
    signal.signal(signal.SIGALRM, timeout_handler)


def start_arima_timeout(seconds: int = 15):
    """
    SIGALRM works on Linux/macOS but not Windows.
    On Windows, this function does nothing.
    """
    if SUPPORTS_SIGALRM:
        signal.alarm(seconds)


def cancel_arima_timeout():
    """
    Cancel SIGALRM timeout if supported.
    """
    if SUPPORTS_SIGALRM:
        signal.alarm(0)


def analyze_symbol(symbol: str, start: str, end: str, spy0: float) -> dict | None:
    """
    Analyze a single symbol with SMA, RSI, Bollinger Bands, normalized comparison,
    ARIMA forecast, and confidence-based Buy/Sell/Hold recommendations.
    """
    symbol = symbol.upper().strip()
    close, data_source = fetch_close(symbol, start, end)

    if close.empty:
        print(f"⚠️ No data for {symbol}")
        return None

    close.index = pd.to_datetime(close.index)

    sma20 = close.rolling(20).mean()
    rsi14 = compute_rsi(close)

    df = pd.DataFrame({
        "close": close,
        "sma20": sma20,
        "rsi14": rsi14
    }).dropna()

    if len(df) < 20:
        print(f"⚠️ Insufficient data for {symbol}")
        return None

    # ─── ARIMA Forecast ────────────────────────────────────────────────────────
    try:
        # Limit data length for memory safety on free hosting
        if len(df) > 300:
            df = df.tail(300)

        start_arima_timeout(15)

        mod = ARIMA(df["close"], order=(1, 1, 1))
        res = mod.fit(method_kwargs={"maxiter": 50})

        cancel_arima_timeout()

    except TimeoutException:
        cancel_arima_timeout()
        print(f"⏰ ARIMA timed out for {symbol}")
        return None

    except Exception as e:
        cancel_arima_timeout()
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

    # ─── Buy/Sell/Hold Recommendations with Confidence ────────────────────────
    actions = build_signal_recommendations(close, df, fc)

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
        "dataSource": data_source,
        "predictions": predictions,
        "evalScores": eval_scores,
        "actions": actions,
        "normalized": {
            "dates": norm_dates,
            "values": norm_vals
        },
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
    try:
        body = request.get_json() or {}
        syms = body.get("symbols", [])
        start = body.get("start")
        end = body.get("end")

        if not isinstance(syms, list) or not (1 <= len(syms) <= 4):
            return jsonify({
                "success": False,
                "error": "Please provide between 1 and 4 stock symbols."
            }), 400

        cleaned_syms = []

        for sym in syms:
            if not isinstance(sym, str) or not sym.strip():
                return jsonify({
                    "success": False,
                    "error": "Each stock symbol must be a valid text value."
                }), 400

            cleaned_syms.append(sym.upper().strip())

        all_syms = ["SPY"] + cleaned_syms

        spy_hist, spy_source = fetch_close("SPY", start, end)

        if spy_hist.empty:
            return jsonify({
                "success": False,
                "error": "Unable to fetch SPY benchmark data. Please try again later."
            }), 503

        spy0 = float(spy_hist.iat[0])

        out = {
            "success": True,
            "data_source": "polygon_primary_yfinance_fallback",
            "spy_data_source": spy_source,
            "cache_ttl_seconds": app.config["CACHE_DEFAULT_TIMEOUT"],
            "results": {}
        }

        for sym in all_syms:
            result = analyze_symbol(sym, start, end, spy0)

            if result is None:
                out["results"][sym] = {
                    "dataSource": "failed",
                    "error": "Computation failed, timed out, or not enough market data was available."
                }
            else:
                out["results"][sym] = result

        return jsonify(out), 200

    except Exception as e:
        print(f"❌ Analyze route failed: {e}")
        return jsonify({
            "success": False,
            "error": "Something went wrong while analyzing the stock data. Please try again."
        }), 500


# ─── Run ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\n=== URL MAP ===")
    print(app.url_map)
    print("================\n")

    app.run(
        host="0.0.0.0",
        port=int(os.getenv("PORT", "5000")),
        debug=True
    )