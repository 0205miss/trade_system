'use client';

import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle2, XCircle, AlertCircle, RefreshCw, ChevronRight } from 'lucide-react';
import { Timeframe, SUPPORTED_SYMBOLS } from '@/lib/engine/types';

interface ConditionRow {
  name: string;
  actual: string | number;
  threshold: string | number;
  passed: boolean;
  note?: string;
}

export function SignalInspectorCard() {
  const [symbol, setSymbol] = useState<string>('BTC-USDT');
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastCheckTime, setLastCheckTime] = useState<string>('');

  const fetchDiagnosis = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/vst?symbol=${symbol}&timeframe=${timeframe}`);
      const data = await res.json();
      if (data.success && data.diagnosis) {
        setDiagnosis(data.diagnosis);
        setLastCheckTime(new Date().toLocaleTimeString('zh-TW'));
      }
    } catch (err) {
      console.error('Failed to load diagnosis:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnosis();
  }, [symbol, timeframe]);

  const evalData = diagnosis?.evaluation;
  const conditions = evalData?.conditions;

  const conditionList: ConditionRow[] = conditions
    ? [
        conditions.supertrend,
        conditions.rsi,
        conditions.stochRsi,
        conditions.rvol,
        conditions.emaTrend,
        conditions.mtfFilter,
      ].filter(Boolean)
    : [];

  const passedCount = conditionList.filter((c) => c.passed).length;
  const totalCount = conditionList.length;

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-lg overflow-hidden shadow-sm font-mono text-xs">
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-sky-500" />
          <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
            即時進場條件檢查診斷 (Signal Inspector)
          </span>
          <span className="text-[11px] text-zinc-500 hidden sm:inline">
            解構「回測有單、當下為何未下單」的具體指標門檻
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Symbol Select */}
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none"
          >
            {SUPPORTED_SYMBOLS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Timeframe Select */}
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as Timeframe)}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none uppercase"
          >
            {(['5m', '15m', '1h', '4h'] as Timeframe[]).map((tf) => (
              <option key={tf} value={tf}>
                {tf}
              </option>
            ))}
          </select>

          <button
            onClick={fetchDiagnosis}
            disabled={isLoading}
            className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-400"
            title="重新評估指標"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Top Summary bar */}
        <div className="p-3 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-zinc-900 dark:text-zinc-100">
                {symbol} [{timeframe.toUpperCase()}] 當前市價:
              </span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                ${diagnosis?.currentPrice?.toLocaleString() || '--'}
              </span>
              <span className="text-[10px] text-zinc-500">
                (評估基準: 最新已收盤 K 棒)
              </span>
            </div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
              {evalData?.summary || diagnosis?.detail || '正在計算技術特徵...'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="text-[10px] text-zinc-500 block">條件符合度</span>
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                {passedCount} / {totalCount} 項符合
              </span>
            </div>
            <div
              className={`px-2.5 py-1 rounded text-xs font-bold ${
                diagnosis?.actionTaken?.startsWith('OPENED')
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              {diagnosis?.actionTaken || 'NO_SIGNAL'}
            </div>
          </div>
        </div>

        {/* Condition Check Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {conditionList.map((cond, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg border flex flex-col justify-between transition-all ${
                cond.passed
                  ? 'bg-emerald-500/5 border-emerald-500/20 dark:bg-emerald-950/10'
                  : 'bg-zinc-50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <div className="flex items-start justify-between gap-1 mb-1.5">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  {cond.name}
                </span>
                {cond.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-zinc-400 dark:text-zinc-600 flex-shrink-0" />
                )}
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between text-zinc-500">
                  <span>當前即時值:</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    {cond.actual}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>進場門檻:</span>
                  <span className="text-zinc-600 dark:text-zinc-400">{cond.threshold}</span>
                </div>
                {cond.note && (
                  <div className="text-[10px] text-zinc-500 pt-1 border-t border-zinc-200 dark:border-zinc-800/60">
                    {cond.note}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="text-[11px] text-zinc-500 flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800/60 pt-2">
          <span>
            💡 提示：回測是針對過去數百根 K 棒逐一掃描；實盤下單要求**全部門檻在最新收盤棒同時成立**才會自動報單。
          </span>
          {lastCheckTime && <span>最後檢查: {lastCheckTime}</span>}
        </div>
      </div>
    </div>
  );
}
