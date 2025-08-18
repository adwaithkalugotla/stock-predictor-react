// src/App.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SplashScreen from './components/SplashScreen';
import Navbar from './components/Navbar';
import InfoTooltip from './components/InfoTooltip';
import StockForm from './components/StockForm';
import PredictionChartMulti from './components/PredictionChartMulti';
import NormalizedChart from './components/NormalizedChart';
import StatsTable from './components/StatsTable';
import EvalTable from './components/EvalTable';
import ActionTable from './components/ActionTable';
import BollingerChart from './components/BollingerChart';
import './index.css';

// Use env var in prod; fall back to same-origin /api (works on Vercel)
const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Render splash screen until animation finishes
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  const handleAnalyze = async ({ symbols, start, end }) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols, start, end }),
      });

      // If the function failed (404/500), trying to parse JSON throws the "Unexpected end" error.
      // So check res.ok first and try to read a short error message if available.
      if (!res.ok) {
        let msg = 'Server error';
        try {
          const maybe = await res.json();
          if (maybe?.error) msg = maybe.error;
        } catch {
          // ignore parse error; keep generic message
        }
        throw new Error(msg);
      }

      const json = await res.json();
      setAnalysis(json);
    } catch (e) {
      setError(e.message || 'Something went wrong');
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  const section = (idx, children) => (
    <motion.div
      key={idx}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.15, duration: 0.5 }}
      className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl"
    >
      {children}
    </motion.div>
  );

  const downloadCSV = () => {
    if (!analysis) return;
    const symbols = Object.keys(analysis.forecasts || {});
    if (!symbols.length) return;

    const dates = analysis.forecasts[symbols[0]].map((pt) => pt.date);
    const header = ['Date', ...symbols].join(',');
    const rows = dates.map((date, i) =>
      [date, ...symbols.map((s) => analysis.forecasts[s][i].value)].join(',')
    );
    const csv = [header, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '7_day_forecast.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <div className="relative">
        {/* Gradient fades at sides */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-900" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-gray-50 to-transparent dark:from-gray-900" />

        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="flex-1 w-full mx-auto py-12 px-8 lg:px-16 space-y-10"
        >
          {section(
            1,
            <>
              <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                Pick up to 4 Symbols & Date Range
                <InfoTooltip text="Enter up to four tickers (e.g., AAPL). Be sure your start/end dates span at least 80 days—this gives the model enough history to learn price patterns reliably." />
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                For accurate forecasts, select a period of <strong>80 days or more</strong>. A longer history helps the model identify trends and avoid overfitting.
              </p>
              {error && <p className="text-red-500 mb-2">{error}</p>}
              <StockForm onSubmit={handleAnalyze} loading={loading} />
            </>
          )}

          <AnimatePresence>
            {analysis && [
              section(
                2,
                <>
                  <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-1">
                    7-Day Forecast
                    <InfoTooltip text="This line chart shows our model’s predicted closing price for each symbol over the next seven days. Helps you anticipate short-term uptrends or downtrends." />
                  </h2>
                  <PredictionChartMulti data={analysis} />
                </>
              ),

              section(
                3,
                <>
                  <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-1">
                    Normalized vs SPY
                    <InfoTooltip text="Compares each stock’s performance to the S&P 500 by scaling all series to 1.0 on the start date—so you can see who out- or under-performed the market." />
                  </h2>
                  <NormalizedChart data={analysis} />
                </>
              ),

              section(
                4,
                <>
                  <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-1">
                    Summary Statistics
                    <InfoTooltip text="Mean/Median show typical daily return; Std shows volatility over your window. Use these to gauge behaviour and risk before trusting the forecast." />
                  </h2>
                  <StatsTable stats={analysis} />
                </>
              ),

              section(
                5,
                <>
                  <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-1">
                    Model Evaluation Scores
                    <InfoTooltip text="Error metrics (MAE, RMSE, MAPE) indicate how well the model fit past data—lower values usually mean more reliable forecasts." />
                  </h2>
                  <EvalTable scores={analysis} />
                </>
              ),

              section(
                6,
                <>
                  <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-1">
                    Action Recommendations
                    <InfoTooltip text="Simple Buy/Hold/Sell suggestions based on the 7-day forecast: Buy if a rise is predicted, Sell if a drop, Hold if flat." />
                  </h2>
                  <ActionTable actions={analysis} />
                </>
              ),

              section(
                7,
                <>
                  <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-1">
                    Bollinger Bands
                    <InfoTooltip text="A moving average with bands at ±2 standard deviations. Prices near the top band may be overbought; near the bottom band, oversold." />
                  </h2>
                  <BollingerChart data={analysis} />
                </>
              ),

              <motion.div
                key="cta"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.3, duration: 0.5 }}
                className="flex justify-end gap-4"
              >
                <button
                  onClick={downloadCSV}
                  className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-6 py-3 rounded-lg hover:opacity-90 transition"
                >
                  Download CSV
                </button>
                <a
                  href="https://github.com/adwaith-kalugotla/stock-predictor-react"
                  target="_blank"
                  rel="noreferrer"
                  className="border border-gray-600 dark:border-gray-400 text-gray-800 dark:text-gray-200 px-6 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  View Details
                </a>
              </motion.div>,
            ]}
          </AnimatePresence>

          <motion.footer
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6, duration: 0.5 }}
            className="mt-16 text-center"
          >
            <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">
              Let’s Connect
            </h2>
            <div className="flex justify-center gap-4">
              <a
                href="https://www.linkedin.com/in/adwaith-kalugotla-68720831a/"
                target="_blank"
                rel="noreferrer"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition"
              >
                LinkedIn
              </a>
              <a
                href="https://github.com/adwaith-kalugotla/stock-predictor-react"
                target="_blank"
                rel="noreferrer"
                className="border border-gray-600 dark:border-gray-400 text-gray-800 dark:text-gray-200 px-6 py-3 rounded-lg transition"
              >
                GitHub
              </a>
            </div>
          </motion.footer>
        </motion.main>
      </div>
    </div>
  );
}
