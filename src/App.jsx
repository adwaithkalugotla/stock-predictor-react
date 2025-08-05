// src/App.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SplashScreen from './components/SplashScreen';
import Navbar from './components/Navbar';
import InfoTooltip from './components/InfoTooltip';
import StockForm from './components/StockForm';
import PredictionChartMulti from './components/PredictionChartMulti';
import NormalizedChart from './components/NormalizedChart';
import StatsTable      from './components/StatsTable';
import EvalTable       from './components/EvalTable';
import ActionTable     from './components/ActionTable';
import BollingerChart  from './components/BollingerChart';
import './index.css';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [analysis,  setAnalysis]    = useState(null);
  const [loading,   setLoading]     = useState(false);
  const [error,     setError]       = useState('');

  // show splash until video ends
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  const handleAnalyze = async ({ symbols, start, end }) => {
    setError('');
    setLoading(true);
    try {
      const res  = await fetch('http://127.0.0.1:5000/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols, start, end })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Server error');
      setAnalysis(json);
    } catch (e) {
      setError(e.message);
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
    const dates   = analysis.forecasts[symbols[0]].map(pt => pt.date);
    const header  = ['Date', ...symbols].join(',');
    const rows    = dates.map((date, i) =>
      [date, ...symbols.map(s => analysis.forecasts[s][i].value)].join(',')
    );
    const csv     = [header, ...rows].join('\n');
    const blob    = new Blob([csv], { type: 'text/csv' });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement('a');
    a.href        = url;
    a.download    = '7_day_forecast.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <div className="relative">
        {/* side fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-32
                        bg-gradient-to-r from-gray-50 to-transparent
                        dark:from-gray-900" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-32
                        bg-gradient-to-l from-gray-50 to-transparent
                        dark:from-gray-900" />

        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="flex-1 w-full mx-auto py-12 px-8 lg:px-16 space-y-10"
        >
          {section(1,
            <>
              <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                Pick up to 4 Symbols & Date Range
                <InfoTooltip text="Pick up to 4 tickers (e.g. AAPL). Be sure your start/end dates span at least 60 days—this gives the model enough history to learn price patterns reliably." />
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                For accurate forecasts, select a period of **60 days or more**. A longer history helps the model identify trends and avoid overfitting.
              </p>
              {error && <p className="text-red-500 mb-2">{error}</p>}
              <StockForm onSubmit={handleAnalyze} loading={loading} />
            </>
          )}

          <AnimatePresence>
            {analysis && [
              section(2,
                <>
                  <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-1">
                    7-Day Forecast
                    <InfoTooltip text="Predicted closing prices for each symbol over the next seven days." />
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    The chart displays daily predicted prices—use it to spot upcoming uptrends or downtrends.
                  </p>
                  <PredictionChartMulti data={analysis} />
                </>
              ),

              section(3,
                <>
                  <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-1">
                    Normalized vs SPY
                    <InfoTooltip text="Compares each stock’s performance to the S&P 500 index over the selected period." />
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Values are scaled so you can see which stocks are stronger or weaker than the overall market.
                  </p>
                  <NormalizedChart data={analysis} />
                </>
              ),

              section(4,
                <>
                  <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-1">
                    Summary Statistics
                    <InfoTooltip text="Key metrics such as average price, volatility, and total return during your chosen window." />
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Review these to understand how the stock behaved historically before trusting the forecast.
                  </p>
                  <StatsTable stats={analysis} />
                </>
              ),

              section(5,
                <>
                  <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-1">
                    Model Evaluation Scores
                    <InfoTooltip text="Error metrics showing how well our model predicted past data—lower is better." />
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Check these scores to gauge confidence—smaller errors mean more reliable forecasts.
                  </p>
                  <EvalTable scores={analysis} />
                </>
              ),

              section(6,
                <>
                  <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-1">
                    Action Recommendations
                    <InfoTooltip text="Automated buy/hold/sell suggestions based on the 7-day forecast." />
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Use these at a glance to guide your next move.
                  </p>
                  <ActionTable actions={analysis} />
                </>
              ),

              section(7,
                <>
                  <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-1">
                    Bollinger Bands
                    <InfoTooltip text="Shows typical price range (upper/lower bands) plus current price position." />
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Prices near the upper band may be overbought; near the lower band, oversold—helping time entries/exits.
                  </p>
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
                  className="bg-gradient-to-r from-purple-500 to-indigo-600
                             text-white px-6 py-3 rounded-lg hover:opacity-90 transition"
                >
                  Download CSV
                </button>
                <a
                  href="https://github.com/adwaith-kalugotla/stock-predictor-react"
                  target="_blank"
                  rel="noreferrer"
                  className="border border-gray-600 dark:border-gray-400
                             text-gray-800 dark:text-gray-200 px-6 py-3 rounded-lg
                             hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  View Details
                </a>
              </motion.div>
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
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3
                           rounded-lg transition"
              >
                LinkedIn
              </a>
              <a
                href="https://github.com/adwaith-kalugotla/stock-predictor-react"
                target="_blank"
                rel="noreferrer"
                className="border border-gray-600 dark:border-gray-400
                           text-gray-800 dark:text-gray-200 px-6 py-3 rounded-lg
                           transition"
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
