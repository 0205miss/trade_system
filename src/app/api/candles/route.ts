import { NextRequest, NextResponse } from 'next/server';
import { CandleCacheManager } from '@/lib/bingx/cache';
import { Timeframe } from '@/lib/engine/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol') || 'BTC-USDT';
    const timeframe = (searchParams.get('timeframe') || '1h') as Timeframe;
    const limit = parseInt(searchParams.get('limit') || '500', 10);

    const candles = await CandleCacheManager.getCandles(symbol, timeframe, limit);

    return NextResponse.json({
      success: true,
      symbol,
      timeframe,
      count: candles.length,
      candles,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
