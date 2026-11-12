import { Candle, Timeframe } from '../engine/types';

if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

export class BingXClient {
  private static BASE_URL = process.env.BINGX_BASE_URL || 'https://open-api.bingx.com';

  /**
   * Fetch candlestick (kline) data from BingX Perpetual Swap API
   */
  static async fetchKlines(
    symbol: string,
    interval: Timeframe,
    limit = 500,
    startTime?: number,
    endTime?: number
  ): Promise<Candle[]> {
    const url = new URL(`${this.BASE_URL}/openApi/swap/v3/quote/klines`);
    url.searchParams.set('symbol', symbol);
    url.searchParams.set('interval', interval);
    url.searchParams.set('limit', Math.min(limit, 1440).toString());

    if (startTime) url.searchParams.set('startTime', startTime.toString());
    if (endTime) url.searchParams.set('endTime', endTime.toString());

    let attempts = 0;
    while (attempts < 3) {
      attempts++;
      try {
        const res = await fetch(url.toString(), {
          headers: {
            'User-Agent': 'AntigravityTradeOptimizer/1.0',
          },
          next: { revalidate: 60 },
        });

        if (!res.ok) {
          throw new Error(`BingX API HTTP error: ${res.status} ${res.statusText}`);
        }

        const json = await res.json();
        if (json.code === 100410) {
          // Rate limit, pause and retry
          await new Promise((r) => setTimeout(r, 600 * attempts));
          continue;
        }

        if (json.code !== 0 || !Array.isArray(json.data)) {
          throw new Error(`BingX API returned error: code=${json.code}, msg=${json.msg}`);
        }

        // Map and normalize candles
        const candles: Candle[] = json.data.map((item: any) => ({
          time: Number(item.time),
          open: parseFloat(item.open),
          high: parseFloat(item.high),
          low: parseFloat(item.low),
          close: parseFloat(item.close),
          volume: parseFloat(item.volume),
        }));

        candles.sort((a, b) => a.time - b.time);
        return candles;
      } catch (err) {
        if (attempts >= 3) throw err;
        await new Promise((r) => setTimeout(r, 500 * attempts));
      }
    }

    return [];
  }

  /**
   * Fetch long history by automatically paginating requests
   */
  static async fetchHistoricalKlines(
    symbol: string,
    interval: Timeframe,
    totalBars = 1000
  ): Promise<Candle[]> {
    const candles: Candle[] = [];
    const maxPerChunk = 1000;
    let remaining = totalBars;
    let currentEndTime: number | undefined = undefined;

    while (remaining > 0) {
      const fetchLimit = Math.min(remaining, maxPerChunk);
      const chunk = await this.fetchKlines(symbol, interval, fetchLimit, undefined, currentEndTime);

      if (chunk.length === 0) break;

      candles.unshift(...chunk);
      remaining -= chunk.length;

      // Oldest candle time minus 1ms as next chunk's endTime
      currentEndTime = chunk[0].time - 1;

      // Small pause to avoid aggressive rate-limits
      await new Promise((r) => setTimeout(r, 150));

      if (chunk.length < fetchLimit) break;
    }

    // Deduplicate by timestamp and sort
    const map = new Map<number, Candle>();
    for (const c of candles) map.set(c.time, c);
    const sorted = Array.from(map.values()).sort((a, b) => a.time - b.time);

    return sorted.slice(-totalBars);
  }
}
