import React, { useState } from 'react';

export default function ActionTable({ actions }) {
  const [expandedRows, setExpandedRows] = useState({});

  if (!actions || Object.keys(actions).length === 0) return null;

  const rows = Object.entries(actions)
    .filter(([_, data]) => data && data.actions)
    .map(([symbol, data]) => ({
      symbol,
      day1: data.actions?.['1'],
      day7: data.actions?.['7'],
      day14: data.actions?.['14'],
    }))
    .filter((row) => row.day1 || row.day7 || row.day14);

  if (rows.length === 0) return null;

  const toggleRow = (symbol) => {
    setExpandedRows((prev) => ({
      ...prev,
      [symbol]: !prev[symbol],
    }));
  };

  const getSignalBadgeClass = (signal) => {
    const normalized = String(signal || '').toLowerCase();

    if (normalized === 'buy') {
      return 'bg-green-100 text-green-700 border border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-800';
    }

    if (normalized === 'sell') {
      return 'bg-red-100 text-red-700 border border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800';
    }

    return 'bg-yellow-100 text-yellow-800 border border-yellow-300 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800';
  };

  const getConfidenceBarClass = (confidence) => {
    if (confidence >= 75) return 'bg-green-500';
    if (confidence >= 55) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  const formatRecommendation = (item) => {
    if (!item) {
      return (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Not available
        </div>
      );
    }

    const signal = item.action || 'Hold';
    const confidence = Number(item.confidence ?? 0);
    const expectedReturn = item.expectedReturnPercent;
    const price = item.price;

    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getSignalBadgeClass(signal)}`}
          >
            {signal}
          </span>

          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {confidence}% confidence
          </span>
        </div>

        <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className={`h-2 rounded-full ${getConfidenceBarClass(confidence)}`}
            style={{ width: `${Math.min(100, Math.max(0, confidence))}%` }}
          />
        </div>

        <div className="text-xs text-gray-600 dark:text-gray-400">
          Forecast: <span className="font-medium">{price}</span>
          {expectedReturn !== undefined && (
            <>
              {' '}| Expected return:{' '}
              <span className="font-medium">
                {expectedReturn > 0 ? '+' : ''}
                {expectedReturn}%
              </span>
            </>
          )}
        </div>
      </div>
    );
  };

  const getAllReasons = (row) => {
    const reasonMap = new Map();

    [row.day1, row.day7, row.day14].forEach((item) => {
      if (Array.isArray(item?.reasons)) {
        item.reasons.forEach((reason) => {
          if (reason && !reasonMap.has(reason)) {
            reasonMap.set(reason, reason);
          }
        });
      }
    });

    return Array.from(reasonMap.values());
  };

  return (
    <div className="mb-6 space-y-4">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 overflow-hidden rounded-xl bg-white shadow dark:divide-gray-700 dark:bg-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold uppercase text-gray-700 dark:text-gray-200">
                Symbol
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold uppercase text-gray-700 dark:text-gray-200">
                1-Day Signal
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold uppercase text-gray-700 dark:text-gray-200">
                7-Day Signal
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold uppercase text-gray-700 dark:text-gray-200">
                14-Day Signal
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold uppercase text-gray-700 dark:text-gray-200">
                Reasoning
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {rows.map((row, index) => {
              const reasons = getAllReasons(row);
              const isExpanded = expandedRows[row.symbol];

              return (
                <React.Fragment key={row.symbol}>
                  <tr
                    className={
                      index % 2 === 0
                        ? 'bg-white dark:bg-gray-900'
                        : 'bg-gray-50 dark:bg-gray-800'
                    }
                  >
                    <td className="px-6 py-4 align-top text-sm font-bold text-gray-900 dark:text-gray-100">
                      {row.symbol}
                    </td>

                    <td className="px-6 py-4 align-top text-sm text-gray-900 dark:text-gray-100">
                      {formatRecommendation(row.day1)}
                    </td>

                    <td className="px-6 py-4 align-top text-sm text-gray-900 dark:text-gray-100">
                      {formatRecommendation(row.day7)}
                    </td>

                    <td className="px-6 py-4 align-top text-sm text-gray-900 dark:text-gray-100">
                      {formatRecommendation(row.day14)}
                    </td>

                    <td className="px-6 py-4 align-top text-sm text-gray-900 dark:text-gray-100">
                      {reasons.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => toggleRow(row.symbol)}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                          {isExpanded ? 'Hide reasons' : 'View reasons'}
                        </button>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">
                          No reasons available
                        </span>
                      )}
                    </td>
                  </tr>

                  {isExpanded && reasons.length > 0 && (
                    <tr className="bg-blue-50 dark:bg-gray-950">
                      <td
                        colSpan="5"
                        className="px-6 py-4 text-sm text-gray-800 dark:text-gray-200"
                      >
                        <div className="mb-2 font-semibold">
                          Signal reasoning for {row.symbol}
                        </div>

                        <ul className="list-disc space-y-1 pl-5">
                          {reasons.map((reason, reasonIndex) => (
                            <li key={`${row.symbol}-${reasonIndex}`}>
                              {reason}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Recommendations are based on forecast trend, RSI, 20-day moving average, and Bollinger Band position. This is for educational analysis only and is not financial advice.
      </p>
    </div>
  );
}