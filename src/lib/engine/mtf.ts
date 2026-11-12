import { Candle, Timeframe, MTFSnapshot } from './types';
import { calculateEMA, calculateSupertrend, calculateMACD } from './indicators/trend';
import { calculateRSI, calculateStochRSI } from './indicators/momentum';
import { calculateATR, calculateBollingerBands } from './indicators/volatility';
import { calculateVWAP, calculateRVOL } from './indicators/volume';

export interface TimeframeCandleMap {
  '4h'?: Candle[];
  '1h'?: Candle[];
  '15m'?: Candle[];
  '5m'?: Candle[];
}

export class MultiTimeframeAggregator {
  /**
   * Find the latest closed higher-timeframe candle for a given target timestamp.
   * Prevents look-ahead bias by only matching HTF candles whose time <= current timestamp.
   */
  static getHTFCandleIndex(htfCandles: Candle[], timestamp: number): number {
    let low = 0;
    let high = htfCandles.length - 1;
    let bestIdx = -1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (htfCandles[mid].time <= timestamp) {
        bestIdx = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return bestIdx;
  }

  /**
   * Compute comprehensive MTF state and confluence for a given symbol across available candles.
   */
  static computeMTFSnapshot(
    symbol: string,
    currentTime: number,
    candlesMap: TimeframeCandleMap
  ): MTFSnapshot {
    let tf4hState: MTFSnapshot['tf4h'] = undefined;
    let tf1hState: MTFSnapshot['tf1h'] = undefined;
    let tf15mState: MTFSnapshot['tf15m'] = undefined;
    let tf5mState: MTFSnapshot['tf5m'] = undefined;

    let bullScore = 0;
    let bearScore = 0;
    let totalWeight = 0;

    // 1. Analyze 4H (Weight: 35%)
    if (candlesMap['4h'] && candlesMap['4h'].length >= 30) {
      const htfIdx = this.getHTFCandleIndex(candlesMap['4h'], currentTime);
      if (htfIdx >= 20) {
        const subCandles = candlesMap['4h'].slice(0, htfIdx + 1);
        const closes = subCandles.map((c) => c.close);
        const emaTrend = calculateEMA(closes, Math.min(200, Math.floor(closes.length * 0.8)));
        const st = calculateSupertrend(subCandles, 10, 3.0);
        const atr = calculateATR(subCandles, 14);
        const rsi = calculateRSI(closes, 14);

        const currClose = closes[closes.length - 1];
        const lastEma = emaTrend[emaTrend.length - 1];
        const isStBull = st.trend[st.trend.length - 1] === 1;

        let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
        if (currClose > lastEma && isStBull) trend = 'BULLISH';
        else if (currClose < lastEma && !isStBull) trend = 'BEARISH';

        tf4hState = {
          trend,
          atr: atr[atr.length - 1] || 0,
          rsi: rsi[rsi.length - 1] || 50,
          supertrendBull: isStBull,
        };

        totalWeight += 35;
        if (trend === 'BULLISH') bullScore += 35;
        else if (trend === 'BEARISH') bearScore += 35;
        else {
          bullScore += 15;
          bearScore += 15;
        }
      }
    }

    // 2. Analyze 1H (Weight: 25%)
    if (candlesMap['1h'] && candlesMap['1h'].length >= 30) {
      const idx = this.getHTFCandleIndex(candlesMap['1h'], currentTime);
      if (idx >= 20) {
        const sub = candlesMap['1h'].slice(0, idx + 1);
        const closes = sub.map((c) => c.close);
        const ema20 = calculateEMA(closes, 20);
        const ema50 = calculateEMA(closes, 50);
        const macd = calculateMACD(closes);
        const atr = calculateATR(sub, 14);
        const rsi = calculateRSI(closes, 14);

        const lastEma20 = ema20[ema20.length - 1];
        const lastEma50 = ema50[ema50.length - 1];
        const lastHist = macd.histogram[macd.histogram.length - 1] || 0;

        let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
        if (lastEma20 > lastEma50 && lastHist > 0) trend = 'BULLISH';
        else if (lastEma20 < lastEma50 && lastHist < 0) trend = 'BEARISH';

        tf1hState = {
          trend,
          atr: atr[atr.length - 1] || 0,
          rsi: rsi[rsi.length - 1] || 50,
          macdHist: lastHist,
        };

        totalWeight += 25;
        if (trend === 'BULLISH') bullScore += 25;
        else if (trend === 'BEARISH') bearScore += 25;
        else {
          bullScore += 10;
          bearScore += 10;
        }
      }
    }

    // 3. Analyze 15M (Weight: 25%)
    if (candlesMap['15m'] && candlesMap['15m'].length >= 30) {
      const idx = this.getHTFCandleIndex(candlesMap['15m'], currentTime);
      if (idx >= 20) {
        const sub = candlesMap['15m'].slice(0, idx + 1);
        const closes = sub.map((c) => c.close);
        const vwap = calculateVWAP(sub);
        const bb = calculateBollingerBands(closes, 20, 2.0);
        const rsi = calculateRSI(closes, 14);

        const currClose = closes[closes.length - 1];
        const lastVwap = vwap[vwap.length - 1];
        const lastRsi = rsi[rsi.length - 1] || 50;

        let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
        if (currClose > lastVwap && lastRsi > 50) trend = 'BULLISH';
        else if (currClose < lastVwap && lastRsi < 50) trend = 'BEARISH';

        tf15mState = {
          trend,
          vwap: lastVwap,
          rsi: lastRsi,
          bbWidth: bb.bandwidth[bb.bandwidth.length - 1] || 0,
        };

        totalWeight += 25;
        if (trend === 'BULLISH') bullScore += 25;
        else if (trend === 'BEARISH') bearScore += 25;
        else {
          bullScore += 10;
          bearScore += 10;
        }
      }
    }

    // 4. Analyze 5M (Weight: 15%)
    if (candlesMap['5m'] && candlesMap['5m'].length >= 20) {
      const idx = this.getHTFCandleIndex(candlesMap['5m'], currentTime);
      if (idx >= 15) {
        const sub = candlesMap['5m'].slice(0, idx + 1);
        const closes = sub.map((c) => c.close);
        const stochRsi = calculateStochRSI(closes);
        const rvol = calculateRVOL(sub, 20);

        const lastK = stochRsi.k[stochRsi.k.length - 1] || 50;
        const lastRvol = rvol[rvol.length - 1] || 1;

        let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
        if (lastK > 50) trend = 'BULLISH';
        else if (lastK < 50) trend = 'BEARISH';

        tf5mState = {
          trend,
          stochRsiK: lastK,
          rvol: lastRvol,
        };

        totalWeight += 15;
        if (trend === 'BULLISH') bullScore += 15;
        else if (trend === 'BEARISH') bearScore += 15;
      }
    }

    // Confluence score normalized to 0-100 (dominant direction conviction)
    const normalizedWeight = totalWeight > 0 ? totalWeight : 100;
    const confluence = Math.round((Math.max(bullScore, bearScore) / normalizedWeight) * 100);

    return {
      time: currentTime,
      symbol,
      tf4h: tf4hState,
      tf1h: tf1hState,
      tf15m: tf15mState,
      tf5m: tf5mState,
      overallConfluenceScore: confluence,
    };
  }
}
