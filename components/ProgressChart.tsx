'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ProgressDataPoint } from '@/types';

interface ProgressChartProps {
  data: ProgressDataPoint[];
}

const metricLines = [
  { key: 'technique', label: 'Техника', color: '#00FF87' },
  { key: 'tactics', label: 'Тактика', color: '#6C8EFF' },
  { key: 'physical', label: 'Физика', color: '#FF8C00' },
  { key: 'mentality', label: 'Ментальность', color: '#FFD600' },
  { key: 'decision', label: 'Решения', color: '#FF4444' },
  { key: 'overall', label: 'Общая', color: '#FFFFFF' },
];

/** График прогресса по матчам */
export default function ProgressChart({ data }: ProgressChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-white/30 text-sm">
        Недостаточно данных для построения графика
      </div>
    );
  }

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 10, right: 10, left: -10, bottom: 10 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickLine={false}
            tickFormatter={(val: string) => {
              const d = new Date(val);
              return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
            }}
          />
          <YAxis
            domain={[0, 10]}
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickCount={6}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#12121A',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              color: '#f0f0f5',
              fontSize: '12px',
              padding: '10px 14px',
            }}
            labelFormatter={(label) => {
              const d = new Date(String(label));
              return d.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              });
            }}
            formatter={(value, name) => [`${value}/10`, String(name)]}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
            iconType="circle"
            iconSize={8}
          />
          {metricLines.map((m) => (
            <Line
              key={m.key}
              type="monotone"
              dataKey={m.key}
              name={m.label}
              stroke={m.color}
              strokeWidth={2}
              dot={{ r: 3, fill: m.color, strokeWidth: 0 }}
              activeDot={{ r: 5, stroke: '#0A0A0F', strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
