import { VSTTrader } from '../src/lib/execution/vstTrader';
import { Timeframe } from '../src/lib/engine/types';

async function startAutoTraderDaemon() {
  console.log('===============================================================');
  console.log('🤖 ANTIGRAVITY 24/7 BINGX VST AUTO-TRADER DAEMON STARTED');
  console.log(`⏱️  Scan Interval: 30 seconds | Leverage: 20x | Risk: 1.5%`);
  console.log('===============================================================\n');

  const symbols = ['BTC-USDT', 'ETH-USDT', 'SOL-USDT'];
  const timeframes: Timeframe[] = ['5m', '15m', '1h', '4h'];

  let scanCount = 0;

  const runScanCycle = async () => {
    scanCount++;
    const nowStr = new Date().toLocaleTimeString('zh-TW');
    console.log(`\n[${nowStr}] 🔄 Auto-Trade Cycle #${scanCount} scanning ${symbols.length} symbols across ${timeframes.length} timeframes...`);

    for (const symbol of symbols) {
      for (const tf of timeframes) {
        try {
          const report = await VSTTrader.scanAndExecute(symbol, tf);
          if (report.actionTaken !== 'NO_SIGNAL' && report.actionTaken !== 'HOLDING') {
            console.log(`   🚨 [${symbol} ${tf.toUpperCase()}] >>> ${report.actionTaken} <<<`);
            console.log(`      ${report.detail}`);
          }
        } catch (err: any) {
          // Graceful error reporting without crashing the loop
          console.error(`   ⚠️ [${symbol} ${tf}] scan error: ${err.message}`);
        }
      }
    }
  };

  // Run initial scan immediately
  await runScanCycle();

  // Recurring loop every 30 seconds
  setInterval(runScanCycle, 30000);
}

startAutoTraderDaemon().catch((err) => {
  console.error('Fatal Auto-Trader Daemon Error:', err);
  process.exit(1);
});
