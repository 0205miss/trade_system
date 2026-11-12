'use client';

import React from 'react';
import { EquityPoint } from '@/lib/engine/types';

interface EquityChartProps {
  equityCurve: EquityPoint[];
  height?: number;
}

export function EquityChart({ equityCurve, height = 240 }: EquityChartProps) {
  if (equityCurve.length < 2) return null;

  const points = equityCurve;
  const equities = points.map((p) => p.equity);
  const benchmarks = points.map((p) => p.benchmarkEquity);

  const minEquity = Math.min(...equities, ...benchmarks);
  const maxEquity = Math.max(...equities, ...benchmarks);
  const range = maxEquity - minEquity || 1;

  const width = 800;
  const paddingX = 40;
  const paddingY = 24;

  const chartW = width - paddingX * 2;
  const chartH = height - paddingY * 2;

  const getX = (idx: number) => paddingX + (idx / (points.length - 1)) * chartW;
  const getY = (val: number) => paddingY + chartH - ((val - minEquity) / range) * chartH;

  // Build SVG path strings
  let equityPath = `M ${getX(0)} ${getY(equities[0])}`;
  for (let i = 1; i < points.length; i++) {
    equityPath += ` L ${getX(i)} ${getY(equities[i])}`;
  }

  let benchmarkPath = `M ${getX(0)} ${getY(benchmarks[0])}`;
  for (let i = 1; i < points.length; i++) {
    benchmarkPath += ` L ${getX(i)} ${getY(benchmarks[i])}`;
  }

  const latestEquity = equities[equities.length - 1];
  const initialEquity = equities[0];
  const isUp = latestEquity >= initialEquity;

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-lg p-3.5 shadow-sm transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">權益曲線 vs 買入持有基準</span>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
              <span className="w-2.5 h-0.5 bg-emerald-500 inline-block rounded" /> 策略本金
            </span>
            <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
              <span className="w-2.5 h-0.5 bg-zinc-400 dark:bg-zinc-600 inline-block stroke-dasharray" /> Buy & Hold
            </span>
          </div>
        </div>
        <div className="text-xs font-mono">
          <span className="text-zinc-500 dark:text-zinc-400">當前本金: </span>
          <span className={`font-bold ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            ${latestEquity.toLocaleString('en-US', { minimumFractionDigits: 1 })}
          </span>
        </div>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
          preserveAspectRatio="none"
        >
          {/* Horizontal grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = paddingY + chartH * (1 - pct);
            const val = minEquity + range * pct;
            return (
              <g key={idx}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="currentColor"
                  className="text-zinc-200 dark:text-zinc-800"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 6}
                  y={y + 3}
                  className="fill-zinc-400 dark:fill-zinc-500 font-mono text-[9px]"
                  textAnchor="end"
                >
                  ${Math.round(val)}
                </text>
              </g>
            );
          })}

          {/* Benchmark Line (Gray dashed) */}
          <path
            d={benchmarkPath}
            fill="none"
            stroke="currentColor"
            className="text-zinc-400 dark:text-zinc-600"
            strokeWidth="1.2"
            strokeDasharray="3 3"
          />

          {/* Strategy Equity Line (Emerald solid) */}
          <path d={equityPath} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
