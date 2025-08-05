import React from 'react';

export default function StatsTable({ stats }) {
  if (!stats || Object.keys(stats).length === 0) return null;

  const rows = Object.entries(stats)
    .filter(([_, s]) => s.summaryStats)
    .map(([symbol, s]) => ({
      symbol,
      mean:   s.summaryStats.mean,
      median: s.summaryStats.median,
      std:    s.summaryStats.std,
    }));

  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto mb-6">
      <table className="min-w-full divide-y divide-gray-200 bg-white dark:bg-gray-800 shadow rounded">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase">
              Symbol
            </th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase">
              Mean
            </th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase">
              Median
            </th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase">
              Std
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
          {rows.map((r, i) => (
            <tr
              key={r.symbol}
              className={i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}
            >
              <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                {r.symbol}
              </td>
              <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-gray-100">
                {r.mean}
              </td>
              <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-gray-100">
                {r.median}
              </td>
              <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-gray-100">
                {r.std}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
