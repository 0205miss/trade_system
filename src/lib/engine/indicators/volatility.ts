import { Candle } from '../types';
import { calculateEMA, calculateSMA } from './trend';

export function calculateATR(candles: Candle[], period = 14): number[] {
  const len = candles.length;
  const atr: number[] = new Array(len).fill(NaN);
  if (len <= period) return atr;

  const tr: number[] = new Array(len).fill(0);
  tr[0] = candles[0].high - candles[0].low;

  for (let i = 1; i < len; i++) {
    const h = candles[i].high;
    const l = candles[i].low;
    const prevC = candles[i - 1].close;
    tr[i] = Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC));
  }

  let sum = 0;
  for (let i = 0; i < period; i++) sum += tr[i];
  atr[period - 1] = sum / period;

  for (let i = period; i < len; i++) {
    atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
  }
  return atr;
}

export interface BollingerBandsResult {
  upper: number[];
  middle: number[];
  lower: number[];
  bandwidth: number[];
  percentB: number[];
}

export function calculateBollingerBands(
  values: number[],
  period = 20,
  stdDevMultiplier = 2.0
): BollingerBandsResult {
  const len = values.length;
  const middle = calculateSMA(values, period);
  const upper: number[] = new Array(len).fill(NaN);
  const lower: number[] = new Array(len).fill(NaN);
  const bandwidth: number[] = new Array(len).fill(NaN);
  const percentB: number[] = new Array(len).fill(NaN);

  for (let i = period - 1; i < len; i++) {
    let varianceSum = 0;
    const mid = middle[i];
    for (let j = 0; j < period; j++) {
      const diff = values[i - j] - mid;
      varianceSum += diff * diff;
    }
    const stdDev = Math.sqrt(varianceSum / period);
    const up = mid + stdDevMultiplier * stdDev;
    const low = mid - stdDevMultiplier * stdDev;

    upper[i] = up;
    lower[i] = low;
    bandwidth[i] = mid === 0 ? 0 : ((up - low) / mid) * 100;
    const bandSpan = up - low;
    percentB[i] = bandSpan === 0 ? 0.5 : (values[i] - low) / bandSpan;
  }

  return { upper, middle, lower, bandwidth, percentB };
}

export interface KeltnerChannelsResult {
  upper: number[];
  middle: number[];
  lower: number[];
}

export function calculateKeltnerChannels(
  candles: Candle[],
  emaPeriod = 20,
  atrPeriod = 10,
  multiplier = 2.0
): KeltnerChannelsResult {
  const len = candles.length;
  const closes = candles.map((c) => c.close);
  const middle = calculateEMA(closes, emaPeriod);
  const atr = calculateATR(candles, atrPeriod);

  const upper: number[] = new Array(len).fill(NaN);
  const lower: number[] = new Array(len).fill(NaN);

  for (let i = Math.max(emaPeriod, atrPeriod) - 1; i < len; i++) {
    if (!isNaN(middle[i]) && !isNaN(atr[i])) {
      upper[i] = middle[i] + multiplier * atr[i];
      lower[i] = middle[i] - multiplier * atr[i];
    }
  }

  return { upper, middle, lower };
}

export interface DonchianChannelsResult {
  upper: number[];
  middle: number[];
  lower: number[];
}

export function calculateDonchianChannels(
  candles: Candle[],
  period = 20
): DonchianChannelsResult {
  const len = candles.length;
  const upper: number[] = new Array(len).fill(NaN);
  const middle: number[] = new Array(len).fill(NaN);
  const lower: number[] = new Array(len).fill(NaN);

  for (let i = period - 1; i < len; i++) {
    let max = -Infinity;
    let min = Infinity;
    for (let j = 0; j < period; j++) {
      const idx = i - j;
      if (candles[idx].high > max) max = candles[idx].high;
      if (candles[idx].low < min) min = candles[idx].low;
    }
    upper[i] = max;
    lower[i] = min;
    middle[i] = (max + min) / 2;
  }

  return { upper, middle, lower };
}
