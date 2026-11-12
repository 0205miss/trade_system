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
        <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold">
          <ArrowUpRight className="w-3 h-3" /> 多頭 (Bull)
        </span>
      );
    }
    if (trend === 'BEARISH') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-semibold">
          <ArrowDownRight className="w-3 h-3" /> 空頭 (Bear)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
        <Minus className="w-3 h-3" /> 震盪 (Neutral)
      </span>
    );
  };

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-lg p-3.5 shadow-sm transition-colors">
      <div className="flex items-center justify-between mb-3 border-b border-zinc-200 dark:border-zinc-800/80 pb-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">跨週期指標共振矩陣 (MTF Confluence)</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-600 dark:text-zinc-400">共振強度:</span>
          <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {snapshot.overallConfluenceScore}%
          </span>
          <div className="w-16 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500"
              style={{ width: `${snapshot.overallConfluenceScore}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {/* 4H Macro */}
        <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-mono">4H 宏觀趨勢</span>
            {renderTrendBadge(snapshot.tf4h?.trend)}
          </div>
          <div className="text-[11px] font-mono text-zinc-700 dark:text-zinc-300 space-y-0.5">
            <div><span className="text-zinc-500 dark:text-zinc-400">Supertrend:</span> <strong className="text-zinc-900 dark:text-zinc-100">{snapshot.tf4h?.supertrendBull ? '多頭' : '空頭'}</strong></div>
            <div><span className="text-zinc-500 dark:text-zinc-400">ATR:</span> <strong className="text-zinc-900 dark:text-zinc-100">{snapshot.tf4h?.atr ? snapshot.tf4h.atr.toFixed(1) : '-'}</strong></div>
            <div><span className="text-zinc-500 dark:text-zinc-400">RSI:</span> <strong className="text-zinc-900 dark:text-zinc-100">{snapshot.tf4h?.rsi ? snapshot.tf4h.rsi.toFixed(1) : '-'}</strong></div>
          </div>
        </div>

        {/* 1H Swing */}
        <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-mono">1H 波段動能</span>
            {renderTrendBadge(snapshot.tf1h?.trend)}
          </div>
          <div className="text-[11px] font-mono text-zinc-700 dark:text-zinc-300 space-y-0.5">
            <div><span className="text-zinc-500 dark:text-zinc-400">MACD Hist:</span> <strong className="text-zinc-900 dark:text-zinc-100">{snapshot.tf1h?.macdHist ? snapshot.tf1h.macdHist.toFixed(1) : '-'}</strong></div>
            <div><span className="text-zinc-500 dark:text-zinc-400">ATR:</span> <strong className="text-zinc-900 dark:text-zinc-100">{snapshot.tf1h?.atr ? snapshot.tf1h.atr.toFixed(1) : '-'}</strong></div>
            <div><span className="text-zinc-500 dark:text-zinc-400">RSI:</span> <strong className="text-zinc-900 dark:text-zinc-100">{snapshot.tf1h?.rsi ? snapshot.tf1h.rsi.toFixed(1) : '-'}</strong></div>
          </div>
        </div>

        {/* 15M Intraday */}
        <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-mono">15M 日內循環</span>
            {renderTrendBadge(snapshot.tf15m?.trend)}
          </div>
          <div className="text-[11px] font-mono text-zinc-700 dark:text-zinc-300 space-y-0.5">
            <div><span className="text-zinc-500 dark:text-zinc-400">VWAP:</span> <strong className="text-zinc-900 dark:text-zinc-100">{snapshot.tf15m?.vwap ? snapshot.tf15m.vwap.toFixed(1) : '-'}</strong></div>
            <div><span className="text-zinc-500 dark:text-zinc-400">BB Width:</span> <strong className="text-zinc-900 dark:text-zinc-100">{snapshot.tf15m?.bbWidth ? snapshot.tf15m.bbWidth.toFixed(2) : '-'}%</strong></div>
            <div><span className="text-zinc-500 dark:text-zinc-400">RSI:</span> <strong className="text-zinc-900 dark:text-zinc-100">{snapshot.tf15m?.rsi ? snapshot.tf15m.rsi.toFixed(1) : '-'}</strong></div>
          </div>
        </div>

        {/* 5M Micro */}
        <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-mono">5M 微觀極速</span>
            {renderTrendBadge(snapshot.tf5m?.trend)}
          </div>
          <div className="text-[11px] font-mono text-zinc-700 dark:text-zinc-300 space-y-0.5">
            <div><span className="text-zinc-500 dark:text-zinc-400">StochRSI %K:</span> <strong className="text-zinc-900 dark:text-zinc-100">{snapshot.tf5m?.stochRsiK ? snapshot.tf5m.stochRsiK.toFixed(1) : '-'}</strong></div>
            <div><span className="text-zinc-500 dark:text-zinc-400">RVOL 爆量比:</span> <strong className="text-zinc-900 dark:text-zinc-100">{snapshot.tf5m?.rvol ? snapshot.tf5m.rvol.toFixed(2) : '-'}x</strong></div>
            <div className="text-emerald-600 dark:text-emerald-400 font-semibold">分批進場: 15/30/40/15</div>
          </div>
        </div>
      </div>
    </div>
  );
}
