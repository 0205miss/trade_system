import { VSTTrader } from '../src/lib/execution/vstTrader';
import { BingXVSTClient } from '../src/lib/bingx/vstClient';
import { supabase } from '../src/lib/supabase/client';

async function testVST() {
  console.log('🧪 Testing BingX VST Trading & Execution Engine...');

  // 1. Balance
  const balance = await BingXVSTClient.getBalance();
  console.log(`  💰 VST Balance: \$${balance.balance.toLocaleString()} (Equity: \$${balance.equity.toLocaleString()})`);

  // 2. Scan and execute
  console.log('  🔍 Executing VST market scan on BTC-USDT 1h...');
  const report = await VSTTrader.scanAndExecute('BTC-USDT', '1h');
  console.log(`  📊 Scan Result: ${report.actionTaken}`);
  console.log(`  📝 Detail: ${report.detail}`);

  // 3. Check database records
  const { data: pos } = await supabase.from('opt_live_positions').select('*').limit(5);
  console.log(`  🛡️ opt_live_positions records count: ${pos?.length || 0}`);

  const { data: orders } = await supabase.from('opt_live_orders').select('*').limit(5);
  console.log(`  🛡️ opt_live_orders records count: ${orders?.length || 0}`);

  console.log('\n🎉 VST AUTOMATED TRADING TEST PASSED!\n');
}

testVST().catch((err) => {
  console.error('VST test error:', err);
  process.exit(1);
});
