📈 Stock Price Predictor

A full-stack stock analysis and forecasting web application that allows users to analyze up to 4 stock tickers using historical market data, technical indicators, and time-series forecasting models.

Live Demo
Frontend (Vercel):
👉 https://stock-predictor-react.vercel.app

Backend (Render):
👉 https://stock-predictor-react.onrender.com

🧠 What This Project Does

Fetches historical stock data using Yahoo Finance

Computes:

Simple Moving Average (SMA)

RSI (Relative Strength Index)

Bollinger Bands

Trains a lightweight ARIMA (1,1,1) model per ticker

Produces:

7-day price forecasts

Buy / Sell / Hold recommendations

Normalized comparison vs SPY

Visualizes results using interactive charts

⚠️ This is an educational / analytical tool — not financial advice.

🏗️ Tech Stack
Frontend

React (Vite)

Tailwind CSS

Framer Motion

Chart.js / custom chart components

Deployed on Vercel

Backend

Flask

yfinance

pandas / numpy

statsmodels (ARIMA)

Flask-CORS + Flask-Caching

Deployed on Render

🧩 Architecture Overview
User (Browser)
   ↓
React Frontend (Vercel)
   ↓ POST /analyze
Flask API (Render)
   ↓
Yahoo Finance (yfinance)
   ↓
ARIMA + Indicators
   ↓
JSON Response

🔌 API Endpoints
Health Check
GET /ping


Response:

pong

Analyze Stocks
POST /analyze


Request Body

{
  "symbols": ["AAPL", "AMZN"],
  "start": "2025-10-01",
  "end": "2025-12-29"
}


Rules

1–4 symbols only

Symbols must be valid tickers (e.g., AAPL, NVDA)

Date range should span ≥ 80 days for best results

🌍 Environment Variables
Frontend (Vercel)
VITE_API_URL=https://stock-predictor-react.onrender.com


The app includes a production fallback if this variable is missing.

Backend (Render)

Optional:

ALLOWED_ORIGINS=https://stock-predictor-react.vercel.app

🚀 Deployment Details (IMPORTANT)
Frontend

Platform: Vercel

Repo: stock-predictor-react

Auto-deploys from main branch

Uses VITE_API_URL to reach backend

Backend

Platform: Render

Runtime: Python 3

Start command:

python app.py


Base URL:

https://stock-predictor-react.onrender.com


If the backend URL changes, update Vercel → Environment Variables → VITE_API_URL, then redeploy.

🧪 Local Development
Backend
cd backend
pip install -r requirements.txt
python app.py


Backend runs at:

http://localhost:5000

Frontend
npm install
npm run dev


Frontend runs at:

http://localhost:5173

🐛 Common Issues & Fixes
❌ 404 on /analyze

Backend URL changed or Render service asleep

Fix: update VITE_API_URL in Vercel and redeploy

❌ No SPY data

Yahoo Finance temporary outage

Retry after a few minutes

❌ App crashes on invalid ticker

Example: NDA instead of NVDA

Fix: frontend validation (planned improvement)

🔮 Planned Improvements

Ticker symbol validation & autocomplete

Graceful handling of partial failures

Caching optimization

Model comparison (ARIMA vs Prophet / LSTM)

Saved analysis sessions

👤 Author

Adwaith Kalugotla

LinkedIn: https://www.linkedin.com/in/adwaith-kalugotla-68720831a

GitHub: https://github.com/adwaithKalugotla

📄 License

MIT License