'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { supabase } from '@/lib/supabase/client';
import { Timeframe } from '@/lib/engine/types';
import { CheckCircle2, Circle } from 'lucide-react';

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<any[]>([]);
  const [selectedTf, setSelectedTf] = useState<Timeframe | 'ALL'>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      let query = supabase.from('opt_strategies').select('*').order('created_at', { ascending: false });
      if (selectedTf !== 'ALL') {
        query = query.eq('timeframe', selectedTf);
      }
      const { data } = await query;
      setStrategies(data || []);
      setIsLoading(false);
    }
    load();
  }, [selectedTf]);

  const handleToggleActive = async (id: string, tf: string) => {
    await supabase.from('opt_strategies').update({ is_active: false }).eq('timeframe', tf);
    await supabase.from('opt_strategies').update({ is_active: true }).eq('id', id);

    setStrategies((prev) =>
      prev.map((s) => ({
        ...s,
        is_active: s.id === id ? true : s.timeframe === tf ? false : s.is_active,
      }))
    );
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div>
            <h1 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">策略模型管理庫 (Strategy Models)</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
              檢視與切換 Supabase opt_strategies 中各週期已儲存之最佳化參數
            </p>
          </div>

          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded border border-zinc-200 dark:border-zinc-800 text-xs font-mono">
            {['ALL', '4h', '1h', '15m', '5m'].map((tf) => (
              <button
                key={tf}
                onClick={() => setSelectedTf(tf as any)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  selectedTf === tf
                    ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 font-semibold shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-zinc-100 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/60 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : strategies.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-xs font-mono border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950">
            尚無已儲存之策略模型。請在工作台執行回測或由 Antigravity 每日排程自動生成。
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {strategies.map((strat) => (
              <div
                key={strat.id}
                className={`p-4 rounded-lg border transition-all ${
                  strat.is_active
                    ? 'bg-white dark:bg-zinc-900/60 border-emerald-500/40 ring-1 ring-emerald-500/20 shadow-sm'
                    : 'bg-white dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[10px] font-mono font-bold uppercase">
                        {strat.timeframe}
                      </span>
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-200">{strat.name}</span>
                    </div>
                    <span className="text-[11px] text-zinc-500 font-mono block mt-0.5">
                      {strat.symbol} &bull; 建立於 {new Date(strat.created_at).toLocaleDateString('zh-TW')}
                    </span>
                  </div>

                  <button
                    onClick={() => handleToggleActive(strat.id, strat.timeframe)}
                    className={`flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded transition-colors ${
                      strat.is_active
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold'
                        : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    {strat.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                    {strat.is_active ? '當前活躍模型' : '設為活躍'}
                  </button>
                </div>

                {/* Exhaustive Indicators & Rules Breakdown */}
                <div className="mt-3 space-y-2 text-xs font-mono">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-zinc-50 dark:bg-zinc-950/80 p-2.5 rounded border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400">
                    <div>
                      <span className="text-zinc-500 block">趨勢 EMA / ST:</span>
                      <span className="text-zinc-900 dark:text-zinc-200 font-semibold">
                        {strat.indicators_config?.emaFast || 20} / {strat.indicators_config?.emaSlow || 50} / {strat.indicators_config?.emaTrend || 200}
                        {' '}&bull; {strat.indicators_config?.supertrendMultiplier || 3.0}x
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">動能 RSI / Stoch:</span>
                      <span className="text-zinc-900 dark:text-zinc-200 font-semibold">
                        {strat.indicators_config?.rsiOversold || 32} / {strat.indicators_config?.rsiOverbought || 68}
                        {' '}&bull; StochRSI &lt; 40
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">量能 RVOL / VWAP:</span>
                      <span className="text-zinc-900 dark:text-zinc-200 font-semibold">
                        &ge; {strat.indicators_config?.rvolThreshold || 1.15}x 爆量 &bull; VWAP
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">風控 止損 / 槓桿:</span>
                      <span className="text-zinc-900 dark:text-zinc-200 font-semibold">
                        {strat.risk_config?.slAtrMultiplier || 1.8}x ATR &bull; {strat.risk_config?.leverage || 20}x
                      </span>
                    </div>
                  </div>

                  {/* Tranches & TP */}
                  <div className="p-2 bg-zinc-50 dark:bg-zinc-950/40 rounded border border-zinc-200 dark:border-zinc-800/60 text-[11px] text-zinc-600 dark:text-zinc-400 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-zinc-500">分批建倉: </span>
                      <span className="text-zinc-800 dark:text-zinc-300">15% 試單 &bull; 30% 加倉 &bull; 40% 主倉 &bull; 15% 尾倉</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">階梯止盈: </span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">TP1 1.5R (移保本 BE) &bull; TP2 3.0R (移動止損) &bull; TP3 6.0R</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
