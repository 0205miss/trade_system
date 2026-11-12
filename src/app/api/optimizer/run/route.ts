import { NextRequest, NextResponse } from 'next/server';
import { CandleCacheManager } from '@/lib/bingx/cache';
import { BacktestEngine } from '@/lib/engine/backtester';
import { StrategyOptimizer } from '@/lib/engine/optimizer';
import { PortfolioEngine } from '@/lib/engine/portfolioEngine';
import { OptStrategyService } from '@/lib/services/optStrategyService';
import { OptBacktestService } from '@/lib/services/optBacktestService';
import { StrategyModel, Timeframe, Candle } from '@/lib/engine/types';
import { TimeframeCandleMap } from '@/lib/engine/mtf';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const symbol = body.symbol || 'BTC-USDT';
    const timeframe = body.timeframe || '1h';
    const isOptimize = body.optimize === true;

    // 1. Handle Portfolio Mode (All Strategies Concurrently Executed)
    if (timeframe === 'ALL' || body.mode === 'PORTFOLIO') {
      const timeframes: Timeframe[] = ['4h', '1h', '15m', '5m'];
      const candlesMap: Record<Timeframe, Candle[]> = {} as any;

      // Consistently fetch 600 candles for each timeframe
      await Promise.all(
        timeframes.map(async (tf) => {
          candlesMap[tf] = await CandleCacheManager.getCandles(symbol, tf, 600);
        })
      );

      // Load active or baseline strategy models for each timeframe
      const strategies: StrategyModel[] = await Promise.all(
        timeframes.map(async (tf) => {
          const dbStrats = await OptStrategyService.getStrategies(tf);
          const active = dbStrats.find((s) => s.isActive && s.symbol === symbol);
          return active || OptStrategyService.getDefaultBaseline(tf, symbol);
        })
      );

      const htfMap: TimeframeCandleMap = {
        '4h': candlesMap['4h'],
        '1h': candlesMap['1h'],
      };

      const portfolioResult = PortfolioEngine.run(symbol, strategies, candlesMap, htfMap, 10000);

      return NextResponse.json({
        success: true,
        mode: 'PORTFOLIO',
        result: portfolioResult,
      });
    }

    // 2. Single Strategy Backtest / Optimization
    const tf = timeframe as Timeframe;
    let strategy: StrategyModel = body.strategyConfig;
    if (!strategy || strategy.timeframe !== tf) {
      const dbStrats = await OptStrategyService.getStrategies(tf);
      const active = dbStrats.find((s) => s.isActive && s.symbol === symbol);
      strategy = active || OptStrategyService.getDefaultBaseline(tf, symbol);
    }

    const candles = await CandleCacheManager.getCandles(symbol, tf, 600);
    const htfMap: TimeframeCandleMap = {};

    if (tf === '5m' || tf === '15m') {
      htfMap['4h'] = await CandleCacheManager.getCandles(symbol, '4h', 600);
      htfMap['1h'] = await CandleCacheManager.getCandles(symbol, '1h', 600);
    } else if (tf === '1h') {
      htfMap['4h'] = await CandleCacheManager.getCandles(symbol, '4h', 600);
    }

    if (isOptimize) {
      const optResult = StrategyOptimizer.optimize(candles, strategy, htfMap, {
        inSampleRatio: 0.7,
        populationSize: 12,
        generations: 3,
      });

      const best = optResult.bestCandidate;
      await OptBacktestService.saveRun(best.outOfSampleResult);

      return NextResponse.json({
        success: true,
        mode: 'OPTIMIZED',
        bestCandidate: best,
        topCandidates: optResult.topCandidates,
      });
    } else {
      const backtestResult = BacktestEngine.run(candles, strategy, htfMap, false);
      await OptBacktestService.saveRun(backtestResult);

      return NextResponse.json({
        success: true,
        mode: 'BACKTEST',
        result: backtestResult,
      });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
