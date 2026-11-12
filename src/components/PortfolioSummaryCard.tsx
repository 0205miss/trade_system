'use client';

import React from 'react';
import { PortfolioBacktestResult, StrategyContribution, SymbolContribution, Timeframe } from '@/lib/engine/types';
import { Layers, Coins, ArrowRight, TrendingUp, ShieldAlert, Award } from 'lucide-react';

interface PortfolioSummaryCardProps {
  portfolioResult: PortfolioBacktestResult;
  onSelectTimeframe: (tf: Timeframe, sym?: string) => void;
}

export function PortfolioSummaryCard({
  portfolioResult,
  onSelectTimeframe,
}: PortfolioSummaryCardProps) {
  const {
    strategyContributions = [],
    symbolContributions = [],
    totalTrades,
    netProfitAmount,
    netProfitPct,
    winRate,
    maxDrawdownPct,
    symbol,
    symbols = [],
  } = portfolioResult;

  const isMultiSymbol = symbol === 'ALL' || symbols.length > 1;

  const getSymbolColor = (sym: string) => {
    if (sym.startsWith('BTC')) return {
      badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      dot: 'bg-amber-500',
      bar: 'bg-amber-500',
    };
    if (sym.startsWith('ETH')) return {
      badge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
      dot: 'bg-indigo-500',
      bar: 'bg-indigo-500',
    };
    if (sym.startsWith('SOL')) return {
      badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      dot: 'bg-purple-500',
      bar: 'bg-purple-500',
    };
    if (sym.startsWith('BNB')) return {
      badge: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
      dot: 'bg-yellow-500',
      bar: 'bg-yellow-500',
    };
    if (sym.startsWith('XRP')) return {
      badge: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
      dot: 'bg-cyan-500',
      bar: 'bg-cyan-500',
    };
    if (sym.startsWith('ADA')) return {
      badge: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
      dot: 'bg-teal-500',
      bar: 'bg-teal-500',
    };
    if (sym.startsWith('LINK')) return {
      badge: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
      dot: 'bg-sky-500',
      bar: 'bg-sky-500',
    };
    if (sym.startsWith('XLM')) return {
      badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      dot: 'bg-blue-500',
      bar: 'bg-blue-500',
    };
    return {
      badge: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20',
      dot: 'bg-fuchsia-500',
      bar: 'bg-fuchsia-500',
    };
  };

  const getTimeframeColor = (tf: Timeframe) => {
    switch (tf) {
      case '4h':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case '1h':
        return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20';
      case '15m':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case '5m':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    }
  };

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xl p-5 font-mono shadow-sm transition-colors space-y-5">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            {isMultiSymbol ? <Coins className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {isMultiSymbol
                  ? '全幣種多策略綜合投資組合 (All-Symbols Portfolio Dashboard)'
                  : `${symbol} 綜合執行投資組合 (Multi-Strategy Portfolio Dashboard)`}
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold">
                {strategyContributions.length} 組策略協同執行
              </span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 font-sans mt-0.5">
              {isMultiSymbol
                ? 'BTC-USDT、ETH-USDT、SOL-USDT 跨市場多級別策略共用 10,000 USDT 資金池之宏觀回測'
                : `4H 宏觀、1H 波段、15M 日內、5M 極速策略同步運作於 ${symbol} 10,000 USDT 資金池`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs">
            <span className="text-zinc-500">協同分散效益：</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">大幅平滑回撤</span>
          </div>
        </div>
      </div>

      {/* 2. Asset Allocation & Symbol Performance Breakdown (If Multi-Symbol) */}
      {isMultiSymbol && symbolContributions.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs text-zinc-700 dark:text-zinc-300 font-semibold">
            <span className="flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-emerald-500" />
              各幣種資金配置與獲利貢獻 (Asset Allocation Breakdown)
            </span>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">共 {symbolContributions.length} 大主流合約標的</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {symbolContributions.map((sc) => {
              const colors = getSymbolColor(sc.symbol);
              const isProfit = sc.netProfitAmount >= 0;
              return (
                <div
                  key={sc.symbol}
                  className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/40 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                      <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">{sc.symbol}</span>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${colors.badge}`}>
                      {sc.tradesCount} 筆交易
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-[10px] text-zinc-500">淨獲利潤</div>
                      <div className={`text-sm font-bold ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {isProfit ? '+' : ''}${sc.netProfitAmount.toFixed(1)}
                        <span className="text-xs ml-1 font-normal">({isProfit ? '+' : ''}{sc.netProfitPct.toFixed(1)}%)</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-zinc-500">勝率 / 回撤</div>
                      <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        {sc.winRate}% <span className="text-amber-500 text-[11px]">(-{sc.maxDrawdownPct}%)</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
                      <span>獲利貢獻佔比</span>
                      <span className="font-bold text-zinc-700 dark:text-zinc-300">{sc.profitContributionPct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors.bar}`}
                        style={{ width: `${Math.max(0, Math.min(100, sc.profitContributionPct))}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Detailed Strategy Performance Matrix */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-zinc-700 dark:text-zinc-300 font-semibold">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-500" />
            各策略獨立績效與貢獻度 (Individual Strategy Performance)
          </span>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">共 {strategyContributions.length} 套策略</span>
        </div>

        <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800/80 rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-900/70 text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 text-[11px]">
              <tr>
                {isMultiSymbol && <th className="py-2.5 px-3 font-semibold">幣種</th>}
                <th className="py-2.5 px-3 font-semibold">策略級別 / 名稱</th>
                <th className="py-2.5 px-3 text-center font-semibold">交易筆數</th>
                <th className="py-2.5 px-3 text-center font-semibold">勝率</th>
                <th className="py-2.5 px-3 text-right font-semibold">淨獲利潤 (USDT)</th>
                <th className="py-2.5 px-3 text-right font-semibold">報酬率</th>
                <th className="py-2.5 px-3 font-semibold">獲利貢獻</th>
                <th className="py-2.5 px-3 text-right font-semibold">最大回撤</th>
                <th className="py-2.5 px-3 text-center font-semibold">盈虧比</th>
                <th className="py-2.5 px-3 text-center font-semibold">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 text-zinc-800 dark:text-zinc-200 text-xs">
              {strategyContributions.map((strat) => {
                const isStratWin = strat.netProfitAmount >= 0;
                const tfBadgeColor = getTimeframeColor(strat.timeframe);
                const symColor = getSymbolColor(strat.symbol);

                return (
                  <tr key={`${strat.symbol}_${strat.timeframe}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                    {isMultiSymbol && (
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${symColor.badge}`}>
                          {strat.symbol}
                        </span>
                      </td>
                    )}
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
                        <div className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden max-w-[70px]">
                          <div
                            className="h-full bg-emerald-500"
                            style={{ width: `${Math.max(0, Math.min(100, strat.profitContributionPct))}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-zinc-600 dark:text-zinc-400 font-bold min-w-[32px]">
                          {strat.profitContributionPct > 0 ? `${strat.profitContributionPct}%` : '0%'}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right text-amber-600 dark:text-amber-400">-{strat.maxDrawdownPct}%</td>
                    <td className="py-2.5 px-3 text-center font-bold">{strat.profitFactor.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => onSelectTimeframe(strat.timeframe, strat.symbol)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-transparent transition-colors font-sans"
                      >
                        <span>檢視單級別</span>
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
    </div>
  );
}
