// src/components/NormalizedChart.jsx
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

const COLORS = ['#4F46E5','#10B981','#F59E0B','#EF4444','#3B82F6'];

export default function NormalizedChart({ data }) {
  const symbols = Object.keys(data);
  // build un‐normalized history from data[sym].normalized
  const dates = data[symbols[0]].normalized.dates;
  const chartData = dates.map((d, idx) => {
    const entry = { date: d };
    symbols.forEach(sym => {
      entry[sym] = data[sym].normalized.values[idx];
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
          <YAxis tick={{ fontSize: 14, fill: '#333' }} domain={['dataMin', 'dataMax']} />
          <Tooltip />
          <Legend verticalAlign="top" height={36} />
          {symbols.map((sym, i) => (
            <Line
              key={sym}
              type="monotone"
              dataKey={sym}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
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
