'use client';

import React from 'react';
import { MTFSnapshot } from '@/lib/engine/types';
import { ArrowUpRight, ArrowDownRight, Minus, Layers } from 'lucide-react';

interface MTFMatrixProps {
  snapshot?: MTFSnapshot | null;
}

export function MTFMatrix({ snapshot }: MTFMatrixProps) {
  if (!snapshot) return null;

  const renderTrendBadge = (trend?: 'BULLISH' | 'BEARISH' | 'NEUTRAL') => {
    if (trend === 'BULLISH') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <ArrowUpRight className="w-3 h-3" /> 多頭 (Bull)
        </span>
      );
    }
    if (trend === 'BEARISH') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <ArrowDownRight className="w-3 h-3" /> 空頭 (Bear)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
        <Minus className="w-3 h-3" /> 震盪 (Neutral)
      </span>
    );
  };

  return (
    <div className="border border-zinc-800 bg-zinc-950 rounded-lg p-3.5">
      <div className="flex items-center justify-between mb-3 border-b border-zinc-800/80 pb-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-semibold text-zinc-200">跨週期指標共振矩陣 (MTF Confluence)</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-500">共振強度:</span>
          <span className="text-xs font-mono font-bold text-emerald-400">
            {snapshot.overallConfluenceScore}%
          </span>
          <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500"
              style={{ width: `${snapshot.overallConfluenceScore}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {/* 4H Macro */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-zinc-300 font-mono">4H 宏觀趨勢</span>
            {renderTrendBadge(snapshot.tf4h?.trend)}
          </div>
          <div className="text-[11px] font-mono text-zinc-500 space-y-0.5">
            <div>Supertrend: {snapshot.tf4h?.supertrendBull ? '多頭' : '空頭'}</div>
            <div>ATR: {snapshot.tf4h?.atr ? snapshot.tf4h.atr.toFixed(1) : '-'}</div>
            <div>RSI: {snapshot.tf4h?.rsi ? snapshot.tf4h.rsi.toFixed(1) : '-'}</div>
          </div>
        </div>

        {/* 1H Swing */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-zinc-300 font-mono">1H 波段動能</span>
            {renderTrendBadge(snapshot.tf1h?.trend)}
          </div>
          <div className="text-[11px] font-mono text-zinc-500 space-y-0.5">
            <div>MACD Hist: {snapshot.tf1h?.macdHist ? snapshot.tf1h.macdHist.toFixed(1) : '-'}</div>
            <div>ATR: {snapshot.tf1h?.atr ? snapshot.tf1h.atr.toFixed(1) : '-'}</div>
            <div>RSI: {snapshot.tf1h?.rsi ? snapshot.tf1h.rsi.toFixed(1) : '-'}</div>
          </div>
        </div>

        {/* 15M Intraday */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-zinc-300 font-mono">15M 日內循環</span>
            {renderTrendBadge(snapshot.tf15m?.trend)}
          </div>
          <div className="text-[11px] font-mono text-zinc-500 space-y-0.5">
            <div>VWAP: {snapshot.tf15m?.vwap ? snapshot.tf15m.vwap.toFixed(1) : '-'}</div>
            <div>BB Width: {snapshot.tf15m?.bbWidth ? snapshot.tf15m.bbWidth.toFixed(2) : '-'}%</div>
            <div>RSI: {snapshot.tf15m?.rsi ? snapshot.tf15m.rsi.toFixed(1) : '-'}</div>
          </div>
        </div>

        {/* 5M Micro */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-zinc-300 font-mono">5M 微觀極速</span>
            {renderTrendBadge(snapshot.tf5m?.trend)}
          </div>
          <div className="text-[11px] font-mono text-zinc-500 space-y-0.5">
            <div>StochRSI %K: {snapshot.tf5m?.stochRsiK ? snapshot.tf5m.stochRsiK.toFixed(1) : '-'}</div>
            <div>RVOL 爆量比: {snapshot.tf5m?.rvol ? snapshot.tf5m.rvol.toFixed(2) : '-'}x</div>
            <div className="text-emerald-400">分批進場: 15/30/40/15</div>
          </div>
        </div>
      </div>
    </div>
  );
}
