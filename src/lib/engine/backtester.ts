import {
  Candle,
  StrategyModel,
  BacktestResult,
  TradeRecord,
  EquityPoint,
  TradeDirection,
  ExitReason,
} from './types';
import { calculateEMA, calculateSupertrend, calculateMACD } from './indicators/trend';
import { calculateRSI, calculateStochRSI } from './indicators/momentum';
import { calculateATR, calculateBollingerBands } from './indicators/volatility';
import { calculateVWAP, calculateRVOL } from './indicators/volume';
import { MultiTimeframeAggregator, TimeframeCandleMap } from './mtf';

interface ActivePositionState {
  id: string;
  symbol: string;
  direction: TradeDirection;
  entryTime: number;
  entryPrice: number;
  totalQty: number;
  remainingQty: number;
  nominalValue: number;
  marginUsed: number;
  currentSl: number;
  initialSlDistance: number;
  isBeTriggered: boolean;
  tpTargets: { target: number; price: number; closePct: number; hit: boolean }[];
  tranchesFilled: number;
  totalFees: number;
  totalSlippage: number;
  accumulatedPnL: number;
  mtfContext?: any;
}

export class BacktestEngine {
  /**
   * Run deterministic event-driven backtest
   */
  static run(
    candles: Candle[],
    strategy: StrategyModel,
    htfCandlesMap?: TimeframeCandleMap,
    isInSample = false
  ): BacktestResult {
    const len = candles.length;
    if (len < 50) {
      throw new Error(`Insufficient candle data for backtest: ${len} candles.`);
    }

    const {
      initialCapital = 10000,
      leverage = 20,
      riskPerTradePct = 1.5,
      maxDailyLossUsdt = 80,
      makerFeeRate = 0.0002,
      takerFeeRate = 0.0005,
      slippageBps = 0.0003,
      slAtrMultiplier = 1.8,
      enableTrailingSl = true,
      trailingSlAtrMultiplier = 2.0,
    } = strategy.riskConfig;

    const indConfig = strategy.indicatorsConfig;
    const closes = candles.map((c) => c.close);

    // Compute indicators
    const emaFast = calculateEMA(closes, indConfig.emaFast || 20);
    const emaSlow = calculateEMA(closes, indConfig.emaSlow || 50);
    const emaTrend = calculateEMA(closes, indConfig.emaTrend || 200);
    const rsi = calculateRSI(closes, indConfig.rsiPeriod || 14);
    const atr = calculateATR(candles, indConfig.atrPeriod || 14);
    const stochRsi = calculateStochRSI(closes, indConfig.rsiPeriod || 14, 14, 3, 3);
    const supertrend = calculateSupertrend(candles, indConfig.supertrendPeriod || 10, indConfig.supertrendMultiplier || 3.0);
    const bb = calculateBollingerBands(closes, indConfig.bbPeriod || 20, indConfig.bbStdDev || 2.0);
    const rvol = calculateRVOL(candles, indConfig.rvolPeriod || 20);

    let cash = initialCapital;
    let equity = initialCapital;
    let peakEquity = initialCapital;
    let maxDrawdownPct = 0;

    const trades: TradeRecord[] = [];
    const equityCurve: EquityPoint[] = [];

    let activePosition: ActivePositionState | null = null;
    let currentDayStr = '';
    let dailyLoss = 0;
    let totalFeesPaid = 0;
    let totalSlippageCost = 0;

    const initialBenchmarkPrice = candles[0].close;

    for (let i = 30; i < len; i++) {
      const c = candles[i];
      const prevC = candles[i - 1];
      const candleDate = new Date(c.time).toISOString().slice(0, 10);

      // Reset daily circuit breaker on new day
      if (candleDate !== currentDayStr) {
        currentDayStr = candleDate;
        dailyLoss = 0;
      }

      const currATR = atr[i] || c.close * 0.01;

      // 1. Position Management & Exit Checks if in position
      if (activePosition) {
        const isLong = activePosition.direction === 'LONG';
        let closedReason: ExitReason | null = null;
        let exitPrice = 0;
        let closedFraction = 0;

        // Check Stop Loss hit
        if (isLong && c.low <= activePosition.currentSl) {
          closedReason = activePosition.isBeTriggered ? 'BE' : 'SL';
          exitPrice = activePosition.currentSl * (1 - slippageBps);
          closedFraction = 1.0;
        } else if (!isLong && c.high >= activePosition.currentSl) {
          closedReason = activePosition.isBeTriggered ? 'BE' : 'SL';
          exitPrice = activePosition.currentSl * (1 + slippageBps);
          closedFraction = 1.0;
        }

        // Check Take Profit targets
        if (!closedReason) {
          for (const tp of activePosition.tpTargets) {
            if (!tp.hit) {
              const hit = isLong ? c.high >= tp.price : c.low <= tp.price;
              if (hit) {
                tp.hit = true;
                const trancheCloseQty = Math.min(
                  activePosition.totalQty * (tp.closePct / 100),
                  activePosition.remainingQty
                );

                if (trancheCloseQty > 0) {
                  const tpExitPrice = isLong ? tp.price * (1 - slippageBps) : tp.price * (1 + slippageBps);
                  const pnl = isLong
                    ? (tpExitPrice - activePosition.entryPrice) * trancheCloseQty
                    : (activePosition.entryPrice - tpExitPrice) * trancheCloseQty;

                  const fee = tpExitPrice * trancheCloseQty * takerFeeRate;
                  const slip = Math.abs(tpExitPrice - tp.price) * trancheCloseQty;
                  const netPnl = pnl - fee;

                  cash += netPnl;
                  totalFeesPaid += fee;
                  totalSlippageCost += slip;
                  activePosition.totalFees += fee;
                  activePosition.totalSlippage += slip;
                  activePosition.accumulatedPnL += netPnl;
                  activePosition.remainingQty -= trancheCloseQty;

                  if (netPnl < 0) dailyLoss += Math.abs(netPnl);

                  // Move SL to Break-Even if TP1 hit
                  if (tp.target === 1 && !activePosition.isBeTriggered) {
                    activePosition.isBeTriggered = true;
                    // Shift to entry price + slight buffer to guarantee zero loss
                    activePosition.currentSl = isLong
                      ? activePosition.entryPrice * (1 + makerFeeRate * 2)
                      : activePosition.entryPrice * (1 - makerFeeRate * 2);
                  }

                  // If this TP exhausts remaining position
                  if (tp.target === 3 || activePosition.remainingQty <= 0.000001) {
                    closedReason = 'TP3';
                    exitPrice = tpExitPrice;
                    closedFraction = 1.0;
                    break;
                  }
                }
              }
            }
          }
        }

        // Trailing Stop logic
        if (!closedReason && enableTrailingSl && activePosition.isBeTriggered) {
          if (isLong) {
            const potentialSl = c.close - currATR * trailingSlAtrMultiplier;
            if (potentialSl > activePosition.currentSl) {
              activePosition.currentSl = potentialSl;
            }
          } else {
            const potentialSl = c.close + currATR * trailingSlAtrMultiplier;
            if (potentialSl < activePosition.currentSl) {
              activePosition.currentSl = potentialSl;
            }
          }
        }

        // Finalize trade closure if SL, BE, or final target hit
        if (closedReason && activePosition.remainingQty > 0) {
          const finalQty = activePosition.remainingQty;
          const nominalVal = finalQty * exitPrice;
          const rawPnl = isLong
            ? (exitPrice - activePosition.entryPrice) * finalQty
            : (activePosition.entryPrice - exitPrice) * finalQty;
          const exitFee = nominalVal * takerFeeRate;
          const exitSlip = Math.abs(exitPrice - activePosition.currentSl) * finalQty;
          const netPnl = rawPnl - exitFee;

          cash += netPnl;
          totalFeesPaid += exitFee;
          totalSlippageCost += exitSlip;
          activePosition.totalFees += exitFee;
          activePosition.totalSlippage += exitSlip;
          activePosition.accumulatedPnL += netPnl;
          activePosition.remainingQty = 0;
          if (netPnl < 0) dailyLoss += Math.abs(netPnl);
        }

        if (closedReason) {
          const totalTradePnL = activePosition.accumulatedPnL;
          const rMult = activePosition.initialSlDistance > 0 ? totalTradePnL / activePosition.initialSlDistance : 0;

          trades.push({
            id: `trade-${trades.length + 1}`,
            symbol: strategy.symbol,
            timeframe: strategy.timeframe,
            direction: activePosition.direction,
            entryTime: activePosition.entryTime,
            exitTime: c.time,
            entryPrice: activePosition.entryPrice,
            exitPrice,
            quantity: activePosition.totalQty,
            nominalValue: activePosition.nominalValue,
            marginUsed: activePosition.marginUsed,
            tranchesFilled: activePosition.tranchesFilled,
            feePaid: Math.round(activePosition.totalFees * 100) / 100,
            slippageCost: Math.round(activePosition.totalSlippage * 100) / 100,
            pnlAmount: Math.round(totalTradePnL * 100) / 100,
            pnlPct: activePosition.marginUsed > 0 ? Math.round(((totalTradePnL / activePosition.marginUsed) * 100) * 10) / 10 : 0,
            rMultiple: Number(rMult.toFixed(2)),
            exitReason: closedReason,
            mtfContext: activePosition.mtfContext,
          });

          activePosition = null;
        }
      }

      // 2. Signal Generation & Entry Execution (if not in position and daily loss within limit)
      if (!activePosition && dailyLoss < maxDailyLossUsdt) {
        // MTF Filter Check
        let mtfAllowsLong = true;
        let mtfAllowsShort = true;
        let mtfSnapshot: any = null;

        if (htfCandlesMap) {
          mtfSnapshot = MultiTimeframeAggregator.computeMTFSnapshot(strategy.symbol, c.time, htfCandlesMap);
          if (strategy.mtfReferenceConfig.useHigherTimeframeTrendFilter) {
            if (strategy.timeframe === '5m' || strategy.timeframe === '15m') {
              if (mtfSnapshot.tf4h?.trend === 'BEARISH') mtfAllowsLong = false;
              if (mtfSnapshot.tf4h?.trend === 'BULLISH') mtfAllowsShort = false;
            }
          }
        }

        // Technical Indicator Signals
        const isEmaBull = (emaFast[i] || 0) > (emaSlow[i] || 0);
        const isSupertrendBull = supertrend.trend[i] === 1;
        const isRsiOversold = (rsi[i] || 50) < (indConfig.rsiOversold || 35);
        const isRsiOverbought = (rsi[i] || 50) > (indConfig.rsiOverbought || 65);
        const isStochRsiBull = (stochRsi.k[i] || 0) > (stochRsi.d[i] || 0) && (stochRsi.k[i] || 0) < 40;
        const isStochRsiBear = (stochRsi.k[i] || 0) < (stochRsi.d[i] || 0) && (stochRsi.k[i] || 0) > 60;
        const hasVolume = (rvol[i] || 1) >= (indConfig.rvolThreshold || 1.1);

        let signal: TradeDirection | null = null;

        // Long signal logic
        if (
          mtfAllowsLong &&
          isSupertrendBull &&
          (isRsiOversold || isStochRsiBull) &&
          hasVolume &&
          c.close > (emaTrend[i] || 0) * 0.98
        ) {
          signal = 'LONG';
        }
        // Short signal logic
        else if (
          mtfAllowsShort &&
          !isSupertrendBull &&
          (isRsiOverbought || isStochRsiBear) &&
          hasVolume &&
          c.close < (emaTrend[i] || Infinity) * 1.02
        ) {
          signal = 'SHORT';
        }

        if (signal) {
          const isLong = signal === 'LONG';
          const executedEntryPrice = isLong ? c.close * (1 + slippageBps) : c.close * (1 - slippageBps);
          const slDistance = currATR * slAtrMultiplier;
          const stopLossPrice = isLong ? executedEntryPrice - slDistance : executedEntryPrice + slDistance;

          // Sizing: risk 1%~2% of equity
          const maxRiskAmount = cash * (riskPerTradePct / 100);
          let targetQty = slDistance > 0 ? maxRiskAmount / slDistance : 0;

          // Cap by 20x leverage
          const maxNominalAllowed = cash * leverage * 0.85; // 85% utilization safety margin
          if (targetQty * executedEntryPrice > maxNominalAllowed) {
            targetQty = maxNominalAllowed / executedEntryPrice;
          }

          if (targetQty > 0) {
            const nominal = targetQty * executedEntryPrice;
            const margin = nominal / leverage;
            const entryFee = nominal * takerFeeRate;
            const entrySlip = Math.abs(executedEntryPrice - c.close) * targetQty;

            cash -= entryFee;
            totalFeesPaid += entryFee;
            totalSlippageCost += entrySlip;

            // Generate 3 TP targets: 1.5R, 3.0R, 6.0R
            const tpTargets = (strategy.takeProfits || [
              { target: 1, rrMultiple: 1.5, closePct: 35, moveSlToBe: true },
              { target: 2, rrMultiple: 3.0, closePct: 35, trailSl: true },
              { target: 3, rrMultiple: 6.0, closePct: 30 },
            ]).map((t) => ({
              target: t.target,
              price: isLong ? executedEntryPrice + slDistance * t.rrMultiple : executedEntryPrice - slDistance * t.rrMultiple,
              closePct: t.closePct,
              hit: false,
            }));

            activePosition = {
              id: `pos-${i}`,
              symbol: strategy.symbol,
              direction: signal,
              entryTime: c.time,
              entryPrice: executedEntryPrice,
              totalQty: targetQty,
              remainingQty: targetQty,
              nominalValue: nominal,
              marginUsed: margin,
              currentSl: stopLossPrice,
              initialSlDistance: slDistance * targetQty,
              isBeTriggered: false,
              tpTargets,
              tranchesFilled: 1,
              totalFees: entryFee,
              totalSlippage: entrySlip,
              accumulatedPnL: 0,
              mtfContext: mtfSnapshot,
            };
          }
        }
      }

      // Mark equity curve point
      equity = cash;
      if (activePosition && activePosition.remainingQty > 0) {
        const unrealized =
          activePosition.direction === 'LONG'
            ? (c.close - activePosition.entryPrice) * activePosition.remainingQty
            : (activePosition.entryPrice - c.close) * activePosition.remainingQty;
        equity += unrealized;
      }

      if (equity > peakEquity) peakEquity = equity;
      const dd = peakEquity > 0 ? ((peakEquity - equity) / peakEquity) * 100 : 0;
      if (dd > maxDrawdownPct) maxDrawdownPct = dd;

      const benchmarkEquity = initialCapital * (c.close / initialBenchmarkPrice);

      equityCurve.push({
        time: c.time,
        equity: Math.round(equity * 100) / 100,
        drawdownPct: Math.round(dd * 100) / 100,
        benchmarkEquity: Math.round(benchmarkEquity * 100) / 100,
      });
    }

    // Performance Calculations
    const finalCapital = equity;
    const netProfitAmount = finalCapital - initialCapital;
    const netProfitPct = (netProfitAmount / initialCapital) * 100;

    const totalTrades = trades.length;
    const winningTrades = trades.filter((t) => t.pnlAmount > 0).length;
    const losingTrades = trades.filter((t) => t.pnlAmount <= 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    const grossProfit = trades.filter((t) => t.pnlAmount > 0).reduce((sum, t) => sum + t.pnlAmount, 0);
    const grossLoss = Math.abs(trades.filter((t) => t.pnlAmount < 0).reduce((sum, t) => sum + t.pnlAmount, 0));
    const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? 99 : 1) : grossProfit / grossLoss;

    // Sharpe Ratio
    const returns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const prev = equityCurve[i - 1].equity;
      const curr = equityCurve[i].equity;
      if (prev > 0) returns.push((curr - prev) / prev);
    }

    let sharpeRatio = 0;
    let sortinoRatio = 0;
    if (returns.length > 5) {
      const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
      const stdDev = Math.sqrt(variance);

      const downReturns = returns.filter((r) => r < 0);
      const downVariance = downReturns.length > 0
        ? downReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downReturns.length
        : 0.0001;
      const downDev = Math.sqrt(downVariance);

      // Annualize assuming 365 days
      const periodsPerYear = strategy.timeframe === '5m' ? 365 * 288 : strategy.timeframe === '15m' ? 365 * 96 : strategy.timeframe === '1h' ? 365 * 24 : 365 * 6;
      if (stdDev > 0) sharpeRatio = (meanReturn / stdDev) * Math.sqrt(periodsPerYear);
      if (downDev > 0) sortinoRatio = (meanReturn / downDev) * Math.sqrt(periodsPerYear);
    }

    const calmarRatio = maxDrawdownPct > 0 ? netProfitPct / maxDrawdownPct : 0;

    return {
      runId: `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      symbol: strategy.symbol,
      timeframe: strategy.timeframe,
      startTime: candles[0].time,
      endTime: candles[len - 1].time,
      initialCapital,
      finalCapital: Math.round(finalCapital * 100) / 100,
      netProfitAmount: Math.round(netProfitAmount * 100) / 100,
      netProfitPct: Math.round(netProfitPct * 100) / 100,
      winRate: Math.round(winRate * 10) / 10,
      profitFactor: Math.round(profitFactor * 100) / 100,
      maxDrawdownPct: Math.round(maxDrawdownPct * 100) / 100,
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
      sortinoRatio: Math.round(sortinoRatio * 100) / 100,
      calmarRatio: Math.round(calmarRatio * 100) / 100,
      totalTrades,
      winningTrades,
      losingTrades,
      totalFeesPaid: Math.round(totalFeesPaid * 100) / 100,
      totalSlippageCost: Math.round(totalSlippageCost * 100) / 100,
      trades,
      equityCurve,
      isInSample,
      configSnapshot: strategy,
    };
  }
}
