'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  SUPPORTED_SYMBOLS,
} from '@/lib/engine/types';
import { OptStrategyService } from '@/lib/services/optStrategyService';
import { MultiTimeframeAggregator } from '@/lib/engine/mtf';
import { RefreshCw, AlertCircle, Coins, Layers, Activity } from 'lucide-react';

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

  // Keep ref of latest portfolio result to avoid stale closures
  const portfolioResultRef = useRef<PortfolioBacktestResult | null>(null);
  portfolioResultRef.current = portfolioResult;

  const isPortfolioMode = symbol === 'ALL' || timeframe === 'ALL';

  // Load candles & trigger initial backtest (single or portfolio)
  const loadDataAndBacktest = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const isPortfolio = symbol === 'ALL' || timeframe === 'ALL';
      const candleSym = symbol === 'ALL' ? 'BTC-USDT' : symbol;
      const candleTf = timeframe === 'ALL' ? '1h' : timeframe;

      // 1. Fetch candles from API for charting and MTF (consistently 600 bars)
      const res = await fetch(`/api/candles?symbol=${candleSym}&timeframe=${candleTf}&limit=600`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const candleList: Candle[] = data.candles;
      setCandles(candleList);

      // 2. Compute MTF Snapshot
      if (candleList.length > 0) {
        const latestTime = candleList[candleList.length - 1].time;
        const snapshot = MultiTimeframeAggregator.computeMTFSnapshot(candleSym, latestTime, {
          [candleTf]: candleList,
        });
        setMtfSnapshot(snapshot);
      }

      // 3. Run backtest (Portfolio or Single)
      if (isPortfolio) {
        const btRes = await fetch('/api/optimizer/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol,
            timeframe,
            optimize: false,
          }),
        });
        const btData = await btRes.json();
        if (!btData.success) throw new Error(btData.error);

        setPortfolioResult(btData.result);
        setBacktestResult(null);
      } else {
        const cacheKey = `${symbol}_${timeframe}`;
        const cachedPortResult =
          portfolioResultRef.current?.individualResults[cacheKey] ||
          portfolioResultRef.current?.individualResults[timeframe];

        const isMismatched = strategy.timeframe !== timeframe || strategy.symbol !== symbol;
        const configToSend = isMismatched ? undefined : strategy;

        if (cachedPortResult && !configToSend) {
          setBacktestResult(cachedPortResult);
          if (cachedPortResult.configSnapshot) {
            setStrategy(cachedPortResult.configSnapshot);
          }
        } else {
          const btRes = await fetch('/api/optimizer/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              symbol,
              timeframe,
              strategyConfig: configToSend,
              optimize: false,
            }),
          });
          const btData = await btRes.json();
          if (!btData.success) throw new Error(btData.error);

          setBacktestResult(btData.result);
          if (btData.result?.configSnapshot) {
            setStrategy(btData.result.configSnapshot);
          }
        }
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

  // Unified timeframe switch handler ensuring zero state bleed and 100% data consistency
  const handleTimeframeChange = (tf: Timeframe | 'ALL', targetSym?: string) => {
    if (targetSym && targetSym !== symbol) {
      setSymbol(targetSym);
    }
    const currentSym = targetSym || symbol;
    if (currentSym !== 'ALL' && tf !== 'ALL') {
      const cacheKey = `${currentSym}_${tf}`;
      const exactSingleResult =
        portfolioResultRef.current?.individualResults[cacheKey] ||
        portfolioResultRef.current?.individualResults[tf];

      if (exactSingleResult) {
        setBacktestResult(exactSingleResult);
        if (exactSingleResult.configSnapshot) {
          setStrategy(exactSingleResult.configSnapshot);
        }
      }
    }
    setTimeframe(tf);
  };

  const handleSymbolChange = (newSym: string) => {
    setSymbol(newSym);
  };

  // Manual Trigger: Re-run Backtest for single strategy
  const handleRunBacktest = async () => {
    if (isPortfolioMode) return;
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
      if (data.result?.configSnapshot) {
        setStrategy(data.result.configSnapshot);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Manual Trigger: Run GA Optimization for single strategy
  const handleRunOptimization = async () => {
    if (isPortfolioMode) return;
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

  const activeResult = isPortfolioMode ? portfolioResult : backtestResult;
  const activeEquityCurve = activeResult?.equityCurve || [];
  const activeTrades = activeResult?.trades || [];

  // Determine contextual badge & title
  const getContextualInfo = () => {
    if (symbol === 'ALL' && timeframe === 'ALL') {
      return {
        title: '全幣種多策略宏觀量化組合 (All-Symbols Portfolio)',
        subtitle: `全市場 ${SUPPORTED_SYMBOLS.length} 大主流標的共 ${SUPPORTED_SYMBOLS.length * 4} 組策略於同一 10,000 USDT 資金池協同運作`,
        badge: `${SUPPORTED_SYMBOLS.length * 4} 組策略協同執行`,
        badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      };
    }
    if (symbol === 'ALL') {
      return {
        title: `全幣種 • ${timeframe.toUpperCase()} 跨市場動能組合`,
        subtitle: `${SUPPORTED_SYMBOLS.length} 大主流標的於 ${timeframe.toUpperCase()} 週期同步執行`,
        badge: `${SUPPORTED_SYMBOLS.length} 大標的協同執行`,
        badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      };
    }
    if (timeframe === 'ALL') {
      return {
        title: `${symbol} 全週期投資組合 (Multi-Timeframe Portfolio)`,
        subtitle: '4H 宏觀、1H 波段、15M 日內、5M 極速 4 組策略同步執行',
        badge: '4 組策略協同執行',
        badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      };
    }
    return {
      title: `${symbol} • ${timeframe.toUpperCase()} 單一策略獨立回測與參數演化`,
      subtitle: `檢視與微調 ${symbol} 之 ${timeframe.toUpperCase()} 策略指標參數、進出場判定與個別權益曲線`,
      badge: '單一級別獨立運算',
      badgeColor: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30',
    };
  };

  const contextInfo = getContextualInfo();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors">
      <Navbar price={latestPrice} symbol={symbol} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-600 dark:text-rose-400 text-xs font-mono font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Unified Institutional Studio Control Bar */}
        <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 rounded-xl p-4 shadow-sm transition-colors space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Header Titles */}
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  {contextInfo.title}
                </h1>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${contextInfo.badgeColor}`}>
                  {contextInfo.badge}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-sans mt-0.5">
                {contextInfo.subtitle}
              </p>
            </div>

            {/* Segmented Switcher Controls */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Asset Segmented Control */}
              <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-950 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-mono overflow-x-auto max-w-full">
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 px-1.5 font-medium flex items-center gap-1 shrink-0">
                  <Coins className="w-3 h-3 text-emerald-500" />
                  標的
                </span>
                <button
                  onClick={() => handleSymbolChange('ALL')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold shrink-0 transition-all ${
                    symbol === 'ALL'
                      ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs border border-zinc-200/80 dark:border-zinc-700/80'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  全幣種
                </button>
                {SUPPORTED_SYMBOLS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSymbolChange(s)}
                    className={`px-2 py-1 rounded-md text-xs font-semibold shrink-0 transition-all ${
                      symbol === s
                        ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs border border-zinc-200/80 dark:border-zinc-700/80'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    {s.replace('-USDT', '')}
                  </button>
                ))}
              </div>

              {/* Timeframe Segmented Control */}
              <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-950 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-mono">
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 px-1.5 font-medium flex items-center gap-1">
                  <Layers className="w-3 h-3 text-emerald-500" />
                  週期
                </span>
                <button
                  onClick={() => handleTimeframeChange('ALL')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    timeframe === 'ALL'
                      ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs border border-zinc-200/80 dark:border-zinc-700/80'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  全週期
                </button>
                {(['4h', '1h', '15m', '5m'] as Timeframe[]).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => handleTimeframeChange(tf)}
                    className={`px-2 py-1 rounded-md text-xs font-semibold transition-all ${
                      timeframe === tf
                        ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs border border-zinc-200/80 dark:border-zinc-700/80'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    {tf.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Refresh Button */}
              <button
                onClick={loadDataAndBacktest}
                disabled={isLoading}
                title="重新執行回測計算"
                className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-500' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* 2. MTF Matrix & Confluence Bar */}
        <MTFMatrix snapshot={mtfSnapshot} />

        {/* 3. MODE SPECIFIC VIEWS */}
        {isPortfolioMode && !portfolioResult && isLoading && (
          <div className="flex flex-col items-center justify-center p-12 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900/50">
            <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
            <p className="text-sm font-mono text-zinc-600 dark:text-zinc-400">
              正在執行{symbol === 'ALL' ? '全幣種 (BTC + ETH + SOL)' : symbol} 跨市場綜合回測與資金組合運算中...
            </p>
          </div>
        )}

        {isPortfolioMode && portfolioResult && (
          <>
            {/* 3.1 Portfolio Summary Dashboard Card (with Asset Allocation & Individual Contributions) */}
            <PortfolioSummaryCard
              portfolioResult={portfolioResult}
              onSelectTimeframe={handleTimeframeChange}
            />

            {/* 3.2 Combined Core Performance Metrics */}
            <MetricsCards result={portfolioResult} isLoading={isLoading} />

            {/* 3.3 Combined Portfolio Equity Curve vs Buy & Hold */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <EquityChart equityCurve={activeEquityCurve} height={280} />
              <TradeLogTable trades={activeTrades} />
            </div>
          </>
        )}

        {!isPortfolioMode && (
          <>
            {/* 3.1 Single Strategy Parameter Controls Panel */}
            <StrategyControls
              strategy={strategy}
              onChange={setStrategy}
              onRunBacktest={handleRunBacktest}
              onRunOptimization={handleRunOptimization}
              isLoading={isLoading}
              isOptimizing={isOptimizing}
            />

            {/* 3.2 Detailed Strategy & Indicators Suite Architecture */}
            <StrategyDetailCard strategy={strategy} expandedDefault={true} />

            {/* 3.3 Single Strategy Financial Performance Metrics */}
            <MetricsCards result={backtestResult} isLoading={isLoading} />

            {/* 3.4 Candlestick Chart with Trade Markers */}
            <div className="space-y-4">
              <TradingViewChart
                candles={candles}
                trades={backtestResult?.trades || []}
                emaPeriod={strategy.indicatorsConfig.emaSlow || 50}
                height={440}
              />
            </div>

            {/* 3.5 Single Strategy Equity Curve & Trade Logs */}
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
