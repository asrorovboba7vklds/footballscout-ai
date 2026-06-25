'use client';

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { Analysis } from '@/types';
import { analysisToRadarData } from '@/types';

interface ScoreRadarProps {
  analysis: Analysis;
  size?: number;
}

/** Неоново-голубой радарный график */
export default function ScoreRadar({ analysis }: ScoreRadarProps) {
  const data = analysisToRadarData(analysis);

  return (
    <div className="w-full aspect-square max-w-[360px] mx-auto">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <defs>
            <filter id="neonGlow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="radarFill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <PolarGrid
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="3 3"
          />
          <PolarAngleAxis
            dataKey="metric"
            tick={{
              fill: 'rgba(255,255,255,0.55)',
              fontSize: 12,
              fontWeight: 500,
            }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 10]}
            tick={{
              fill: 'rgba(255,255,255,0.2)',
              fontSize: 10,
            }}
            tickCount={6}
            axisLine={false}
          />
          <Radar
            name="Оценка"
            dataKey="value"
            stroke="#06b6d4"
            fill="url(#radarFill)"
            fillOpacity={1}
            strokeWidth={2.5}
            filter="url(#neonGlow)"
            dot={{
              r: 4,
              fill: '#06b6d4',
              strokeWidth: 0,
            }}
            activeDot={{
              r: 6,
              fill: '#06b6d4',
              stroke: '#0d1117',
              strokeWidth: 2,
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#161b22',
              border: '1px solid rgba(6,182,212,0.2)',
              borderRadius: '12px',
              color: '#e6edf3',
              fontSize: '13px',
              padding: '8px 12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            }}
            formatter={(value) => [`${value}/10`, 'Оценка']}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
