# legacy-backend/services/market_data.py

import os
from datetime import datetime, timedelta

import pandas as pd
import requests
import yfinance as yf
from cachetools import TTLCache
from dotenv import load_dotenv

load_dotenv()

POLYGON_API_KEY = os.getenv("POLYGON_API_KEY", "").strip()
CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL_SECONDS", "900"))

market_cache = TTLCache(maxsize=100, ttl=CACHE_TTL_SECONDS)


class MarketDataError(Exception):
    pass


def get_close_prices(symbol: str, start: str | None = None, end: str | None = None) -> tuple[pd.Series, str]:
    """
    Primary source: Polygon.io
    Fallback source: yfinance

    Returns:
        close_prices: pd.Series with DateTimeIndex
        source: polygon, yfinance_fallback, or cache
    """
    symbol = symbol.upper().strip()
    cache_key = f"{symbol}_{start}_{end}"

    if cache_key in market_cache:
        return market_cache[cache_key], "cache"

    try:
        close = fetch_close_from_polygon(symbol, start, end)
        source = "polygon"
    except Exception as polygon_error:
        print(f"[WARN] Polygon failed for {symbol}: {polygon_error}")

        try:
            close = fetch_close_from_yfinance(symbol, start, end)
            source = "yfinance_fallback"
        except Exception as yf_error:
            print(f"[ERROR] yfinance fallback failed for {symbol}: {yf_error}")
            raise MarketDataError(
                f"Unable to fetch market data for {symbol}. Please try again later."
            )

    if close is None or close.dropna().empty:
        raise MarketDataError(f"No market data found for {symbol}.")

    close = close.dropna()
    market_cache[cache_key] = close

    return close, source


def fetch_close_from_polygon(symbol: str, start: str | None = None, end: str | None = None) -> pd.Series:
    if not POLYGON_API_KEY:
        raise MarketDataError("Missing POLYGON_API_KEY")

    if start and end:
        start_date = pd.to_datetime(start).date()
        end_date = pd.to_datetime(end).date()
    else:
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=90)

    url = (
        f"https://api.polygon.io/v2/aggs/ticker/{symbol}/range/1/day/"
        f"{start_date}/{end_date}"
    )

    params = {
        "adjusted": "true",
        "sort": "asc",
        "limit": 5000,
        "apiKey": POLYGON_API_KEY,
    }

    response = requests.get(url, params=params, timeout=10)

    if response.status_code != 200:
        raise MarketDataError(f"Polygon API error: {response.status_code}")

    data = response.json()

    if "results" not in data or not data["results"]:
        raise MarketDataError("Polygon returned no results.")

    rows = []

    for item in data["results"]:
        rows.append({
            "Date": pd.to_datetime(item["t"], unit="ms"),
            "Close": item["c"],
        })

    df = pd.DataFrame(rows)

    if df.empty:
        raise MarketDataError("Polygon dataframe was empty.")

    df = df.sort_values("Date").set_index("Date")

    return df["Close"]


def fetch_close_from_yfinance(symbol: str, start: str | None = None, end: str | None = None) -> pd.Series:
    ticker = yf.Ticker(symbol)

    if start and end:
        adjusted_end = pd.to_datetime(end) + pd.Timedelta(days=1)
        hist = ticker.history(start=start, end=adjusted_end.strftime("%Y-%m-%d"))["Close"]

        if hist.dropna().empty:
            hist = ticker.history(period="60d")["Close"]
    else:
        hist = ticker.history(period="60d")["Close"]

    if hist is None or hist.dropna().empty:
        raise MarketDataError("yfinance returned no results.")

    hist.index = pd.to_datetime(hist.index)

    return hist.dropna()