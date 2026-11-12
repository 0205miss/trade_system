import { Candle } from '../types';

export interface PivotPointsResult {
  p: number[];
  r1: number[];
  r2: number[];
  r3: number[];
  s1: number[];
  s2: number[];
  s3: number[];
}

export function calculateStandardPivotPoints(candles: Candle[]): PivotPointsResult {
  const len = candles.length;
  const p = new Array(len).fill(NaN);
  const r1 = new Array(len).fill(NaN);
  const r2 = new Array(len).fill(NaN);
  const r3 = new Array(len).fill(NaN);
  const s1 = new Array(len).fill(NaN);
  const s2 = new Array(len).fill(NaN);
  const s3 = new Array(len).fill(NaN);

  for (let i = 1; i < len; i++) {
    const prev = candles[i - 1];
    const pivot = (prev.high + prev.low + prev.close) / 3;
    p[i] = pivot;
    r1[i] = 2 * pivot - prev.low;
    s1[i] = 2 * pivot - prev.high;
    r2[i] = pivot + (prev.high - prev.low);
    s2[i] = pivot - (prev.high - prev.low);
    r3[i] = prev.high + 2 * (pivot - prev.low);
    s3[i] = prev.low - 2 * (prev.high - pivot);
  }

  return { p, r1, r2, r3, s1, s2, s3 };
}

export interface SwingPointsResult {
  isSwingHigh: boolean[];
  isSwingLow: boolean[];
  swingHighPrice: number[];
  swingLowPrice: number[];
}

export function findSwingHighLow(
  candles: Candle[],
  leftBars = 2,
  rightBars = 2
): SwingPointsResult {
  const len = candles.length;
  const isSwingHigh = new Array(len).fill(false);
  const isSwingLow = new Array(len).fill(false);
  const swingHighPrice = new Array(len).fill(NaN);
  const swingLowPrice = new Array(len).fill(NaN);

  for (let i = leftBars; i < len - rightBars; i++) {
    const targetH = candles[i].high;
    const targetL = candles[i].low;

    let isHigh = true;
    let isLow = true;

    for (let j = 1; j <= leftBars; j++) {
      if (candles[i - j].high >= targetH) isHigh = false;
      if (candles[i - j].low <= targetL) isLow = false;
    }
    for (let j = 1; j <= rightBars; j++) {
      if (candles[i + j].high > targetH) isHigh = false;
      if (candles[i + j].low < targetL) isLow = false;
    }

    if (isHigh) {
      isSwingHigh[i] = true;
      swingHighPrice[i] = targetH;
    }
    if (isLow) {
      isSwingLow[i] = true;
      swingLowPrice[i] = targetL;
    }
  }

  return { isSwingHigh, isSwingLow, swingHighPrice, swingLowPrice };
}
