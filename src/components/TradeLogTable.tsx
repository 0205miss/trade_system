'use client';

import React, { useState } from 'react';
import { TradeRecord } from '@/lib/engine/types';
import { ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react';

interface TradeLogTableProps {
  trades: TradeRecord[];
}

export function TradeLogTable({ trades }: TradeLogTableProps) {
  const [filterDirection, setFilterDirection] = useState<'ALL' | 'LONG' | 'SHORT'>('ALL');

  const filteredTrades = trades.filter((t) => {
    if (filterDirection === 'ALL') return true;
    return t.direction === filterDirection;
  });

  return (
    <div className="border border-zinc-800 bg-zinc-950 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-zinc-800 bg-zinc-900/40 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-200">交易明細紀錄 (Trade Execution Log)</span>
          <span className="text-[11px] font-mono text-zinc-500">({trades.length} 筆)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="w-3 h-3 text-zinc-500" />
          <button
            onClick={() => setFilterDirection('ALL')}
            className={`px-2 py-0.5 rounded text-[11px] font-mono ${
              filterDirection === 'ALL' ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            全部
          </button>
          <button
            onClick={() => setFilterDirection('LONG')}
            className={`px-2 py-0.5 rounded text-[11px] font-mono ${
              filterDirection === 'LONG' ? 'bg-emerald-500/20 text-emerald-400 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            僅做多
          </button>
          <button
            onClick={() => setFilterDirection('SHORT')}
            className={`px-2 py-0.5 rounded text-[11px] font-mono ${
              filterDirection === 'SHORT' ? 'bg-rose-500/20 text-rose-400 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            僅做空
          </button>
        </div>
      </div>

      <div className="max-h-72 overflow-y-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="sticky top-0 bg-zinc-900 text-zinc-400 border-b border-zinc-800 text-[11px]">
            <tr>
              <th className="py-2 px-3">時間 (Time)</th>
              <th className="py-2 px-3">方向</th>
              <th className="py-2 px-3 text-right">進場均價</th>
              <th className="py-2 px-3 text-right">出場均價</th>
              <th className="py-2 px-3 text-right">手續費</th>
              <th className="py-2 px-3 text-center">出場原因</th>
              <th className="py-2 px-3 text-right">損益 (PnL)</th>
              <th className="py-2 px-3 text-right">報酬率</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
            {filteredTrades.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-zinc-500 text-xs">
                  此回測期間無觸發交易。
                </td>
              </tr>
            ) : (
              filteredTrades.slice().reverse().map((t) => {
                const isWin = t.pnlAmount > 0;
                return (
                  <tr key={t.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="py-2 px-3 text-zinc-400 text-[11px]">
                      {new Date(t.entryTime).toLocaleString('zh-TW', {
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded ${
                          t.direction === 'LONG'
                            ? 'text-emerald-400 bg-emerald-500/10'
                            : 'text-rose-400 bg-rose-500/10'
                        }`}
                      >
                        {t.direction === 'LONG' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {t.direction}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">${t.entryPrice.toFixed(1)}</td>
                    <td className="py-2 px-3 text-right">${t.exitPrice.toFixed(1)}</td>
                    <td className="py-2 px-3 text-right text-zinc-400">-${t.feePaid.toFixed(2)}</td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded border ${
                          t.exitReason === 'TP1' || t.exitReason === 'TP2' || t.exitReason === 'TP3'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : t.exitReason === 'BE'
                            ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {t.exitReason}
                      </span>
                    </td>
                    <td className={`py-2 px-3 text-right font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isWin ? '+' : ''}${t.pnlAmount.toFixed(2)}
                    </td>
                    <td className={`py-2 px-3 text-right font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isWin ? '+' : ''}{t.pnlPct.toFixed(2)}%
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
