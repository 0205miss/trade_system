'use client';

import React, { useState } from 'react';
import { TradeRecord, Timeframe } from '@/lib/engine/types';
import { ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react';

interface TradeLogTableProps {
  trades: TradeRecord[];
}

export function TradeLogTable({ trades }: TradeLogTableProps) {
  const [filterDirection, setFilterDirection] = useState<'ALL' | 'LONG' | 'SHORT'>('ALL');
  const [filterTf, setFilterTf] = useState<Timeframe | 'ALL'>('ALL');
  const [filterSymbol, setFilterSymbol] = useState<string>('ALL');

  const uniqueSymbols = Array.from(new Set(trades.map((t) => t.symbol).filter(Boolean))) as string[];
  const hasMultipleSymbols = uniqueSymbols.length > 1;

  const filteredTrades = trades.filter((t) => {
    if (filterDirection !== 'ALL' && t.direction !== filterDirection) return false;
    if (filterTf !== 'ALL' && t.timeframe !== filterTf) return false;
    if (filterSymbol !== 'ALL' && t.symbol !== filterSymbol) return false;
    return true;
  });

  const getSymbolBadge = (sym?: string) => {
    if (!sym) return null;
    const base = sym.replace('-USDT', '');
    if (base === 'BTC') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    if (base === 'ETH') return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
    return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
  };

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-lg overflow-hidden shadow-sm transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3.5 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 text-xs gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-zinc-900 dark:text-zinc-100">交易明細紀錄 (Trade Execution Log)</span>
          <span className="text-[11px] font-mono text-zinc-500">
            ({filteredTrades.length} / {trades.length} 筆)
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Symbol Filter (if multi-symbol) */}
          {hasMultipleSymbols && (
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/60 p-0.5 rounded text-[11px] font-mono">
              <button
                onClick={() => setFilterSymbol('ALL')}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  filterSymbol === 'ALL'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-bold shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                }`}
              >
                全幣種
              </button>
              {uniqueSymbols.map((sym) => (
                <button
                  key={sym}
                  onClick={() => setFilterSymbol(sym)}
                  className={`px-1.5 py-0.5 rounded transition-colors ${
                    filterSymbol === sym
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-bold shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                  }`}
                >
                  {sym.replace('-USDT', '')}
                </button>
              ))}
            </div>
          )}

          {/* Timeframe Filter */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/60 p-0.5 rounded text-[11px] font-mono">
            {['ALL', '4h', '1h', '15m', '5m'].map((tf) => (
              <button
                key={tf}
                onClick={() => setFilterTf(tf as any)}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  filterTf === tf
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-bold shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                }`}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Direction Filter */}
          <div className="flex items-center gap-1">
            <Filter className="w-3 h-3 text-zinc-400" />
            <button
              onClick={() => setFilterDirection('ALL')}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                filterDirection === 'ALL'
                  ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setFilterDirection('LONG')}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                filterDirection === 'LONG'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
              }`}
            >
              做多
            </button>
            <button
              onClick={() => setFilterDirection('SHORT')}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                filterDirection === 'SHORT'
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/30'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
              }`}
            >
              做空
            </button>
          </div>
        </div>
      </div>

      <div className="max-h-72 overflow-y-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 text-[11px]">
            <tr>
              <th className="py-2 px-3">時間 (Time)</th>
              <th className="py-2 px-3">標的 / 策略 / 方向</th>
              <th className="py-2 px-3 text-right">進場均價</th>
              <th className="py-2 px-3 text-right">出場均價</th>
              <th className="py-2 px-3 text-right">手續費</th>
              <th className="py-2 px-3 text-center">出場原因</th>
              <th className="py-2 px-3 text-right">損益 (PnL)</th>
              <th className="py-2 px-3 text-right">報酬率</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 text-zinc-800 dark:text-zinc-200">
            {filteredTrades.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-zinc-400 dark:text-zinc-500 text-xs">
                  此條件下無觸發交易。
                </td>
              </tr>
            ) : (
              filteredTrades.slice().reverse().map((t) => {
                const isWin = t.pnlAmount > 0;
                const tfBadgeColor =
                  t.timeframe === '4h'
                    ? 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20'
                    : t.timeframe === '1h'
                    ? 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20'
                    : t.timeframe === '15m'
                    ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20'
                    : 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

                const symBadge = getSymbolBadge(t.symbol);

                return (
                  <tr key={t.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                    <td className="py-2 px-3 text-zinc-600 dark:text-zinc-400 text-[11px]">
                      {new Date(t.entryTime).toLocaleString('zh-TW', {
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        {t.symbol && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${symBadge}`}>
                            {t.symbol.replace('-USDT', '')}
                          </span>
                        )}
                        <span className={`text-[9px] font-bold px-1 py-0.2 rounded border ${tfBadgeColor}`}>
                          {t.timeframe.toUpperCase()}
                        </span>
                        <span
                          className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded ${
                            t.direction === 'LONG'
                              ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                              : 'text-rose-600 dark:text-rose-400 bg-rose-500/10'
                          }`}
                        >
                          {t.direction === 'LONG' ? (
                            <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3 text-rose-500" />
                          )}
                          {t.direction}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right text-zinc-700 dark:text-zinc-300 font-medium">
                      ${t.entryPrice.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-right text-zinc-700 dark:text-zinc-300 font-medium">
                      ${t.exitPrice.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-right text-zinc-500 text-[11px]">
                      -${t.feePaid.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium">
                        {t.exitReason}
                      </span>
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-bold ${
                        isWin ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isWin ? '+' : ''}${t.pnlAmount.toFixed(2)}
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-bold ${
                        isWin ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isWin ? '+' : ''}
                      {t.pnlPct.toFixed(1)}%
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
