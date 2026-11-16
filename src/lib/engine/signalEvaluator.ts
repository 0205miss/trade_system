import { Candle, StrategyModel, TradeDirection, Timeframe } from './types';
import { calculateEMA, calculateSupertrend } from './indicators/trend';
import { calculateRSI, calculateStochRSI } from './indicators/momentum';
import { calculateATR } from './indicators/volatility';
import { calculateRVOL } from './indicators/volume';
import { MultiTimeframeAggregator, TimeframeCandleMap } from './mtf';

export interface IndicatorConditionCheck {
  name: string;
  actual: string | number;
  threshold: string | number;
  passed: boolean;
  note?: string;
}

export interface SignalEvaluationResult {
  signal: TradeDirection | null;
  currentPrice: number;
  evaluationBarTime: number;
  atr: number;
  conditions: {
    supertrend: IndicatorConditionCheck;
    rsi: IndicatorConditionCheck;
    stochRsi: IndicatorConditionCheck;
    rvol: IndicatorConditionCheck;
    emaTrend: IndicatorConditionCheck;
    mtfFilter?: IndicatorConditionCheck;
  };
  summary: string;
}

export class SignalEvaluator {
  /**
   * Evaluate trade signals on a specific candle bar (defaults to closed bar: candles.length - 2 or candles.length - 1)
   * Ensures 100% identical decision logic between backtesting and live/VST execution.
   */
  static evaluate(
    candles: Candle[],
    strategy: StrategyModel,
    barIndex?: number,
    htfCandlesMap?: TimeframeCandleMap
  ): SignalEvaluationResult {
    const len = candles.length;
    if (len < 35) {
      throw new Error(`Insufficient candles for signal evaluation: ${len} (minimum 35 required)`);
    }

    // Default to closed bar (len - 2) if barIndex not provided, to prevent unclosed bar volume distortion
    const i = barIndex !== undefined ? barIndex : Math.max(0, len - 2);
    const targetCandle = candles[i];
    const currentPrice = candles[len - 1].close;

    const indConfig = strategy.indicatorsConfig || {};
    const closes = candles.map((c) => c.close);

    // 1. Calculate technical indicators
    const supertrendPeriod = indConfig.supertrendPeriod || 10;
    const supertrendMultiplier = indConfig.supertrendMultiplier || 3.0;
    const supertrend = calculateSupertrend(candles, supertrendPeriod, supertrendMultiplier);

    const rsiPeriod = indConfig.rsiPeriod || 14;
    const rsi = calculateRSI(closes, rsiPeriod);
    const stochRsi = calculateStochRSI(closes, rsiPeriod, 14, 3, 3);

    const emaTrendPeriod = indConfig.emaTrend || 200;
    const emaTrend = calculateEMA(closes, emaTrendPeriod);

    const atrPeriod = indConfig.atrPeriod || 14;
    const atr = calculateATR(candles, atrPeriod);

    const rvolPeriod = indConfig.rvolPeriod || 20;
    const rvol = calculateRVOL(candles, rvolPeriod);

    // 2. Extract values for the evaluated bar
    const barClose = targetCandle.close;
    const isSupertrendBull = supertrend.trend[i] === 1;
    const curRsi = rsi[i] !== undefined ? rsi[i] : 50;
    const curStochK = stochRsi.k[i] !== undefined ? stochRsi.k[i] : 50;
    const curStochD = stochRsi.d[i] !== undefined ? stochRsi.d[i] : 50;
    const curEmaTrend = emaTrend[i] !== undefined ? emaTrend[i] : barClose;
    const curRvol = rvol[i] !== undefined ? rvol[i] : 1.0;
    const curAtr = atr[i] !== undefined ? atr[i] : barClose * 0.01;

    // Thresholds (Unified: default RSI oversold < 35, overbought > 65, RVOL >= 1.1)
    const rsiOversoldThreshold = indConfig.rsiOversold ?? 35;
    const rsiOverboughtThreshold = indConfig.rsiOverbought ?? 65;
    const rvolThreshold = indConfig.rvolThreshold ?? 1.1;

    const isRsiOversold = curRsi < rsiOversoldThreshold;
    const isRsiOverbought = curRsi > rsiOverboughtThreshold;

    const isStochRsiBull = curStochK > curStochD && curStochK < 40;
    const isStochRsiBear = curStochK < curStochD && curStochK > 60;

    const hasVolume = curRvol >= rvolThreshold;

    // 3. Multi-timeframe trend filter check
    let mtfAllowsLong = true;
    let mtfAllowsShort = true;
    let mtfNote = 'MTF 濾網未啟用或無高週期資料';

    if (htfCandlesMap && strategy.mtfReferenceConfig?.useHigherTimeframeTrendFilter) {
      const mtfSnapshot = MultiTimeframeAggregator.computeMTFSnapshot(
        strategy.symbol,
        targetCandle.time,
        htfCandlesMap
      );
      if (strategy.timeframe === '5m' || strategy.timeframe === '15m') {
        if (mtfSnapshot.tf4h?.trend === 'BEARISH') {
          mtfAllowsLong = false;
          mtfNote = '4H 處於空頭趨勢，禁止多單';
        } else if (mtfSnapshot.tf4h?.trend === 'BULLISH') {
          mtfAllowsShort = false;
          mtfNote = '4H 處於多頭趨勢，禁止空單';
        } else {
          mtfNote = '4H 趨勢共振一致';
        }
      }
    }

    const emaTrendBullPass = barClose > curEmaTrend * 0.98;
    const emaTrendBearPass = barClose < curEmaTrend * 1.02;

    // 4. Signal Determination
    let signal: TradeDirection | null = null;
    if (
      mtfAllowsLong &&
      isSupertrendBull &&
      (isRsiOversold || isStochRsiBull) &&
      hasVolume &&
      emaTrendBullPass
    ) {
      signal = 'LONG';
    } else if (
      mtfAllowsShort &&
      !isSupertrendBull &&
      (isRsiOverbought || isStochRsiBear) &&
      hasVolume &&
      emaTrendBearPass
    ) {
      signal = 'SHORT';
    }

    // 5. Structure conditions inspection report
    const conditions = {
      supertrend: {
        name: 'Supertrend 趨勢方向',
        actual: isSupertrendBull ? '看多 (Bullish)' : '看空 (Bearish)',
        threshold: signal === 'SHORT' ? '看空' : '看多',
        passed: isSupertrendBull || !isSupertrendBull,
        note: `週期 ${supertrendPeriod}, 倍數 ${supertrendMultiplier}`,
      },
      rsi: {
        name: 'RSI 相對強弱',
        actual: Number(curRsi.toFixed(1)),
        threshold: `< ${rsiOversoldThreshold} (超賣) 或 > ${rsiOverboughtThreshold} (超買)`,
        passed: isRsiOversold || isRsiOverbought,
        note: isRsiOversold ? '超賣 (看多有利)' : isRsiOverbought ? '超買 (看空有利)' : '處於中性區間',
      },
      stochRsi: {
        name: 'StochRSI 隨機擺盪',
        actual: `K: ${curStochK.toFixed(1)} / D: ${curStochD.toFixed(1)}`,
        threshold: '多頭金叉 (K>D 且 K<40) 或 空頭死叉 (K<D 且 K>60)',
        passed: isStochRsiBull || isStochRsiBear,
        note: isStochRsiBull ? '低檔金叉' : isStochRsiBear ? '高檔死叉' : '無反轉交叉信號',
      },
      rvol: {
        name: 'RVOL 成交量放大倍數',
        actual: `${curRvol.toFixed(2)}x`,
        threshold: `>= ${rvolThreshold.toFixed(2)}x`,
        passed: hasVolume,
        note: hasVolume ? '量能確認充沛' : '成交量未達放量門檻',
      },
      emaTrend: {
        name: `EMA${emaTrendPeriod} 長期趨勢防守`,
        actual: Number(barClose.toFixed(2)),
        threshold: `參考線: ${curEmaTrend.toFixed(2)}`,
        passed: (isSupertrendBull && emaTrendBullPass) || (!isSupertrendBull && emaTrendBearPass),
        note: barClose >= curEmaTrend ? '位於均線之上' : '位於均線之下',
      },
      mtfFilter: {
        name: 'MTF 跨週期濾網',
        actual: mtfAllowsLong && mtfAllowsShort ? '全向允許' : mtfAllowsLong ? '僅大多頭' : '僅大空頭',
        threshold: '與大級別 4H 趨勢同向',
        passed: signal === 'LONG' ? mtfAllowsLong : signal === 'SHORT' ? mtfAllowsShort : true,
        note: mtfNote,
      },
    };

    let summary = '當前無觸發信號：';
    if (signal) {
      summary = `觸發開倉信號 [${signal}]！所有技術指標與成交量門檻均已滿足。`;
    } else {
      const unmet: string[] = [];
      if (!hasVolume) unmet.push(`量能不足(${curRvol.toFixed(2)}x < ${rvolThreshold}x)`);
      if (!isRsiOversold && !isStochRsiBull && isSupertrendBull) unmet.push('動能未超賣/未金叉');
      if (!isRsiOverbought && !isStochRsiBear && !isSupertrendBull) unmet.push('動能未超買/未死叉');
      if (isSupertrendBull && !emaTrendBullPass) unmet.push('遠低於EMA200');
      if (!isSupertrendBull && !emaTrendBearPass) unmet.push('遠高於EMA200');
      summary += unmet.length > 0 ? unmet.join('、') : '條件未完全收斂';
    }

    return {
      signal,
      currentPrice,
      evaluationBarTime: targetCandle.time,
      atr: curAtr,
      conditions,
      summary,
    };
  }
}
