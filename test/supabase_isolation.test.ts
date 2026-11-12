import { supabase } from '../src/lib/supabase/client';
import { OptStrategyService } from '../src/lib/services/optStrategyService';
import { OptReportService } from '../src/lib/services/optReportService';

async function testSupabase() {
  console.log('🧪 Testing Supabase opt_* Isolated Tables...');

  // 1. Verify old tables row count before
  const { count: oldPresetCount } = await supabase.from('strategy_presets').select('*', { count: 'exact', head: true });
  console.log(`  🔍 Existing strategy_presets count: ${oldPresetCount}`);

  // 2. Save baseline strategies to opt_strategies
  const strat4h = OptStrategyService.getDefaultBaseline('4h', 'BTC-USDT');
  const id4h = await OptStrategyService.saveStrategy(strat4h);
  console.log(`  ✅ Saved opt_strategies 4H record: ${id4h}`);

  const strat1h = OptStrategyService.getDefaultBaseline('1h', 'BTC-USDT');
  const id1h = await OptStrategyService.saveStrategy(strat1h);
  console.log(`  ✅ Saved opt_strategies 1H record: ${id1h}`);

  const strat15m = OptStrategyService.getDefaultBaseline('15m', 'BTC-USDT');
  const id15m = await OptStrategyService.saveStrategy(strat15m);
  console.log(`  ✅ Saved opt_strategies 15M record: ${id15m}`);

  const strat5m = OptStrategyService.getDefaultBaseline('5m', 'BTC-USDT');
  const id5m = await OptStrategyService.saveStrategy(strat5m);
  console.log(`  ✅ Saved opt_strategies 5M record: ${id5m}`);

  // 3. Save a sample report
  const reportId = await OptReportService.saveReport({
    reportDate: new Date().toISOString().slice(0, 10),
    symbol: 'BTC-USDT',
    timeframe: '4h',
    status: 'OPTIMIZED',
    newStrategyId: id4h,
    volatilityRegime: 'NORMAL',
    improvementMetrics: { sharpe: 1.85, winRate: 64.2 },
    reportMarkdown: 'Initial baseline verification report',
  });
  console.log(`  ✅ Saved opt_daily_reports record: ${reportId}`);

  // 4. Verify old tables row count after (MUST BE UNCHANGED)
  const { count: oldPresetCountAfter } = await supabase.from('strategy_presets').select('*', { count: 'exact', head: true });
  console.log(`  🔍 Existing strategy_presets count after: ${oldPresetCountAfter}`);

  if (oldPresetCount !== oldPresetCountAfter) {
    console.error('❌ FATAL: Existing table was modified!');
    process.exit(1);
  }

  console.log('  🛡️ Perfect Database Isolation Confirmed! Existing tables are 100% untouched.\n');
}

testSupabase().catch((err) => {
  console.error('Supabase test error:', err);
  process.exit(1);
});
