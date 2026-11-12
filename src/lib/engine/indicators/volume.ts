import { Candle } from '../types';
import { calculateSMA } from './trend';

export function calculateVWAP(candles: Candle[]): number[] {
  const len = candles.length;
  const vwap: number[] = new Array(len).fill(NaN);
  let cumVolume = 0;
  let cumVolPrice = 0;

  for (let i = 0; i < len; i++) {
    const tp = (candles[i].high + candles[i].low + candles[i].close) / 3;
    const vol = candles[i].volume;
    cumVolume += vol;
    cumVolPrice += tp * vol;
    vwap[i] = cumVolume === 0 ? tp : cumVolPrice / cumVolume;
  }
  return vwap;
}

export function calculateOBV(candles: Candle[]): number[] {
  const len = candles.length;
  const obv: number[] = new Array(len).fill(0);
  if (len === 0) return obv;

  obv[0] = candles[0].volume;
  for (let i = 1; i < len; i++) {
    const prevC = candles[i - 1].close;
    const currC = candles[i].close;
    const vol = candles[i].volume;

    if (currC > prevC) {
      obv[i] = obv[i - 1] + vol;
    } else if (currC < prevC) {
      obv[i] = obv[i - 1] - vol;
    } else {
      obv[i] = obv[i - 1];
    }
  }
  return obv;
}

export function calculateCMF(candles: Candle[], period = 20): number[] {
  const len = candles.length;
  const cmf: number[] = new Array(len).fill(NaN);
  if (len < period) return cmf;

  const mfv: number[] = new Array(len).fill(0);
  for (let i = 0; i < len; i++) {
    const h = candles[i].high;
    const l = candles[i].low;
    const c = candles[i].close;
    const v = candles[i].volume;
    const hl = h - l;
    const mfm = hl === 0 ? 0 : (c - l - (h - c)) / hl;
    mfv[i] = mfm * v;
  }

  for (let i = period - 1; i < len; i++) {
    let sumMFV = 0;
    let sumVol = 0;
    for (let j = 0; j < period; j++) {
      sumMFV += mfv[i - j];
      sumVol += candles[i - j].volume;
    }
    cmf[i] = sumVol === 0 ? 0 : sumMFV / sumVol;
  }
  return cmf;
}

export function calculateRVOL(candles: Candle[], period = 20): number[] {
  const volumes = candles.map((c) => c.volume);
  const volSma = calculateSMA(volumes, period);
  const rvol: number[] = new Array(candles.length).fill(NaN);

  for (let i = period - 1; i < candles.length; i++) {
    rvol[i] = volSma[i] === 0 ? 1 : volumes[i] / volSma[i];
  }
  return rvol;
}
