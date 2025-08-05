// src/components/PredictionChart.jsx
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
} from 'recharts';

export default function PredictionChart({ data }) {
  return (
    <div
      className="w-full"
      style={{
        height: 'calc(100vh - 220px)',  // give a bit more room
        overflow: 'hidden',
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 30, right: 40, left: 20, bottom: 60 }} // more bottom margin
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 14, fill: '#333' }}    // bigger, darker ticks
            tickMargin={16}
            angle={-45}
            textAnchor="end"
          />
          <YAxis
            domain={['dataMin', 'dataMax']}
            tick={{ fontSize: 14, fill: '#333' }}
            width={60}
          />
          <Tooltip
            contentStyle={{ fontSize: '1rem' }}
            itemStyle={{ fontSize: '1rem' }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            wrapperStyle={{ fontSize: '1rem' }}
          />
          <Line
            type="monotone"
            dataKey="predicted"
            stroke="#4F46E5"
            strokeWidth={3}
            dot={{ r: 6 }}
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
