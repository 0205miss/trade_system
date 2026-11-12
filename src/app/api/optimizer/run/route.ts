import { NextRequest, NextResponse } from 'next/server';
import { CandleCacheManager } from '@/lib/bingx/cache';
import { BacktestEngine } from '@/lib/engine/backtester';
import { StrategyOptimizer } from '@/lib/engine/optimizer';
import { PortfolioEngine } from '@/lib/engine/portfolioEngine';
import { OptStrategyService } from '@/lib/services/optStrategyService';
import { OptBacktestService } from '@/lib/services/optBacktestService';
import { StrategyModel, Timeframe, Candle, SUPPORTED_SYMBOLS } from '@/lib/engine/types';
import { TimeframeCandleMap } from '@/lib/engine/mtf';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const symbol = body.symbol || 'BTC-USDT';
    const timeframe = body.timeframe || '1h';
    const isOptimize = body.optimize === true;

    // 1. Handle All-Symbols Portfolio Mode or All-Timeframes Portfolio Mode
    if (symbol === 'ALL' || timeframe === 'ALL' || body.mode === 'PORTFOLIO') {
      const symbolsToRun = symbol === 'ALL' ? [...SUPPORTED_SYMBOLS] : [symbol];
      const timeframesToRun: Timeframe[] =
        timeframe === 'ALL' ? ['4h', '1h', '15m', '5m'] : [timeframe as Timeframe];

      const candlesBySymbolAndTf: Record<string, Record<Timeframe, Candle[]>> = {};
      const htfBySymbol: Record<string, TimeframeCandleMap> = {};

      await Promise.all(
        symbolsToRun.map(async (s) => {
          candlesBySymbolAndTf[s] = {} as any;
          const allNeededTfs = Array.from(new Set([...timeframesToRun, '4h' as Timeframe, '1h' as Timeframe]));
          await Promise.all(
            allNeededTfs.map(async (tf) => {
              candlesBySymbolAndTf[s][tf] = await CandleCacheManager.getCandles(s, tf, 600);
            })
          );

          htfBySymbol[s] = {
            '4h': candlesBySymbolAndTf[s]['4h'],
            '1h': candlesBySymbolAndTf[s]['1h'],
          };
        })
      );

      // Load active or baseline strategy models for each symbol and timeframe
      const strategies: StrategyModel[] = [];
      for (const s of symbolsToRun) {
        for (const tf of timeframesToRun) {
          const dbStrats = await OptStrategyService.getStrategies(tf);
          const active = dbStrats.find((st) => st.isActive && st.symbol === s);
          strategies.push(active || OptStrategyService.getDefaultBaseline(tf, s));
        }
      }

      const portfolioResult = PortfolioEngine.runMultiSymbol(
        symbolsToRun,
        strategies,
        candlesBySymbolAndTf,
        htfBySymbol,
        10000
      );

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
