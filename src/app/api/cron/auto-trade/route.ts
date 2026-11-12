import { NextRequest, NextResponse } from 'next/server';
import { VSTTrader, VSTScanReport } from '@/lib/execution/vstTrader';
import { Timeframe, SUPPORTED_SYMBOLS } from '@/lib/engine/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const symbols = [...SUPPORTED_SYMBOLS];
    const timeframes: Timeframe[] = ['5m', '15m', '1h', '4h'];
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
            detail: `Error: ${err.message}`,
          });
        }
      }
    }

    const executedActions = reports.filter((r) => r.actionTaken !== 'NO_SIGNAL' && r.actionTaken !== 'HOLDING');

    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
      scannedCount: reports.length,
      executedCount: executedActions.length,
      executedActions,
      reports,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
