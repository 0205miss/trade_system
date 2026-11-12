import { NextRequest, NextResponse } from 'next/server';
import { CandleCacheManager } from '@/lib/bingx/cache';
import { BacktestEngine } from '@/lib/engine/backtester';
import { StrategyOptimizer } from '@/lib/engine/optimizer';
import { OptStrategyService } from '@/lib/services/optStrategyService';
import { OptBacktestService } from '@/lib/services/optBacktestService';
import { StrategyModel, Timeframe, Candle } from '@/lib/engine/types';
import { TimeframeCandleMap } from '@/lib/engine/mtf';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const symbol = body.symbol || 'BTC-USDT';
    const timeframe = (body.timeframe || '1h') as Timeframe;
    const isOptimize = body.optimize === true;

    // Load base strategy or use provided config
    const strategy: StrategyModel = body.strategyConfig || OptStrategyService.getDefaultBaseline(timeframe, symbol);

    // Fetch candles for requested timeframe + higher timeframes for MTF
    const candles = await CandleCacheManager.getCandles(symbol, timeframe, 600);
    const htfMap: TimeframeCandleMap = {};

    if (timeframe === '5m' || timeframe === '15m') {
      htfMap['4h'] = await CandleCacheManager.getCandles(symbol, '4h', 300);
      htfMap['1h'] = await CandleCacheManager.getCandles(symbol, '1h', 400);
    } else if (timeframe === '1h') {
      htfMap['4h'] = await CandleCacheManager.getCandles(symbol, '4h', 300);
    }

    if (isOptimize) {
      const optResult = StrategyOptimizer.optimize(candles, strategy, htfMap, {
        inSampleRatio: 0.7,
        populationSize: 12,
        generations: 3,
      });

      const best = optResult.bestCandidate;
      // Persist run
      await OptBacktestService.saveRun(best.outOfSampleResult);

      return NextResponse.json({
        success: true,
        mode: 'OPTIMIZED',
        bestCandidate: best,
        topCandidates: optResult.topCandidates,
      });
    } else {
      // Standard Backtest
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
