'use client';

import React from 'react';
import { PortfolioBacktestResult, StrategyContribution, Timeframe } from '@/lib/engine/types';
import { Layers, TrendingUp, ShieldCheck, ArrowRight, Activity, Percent } from 'lucide-react';

interface PortfolioSummaryCardProps {
  portfolioResult: PortfolioBacktestResult;
  onSelectTimeframe: (tf: Timeframe) => void;
}

export function PortfolioSummaryCard({
  portfolioResult,
  onSelectTimeframe,
}: PortfolioSummaryCardProps) {
  const { strategyContributions, totalTrades, netProfitAmount, netProfitPct, winRate, maxDrawdownPct } =
    portfolioResult;

  const isProfit = netProfitAmount >= 0;

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-lg p-4 font-mono shadow-sm transition-colors space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                所有策略綜合執行投資組合 (Multi-Strategy Portfolio Dashboard)
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold">
                4 組策略同時執行
              </span>
            </div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 font-sans mt-0.5">
              4H 宏觀、1H 波段、15M 日內、5M 極速共 4 套策略同步運作於 10,000 USDT 共用資金池之綜合回測
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="px-2.5 py-1 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px]">
            <span className="text-zinc-500">協同分散效益：</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">回撤大幅降低</span>
          </div>
        </div>
      </div>

      {/* Strategy Performance Matrix */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-50 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 text-[11px]">
            <tr>
              <th className="py-2 px-3 font-semibold">策略級別 / 名稱</th>
              <th className="py-2 px-3 text-center font-semibold">交易筆數</th>
              <th className="py-2 px-3 text-center font-semibold">勝率</th>
              <th className="py-2 px-3 text-right font-semibold">淨獲利潤 (USDT)</th>
              <th className="py-2 px-3 text-right font-semibold">報酬率</th>
              <th className="py-2 px-3 font-semibold">獲利貢獻度佔比</th>
              <th className="py-2 px-3 text-right font-semibold">最大回撤</th>
              <th className="py-2 px-3 text-center font-semibold">盈虧比</th>
              <th className="py-2 px-3 text-center font-semibold">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 text-zinc-800 dark:text-zinc-200 text-xs">
            {strategyContributions.map((strat) => {
              const isStratWin = strat.netProfitAmount >= 0;
              const tfBadgeColor =
                strat.timeframe === '4h'
                  ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                  : strat.timeframe === '1h'
                  ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
                  : strat.timeframe === '15m'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';

              return (
                <tr key={strat.timeframe} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${tfBadgeColor}`}>
                        {strat.timeframe.toUpperCase()}
                      </span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">{strat.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center text-zinc-600 dark:text-zinc-400">{strat.tradesCount} 筆</td>
                  <td className="py-2.5 px-3 text-center font-bold text-zinc-900 dark:text-zinc-100">{strat.winRate}%</td>
                  <td className={`py-2.5 px-3 text-right font-bold ${isStratWin ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {isStratWin ? '+' : ''}${strat.netProfitAmount.toFixed(1)}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-bold ${isStratWin ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {isStratWin ? '+' : ''}{strat.netProfitPct.toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden max-w-[80px]">
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${Math.max(0, Math.min(100, strat.profitContributionPct))}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-zinc-600 dark:text-zinc-400 font-bold min-w-[36px]">
                        {strat.profitContributionPct > 0 ? `${strat.profitContributionPct}%` : '0%'}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right text-amber-600 dark:text-amber-400">-{strat.maxDrawdownPct}%</td>
                  <td className="py-2.5 px-3 text-center font-bold">{strat.profitFactor.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => onSelectTimeframe(strat.timeframe)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-transparent transition-colors font-sans"
                    >
                      <span>檢視單一回測</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
