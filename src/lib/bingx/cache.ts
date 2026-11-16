import { supabase } from '../supabase/client';
import { Candle, Timeframe } from '../engine/types';
import { BingXClient } from './client';

export class CandleCacheManager {
  /**
   * Save candles to isolated opt_market_candles
   */
  static async cacheCandles(symbol: string, timeframe: Timeframe, candles: Candle[]): Promise<number> {
    if (candles.length === 0) return 0;

    const rows = candles.map((c) => ({
      symbol,
      timeframe,
      open_time: new Date(c.time).toISOString(),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    }));

    // Upsert in batches of 500
    const batchSize = 500;
    let saved = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error } = await supabase.from('opt_market_candles').upsert(batch, {
        onConflict: 'symbol,timeframe,open_time',
        ignoreDuplicates: true,
      });

      if (error) {
        console.warn(`Failed to cache candle batch: ${error.message}`);
      } else {
        saved += batch.length;
      }
    }
    return saved;
  }

  /**
   * Retrieve cached candles or fetch fresh from BingX
   */
  static async getCandles(
    symbol: string,
    timeframe: Timeframe,
    barsNeeded = 500,
    forceFresh = false
  ): Promise<Candle[]> {
    const intervalMs =
      timeframe === '5m'
        ? 5 * 60 * 1000
        : timeframe === '15m'
        ? 15 * 60 * 1000
        : timeframe === '1h'
        ? 60 * 60 * 1000
        : 4 * 60 * 60 * 1000;

    if (!forceFresh) {
      // Attempt to read from opt_market_candles
      const { data, error } = await supabase
        .from('opt_market_candles')
        .select('open_time, open, high, low, close, volume')
        .eq('symbol', symbol)
        .eq('timeframe', timeframe)
        .order('open_time', { ascending: false })
        .limit(barsNeeded);

      if (!error && data && data.length >= barsNeeded * 0.8) {
        const candles: Candle[] = data
          .map((row: any) => ({
            time: new Date(row.open_time).getTime(),
            open: parseFloat(row.open),
            high: parseFloat(row.high),
            low: parseFloat(row.low),
            close: parseFloat(row.close),
            volume: parseFloat(row.volume),
          }))
          .reverse();

        // Check freshness: if within 1 interval, it is fresh enough
        const latestTime = candles[candles.length - 1].time;
        if (Date.now() - latestTime < intervalMs * 1.2) {
          return candles;
        }
      }
    }

    // Fetch fresh from BingX and cache asynchronously
    const freshCandles = await BingXClient.fetchHistoricalKlines(symbol, timeframe, barsNeeded);
    if (freshCandles && freshCandles.length > 0) {
      this.cacheCandles(symbol, timeframe, freshCandles).catch(() => {});
      return freshCandles;
    }

    // Fallback to cache if network fails
    const { data: fallbackData } = await supabase
      .from('opt_market_candles')
      .select('open_time, open, high, low, close, volume')
      .eq('symbol', symbol)
      .eq('timeframe', timeframe)
      .order('open_time', { ascending: false })
      .limit(barsNeeded);

    if (fallbackData && fallbackData.length > 0) {
      return fallbackData
        .map((row: any) => ({
          time: new Date(row.open_time).getTime(),
          open: parseFloat(row.open),
          high: parseFloat(row.high),
          low: parseFloat(row.low),
          close: parseFloat(row.close),
          volume: parseFloat(row.volume),
        }))
        .reverse();
    }

    return [];
  }
}
