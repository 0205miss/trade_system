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
        className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-900/90 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <Cpu className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <div>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {strategy.name} &bull; 策略詳細內容與指標清單
            </span>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block font-normal">
              週期: {strategy.timeframe.toUpperCase()} &bull; 標的: {strategy.symbol} &bull; 模式: 100% 數據數學客觀驅動
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
          <span className="text-[11px]">{isExpanded ? '收合詳情' : '展開完整指標與進場條件'}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 space-y-4 divide-y divide-zinc-200 dark:divide-zinc-800/80">
          {/* 1. Technical Indicators Categorized Matrix */}
          <div>
            <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-200 font-semibold mb-2.5">
              <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>1. 策略技術指標陣容 (Indicators Suite)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Trend */}
              <div className="p-2.5 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded space-y-1 text-zinc-800 dark:text-zinc-300">
                <div className="text-[11px] font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> 趨勢類指標 (Trend)
                </div>
                <div className="text-[11px] space-y-0.5 text-zinc-600 dark:text-zinc-400">
                  <div>&bull; Fast EMA: <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{ind.emaFast || 20}</span></div>
                  <div>&bull; Slow EMA: <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{ind.emaSlow || 50}</span></div>
                  <div>&bull; Trend EMA: <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{ind.emaTrend || 200}</span></div>
                  <div>&bull; Supertrend: <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{ind.supertrendPeriod || 10} / {ind.supertrendMultiplier || 3.0}x</span></div>
                  <div>&bull; MACD: <span className="text-zinc-900 dark:text-zinc-100 font-semibold">12, 26, 9 (零軸柱狀判定)</span></div>
                </div>
              </div>

              {/* Momentum */}
              <div className="p-2.5 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded space-y-1 text-zinc-800 dark:text-zinc-300">
                <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Activity className="w-3 h-3" /> 動能擺盪類 (Momentum)
                </div>
                <div className="text-[11px] space-y-0.5 text-zinc-600 dark:text-zinc-400">
                  <div>&bull; RSI 週期: <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{ind.rsiPeriod || 14}</span></div>
                  <div>&bull; RSI 超賣門檻: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">&lt; {ind.rsiOversold || 32}</span></div>
                  <div>&bull; RSI 超買門檻: <span className="text-rose-600 dark:text-rose-400 font-semibold">&gt; {ind.rsiOverbought || 68}</span></div>
                  <div>&bull; StochRSI: <span className="text-zinc-900 dark:text-zinc-100 font-semibold">14, 14, 3, 3 (%K金叉 &lt; 40)</span></div>
                  <div>&bull; Williams %R: <span className="text-zinc-900 dark:text-zinc-100 font-semibold">14 (極限超跌確認)</span></div>
                </div>
              </div>

              {/* Volatility */}
              <div className="p-2.5 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded space-y-1 text-zinc-800 dark:text-zinc-300">
                <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Layers className="w-3 h-3" /> 波動率與通道 (Volatility)
                </div>
                <div className="text-[11px] space-y-0.5 text-zinc-600 dark:text-zinc-400">
                  <div>&bull; ATR 週期: <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{ind.atrPeriod || 14}</span></div>
                  <div>&bull; 布林通道: <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{ind.bbPeriod || 20} (2.0 StdDev)</span></div>
                  <div>&bull; 布林帶寬度: <span className="text-zinc-900 dark:text-zinc-100 font-semibold">%B &amp; Bandwidth 擠壓</span></div>
                  <div>&bull; Keltner 通道: <span className="text-zinc-900 dark:text-zinc-100 font-semibold">EMA 20 + 2.0x ATR</span></div>
                  <div>&bull; Donchian: <span className="text-zinc-900 dark:text-zinc-100 font-semibold">20 週期高低通道</span></div>
                </div>
              </div>

              {/* Volume & Flow */}
              <div className="p-2.5 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded space-y-1 text-zinc-800 dark:text-zinc-300">
                <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                  <BarChart2 className="w-3 h-3" /> 量能與資金流 (Volume)
                </div>
                <div className="text-[11px] space-y-0.5 text-zinc-600 dark:text-zinc-400">
                  <div>&bull; RVOL 爆量門檻: <span className="text-zinc-900 dark:text-zinc-100 font-semibold">&ge; {ind.rvolThreshold || 1.15}x</span></div>
                  <div>&bull; VWAP: <span className="text-zinc-900 dark:text-zinc-100 font-semibold">日內成交量加權均價</span></div>
                  <div>&bull; CMF 蔡金流: <span className="text-zinc-900 dark:text-zinc-100 font-semibold">20 週期主力資金動向</span></div>
                  <div>&bull; OBV: <span className="text-zinc-900 dark:text-zinc-100 font-semibold">能量潮均線多空偏向</span></div>
                  <div>&bull; 關鍵位: <span className="text-zinc-900 dark:text-zinc-100 font-semibold">Pivot Points &amp; Swing H/L</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Confluence Entry Formulas & Mathematical Rules */}
          <div className="pt-3">
            <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-200 font-semibold mb-2">
              <Target className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>2. 進場判定數學邏輯 (Confluence Trigger Conditions)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Long Rules */}
              <div className="p-3 bg-emerald-500/5 dark:bg-zinc-900/30 border border-emerald-500/20 rounded space-y-1.5">
                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5" /> 多頭開倉條件 (Long Trigger)
                </div>
                <div className="text-[11px] text-zinc-700 dark:text-zinc-300 space-y-1 leading-relaxed">
                  <div className="flex items-start gap-1.5">
                    <span className="text-emerald-600 dark:text-emerald-500 font-bold">1.</span>
                    <span><strong>Supertrend 偏多</strong>：趨勢指標為 1 且價位站上下軌</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-emerald-600 dark:text-emerald-500 font-bold">2.</span>
                    <span><strong>動能共振</strong>：RSI &lt; {ind.rsiOversold || 32} 或 StochRSI %K 超賣金叉</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-emerald-600 dark:text-emerald-500 font-bold">3.</span>
                    <span><strong>大趨勢支撐</strong>：現價高於 EMA({ind.emaTrend || 200}) 的 98%</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-emerald-600 dark:text-emerald-500 font-bold">4.</span>
                    <span><strong>爆量確認</strong>：相對成交量 RVOL &ge; {ind.rvolThreshold || 1.15}x</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-emerald-600 dark:text-emerald-500 font-bold">5.</span>
                    <span><strong>MTF 跨週期濾網</strong>：{mtf.useHigherTimeframeTrendFilter ? `4H 宏觀趨勢非空頭` : '無'}</span>
                  </div>
                </div>
              </div>

              {/* Short Rules */}
              <div className="p-3 bg-rose-500/5 dark:bg-zinc-900/30 border border-rose-500/20 rounded space-y-1.5">
                <div className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <ArrowDownRight className="w-3.5 h-3.5" /> 空頭開倉條件 (Short Trigger)
                </div>
                <div className="text-[11px] text-zinc-700 dark:text-zinc-300 space-y-1 leading-relaxed">
                  <div className="flex items-start gap-1.5">
                    <span className="text-rose-600 dark:text-rose-500 font-bold">1.</span>
                    <span><strong>Supertrend 偏空</strong>：趨勢指標為 -1 且價位受壓於上軌</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-rose-600 dark:text-rose-500 font-bold">2.</span>
                    <span><strong>動能共振</strong>：RSI &gt; {ind.rsiOverbought || 68} 或 StochRSI %K 超買死叉</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-rose-600 dark:text-rose-500 font-bold">3.</span>
                    <span><strong>大趨勢反壓</strong>：現價低於 EMA({ind.emaTrend || 200}) 的 102%</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-rose-600 dark:text-rose-500 font-bold">4.</span>
                    <span><strong>爆量確認</strong>：相對成交量 RVOL &ge; {ind.rvolThreshold || 1.15}x</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-rose-600 dark:text-rose-500 font-bold">5.</span>
                    <span><strong>MTF 跨週期濾網</strong>：{mtf.useHigherTimeframeTrendFilter ? `4H 宏觀趨勢非多頭` : '無'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Position Tranches & Risk Management */}
          <div className="pt-3">
            <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-200 font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>3. 倉位管理、分批加倉與止盈止損階梯</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Tranches */}
              <div className="p-2.5 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded space-y-1">
                <div className="text-[11px] font-bold text-zinc-900 dark:text-zinc-200 flex items-center gap-1">
                  <GitBranch className="w-3 h-3 text-sky-600 dark:text-sky-400" /> 分批建倉規劃 (Tranches)
                </div>
                <div className="text-[11px] text-zinc-600 dark:text-zinc-400 space-y-0.5">
                  <div>&bull; 15% 試單 (Scout): 信號觸發立即進場</div>
                  <div>&bull; 30% 加倉 (Scale-in): 回踩極端 ATR 區</div>
                  <div>&bull; 40% 主倉 (Confirmed): 小級別結構確認</div>
                  <div>&bull; 15% 尾倉 (Runner): 突破 BOS 順勢加碼</div>
                </div>
              </div>

              {/* Take Profits */}
              <div className="p-2.5 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded space-y-1">
                <div className="text-[11px] font-bold text-zinc-900 dark:text-zinc-200 flex items-center gap-1">
                  <Target className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> 階梯止盈與保本 (Take Profit)
                </div>
                <div className="text-[11px] text-zinc-600 dark:text-zinc-400 space-y-0.5">
                  <div>&bull; TP1 ({strategy.takeProfits[0]?.rrMultiple || 1.5}R): 平倉 35% 並<strong>移損至保本 (BE)</strong></div>
                  <div>&bull; TP2 ({strategy.takeProfits[1]?.rrMultiple || 3.0}R): 平倉 35% 並啟用移動止損</div>
                  <div>&bull; TP3 ({strategy.takeProfits[2]?.rrMultiple || 6.0}R): 30% 尾倉順勢奔跑</div>
                </div>
              </div>

              {/* Risk Settings */}
              <div className="p-2.5 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded space-y-1">
                <div className="text-[11px] font-bold text-zinc-900 dark:text-zinc-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-amber-600 dark:text-amber-400" /> 嚴格風控與費用模型
                </div>
                <div className="text-[11px] text-zinc-600 dark:text-zinc-400 space-y-0.5">
                  <div>&bull; 止損距離: <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{risk.slAtrMultiplier}x ATR</span></div>
                  <div>&bull; 單筆風險上限: <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{risk.riskPerTradePct}% 帳戶總額</span></div>
                  <div>&bull; 合約槓桿: <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{risk.leverage}x 永續合約</span></div>
                  <div>&bull; 手續費: <span className="text-zinc-900 dark:text-zinc-100 font-semibold">Maker 0.02% / Taker 0.05%</span></div>
                  <div>&bull; 滑點模型: <span className="text-zinc-900 dark:text-zinc-100 font-semibold">3 bps (0.03%)</span></div>
                  <div>&bull; 單日熔斷: <span className="text-zinc-900 dark:text-zinc-100 font-semibold">${risk.maxDailyLossUsdt} USDT</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
