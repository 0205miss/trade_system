import { NextRequest, NextResponse } from 'next/server';
import { VSTTrader, VSTScanReport } from '@/lib/execution/vstTrader';
import { Timeframe, SUPPORTED_SYMBOLS } from '@/lib/engine/types';
import { supabase } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  try {
    const url = new URL(req.url);
    const querySymbol = url.searchParams.get('symbol');
    const queryTf = url.searchParams.get('timeframe') as Timeframe | null;

    const symbols = querySymbol ? [querySymbol] : [...SUPPORTED_SYMBOLS];
    const timeframes: Timeframe[] = queryTf ? [queryTf] : ['5m', '15m', '1h', '4h'];
    const reports: VSTScanReport[] = [];

    for (const symbol of symbols) {
      for (const tf of timeframes) {
        try {
          const report = await VSTTrader.scanAndExecute(symbol, tf);
          reports.push(report);
        } catch (err: any) {
          reports.push({
            symbol,
            timeframe: tf,
            timestamp: Date.now(),
            currentPrice: 0,
            actionTaken: 'NO_SIGNAL',
            detail: `掃描異常: ${err.message}`,
          });
        }
      }
    }

    const executedActions = reports.filter(
      (r) => r.actionTaken !== 'NO_SIGNAL' && r.actionTaken !== 'HOLDING'
    );
    const durationMs = Date.now() - startTime;

    // Log this Webhook execution to opt_cron_logs
    try {
      await supabase.from('opt_cron_logs').insert({
        job_name: 'opt-auto-trade-vst',
        status: executedActions.length > 0 ? 'EXECUTED' : 'SUCCESS_NO_SIGNAL',
        target_url: req.url,
        message: `掃描 ${reports.length} 組標的/週期，觸發 ${executedActions.length} 筆動作 (${durationMs}ms)`,
      });
    } catch (logErr) {
      console.warn('Failed to insert opt_cron_logs:', logErr);
    }

    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
      durationMs,
      scannedCount: reports.length,
      executedCount: executedActions.length,
      executedActions,
      reports,
    });
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    try {
      await supabase.from('opt_cron_logs').insert({
        job_name: 'opt-auto-trade-vst',
        status: 'FAILED',
        target_url: req.url,
        message: `Cron 執行失敗: ${err.message} (${durationMs}ms)`,
      });
    } catch {}

    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
