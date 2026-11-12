'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { TradingViewChart } from '@/components/TradingViewChart';
import { MetricsCards } from '@/components/MetricsCards';
import { MTFMatrix } from '@/components/MTFMatrix';
import { EquityChart } from '@/components/EquityChart';
import { TradeLogTable } from '@/components/TradeLogTable';
import { StrategyControls } from '@/components/StrategyControls';
import { StrategyDetailCard } from '@/components/StrategyDetailCard';
import { PortfolioSummaryCard } from '@/components/PortfolioSummaryCard';
import {
  Candle,
  Timeframe,
  StrategyModel,
  BacktestResult,
  PortfolioBacktestResult,
  MTFSnapshot,
} from '@/lib/engine/types';
import { OptStrategyService } from '@/lib/services/optStrategyService';
import { MultiTimeframeAggregator } from '@/lib/engine/mtf';
import { RefreshCw, AlertCircle, Layers, SlidersHorizontal, ArrowLeft } from 'lucide-react';

export default function StudioPage() {
  const [symbol, setSymbol] = useState<string>('BTC-USDT');
  const [timeframe, setTimeframe] = useState<Timeframe | 'ALL'>('ALL');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [strategy, setStrategy] = useState<StrategyModel>(
    OptStrategyService.getDefaultBaseline('1h', 'BTC-USDT')
  );
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [portfolioResult, setPortfolioResult] = useState<PortfolioBacktestResult | null>(null);
  const [mtfSnapshot, setMtfSnapshot] = useState<MTFSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync strategy when timeframe or symbol changes (if not in ALL mode)
  useEffect(() => {
    if (timeframe !== 'ALL') {
      setStrategy(OptStrategyService.getDefaultBaseline(timeframe, symbol));
    }
  }, [timeframe, symbol]);

  // Load candles & trigger initial backtest (single or portfolio)
  const loadDataAndBacktest = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const candleTf = timeframe === 'ALL' ? '1h' : timeframe;

      // 1. Fetch candles from API for charting and MTF
      const res = await fetch(`/api/candles?symbol=${symbol}&timeframe=${candleTf}&limit=500`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const candleList: Candle[] = data.candles;
      setCandles(candleList);

      // 2. Compute MTF Snapshot
      if (candleList.length > 0) {
        const latestTime = candleList[candleList.length - 1].time;
        const snapshot = MultiTimeframeAggregator.computeMTFSnapshot(symbol, latestTime, {
          [candleTf]: candleList,
        });
        setMtfSnapshot(snapshot);
      }

      // 3. Run backtest (Portfolio or Single)
      const btRes = await fetch('/api/optimizer/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          timeframe,
          strategyConfig: timeframe === 'ALL' ? undefined : strategy,
          optimize: false,
        }),
      });
      const btData = await btRes.json();
      if (!btData.success) throw new Error(btData.error);

      if (timeframe === 'ALL') {
        setPortfolioResult(btData.result);
        setBacktestResult(null);
      } else {
        setBacktestResult(btData.result);
        setPortfolioResult(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [symbol, timeframe, strategy]);

  useEffect(() => {
    loadDataAndBacktest();
  }, [symbol, timeframe]);

  // Manual Trigger: Re-run Backtest for single strategy
  const handleRunBacktest = async () => {
    if (timeframe === 'ALL') return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/optimizer/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          timeframe,
          strategyConfig: strategy,
          optimize: false,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setBacktestResult(data.result);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Manual Trigger: Run GA Optimization for single strategy
  const handleRunOptimization = async () => {
    if (timeframe === 'ALL') return;
    setIsOptimizing(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/optimizer/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          timeframe,
          strategyConfig: strategy,
          optimize: true,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const bestCandidate = data.bestCandidate;
      setStrategy(bestCandidate.strategy);
      setBacktestResult(bestCandidate.outOfSampleResult);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsOptimizing(false);
    }
  };

  const latestPrice = candles.length > 0 ? candles[candles.length - 1].close : undefined;

  const activeResult = timeframe === 'ALL' ? portfolioResult : backtestResult;
  const activeEquityCurve = activeResult?.equityCurve || [];
  const activeTrades = activeResult?.trades || [];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors">
      <Navbar
        symbol={symbol}
        onSymbolChange={setSymbol}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        price={latestPrice}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-600 dark:text-rose-400 text-xs font-mono font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Mode Navigation & Switcher Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3.5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {timeframe === 'ALL'
                  ? `${symbol} 所有策略綜合執行投資組合 (Multi-Strategy Portfolio)`
                  : `${symbol} &bull; ${timeframe.toUpperCase()} 單一策略獨立回測與參數演化`}
              </h1>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  timeframe === 'ALL'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30'
                }`}
              >
                {timeframe === 'ALL' ? '4 組策略協同執行' : '單一級別獨立運算'}
              </span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 font-mono mt-0.5">
              {timeframe === 'ALL'
                ? '直接檢視 4H 宏觀趨勢、1H 波段動能、15M 日內循環、5M 微觀極速 4 組策略同時於同一資金池執行之綜合報酬率與最大回撤'
                : `檢視與微調 ${symbol} 之 ${timeframe.toUpperCase()} 獨立策略指標參數、進出場判定條件與個別權益曲線`}
            </p>
          </div>

          {/* Quick Mode Toggle */}
          <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-mono">
            <button
              onClick={() => setTimeframe('ALL')}
              className={`px-3 py-1 rounded transition-colors ${
                timeframe === 'ALL'
                  ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              🌐 全策略綜合回測
            </button>
            <div className="w-[1px] h-4 bg-zinc-300 dark:bg-zinc-700" />
            {(['4h', '1h', '15m', '5m'] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  timeframe === tf
                    ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* 1. MTF Matrix & Confluence Bar */}
        <MTFMatrix snapshot={mtfSnapshot} />

        {/* 2. MODE SPECIFIC VIEWS */}
        {timeframe === 'ALL' && portfolioResult && (
          <>
            {/* 2.1 Portfolio Summary Dashboard Card */}
            <PortfolioSummaryCard
              portfolioResult={portfolioResult}
              onSelectTimeframe={(tf) => setTimeframe(tf)}
            />

            {/* 2.2 Combined Core Performance Metrics */}
            <MetricsCards result={portfolioResult} isLoading={isLoading} />

            {/* 2.3 Combined Portfolio Equity Curve vs Buy & Hold */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <EquityChart equityCurve={activeEquityCurve} height={280} />
              <TradeLogTable trades={activeTrades} />
            </div>
          </>
        )}

        {timeframe !== 'ALL' && (
          <>
            {/* 2.1 Single Strategy Parameter Controls Panel */}
            <StrategyControls
              strategy={strategy}
              onChange={setStrategy}
              onRunBacktest={handleRunBacktest}
              onRunOptimization={handleRunOptimization}
              isLoading={isLoading}
              isOptimizing={isOptimizing}
            />

            {/* 2.2 Detailed Strategy & Indicators Suite Architecture */}
            <StrategyDetailCard strategy={strategy} expandedDefault={true} />

            {/* 2.3 Single Strategy Financial Performance Metrics */}
            <MetricsCards result={backtestResult} isLoading={isLoading} />

            {/* 2.4 Candlestick Chart with Trade Markers */}
            <div className="space-y-4">
              <TradingViewChart
                candles={candles}
                trades={backtestResult?.trades || []}
                emaPeriod={strategy.indicatorsConfig.emaSlow || 50}
                height={440}
              />
            </div>

            {/* 2.5 Single Strategy Equity Curve & Trade Logs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {backtestResult && <EquityChart equityCurve={backtestResult.equityCurve} height={260} />}
              <TradeLogTable trades={backtestResult?.trades || []} />
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-900 py-4 text-center text-xs text-zinc-500 dark:text-zinc-600 font-mono">
        Antigravity Autonomous Crypto Strategy Optimization System &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
