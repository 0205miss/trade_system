import { Candle } from '../types';
import { calculateEMA, calculateSMA } from './trend';

export function calculateRSI(values: number[], period = 14): number[] {
  const len = values.length;
  const rsi: number[] = new Array(len).fill(NaN);
  if (len <= period) return rsi;

  const gains: number[] = new Array(len).fill(0);
  const losses: number[] = new Array(len).fill(0);

  for (let i = 1; i < len; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) {
      gains[i] = diff;
    } else {
      losses[i] = -diff;
    }
  }

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    avgGain += gains[i];
    avgLoss += losses[i];
  }
  avgGain /= period;
  avgLoss /= period;

  rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < len; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  return rsi;
}

export interface StochasticResult {
  k: number[];
  d: number[];
}

export function calculateStochastic(
  candles: Candle[],
  kPeriod = 14,
  dPeriod = 3,
  smooth = 3
): StochasticResult {
  const len = candles.length;
  const rawK: number[] = new Array(len).fill(NaN);

  for (let i = kPeriod - 1; i < len; i++) {
    let highest = -Infinity;
    let lowest = Infinity;
    for (let j = 0; j < kPeriod; j++) {
      const idx = i - j;
      if (candles[idx].high > highest) highest = candles[idx].high;
      if (candles[idx].low < lowest) lowest = candles[idx].low;
    }
    const range = highest - lowest;
    rawK[i] = range === 0 ? 50 : ((candles[i].close - lowest) / range) * 100;
  }

  const k = calculateSMA(rawK.map((v) => (isNaN(v) ? 0 : v)), smooth);
  const d = calculateSMA(k.map((v) => (isNaN(v) ? 0 : v)), dPeriod);

  for (let i = 0; i < kPeriod + smooth - 2; i++) {
    k[i] = NaN;
    d[i] = NaN;
  }

  return { k, d };
}

export interface StochRSIResult {
  k: number[];
  d: number[];
}

export function calculateStochRSI(
  values: number[],
  rsiPeriod = 14,
  stochPeriod = 14,
  kPeriod = 3,
  dPeriod = 3
): StochRSIResult {
  const rsi = calculateRSI(values, rsiPeriod);
  const len = values.length;
  const rawK: number[] = new Array(len).fill(NaN);

  for (let i = rsiPeriod + stochPeriod - 1; i < len; i++) {
    let highest = -Infinity;
    let lowest = Infinity;
    for (let j = 0; j < stochPeriod; j++) {
      const r = rsi[i - j];
      if (r > highest) highest = r;
      if (r < lowest) lowest = r;
    }
    const range = highest - lowest;
    rawK[i] = range === 0 ? 50 : ((rsi[i] - lowest) / range) * 100;
  }

  const k = calculateSMA(rawK.map((v) => (isNaN(v) ? 0 : v)), kPeriod);
  const d = calculateSMA(k.map((v) => (isNaN(v) ? 0 : v)), dPeriod);

  for (let i = 0; i < rsiPeriod + stochPeriod + kPeriod - 3; i++) {
    k[i] = NaN;
    d[i] = NaN;
  }

  return { k, d };
}

export function calculateWilliamsR(candles: Candle[], period = 14): number[] {
  const len = candles.length;
  const wr: number[] = new Array(len).fill(NaN);

  for (let i = period - 1; i < len; i++) {
    let highest = -Infinity;
    let lowest = Infinity;
    for (let j = 0; j < period; j++) {
      const idx = i - j;
      if (candles[idx].high > highest) highest = candles[idx].high;
      if (candles[idx].low < lowest) lowest = candles[idx].low;
    }
    const range = highest - lowest;
    wr[i] = range === 0 ? -50 : ((highest - candles[i].close) / range) * -100;
  }
  return wr;
}

export function calculateCCI(candles: Candle[], period = 20): number[] {
  const len = candles.length;
  const cci: number[] = new Array(len).fill(NaN);
  const tp = candles.map((c) => (c.high + c.low + c.close) / 3);
  const smaTP = calculateSMA(tp, period);

  for (let i = period - 1; i < len; i++) {
    let meanDev = 0;
    for (let j = 0; j < period; j++) {
      meanDev += Math.abs(tp[i - j] - smaTP[i]);
    }
    meanDev /= period;
    cci[i] = meanDev === 0 ? 0 : (tp[i] - smaTP[i]) / (0.015 * meanDev);
  }
  return cci;
}

export function calculateMFI(candles: Candle[], period = 14): number[] {
  const len = candles.length;
  const mfi: number[] = new Array(len).fill(NaN);
  if (len <= period) return mfi;

  const typicalPrice = candles.map((c) => (c.high + c.low + c.close) / 3);
  const rawMoneyFlow = typicalPrice.map((tp, i) => tp * candles[i].volume);

  const posFlow: number[] = new Array(len).fill(0);
  const negFlow: number[] = new Array(len).fill(0);

  for (let i = 1; i < len; i++) {
    if (typicalPrice[i] > typicalPrice[i - 1]) {
      posFlow[i] = rawMoneyFlow[i];
    } else if (typicalPrice[i] < typicalPrice[i - 1]) {
      negFlow[i] = rawMoneyFlow[i];
    }
  }

  for (let i = period; i < len; i++) {
    let posSum = 0;
    let negSum = 0;
    for (let j = 0; j < period; j++) {
      posSum += posFlow[i - j];
      negSum += negFlow[i - j];
    }
    mfi[i] = negSum === 0 ? 100 : 100 - 100 / (1 + posSum / negSum);
  }
  return mfi;
}

export function calculateROC(values: number[], period = 12): number[] {
  const len = values.length;
  const roc: number[] = new Array(len).fill(NaN);

  for (let i = period; i < len; i++) {
    const prev = values[i - period];
    roc[i] = prev === 0 ? 0 : ((values[i] - prev) / prev) * 100;
  }
  return roc;
}
