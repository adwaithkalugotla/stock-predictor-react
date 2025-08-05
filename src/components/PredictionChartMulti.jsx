// src/components/PredictionChartMulti.jsx
import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Brush
} from 'recharts';

// a small palette – feel free to adjust or import your own
const COLORS = ['#4F46E5','#10B981','#F59E0B','#EF4444','#3B82F6'];

export default function PredictionChartMulti({ data }) {
  // data is an object like { SPY: { predictions: [...] }, AAPL: { … }, … }
  const symbols = Object.keys(data);

  // build a single array of { date, SPY, AAPL, … }
  const dates = data[symbols[0]].predictions.map(p => p.date);
  const chartData = dates.map(date => {
    const entry = { date };
    symbols.forEach(sym => {
      entry[sym] = data[sym].predictions.find(pt => pt.date === date)?.predicted;
    });
    return entry;
  });

  return (
    <div className="w-full" style={{ height: '400px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 14, fill: '#333' }}
            angle={-30}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fontSize: 14, fill: '#333' }} />
          <Tooltip />
          <Legend verticalAlign="top" height={36} />
          {symbols.map((sym, i) => (
            <Line
              key={sym}
              type="monotone"
              dataKey={sym}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          ))}
          <Brush
            dataKey="date"
            height={80}
            stroke="#8884d8"
            travellerWidth={16}
            gap={4}
            tick={{ fontSize: 12 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
