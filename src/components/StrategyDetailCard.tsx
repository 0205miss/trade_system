'use client';

import React, { useState } from 'react';
import { StrategyModel } from '@/lib/engine/types';
import {
  Activity,
  Layers,
  ShieldCheck,
  TrendingUp,
  BarChart2,
  GitBranch,
  ChevronDown,
  ChevronUp,
  Cpu,
  Target,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface StrategyDetailCardProps {
  strategy: StrategyModel;
  expandedDefault?: boolean;
}

export function StrategyDetailCard({ strategy, expandedDefault = true }: StrategyDetailCardProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(expandedDefault);

  const ind = strategy.indicatorsConfig;
  const risk = strategy.riskConfig;
  const mtf = strategy.mtfReferenceConfig;

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-lg overflow-hidden text-xs font-mono shadow-sm transition-colors">
      {/* Header Banner */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/60 hover:bg-zinc-100/80 dark:hover:bg-zinc-900 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <Cpu className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <div>
            <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
              {strategy.name} &bull; 策略詳細內容與指標清單
            </span>
            <span className="text-[11px] text-zinc-600 dark:text-zinc-400 block font-medium mt-0.5">
              週期: <strong className="text-zinc-900 dark:text-zinc-200">{strategy.timeframe.toUpperCase()}</strong> &bull; 標的: <strong className="text-zinc-900 dark:text-zinc-200">{strategy.symbol}</strong> &bull; 模式: 100% 數據數學客觀驅動
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 font-medium">
          <span className="text-[11px]">{isExpanded ? '收合詳情' : '展開完整指標與進場條件'}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-700 dark:text-zinc-300" /> : <ChevronDown className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 space-y-4 divide-y divide-zinc-200 dark:divide-zinc-800/80">
          {/* 1. Technical Indicators Categorized Matrix */}
          <div>
            <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100 font-bold mb-2.5">
              <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>1. 策略技術指標陣容 (Indicators Suite)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Trend */}
              <div className="p-2.5 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded space-y-1.5">
                <div className="text-[11px] font-bold text-sky-700 dark:text-sky-400 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> 趨勢類指標 (Trend)
                </div>
                <div className="text-[11px] space-y-1">
                  <div className="flex items-baseline justify-between"><span className="text-zinc-700 dark:text-zinc-400 font-medium">&bull; Fast EMA:</span> <span className="text-zinc-950 dark:text-zinc-100 font-bold">{ind.emaFast || 20}</span></div>
                  <div className="flex items-baseline justify-between"><span className="text-zinc-700 dark:text-zinc-400 font-medium">&bull; Slow EMA:</span> <span className="text-zinc-950 dark:text-zinc-100 font-bold">{ind.emaSlow || 50}</span></div>
                  <div className="flex items-baseline justify-between"><span className="text-zinc-700 dark:text-zinc-400 font-medium">&bull; Trend EMA:</span> <span className="text-zinc-950 dark:text-zinc-100 font-bold">{ind.emaTrend || 200}</span></div>
                  <div className="flex items-baseline justify-between"><span className="text-zinc-700 dark:text-zinc-400 font-medium">&bull; Supertrend:</span> <span className="text-zinc-950 dark:text-zinc-100 font-bold">{ind.supertrendPeriod || 10} / {ind.supertrendMultiplier || 3.0}x</span></div>
                  <div className="flex items-baseline justify-between"><span className="text-zinc-700 dark:text-zinc-400 font-medium">&bull; MACD:</span> <span className="text-zinc-950 dark:text-zinc-100 font-bold">12, 26, 9 (柱狀判定)</span></div>
                </div>
              </div>

              {/* Momentum */}
              <div className="p-2.5 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded space-y-1.5">
                <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5" /> 動能擺盪類 (Momentum)
                </div>
                <div className="text-[11px] space-y-1">
                  <div className="flex items-baseline justify-between"><span className="text-zinc-700 dark:text-zinc-400 font-medium">&bull; RSI 週期:</span> <span className="text-zinc-950 dark:text-zinc-100 font-bold">{ind.rsiPeriod || 14}</span></div>
                  <div className="flex items-baseline justify-between"><span className="text-zinc-700 dark:text-zinc-400 font-medium">&bull; RSI 超賣門檻:</span> <span className="text-emerald-600 dark:text-emerald-400 font-bold">&lt; {ind.rsiOversold || 32}</span></div>
                  <div className="flex items-baseline justify-between"><span className="text-zinc-700 dark:text-zinc-400 font-medium">&bull; RSI 超買門檻:</span> <span className="text-rose-600 dark:text-rose-400 font-bold">&gt; {ind.rsiOverbought || 68}</span></div>
                  <div className="flex items-baseline justify-between"><span className="text-zinc-700 dark:text-zinc-400 font-medium">&bull; StochRSI:</span> <span className="text-zinc-950 dark:text-zinc-100 font-bold">14, 14, 3, 3</span></div>
                  <div className="flex items-baseline justify-between"><span className="text-zinc-700 dark:text-zinc-400 font-medium">&bull; Williams %R:</span> <span className="text-zinc-950 dark:text-zinc-100 font-bold">14 (超跌判定)</span></div>
                </div>
              </div>

              {/* Volatility */}
              <div className="p-2.5 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded space-y-1.5">
                <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" /> 波動率與通道 (Volatility)
                </div>
                <div className="text-[11px] space-y-1">
                  <div className="flex items-baseline justify-between"><span className="text-zinc-700 dark:text-zinc-400 font-medium">&bull; ATR 週期:</span> <span className="text-zinc-950 dark:text-zinc-100 font-bold">{ind.atrPeriod || 14}</span></div>
                  <div className="flex items-baseline justify-between"><span className="text-zinc-700 dark:text-zinc-400 font-medium">&bull; 布林通道:</span> <span className="text-zinc-950 dark:text-zinc-100 font-bold">{ind.bbPeriod || 20} (2.0 Std)</span></div>
                  <div className="flex items-baseline justify-between"><span className="text-zinc-700 dark:text-zinc-400 font-medium">&bull; 布林帶寬度:</span> <span className="text-zinc-950 dark:text-zinc-100 font-bold">Bandwidth 擠壓</span></div>
                  <div className="flex items-baseline justify-between"><span className="text-zinc-700 dark:text-zinc-400 font-medium">&bull; Keltner 通道:</span> <span className="text-zinc-950 dark:text-zinc-100 font-bold">EMA20 + 2x ATR</span></div>
                  <div className="flex items-baseline justify-between"><span className="text-zinc-700 dark:text-zinc-400 font-medium">&bull; Donchian:</span> <span className="text-zinc-950 dark:text-zinc-100 font-bold">20 週期高低位</span></div>
                </div>
              </div>

              {/* Volume & Flow */}
              <div className="p-2.5 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded space-y-1.5">
                <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                  <BarChart2 className="w-3.5 h-3.5" /> 量能與資金流 (Volume)
                </div>
                <div className="text-[11px] space-y-1">
                  <div className="flex items-baseline justify-between"><span className="text-zinc-700 dark:text-zinc-400 font-medium">&bull; RVOL 爆量門檻:</span> <span className="text-zinc-950 dark:text-zinc-100 font-bold">&ge; {ind.rvolThreshold || 1.15}x</span></div>
                  <div className="flex items-baseline justify-between"><span className="text-zinc-700 dark:text-zinc-400 font-medium">&bull; VWAP:</span> <span className="text-zinc-950 dark:text-zinc-100 font-bold">量加權均價</span></div>
                  <div className="flex items-baseline justify-between"><span className="text-zinc-700 dark:text-zinc-400 font-medium">&bull; CMF 蔡金流:</span> <span className="text-zinc-950 dark:text-zinc-100 font-bold">20 週期主力動向</span></div>
                  <div className="flex items-baseline justify-between"><span className="text-zinc-700 dark:text-zinc-400 font-medium">&bull; OBV:</span> <span className="text-zinc-950 dark:text-zinc-100 font-bold">能量潮多空偏向</span></div>
                  <div className="flex items-baseline justify-between"><span className="text-zinc-700 dark:text-zinc-400 font-medium">&bull; 關鍵位:</span> <span className="text-zinc-950 dark:text-zinc-100 font-bold">Pivot Points &amp; HL</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Confluence Entry Formulas & Mathematical Rules */}
          <div className="pt-3">
            <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100 font-bold mb-2">
              <Target className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>2. 進場判定數學邏輯 (Confluence Trigger Conditions)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Long Rules */}
              <div className="p-3 bg-emerald-500/5 dark:bg-zinc-900/40 border border-emerald-500/30 rounded space-y-2">
                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5" /> 多頭開倉條件 (Long Trigger)
                </div>
                <div className="text-[11px] text-zinc-800 dark:text-zinc-200 space-y-1.5 leading-relaxed">
                  <div className="flex items-start gap-1.5">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">1.</span>
                    <span><strong className="text-zinc-950 dark:text-zinc-50 font-bold">Supertrend 偏多</strong>：趨勢指標為 1 且價位站上下軌</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">2.</span>
                    <span><strong className="text-zinc-950 dark:text-zinc-50 font-bold">動能共振</strong>：RSI &lt; {ind.rsiOversold || 32} 或 StochRSI %K 超賣金叉</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">3.</span>
                    <span><strong className="text-zinc-950 dark:text-zinc-50 font-bold">大趨勢支撐</strong>：現價高於 EMA({ind.emaTrend || 200}) 的 98%</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">4.</span>
                    <span><strong className="text-zinc-950 dark:text-zinc-50 font-bold">爆量確認</strong>：相對成交量 RVOL &ge; {ind.rvolThreshold || 1.15}x</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">5.</span>
                    <span><strong className="text-zinc-950 dark:text-zinc-50 font-bold">MTF 跨週期濾網</strong>：{mtf.useHigherTimeframeTrendFilter ? `4H 宏觀趨勢非空頭` : '無'}</span>
                  </div>
                </div>
              </div>

              {/* Short Rules */}
              <div className="p-3 bg-rose-500/5 dark:bg-zinc-900/40 border border-rose-500/30 rounded space-y-2">
                <div className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1">
                  <ArrowDownRight className="w-3.5 h-3.5" /> 空頭開倉條件 (Short Trigger)
                </div>
                <div className="text-[11px] text-zinc-800 dark:text-zinc-200 space-y-1.5 leading-relaxed">
                  <div className="flex items-start gap-1.5">
                    <span className="text-rose-600 dark:text-rose-400 font-bold">1.</span>
                    <span><strong className="text-zinc-950 dark:text-zinc-50 font-bold">Supertrend 偏空</strong>：趨勢指標為 -1 且價位受壓於上軌</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-rose-600 dark:text-rose-400 font-bold">2.</span>
                    <span><strong className="text-zinc-950 dark:text-zinc-50 font-bold">動能共振</strong>：RSI &gt; {ind.rsiOverbought || 68} 或 StochRSI %K 超買死叉</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-rose-600 dark:text-rose-400 font-bold">3.</span>
                    <span><strong className="text-zinc-950 dark:text-zinc-50 font-bold">大趨勢反壓</strong>：現價低於 EMA({ind.emaTrend || 200}) 的 102%</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-rose-600 dark:text-rose-400 font-bold">4.</span>
                    <span><strong className="text-zinc-950 dark:text-zinc-50 font-bold">爆量確認</strong>：相對成交量 RVOL &ge; {ind.rvolThreshold || 1.15}x</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-rose-600 dark:text-rose-400 font-bold">5.</span>
                    <span><strong className="text-zinc-950 dark:text-zinc-50 font-bold">MTF 跨週期濾網</strong>：{mtf.useHigherTimeframeTrendFilter ? `4H 宏觀趨勢非多頭` : '無'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Position Tranches & Risk Management */}
          <div className="pt-3">
            <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100 font-bold mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>3. 倉位管理、分批加倉與止盈止損階梯</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Tranches */}
              <div className="p-2.5 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded space-y-1.5">
                <div className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                  <GitBranch className="w-3 h-3 text-sky-600 dark:text-sky-400" /> 分批建倉規劃 (Tranches)
                </div>
                <div className="text-[11px] text-zinc-800 dark:text-zinc-200 space-y-1">
                  <div>&bull; <strong className="text-zinc-900 dark:text-zinc-100 font-bold">15% 試單 (Scout):</strong> 信號觸發立即進場</div>
                  <div>&bull; <strong className="text-zinc-900 dark:text-zinc-100 font-bold">30% 加倉 (Scale-in):</strong> 回踩極端 ATR 區</div>
                  <div>&bull; <strong className="text-zinc-900 dark:text-zinc-100 font-bold">40% 主倉 (Confirmed):</strong> 小級別結構確認</div>
                  <div>&bull; <strong className="text-zinc-900 dark:text-zinc-100 font-bold">15% 尾倉 (Runner):</strong> 突破 BOS 順勢加碼</div>
                </div>
              </div>

              {/* Take Profits */}
              <div className="p-2.5 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded space-y-1.5">
                <div className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                  <Target className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> 階梯止盈與保本 (Take Profit)
                </div>
                <div className="text-[11px] text-zinc-800 dark:text-zinc-200 space-y-1">
                  <div>&bull; <strong className="text-zinc-900 dark:text-zinc-100 font-bold">TP1 ({strategy.takeProfits[0]?.rrMultiple || 1.5}R):</strong> 平倉 35% 並<span className="text-emerald-700 dark:text-emerald-400 font-bold underline">移損至保本 (BE)</span></div>
                  <div>&bull; <strong className="text-zinc-900 dark:text-zinc-100 font-bold">TP2 ({strategy.takeProfits[1]?.rrMultiple || 3.0}R):</strong> 平倉 35% 並啟用移動止損</div>
                  <div>&bull; <strong className="text-zinc-900 dark:text-zinc-100 font-bold">TP3 ({strategy.takeProfits[2]?.rrMultiple || 6.0}R):</strong> 30% 尾倉順勢奔跑</div>
                </div>
              </div>

              {/* Risk Settings */}
              <div className="p-2.5 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded space-y-1.5">
                <div className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-amber-600 dark:text-amber-400" /> 嚴格風控與費用模型
                </div>
                <div className="text-[11px] text-zinc-800 dark:text-zinc-200 space-y-1">
                  <div className="flex items-baseline justify-between"><span className="text-zinc-700 dark:text-zinc-400 font-medium">&bull; 止損距離:</span> <span className="text-zinc-950 dark:text-zinc-100 font-bold">{risk.slAtrMultiplier}x ATR</span></div>
                  <div className="flex items-baseline justify-between"><span className="text-zinc-700 dark:text-zinc-400 font-medium">&bull; 單筆風險上限:</span> <span className="text-zinc-950 dark:text-zinc-100 font-bold">{risk.riskPerTradePct}% 帳戶總額</span></div>
                  <div className="flex items-baseline justify-between"><span className="text-zinc-700 dark:text-zinc-400 font-medium">&bull; 合約槓桿:</span> <span className="text-zinc-950 dark:text-zinc-100 font-bold">{risk.leverage}x 永續合約</span></div>
                  <div className="flex items-baseline justify-between"><span className="text-zinc-700 dark:text-zinc-400 font-medium">&bull; 手續費:</span> <span className="text-zinc-950 dark:text-zinc-100 font-bold">Maker 0.02% / Taker 0.05%</span></div>
                  <div className="flex items-baseline justify-between"><span className="text-zinc-700 dark:text-zinc-400 font-medium">&bull; 滑點模型:</span> <span className="text-zinc-950 dark:text-zinc-100 font-bold">3 bps (0.03%)</span></div>
                  <div className="flex items-baseline justify-between"><span className="text-zinc-700 dark:text-zinc-400 font-medium">&bull; 單日熔斷:</span> <span className="text-zinc-950 dark:text-zinc-100 font-bold">${risk.maxDailyLossUsdt} USDT</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
