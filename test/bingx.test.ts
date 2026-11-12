import { BingXClient } from '../src/lib/bingx/client';
import { Timeframe } from '../src/lib/engine/types';

async function testBingX() {
  console.log('🧪 Testing BingX API live fetch for 4H, 1H, 15M, 5M...');

  const timeframes: Timeframe[] = ['4h', '1h', '15m', '5m'];

  for (const tf of timeframes) {
    process.stdout.write(`Fetching BTC-USDT ${tf} (limit=10)... `);
    const candles = await BingXClient.fetchKlines('BTC-USDT', tf, 10);
    if (candles.length === 0) {
      console.error(`❌ Returned 0 candles for ${tf}`);
      process.exit(1);
    }
    const latest = candles[candles.length - 1];
    console.log(
      `✅ Success (${candles.length} bars). Latest Close: \$${latest.close} at ${new Date(latest.time).toISOString()}`
    );
  }

  console.log('\n🎉 BINGX MULTI-TIMEFRAME DATA FETCH TESTS PASSED!\n');
}

testBingX().catch((err) => {
  console.error('BingX test error:', err);
  process.exit(1);
});
