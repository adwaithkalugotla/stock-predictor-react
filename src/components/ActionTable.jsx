import React from 'react';

export default function ActionTable({ actions }) {
  if (!actions || Object.keys(actions).length === 0) return null;

  const rows = Object.entries(actions)
    // actions is { SPY: {actions}, AAPL: {actions}, … }
    .map(([symbol, a]) => ({
      symbol,
      day1:  a.actions['1'],
      day7:  a.actions['7'],
      day14: a.actions['14'],
    }));

  return (
    <div className="overflow-x-auto mb-6">
      <table className="min-w-full divide-y divide-gray-200 bg-white dark:bg-gray-800 shadow rounded">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase">
              Symbol
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase">
              1-Day
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase">
              7-Day
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase">
              14-Day
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
              <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                {r.day1.price} / <em>{r.day1.action}</em>
              </td>
              <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                {r.day7.price} / <em>{r.day7.action}</em>
              </td>
              <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                {r.day14.price} / <em>{r.day14.action}</em>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
