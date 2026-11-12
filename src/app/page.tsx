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
import { Candle, Timeframe, StrategyModel, BacktestResult, MTFSnapshot } from '@/lib/engine/types';
import { OptStrategyService } from '@/lib/services/optStrategyService';
import { MultiTimeframeAggregator } from '@/lib/engine/mtf';
import { RefreshCw, AlertCircle } from 'lucide-react';

export default function StudioPage() {
  const [symbol, setSymbol] = useState<string>('BTC-USDT');
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [strategy, setStrategy] = useState<StrategyModel>(
    OptStrategyService.getDefaultBaseline('1h', 'BTC-USDT')
  );
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [mtfSnapshot, setMtfSnapshot] = useState<MTFSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync strategy when timeframe or symbol changes
  useEffect(() => {
    setStrategy(OptStrategyService.getDefaultBaseline(timeframe, symbol));
  }, [timeframe, symbol]);

  // Load candles & trigger initial backtest
  const loadDataAndBacktest = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      // 1. Fetch candles from API
      const res = await fetch(`/api/candles?symbol=${symbol}&timeframe=${timeframe}&limit=500`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const candleList: Candle[] = data.candles;
      setCandles(candleList);

      // 2. Run initial backtest
      const btRes = await fetch('/api/optimizer/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          timeframe,
          strategyConfig: strategy,
          optimize: false,
        }),
      });
      const btData = await btRes.json();
      if (!btData.success) throw new Error(btData.error);

      setBacktestResult(btData.result);

      // 3. Compute MTF Snapshot
      if (candleList.length > 0) {
        const latestTime = candleList[candleList.length - 1].time;
        const snapshot = MultiTimeframeAggregator.computeMTFSnapshot(symbol, latestTime, {
          [timeframe]: candleList,
        });
        setMtfSnapshot(snapshot);
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

  // Manual Trigger: Re-run Backtest
  const handleRunBacktest = async () => {
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

  // Manual Trigger: Run GA Optimization
  const handleRunOptimization = async () => {
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
          <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs font-mono">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. MTF Matrix & Confluence Bar */}
        <MTFMatrix snapshot={mtfSnapshot} />

        {/* 2. Strategy Parameter Controls Panel */}
        <StrategyControls
          strategy={strategy}
          onChange={setStrategy}
          onRunBacktest={handleRunBacktest}
          onRunOptimization={handleRunOptimization}
          isLoading={isLoading}
          isOptimizing={isOptimizing}
        />

        {/* 2.1 Detailed Strategy & Indicators Suite Architecture */}
        <StrategyDetailCard strategy={strategy} expandedDefault={true} />

        {/* 3. Core Financial Performance Metrics */}
        <MetricsCards result={backtestResult} isLoading={isLoading} />

        {/* 4. One Bright Element: Candlestick Chart */}
        <div className="space-y-4">
          <TradingViewChart
            candles={candles}
            trades={backtestResult?.trades || []}
            emaPeriod={strategy.indicatorsConfig.emaSlow || 50}
            height={440}
          />
        </div>

        {/* 5. Equity Curve & Trade Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {backtestResult && <EquityChart equityCurve={backtestResult.equityCurve} height={260} />}
          <TradeLogTable trades={backtestResult?.trades || []} />
        </div>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-900 py-4 text-center text-xs text-zinc-500 dark:text-zinc-600 font-mono">
        Antigravity Autonomous Crypto Strategy Optimization System &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
