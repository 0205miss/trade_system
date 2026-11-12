import { Candle } from '../types';

export function calculateSMA(values: number[], period: number): number[] {
  const result: number[] = new Array(values.length).fill(NaN);
  if (values.length < period || period <= 0) return result;

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
  }
  result[period - 1] = sum / period;

  for (let i = period; i < values.length; i++) {
    sum += values[i] - values[i - period];
    result[i] = sum / period;
  }
  return result;
}

export function calculateEMA(values: number[], period: number): number[] {
  const result: number[] = new Array(values.length).fill(NaN);
  if (values.length < period || period <= 0) return result;

  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
  }
  let prevEma = sum / period;
  result[period - 1] = prevEma;

  for (let i = period; i < values.length; i++) {
    const ema = values[i] * k + prevEma * (1 - k);
    result[i] = ema;
    prevEma = ema;
  }
  return result;
}

export function calculateWMA(values: number[], period: number): number[] {
  const result: number[] = new Array(values.length).fill(NaN);
  if (values.length < period || period <= 0) return result;

  const denominator = (period * (period + 1)) / 2;
  for (let i = period - 1; i < values.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += values[i - (period - 1 - j)] * (j + 1);
    }
    result[i] = sum / denominator;
  }
  return result;
}

export function calculateHMA(values: number[], period: number): number[] {
  const halfPeriod = Math.floor(period / 2);
  const sqrtPeriod = Math.floor(Math.sqrt(period));

  const wmaHalf = calculateWMA(values, halfPeriod);
  const wmaFull = calculateWMA(values, period);

  const diff: number[] = new Array(values.length).fill(NaN);
  for (let i = 0; i < values.length; i++) {
    if (!isNaN(wmaHalf[i]) && !isNaN(wmaFull[i])) {
      diff[i] = 2 * wmaHalf[i] - wmaFull[i];
    }
  }

  // WMA of diff over sqrtPeriod
  const validStart = diff.findIndex((v) => !isNaN(v));
  if (validStart === -1 || diff.length - validStart < sqrtPeriod) {
    return new Array(values.length).fill(NaN);
  }

  const subDiff = diff.slice(validStart);
  const hmaSub = calculateWMA(subDiff, sqrtPeriod);

  const result: number[] = new Array(values.length).fill(NaN);
  for (let i = 0; i < hmaSub.length; i++) {
    result[validStart + i] = hmaSub[i];
  }
  return result;
}

export interface MACDResult {
  macdLine: number[];
  signalLine: number[];
  histogram: number[];
}

export function calculateMACD(
  values: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): MACDResult {
  const fastEMA = calculateEMA(values, fastPeriod);
  const slowEMA = calculateEMA(values, slowPeriod);

  const macdLine: number[] = new Array(values.length).fill(NaN);
  for (let i = 0; i < values.length; i++) {
    if (!isNaN(fastEMA[i]) && !isNaN(slowEMA[i])) {
      macdLine[i] = fastEMA[i] - slowEMA[i];
    }
  }

  // Find first valid index in macdLine
  const firstValid = macdLine.findIndex((v) => !isNaN(v));
  const signalLine: number[] = new Array(values.length).fill(NaN);
  const histogram: number[] = new Array(values.length).fill(NaN);

  if (firstValid !== -1 && macdLine.length - firstValid >= signalPeriod) {
    const subMacd = macdLine.slice(firstValid);
    const subSignal = calculateEMA(subMacd, signalPeriod);
    for (let i = 0; i < subSignal.length; i++) {
      const idx = firstValid + i;
      signalLine[idx] = subSignal[i];
      if (!isNaN(macdLine[idx]) && !isNaN(signalLine[idx])) {
        histogram[idx] = macdLine[idx] - signalLine[idx];
      }
    }
  }

  return { macdLine, signalLine, histogram };
}

export interface SupertrendResult {
  trend: (1 | -1)[]; // 1 = bullish, -1 = bearish
  supertrend: number[];
  upperBand: number[];
  lowerBand: number[];
}

export function calculateSupertrend(
  candles: Candle[],
  period = 10,
  multiplier = 3.0
): SupertrendResult {
  const len = candles.length;
  const trend: (1 | -1)[] = new Array(len).fill(1);
  const supertrend: number[] = new Array(len).fill(NaN);
  const upperBand: number[] = new Array(len).fill(NaN);
  const lowerBand: number[] = new Array(len).fill(NaN);

  if (len < period) return { trend, supertrend, upperBand, lowerBand };

  // Calculate True Range
  const tr: number[] = new Array(len).fill(0);
  tr[0] = candles[0].high - candles[0].low;
  for (let i = 1; i < len; i++) {
    const h = candles[i].high;
    const l = candles[i].low;
    const prevC = candles[i - 1].close;
    tr[i] = Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC));
  }

  // ATR using RMA / Wilder's Smoothing
  const atr: number[] = new Array(len).fill(NaN);
  let trSum = 0;
  for (let i = 0; i < period; i++) trSum += tr[i];
  atr[period - 1] = trSum / period;
  for (let i = period; i < len; i++) {
    atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
  }

  const basicUpper: number[] = new Array(len).fill(NaN);
  const basicLower: number[] = new Array(len).fill(NaN);

  for (let i = period - 1; i < len; i++) {
    const hl2 = (candles[i].high + candles[i].low) / 2;
    basicUpper[i] = hl2 + multiplier * atr[i];
    basicLower[i] = hl2 - multiplier * atr[i];
  }

  // Final bands & trend state
  upperBand[period - 1] = basicUpper[period - 1];
  lowerBand[period - 1] = basicLower[period - 1];
  trend[period - 1] = candles[period - 1].close > upperBand[period - 1] ? 1 : -1;
  supertrend[period - 1] = trend[period - 1] === 1 ? lowerBand[period - 1] : upperBand[period - 1];

  for (let i = period; i < len; i++) {
    const prevClose = candles[i - 1].close;
    const currClose = candles[i].close;

    // Upper band logic
    if (basicUpper[i] < upperBand[i - 1] || prevClose > upperBand[i - 1]) {
      upperBand[i] = basicUpper[i];
    } else {
      upperBand[i] = upperBand[i - 1];
    }

    // Lower band logic
    if (basicLower[i] > lowerBand[i - 1] || prevClose < lowerBand[i - 1]) {
      lowerBand[i] = basicLower[i];
    } else {
      lowerBand[i] = lowerBand[i - 1];
    }

    // Trend switch
    let currTrend: 1 | -1 = trend[i - 1];
    if (currTrend === -1 && currClose > upperBand[i - 1]) {
      currTrend = 1;
    } else if (currTrend === 1 && currClose < lowerBand[i - 1]) {
      currTrend = -1;
    }

    trend[i] = currTrend;
    supertrend[i] = currTrend === 1 ? lowerBand[i] : upperBand[i];
  }

  return { trend, supertrend, upperBand, lowerBand };
}

export interface ADXResult {
  adx: number[];
  plusDI: number[];
  minusDI: number[];
}

export function calculateADX(candles: Candle[], period = 14): ADXResult {
  const len = candles.length;
  const adx: number[] = new Array(len).fill(NaN);
  const plusDI: number[] = new Array(len).fill(NaN);
  const minusDI: number[] = new Array(len).fill(NaN);

  if (len <= period * 2) return { adx, plusDI, minusDI };

  const tr: number[] = new Array(len).fill(0);
  const plusDM: number[] = new Array(len).fill(0);
  const minusDM: number[] = new Array(len).fill(0);

  for (let i = 1; i < len; i++) {
    const h = candles[i].high;
    const l = candles[i].low;
    const prevH = candles[i - 1].high;
    const prevL = candles[i - 1].low;
    const prevC = candles[i - 1].close;

    tr[i] = Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC));

    const upMove = h - prevH;
    const downMove = prevL - l;

    if (upMove > downMove && upMove > 0) plusDM[i] = upMove;
    if (downMove > upMove && downMove > 0) minusDM[i] = downMove;
  }

  // Smooth TR, +DM, -DM
  let smoothTR = 0;
  let smoothPlusDM = 0;
  let smoothMinusDM = 0;

  for (let i = 1; i <= period; i++) {
    smoothTR += tr[i];
    smoothPlusDM += plusDM[i];
    smoothMinusDM += minusDM[i];
  }

  const dx: number[] = new Array(len).fill(NaN);

  for (let i = period; i < len; i++) {
    if (i > period) {
      smoothTR = smoothTR - smoothTR / period + tr[i];
      smoothPlusDM = smoothPlusDM - smoothPlusDM / period + plusDM[i];
      smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDM[i];
    }

    const pDI = (smoothPlusDM / smoothTR) * 100;
    const mDI = (smoothMinusDM / smoothTR) * 100;
    plusDI[i] = pDI;
    minusDI[i] = mDI;

    const diSum = pDI + mDI;
    dx[i] = diSum === 0 ? 0 : (Math.abs(pDI - mDI) / diSum) * 100;
  }

  // ADX is smoothed DX
  const firstDxIdx = period;
  let dxSum = 0;
  for (let i = firstDxIdx; i < firstDxIdx + period && i < len; i++) {
    dxSum += dx[i];
  }
  adx[firstDxIdx + period - 1] = dxSum / period;

  for (let i = firstDxIdx + period; i < len; i++) {
    adx[i] = (adx[i - 1] * (period - 1) + dx[i]) / period;
  }

  return { adx, plusDI, minusDI };
}

export interface IchimokuResult {
  tenkan: number[];
  kijun: number[];
  senkouA: number[];
  senkouB: number[];
  chikou: number[];
}

export function calculateIchimoku(
  candles: Candle[],
  tenkanPeriod = 9,
  kijunPeriod = 26,
  senkouBPeriod = 52
): IchimokuResult {
  const len = candles.length;
  const tenkan: number[] = new Array(len).fill(NaN);
  const kijun: number[] = new Array(len).fill(NaN);
  const senkouA: number[] = new Array(len).fill(NaN);
  const senkouB: number[] = new Array(len).fill(NaN);
  const chikou: number[] = new Array(len).fill(NaN);

  const getMidPoint = (start: number, end: number) => {
    let max = -Infinity;
    let min = Infinity;
    for (let i = start; i <= end; i++) {
      if (candles[i].high > max) max = candles[i].high;
      if (candles[i].low < min) min = candles[i].low;
    }
    return (max + min) / 2;
  };

  for (let i = 0; i < len; i++) {
    if (i >= tenkanPeriod - 1) {
      tenkan[i] = getMidPoint(i - tenkanPeriod + 1, i);
    }
    if (i >= kijunPeriod - 1) {
      kijun[i] = getMidPoint(i - kijunPeriod + 1, i);
    }
    if (!isNaN(tenkan[i]) && !isNaN(kijun[i])) {
      senkouA[i] = (tenkan[i] + kijun[i]) / 2;
    }
    if (i >= senkouBPeriod - 1) {
      senkouB[i] = getMidPoint(i - senkouBPeriod + 1, i);
    }
    chikou[i] = candles[i].close;
  }

  return { tenkan, kijun, senkouA, senkouB, chikou };
}
