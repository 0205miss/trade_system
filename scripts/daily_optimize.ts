try {
  process.loadEnvFile('.env.local');
} catch {}

import { BingXClient } from '../src/lib/bingx/client';
import { CandleCacheManager } from '../src/lib/bingx/cache';
import { StrategyOptimizer } from '../src/lib/engine/optimizer';
import { BacktestEngine } from '../src/lib/engine/backtester';
import { OptStrategyService } from '../src/lib/services/optStrategyService';
import { OptBacktestService } from '../src/lib/services/optBacktestService';
import { OptReportService } from '../src/lib/services/optReportService';
import { Timeframe, StrategyModel, Candle, SUPPORTED_SYMBOLS } from '../src/lib/engine/types';

async function runDailyOptimization() {
  console.log('===============================================================');
  console.log('🚀 ANTIGRAVITY CRYPTO STRATEGY DAILY OPTIMIZER');
  console.log(`📅 Date: ${new Date().toISOString().slice(0, 10)} (Asia/Taipei)`);
  console.log('===============================================================\n');

  let symbols: string[] = [...SUPPORTED_SYMBOLS];
  let timeframes: Timeframe[] = ['4h', '1h', '15m', '5m'];

  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--symbols' && args[i + 1]) {
      symbols = args[i + 1].split(',').map((s) => s.trim());
      i++;
    } else if (args[i].startsWith('--symbols=')) {
      symbols = args[i].split('=')[1].split(',').map((s) => s.trim());
    } else if (args[i] === '--timeframes' && args[i + 1]) {
      timeframes = args[i + 1].split(',').map((s) => s.trim() as Timeframe);
      i++;
    } else if (args[i].startsWith('--timeframes=')) {
      timeframes = args[i].split('=')[1].split(',').map((s) => s.trim() as Timeframe);
    }
  }

  console.log(`🎯 Target Symbols: ${symbols.join(', ')}`);
  console.log(`⏱️ Target Timeframes: ${timeframes.join(', ')}\n`);

  const dateStr = new Date().toISOString().slice(0, 10);

  for (const symbol of symbols) {
    console.log(`\n---------------------------------------------------------`);
    console.log(`📊 Processing Symbol: ${symbol}`);
    console.log(`---------------------------------------------------------`);

    // 1. Fetch candles for all timeframes
    const candlesMap: Record<Timeframe, Candle[]> = {
      '4h': [],
      '1h': [],
      '15m': [],
      '5m': [],
    };

    for (const tf of timeframes) {
      process.stdout.write(`Fetching ${symbol} ${tf} candles from BingX... `);
      try {
        const barsNeeded = tf === '5m' ? 800 : tf === '15m' ? 600 : tf === '1h' ? 500 : 350;
        const candles = await BingXClient.fetchHistoricalKlines(symbol, tf, barsNeeded);
        candlesMap[tf] = candles;
        console.log(`✅ Loaded ${candles.length} bars.`);
        // Cache to Supabase opt_market_candles
        await CandleCacheManager.cacheCandles(symbol, tf, candles);
      } catch (err: any) {
        console.log(`❌ Failed: ${err.message}`);
      }
    }

    // 2. Optimize each timeframe independently with MTF context
    for (const tf of timeframes) {
      const candles = candlesMap[tf];
      if (!candles || candles.length < 60) {
        console.log(`⚠️ Skipped ${symbol} ${tf}: Insufficient candles.`);
        continue;
      }

      console.log(`\n⚙️ Optimizing ${symbol} [${tf.toUpperCase()}] Model...`);
      const baseStrategy = OptStrategyService.getDefaultBaseline(tf, symbol);

      try {
        // Run Walk-Forward Genetic Optimization (70% in-sample, 30% out-of-sample)
        const optResult = StrategyOptimizer.optimize(candles, baseStrategy, candlesMap, {
          inSampleRatio: 0.7,
          populationSize: 12,
          generations: 3,
        });

        const best = optResult.bestCandidate;
        const inRes = best.inSampleResult;
        const outRes = best.outOfSampleResult;

        console.log(`   📈 In-Sample WinRate: ${inRes.winRate}% | Sharpe: ${inRes.sharpeRatio} | Trades: ${inRes.totalTrades}`);
        console.log(`   🎯 Out-of-Sample WinRate: ${outRes.winRate}% | Sharpe: ${outRes.sharpeRatio} | MaxDD: ${outRes.maxDrawdownPct}%`);
        console.log(`   🛡️ Robustness Ratio: ${best.robustnessRatio}`);

        const isApproved = outRes.sharpeRatio >= 0.3 && outRes.maxDrawdownPct <= 35 && outRes.totalTrades >= 3;
        const status = isApproved ? 'OPTIMIZED' : 'MAINTAINED';

        // Save strategy to opt_strategies
        const finalStrat: StrategyModel = isApproved ? best.strategy : baseStrategy;
        finalStrat.isActive = true;
        const stratId = await OptStrategyService.saveStrategy(finalStrat);

        // Save backtest run to opt_backtest_runs
        await OptBacktestService.saveRun(outRes, stratId);

        // Save daily audit report to opt_daily_reports
        const reportMd = `
### Daily Optimization Audit: ${symbol} [${tf.toUpperCase()}]
- **Date**: ${dateStr}
- **Status**: ${status}
- **In-Sample Performance**: Net Profit ${inRes.netProfitPct}%, Win Rate ${inRes.winRate}%, Sharpe ${inRes.sharpeRatio}, Max DD ${inRes.maxDrawdownPct}%
- **Out-of-Sample Performance**: Net Profit ${outRes.netProfitPct}%, Win Rate ${outRes.winRate}%, Sharpe ${outRes.sharpeRatio}, Max DD ${outRes.maxDrawdownPct}%
- **Fees Incurred**: \$${outRes.totalFeesPaid} USDT | Slippage Cost: \$${outRes.totalSlippageCost} USDT
- **Optimized Parameters**:
  - RSI Oversold: ${finalStrat.indicatorsConfig.rsiOversold} / Overbought: ${finalStrat.indicatorsConfig.rsiOverbought}
  - Supertrend Multiplier: ${finalStrat.indicatorsConfig.supertrendMultiplier}
  - Stop Loss Multiplier: ${finalStrat.riskConfig.slAtrMultiplier}x ATR
  - TP Targets: TP1=${finalStrat.takeProfits[0]?.rrMultiple}R, TP2=${finalStrat.takeProfits[1]?.rrMultiple}R
        `.trim();

        await OptReportService.saveReport({
          reportDate: dateStr,
          symbol,
          timeframe: tf,
          status,
          newStrategyId: stratId,
          volatilityRegime: outRes.maxDrawdownPct > 15 ? 'HIGH_VOLATILITY' : 'NORMAL',
          improvementMetrics: {
            inSampleSharpe: inRes.sharpeRatio,
            outSampleSharpe: outRes.sharpeRatio,
            outSampleWinRate: outRes.winRate,
            outSampleMaxDd: outRes.maxDrawdownPct,
            robustnessRatio: best.robustnessRatio,
          },
          reportMarkdown: reportMd,
        });

        console.log(`   💾 Saved ${symbol} ${tf} optimized model & audit record to Supabase opt_*.`);
      } catch (err: any) {
        console.error(`   ❌ Optimization error on ${symbol} ${tf}: ${err.message}`);
      }
    }
  }

  console.log('\n===============================================================');
  console.log('🎉 ALL TIMEFRAMES DAILY OPTIMIZATION COMPLETED SUCCESSFULLY');
  console.log('===============================================================\n');
}

runDailyOptimization().catch((err) => {
  console.error('Fatal daily optimization error:', err);
  process.exit(1);
});
