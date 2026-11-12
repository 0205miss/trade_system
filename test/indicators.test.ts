import {
  calculateSMA,
  calculateEMA,
  calculateMACD,
  calculateSupertrend,
  calculateRSI,
  calculateStochRSI,
  calculateATR,
  calculateBollingerBands,
  calculateVWAP,
} from '../src/lib/engine/indicators';
import { Candle } from '../src/lib/engine/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
}

function runTests() {
  console.log('🧪 Running Technical Indicators Accuracy Tests...');

  // 1. Test SMA
  const prices = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
  const sma5 = calculateSMA(prices, 5);
  assert(isNaN(sma5[3]), 'SMA5 index 3 must be NaN');
  assert(Math.abs(sma5[4] - 12) < 0.0001, `SMA5 index 4 expected 12, got ${sma5[4]}`);
  assert(Math.abs(sma5[9] - 17) < 0.0001, `SMA5 index 9 expected 17, got ${sma5[9]}`);
  console.log('  ✅ SMA verified.');

  // 2. Test EMA
  const ema3 = calculateEMA(prices, 3);
  assert(Math.abs(ema3[2] - 11) < 0.0001, `EMA3 index 2 expected 11, got ${ema3[2]}`);
  assert(!isNaN(ema3[9]), 'EMA3 index 9 must be a valid number');
  console.log('  ✅ EMA verified.');

  // 3. Test RSI
  const rsiPrices = [44, 44.5, 45, 43.5, 44, 44.8, 45.5, 46, 45.2, 45.8, 46.2, 46.5, 47, 46.8, 47.5, 48];
  const rsi14 = calculateRSI(rsiPrices, 14);
  assert(!isNaN(rsi14[14]), 'RSI index 14 should be calculated');
  assert(rsi14[15] >= 0 && rsi14[15] <= 100, `RSI should be between 0 and 100, got ${rsi14[15]}`);
  console.log(`  ✅ RSI verified (value: ${rsi14[15].toFixed(2)}).`);

  // 4. Test Synthetic Candles for ATR, Supertrend, Bollinger, VWAP
  const sampleCandles: Candle[] = [];
  let basePrice = 50000;
  for (let i = 0; i < 40; i++) {
    const change = Math.sin(i / 3) * 200 + 50;
    basePrice += change;
    sampleCandles.push({
      time: 1700000000000 + i * 3600000,
      open: basePrice - 20,
      high: basePrice + 100,
      low: basePrice - 80,
      close: basePrice,
      volume: 10 + i * 2,
    });
  }

  // ATR
  const atr14 = calculateATR(sampleCandles, 14);
  assert(atr14[13] > 0, 'ATR index 13 should be positive');
  assert(!isNaN(atr14[39]), 'ATR index 39 should be valid');
  console.log(`  ✅ ATR verified (latest ATR: ${atr14[39].toFixed(2)}).`);

  // Supertrend
  const st = calculateSupertrend(sampleCandles, 10, 3.0);
  assert(st.trend.length === 40, 'Supertrend length must match candles');
  assert(st.trend[39] === 1 || st.trend[39] === -1, 'Supertrend direction must be 1 or -1');
  console.log(`  ✅ Supertrend verified (trend: ${st.trend[39] === 1 ? 'Bullish' : 'Bearish'}).`);

  // Bollinger Bands
  const bb = calculateBollingerBands(sampleCandles.map((c) => c.close), 20, 2.0);
  assert(bb.upper[39] > bb.middle[39], 'Upper BB must be greater than Middle BB');
  assert(bb.middle[39] > bb.lower[39], 'Middle BB must be greater than Lower BB');
  console.log('  ✅ Bollinger Bands verified.');

  // VWAP
  const vwap = calculateVWAP(sampleCandles);
  assert(vwap[39] > 40000 && vwap[39] < 70000, 'VWAP in plausible range');
  console.log('  ✅ VWAP verified.');

  console.log('\n🎉 ALL TECHNICAL INDICATORS TESTS PASSED!\n');
}

runTests();
