'use client';

import React from 'react';
import { StrategyModel } from '@/lib/engine/types';
import { Play, Sparkles, SlidersHorizontal } from 'lucide-react';

interface StrategyControlsProps {
  strategy: StrategyModel;
  onChange: (updated: StrategyModel) => void;
  onRunBacktest: () => void;
  onRunOptimization: () => void;
  isLoading: boolean;
  isOptimizing: boolean;
}

export function StrategyControls({
  strategy,
  onChange,
  onRunBacktest,
  onRunOptimization,
  isLoading,
  isOptimizing,
}: StrategyControlsProps) {
  const updateIndicator = (key: string, val: number) => {
    onChange({
      ...strategy,
      indicatorsConfig: {
        ...strategy.indicatorsConfig,
        [key]: val,
      },
    });
  };

  const updateRisk = (key: string, val: number) => {
    onChange({
      ...strategy,
      riskConfig: {
        ...strategy.riskConfig,
        [key]: val,
      },
    });
  };

  return (
    <div className="border border-zinc-800 bg-zinc-950 rounded-lg p-3.5 space-y-3.5">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
          <h3 className="text-xs font-semibold text-zinc-200">
            {strategy.timeframe.toUpperCase()} 策略參數面板
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRunBacktest}
            disabled={isLoading || isOptimizing}
            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono rounded flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Play className="w-3 h-3 text-emerald-400" />
            快速回測
          </button>
          <button
            onClick={onRunOptimization}
            disabled={isLoading || isOptimizing}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-medium rounded flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-3 h-3" />
            {isOptimizing ? '演算法優化中...' : 'GA 前進優化'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
        {/* RSI Oversold */}
        <div>
          <label className="text-[11px] text-zinc-400 block mb-1">RSI 超賣門檻</label>
          <input
            type="number"
            value={strategy.indicatorsConfig.rsiOversold || 32}
            onChange={(e) => updateIndicator('rsiOversold', parseInt(e.target.value, 10))}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-zinc-200 focus:outline-none focus:border-zinc-700"
          />
        </div>

        {/* RSI Overbought */}
        <div>
          <label className="text-[11px] text-zinc-400 block mb-1">RSI 超買門檻</label>
          <input
            type="number"
            value={strategy.indicatorsConfig.rsiOverbought || 68}
            onChange={(e) => updateIndicator('rsiOverbought', parseInt(e.target.value, 10))}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-zinc-200 focus:outline-none focus:border-zinc-700"
          />
        </div>

        {/* Supertrend Multiplier */}
        <div>
          <label className="text-[11px] text-zinc-400 block mb-1">Supertrend 乘數</label>
          <input
            type="number"
            step="0.1"
            value={strategy.indicatorsConfig.supertrendMultiplier || 3.0}
            onChange={(e) => updateIndicator('supertrendMultiplier', parseFloat(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-zinc-200 focus:outline-none focus:border-zinc-700"
          />
        </div>

        {/* Stop Loss ATR Multiplier */}
        <div>
          <label className="text-[11px] text-zinc-400 block mb-1">止損 (ATR 乘數)</label>
          <input
            type="number"
            step="0.1"
            value={strategy.riskConfig.slAtrMultiplier || 1.8}
            onChange={(e) => updateRisk('slAtrMultiplier', parseFloat(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-zinc-200 focus:outline-none focus:border-zinc-700"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono pt-1 border-t border-zinc-800/60">
        <div>
          <span className="text-[11px] text-zinc-500 block">初始本金 / 槓桿</span>
          <span className="text-zinc-300 font-semibold">$10,000 / 20x 永續合約</span>
        </div>
        <div>
          <span className="text-[11px] text-zinc-500 block">手續費率 (Maker / Taker)</span>
          <span className="text-zinc-300 font-semibold">0.02% / 0.05%</span>
        </div>
        <div>
          <span className="text-[11px] text-zinc-500 block">滑點損耗模型</span>
          <span className="text-zinc-300 font-semibold">3 bps (0.03%)</span>
        </div>
        <div>
          <span className="text-[11px] text-zinc-500 block">分批加倉與止盈保本</span>
          <span className="text-zinc-300 font-semibold">15/30/40/15 + TP1保本</span>
        </div>
      </div>
    </div>
  );
}
