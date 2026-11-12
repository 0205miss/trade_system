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
  const drawdowns = points.map((p) => p.drawdownPct);

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
    <div className="border border-zinc-800 bg-zinc-950 rounded-lg p-3.5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-zinc-200">權益曲線 vs 買入持有基準</span>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-0.5 bg-emerald-400 inline-block" /> 策略本金
            </span>
            <span className="flex items-center gap-1.5 text-zinc-500">
              <span className="w-2.5 h-0.5 bg-zinc-600 inline-block stroke-dasharray" /> Buy & Hold
            </span>
          </div>
        </div>
        <div className="text-xs font-mono">
          <span className="text-zinc-500">當前本金: </span>
          <span className={`font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
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
          {/* Subtle horizontal grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = paddingY + chartH * (1 - pct);
            const val = minEquity + range * pct;
            return (
              <g key={idx}>
                <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#18181b" strokeWidth="1" />
                <text
                  x={paddingX - 6}
                  y={y + 3}
                  fill="#71717a"
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  ${Math.round(val)}
                </text>
              </g>
            );
          })}

          {/* Benchmark Line (Gray dashed) */}
          <path d={benchmarkPath} fill="none" stroke="#52525b" strokeWidth="1.2" strokeDasharray="3 3" />

          {/* Strategy Equity Line (Emerald solid) */}
          <path d={equityPath} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
