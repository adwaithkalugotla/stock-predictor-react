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

export default function BollingerChart({ data }) {
  const spy = data?.SPY?.bollinger;
  if (!spy) {
    return <div className="p-4 text-center text-red-500">No Bollinger data</div>;
  }

  const { dates, upper, lower, close } = spy;
  const chartData = dates.map((d,i) => ({
    date:  d,
    upper: upper[i],
    lower: lower[i],
    close: close[i]
  }));

  return (
    <div className="w-full" style={{ height: 400 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 14 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fontSize: 14 }} width={60} />
          <Tooltip />
          <Legend verticalAlign="top" height={36} />
          <Line
            type="monotone"
            dataKey="upper"
            name="Upper Band"
            stroke="#8884d8"
            dot={false}
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="lower"
            name="Lower Band"
            stroke="#82ca9d"
            dot={false}
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="close"
            name="Close Price"
            stroke="#FF8042"
            dot={false}
            strokeWidth={2}
          />
          <Brush
            dataKey="date"
            height={60}
            stroke="#8884d8"
            travellerWidth={12}
            tick={{ fontSize: 12 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
