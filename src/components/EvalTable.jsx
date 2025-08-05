// src/components/EvalTable.jsx
import React from 'react';

export default function EvalTable({ scores }) {
  if (!scores || Object.keys(scores).length === 0) return null;

  // grab the first evalScores to detect which metrics we have
  const firstSym   = Object.keys(scores)[0];
  const firstScores = scores[firstSym]?.evalScores || {};
  const isArima    = 'aic' in firstScores && 'bic' in firstScores;

  // build rows dynamically
  const rows = Object.entries(scores)
    .filter(([_, symData]) => symData.evalScores)
    .map(([symbol, symData]) => {
      const es = symData.evalScores;
      return {
        symbol,
        train:     es.train,
        test:      es.test,
        aic:       es.aic,
        bic:       es.bic,
      };
    });

  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto mb-6">
      <table className="min-w-full divide-y divide-gray-200 bg-white dark:bg-gray-800 shadow rounded">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase">
              Symbol
            </th>
            {isArima ? (
              <>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase">
                  AIC
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase">
                  BIC
                </th>
              </>
            ) : (
              <>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase">
                  Train %
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase">
                  Test %
                </th>
              </>
            )}
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

              {isArima ? (
                <>
                  <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-gray-100">
                    {r.aic}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-gray-100">
                    {r.bic}
                  </td>
                </>
              ) : (
                <>
                  <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-gray-100">
                    {r.train ?? '–'}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-gray-100">
                    {r.test ?? '–'}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
