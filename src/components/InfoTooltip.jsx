// src/components/InfoTooltip.jsx
import React from 'react';

export default function InfoTooltip({ text }) {
  return (
    <details className="inline-block ml-2 align-top">
      <summary className="cursor-pointer text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
        ℹ️
      </summary>
      <div className="mt-2 p-4 text-sm bg-gray-100 dark:bg-gray-700 rounded shadow">
        {text}
      </div>
    </details>
  );
}
