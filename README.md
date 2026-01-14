# 📈 Stock Price Predictor

A full-stack stock analysis and forecasting web application that allows users to analyze up to 4 stock tickers using historical market data, technical indicators, and time-series forecasting models.

## Live Demo
- **Frontend (Vercel):** https://stock-predictor-react.vercel.app  
- **Backend (Render):** https://stock-predictor-react.onrender.com

> ⚠️ Educational/analytical tool — **not financial advice**.

---

## 🧠 What This Project Does

- Fetches historical stock data using **Yahoo Finance (yfinance)**
- Computes:
  - Simple Moving Average (**SMA**)
  - Relative Strength Index (**RSI**)
  - **Bollinger Bands**
- Trains a lightweight **ARIMA (1,1,1)** model per ticker
- Produces:
  - **7-day price forecasts**
  - **Buy / Sell / Hold** recommendations
  - **Normalized comparison vs SPY**
- Visualizes results using interactive charts

---

## 🏗️ Tech Stack

### Frontend
- React (Vite)
- Tailwind CSS
- Framer Motion
- Chart.js / custom chart components
- Deployed on Vercel

### Backend
- Flask
- yfinance
- pandas / numpy
- statsmodels (ARIMA)
- Flask-CORS + Flask-Caching
- Deployed on Render

---

## 🧩 Architecture Overview

User (Browser)  
↓  
React Frontend (Vercel)  
↓ `POST /analyze`  
Flask API (Render)  
↓  
Yahoo Finance (yfinance)  
↓  
Indicators + ARIMA Forecast  
↓  
JSON Response → Charts

---

## 🔌 API Endpoints

### Health Check
`GET /ping`

Response:
```txt
pong
