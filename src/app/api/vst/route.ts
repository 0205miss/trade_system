import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { BingXVSTClient } from '@/lib/bingx/vstClient';
import { VSTTrader } from '@/lib/execution/vstTrader';
import { Timeframe } from '@/lib/engine/types';

export async function GET(req: NextRequest) {
  try {
    const balance = await BingXVSTClient.getBalance();
    const isConfigured = BingXVSTClient.isConfigured();

    // Query open positions from opt_live_positions
    const { data: positions } = await supabase
      .from('opt_live_positions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    // Query recent orders from opt_live_orders
    const { data: orders } = await supabase
      .from('opt_live_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    return NextResponse.json({
      success: true,
      isConfigured,
      balance,
      positions: positions || [],
      orders: orders || [],
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || 'scan';

    if (action === 'scan') {
      const symbol = body.symbol || 'BTC-USDT';
      const timeframe = (body.timeframe || '1h') as Timeframe;
      const report = await VSTTrader.scanAndExecute(symbol, timeframe);
      return NextResponse.json({ success: true, report });
    }

    if (action === 'close') {
      const positionId = body.positionId;
      if (!positionId) throw new Error('Missing positionId');
      await VSTTrader.closePosition(positionId);
      return NextResponse.json({ success: true, message: 'Position closed successfully' });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
