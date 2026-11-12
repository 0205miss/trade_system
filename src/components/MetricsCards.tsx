'use client';

import React from 'react';
import { BacktestResult } from '@/lib/engine/types';
import { TrendingUp, ShieldAlert, Award, Percent, DollarSign, Activity } from 'lucide-react';

interface MetricsCardsProps {
  result: BacktestResult | null;
  isLoading?: boolean;
}

export function MetricsCards({ result, isLoading }: MetricsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 bg-zinc-900/40 border border-zinc-800/60 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!result) {
    return null;
  }

  const isProfit = result.netProfitAmount >= 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Net Profit */}
      <div className="p-3.5 bg-zinc-900/50 border border-zinc-800 rounded-lg">
        <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
          <span>淨獲利潤 (PnL)</span>
          <TrendingUp className={`w-3.5 h-3.5 ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`} />
        </div>
        <div className="flex items-baseline gap-1.5 font-mono">
          <span className={`text-lg font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isProfit ? '+' : ''}
            {result.netProfitPct.toFixed(2)}%
          </span>
          <span className="text-[11px] text-zinc-500">
            (${result.netProfitAmount.toLocaleString('en-US')})
          </span>
        </div>
      </div>

      {/* 2. Win Rate */}
      <div className="p-3.5 bg-zinc-900/50 border border-zinc-800 rounded-lg">
        <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
          <span>勝率 (Win Rate)</span>
          <Award className="w-3.5 h-3.5 text-zinc-400" />
        </div>
        <div className="flex items-baseline gap-1.5 font-mono">
          <span className="text-lg font-bold text-zinc-100">{result.winRate.toFixed(1)}%</span>
          <span className="text-[11px] text-zinc-500">
            ({result.winningTrades}W / {result.losingTrades}L)
          </span>
        </div>
      </div>

      {/* 3. Profit Factor */}
      <div className="p-3.5 bg-zinc-900/50 border border-zinc-800 rounded-lg">
        <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
          <span>盈虧比 (PF)</span>
          <Percent className="w-3.5 h-3.5 text-zinc-400" />
        </div>
        <div className="flex items-baseline gap-1.5 font-mono">
          <span className="text-lg font-bold text-zinc-100">{result.profitFactor.toFixed(2)}</span>
          <span className="text-[11px] text-zinc-500">共 {result.totalTrades} 筆交易</span>
        </div>
      </div>

      {/* 4. Max Drawdown */}
      <div className="p-3.5 bg-zinc-900/50 border border-zinc-800 rounded-lg">
        <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
          <span>最大回撤 (MaxDD)</span>
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div className="flex items-baseline gap-1.5 font-mono">
          <span className="text-lg font-bold text-amber-400">-{result.maxDrawdownPct.toFixed(2)}%</span>
          <span className="text-[11px] text-zinc-500">
            Calmar: {result.calmarRatio.toFixed(2)}
          </span>
        </div>
      </div>

      {/* 5. Sharpe & Sortino */}
      <div className="p-3.5 bg-zinc-900/50 border border-zinc-800 rounded-lg">
        <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
          <span>夏普比率 (Sharpe)</span>
          <Activity className="w-3.5 h-3.5 text-sky-400" />
        </div>
        <div className="flex items-baseline gap-1.5 font-mono">
          <span className="text-lg font-bold text-zinc-100">{result.sharpeRatio.toFixed(2)}</span>
          <span className="text-[11px] text-zinc-500">
            Sortino: {result.sortinoRatio.toFixed(2)}
          </span>
        </div>
      </div>

      {/* 6. Fees & Slippage */}
      <div className="p-3.5 bg-zinc-900/50 border border-zinc-800 rounded-lg">
        <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
          <span>手續費與滑點損耗</span>
          <DollarSign className="w-3.5 h-3.5 text-zinc-400" />
        </div>
        <div className="flex flex-col font-mono">
          <span className="text-sm font-semibold text-zinc-200">
            -${result.totalFeesPaid.toFixed(2)} <span className="text-[10px] text-zinc-500">Fee</span>
          </span>
          <span className="text-[11px] text-zinc-500">
            -${result.totalSlippageCost.toFixed(2)} Slippage (3bps)
          </span>
        </div>
      </div>
    </div>
  );
}
