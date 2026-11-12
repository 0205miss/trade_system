import { BacktestEngine } from '../src/lib/engine/backtester';
import { Candle, StrategyModel } from '../src/lib/engine/types';
import { OptStrategyService } from '../src/lib/services/optStrategyService';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
}

function runBacktestTests() {
  console.log('🧪 Running Backtester Execution, Fee & Slippage Tests...');

  // Create 120 synthetic candles with an initial uptrend then a sharp reversal
  const candles: Candle[] = [];
  let price = 60000;
  for (let i = 0; i < 120; i++) {
    const trendStep = i < 70 ? 80 : -100;
    const noise = (Math.sin(i * 1.5) + (i % 2 === 0 ? 0.5 : -0.5)) * 30;
    price += trendStep + noise;
    candles.push({
      time: 1700000000000 + i * 3600000,
      open: price - 10,
      high: price + 60,
      low: price - 60,
      close: price,
      volume: 100 + (i % 5) * 50,
    });
  }

  const strat: StrategyModel = OptStrategyService.getDefaultBaseline('1h', 'BTC-USDT');
  strat.riskConfig.makerFeeRate = 0.0002; // 0.02%
  strat.riskConfig.takerFeeRate = 0.0005; // 0.05%
  strat.riskConfig.slippageBps = 0.0003; // 3 bps
  strat.riskConfig.leverage = 20;

  const result = BacktestEngine.run(candles, strat);

  console.log(`  📊 Initial Capital: \$${result.initialCapital}`);
  console.log(`  📊 Final Capital: \$${result.finalCapital}`);
  console.log(`  📊 Total Trades: ${result.totalTrades}`);
  console.log(`  📊 Total Fees Paid: \$${result.totalFeesPaid}`);
  console.log(`  📊 Total Slippage Cost: \$${result.totalSlippageCost}`);
  console.log(`  📊 Max Drawdown: ${result.maxDrawdownPct}%`);
  console.log(`  📊 Win Rate: ${result.winRate}%`);

  assert(result.initialCapital === 10000, 'Initial capital must equal 10000');
  assert(result.equityCurve.length > 50, 'Equity curve points generated');
  assert(typeof result.totalFeesPaid === 'number', 'Total fees is numeric');
  assert(typeof result.totalSlippageCost === 'number', 'Total slippage is numeric');

  if (result.trades.length > 0) {
    const firstTrade = result.trades[0];
    assert(firstTrade.feePaid > 0, 'Fee must be deducted on each trade');
    assert(firstTrade.slippageCost > 0, 'Slippage must be deducted on each trade');
    assert(firstTrade.nominalValue > 0, 'Nominal value calculated');
    console.log(`  ✅ First trade exit reason: ${firstTrade.exitReason}, PnL: \$${firstTrade.pnlAmount}`);
  }

  console.log('\n🎉 BACKTEST ENGINE EXECUTION TESTS PASSED!\n');
}

runBacktestTests();
