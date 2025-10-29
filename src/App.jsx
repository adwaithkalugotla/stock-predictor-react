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

// 🔧 Base API configuration
const RAW_API = import.meta.env.VITE_API_URL;
const API_BASE = (RAW_API && typeof RAW_API === 'string')
  ? RAW_API.replace(/\/+$/, '')   // remove trailing slashes
  : 'https://stock-predictor-react.onrender.com';  // fallback for production

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAnalyze = async ({ symbols, start, end }) => {
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // 🚀 ensure payload is clean JSON
        body: JSON.stringify({ symbols, start, end }),
      });

      if (!res.ok) {
        let msg = `Server error (${res.status})`;
        try {
          const maybe = await res.json();
          if (maybe?.error) msg = maybe.error;
        } catch (_) {
          /* ignore */
        }
        throw new Error(msg);
      }

      const json = await res.json();
      setAnalysis(json);
    } catch (err) {
      console.error('Fetch failed:', err);
      setError('Failed to fetch. Please try again.');
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

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <div className="relative">
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
                <InfoTooltip text="Enter up to four tickers (e.g., AAPL). Ensure your start/end dates span at least 80 days for accurate forecasting." />
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                For accurate forecasts, select a period of <strong>80 days or more</strong>. A longer history helps the model identify trends and avoid overfitting.
              </p>
              {error && <p className="text-red-500 mb-2">{error}</p>}
              <StockForm onSubmit={handleAnalyze} loading={loading} />
            </>
          )}

          <AnimatePresence>
            {analysis && (
              <>
                {section(2, <>
                  <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-1">
                    7-Day Forecast
                  </h2>
                  <PredictionChartMulti data={analysis} />
                </>)}

                {section(3, <>
                  <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-1">
                    Normalized vs SPY
                  </h2>
                  <NormalizedChart data={analysis} />
                </>)}

                {section(4, <>
                  <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-1">
                    Summary Statistics
                  </h2>
                  <StatsTable stats={analysis} />
                </>)}

                {section(5, <>
                  <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-1">
                    Model Evaluation Scores
                  </h2>
                  <EvalTable scores={analysis} />
                </>)}

                {section(6, <>
                  <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-1">
                    Action Recommendations
                  </h2>
                  <ActionTable actions={analysis} />
                </>)}

                {section(7, <>
                  <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-1">
                    Bollinger Bands
                  </h2>
                  <BollingerChart data={analysis} />
                </>)}
              </>
            )}
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
                href="https://github.com/adwaithKalugotla/stock-predictor-react"
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
