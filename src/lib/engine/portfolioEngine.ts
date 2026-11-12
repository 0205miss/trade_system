import {
  Candle,
  StrategyModel,
  BacktestResult,
  TradeRecord,
  EquityPoint,
  Timeframe,
  PortfolioBacktestResult,
  StrategyContribution,
  SymbolContribution,
} from './types';
import { BacktestEngine } from './backtester';
import { TimeframeCandleMap } from './mtf';

export class PortfolioEngine {
  /**
   * Run multi-symbol and/or multi-strategy concurrent backtest
   */
  static runMultiSymbol(
    symbols: string[],
    strategies: StrategyModel[],
    candlesBySymbolAndTf: Record<string, Record<Timeframe, Candle[]>>,
    htfCandlesBySymbol?: Record<string, TimeframeCandleMap>,
    initialCapital: number = 10000
  ): PortfolioBacktestResult {
    const individualResults: Record<string, BacktestResult> = {};
    const allTrades: TradeRecord[] = [];

    // 1. Run backtest for each strategy
    for (const strat of strategies) {
      const symCandles = candlesBySymbolAndTf[strat.symbol];
      const candles = symCandles ? symCandles[strat.timeframe] : undefined;
      if (!candles || candles.length < 50) continue;

      const htfMap = htfCandlesBySymbol ? htfCandlesBySymbol[strat.symbol] : undefined;
      const res = BacktestEngine.run(candles, strat, htfMap, false);
      const key = `${strat.symbol}_${strat.timeframe}`;
      individualResults[key] = res;
      // Also index by timeframe for single-symbol backwards compatibility
      if (symbols.length === 1) {
        individualResults[strat.timeframe] = res;
      }

      // Tag trades and collect
      for (const t of res.trades) {
        allTrades.push({
          ...t,
          timeframe: strat.timeframe,
          symbol: strat.symbol,
        });
      }
    }

    // 2. Sort all trades chronologically by entryTime
    allTrades.sort((a, b) => a.entryTime - b.entryTime);

    // 3. Build unified portfolio equity curve
    // Base timeline on primary symbol's 1h/15m/4h/5m candles
    const primarySym = symbols[0] || 'BTC-USDT';
    const primaryCandlesMap = candlesBySymbolAndTf[primarySym] || {};
    const baseCandles =
      primaryCandlesMap['1h'] ||
      primaryCandlesMap['15m'] ||
      primaryCandlesMap['4h'] ||
      primaryCandlesMap['5m'] ||
      [];

    // Fast price lookup across symbols at time t for mark-to-market
    const symbolTimelineMap: Record<string, { times: number[]; closes: number[] }> = {};
    for (const sym of symbols) {
      const symMap = candlesBySymbolAndTf[sym];
      if (symMap) {
        const cList = symMap['1h'] || symMap['15m'] || symMap['4h'] || symMap['5m'] || [];
        symbolTimelineMap[sym] = {
          times: cList.map((c) => c.time),
          closes: cList.map((c) => c.close),
        };
      }
    }

    const getSymbolPriceAtTime = (sym: string, time: number): number | null => {
      const timeline = symbolTimelineMap[sym];
      if (!timeline || timeline.times.length === 0) return null;
      let low = 0;
      let high = timeline.times.length - 1;
      let idx = -1;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (timeline.times[mid] <= time) {
          idx = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
      return idx >= 0 ? timeline.closes[idx] : timeline.closes[0];
    };

    const equityCurve: EquityPoint[] = [];
    let peakEquity = initialCapital;
    let maxDrawdownPct = 0;

    const initialBenchmarkPrice = baseCandles.length > 0 ? baseCandles[0].close : 1;

    for (let i = 0; i < baseCandles.length; i++) {
      const c = baseCandles[i];
      const t = c.time;

      // Realized PnL from trades that exited at or before time t
      let realizedPnL = 0;
      for (const trade of allTrades) {
        if (trade.exitTime <= t) {
          realizedPnL += trade.pnlAmount;
        }
      }

      // Mark-to-market unrealized PnL of open trades at time t
      let unrealizedPnL = 0;
      for (const trade of allTrades) {
        if (trade.entryTime <= t && trade.exitTime > t) {
          const isLong = trade.direction === 'LONG';
          const symPrice = getSymbolPriceAtTime(trade.symbol || primarySym, t) ?? trade.entryPrice;
          const pnl = isLong
            ? (symPrice - trade.entryPrice) * trade.quantity
            : (trade.entryPrice - symPrice) * trade.quantity;
          unrealizedPnL += pnl;
        }
      }

      const currentEquity = initialCapital + realizedPnL + unrealizedPnL;
      if (currentEquity > peakEquity) peakEquity = currentEquity;

      const dd = peakEquity > 0 ? ((peakEquity - currentEquity) / peakEquity) * 100 : 0;
      if (dd > maxDrawdownPct) maxDrawdownPct = dd;

      const benchmarkEquity = initialCapital * (c.close / initialBenchmarkPrice);

      equityCurve.push({
        time: t,
        equity: Math.round(currentEquity * 100) / 100,
        drawdownPct: Math.round(dd * 100) / 100,
        benchmarkEquity: Math.round(benchmarkEquity * 100) / 100,
      });
    }

    // 4. Portfolio Performance Metrics
    const sumIndividualNetProfit = Object.values(individualResults).reduce(
      (sum, res) => sum + res.netProfitAmount,
      0
    );
    const sumTotalTrades = Object.values(individualResults).reduce(
      (sum, res) => sum + res.totalTrades,
      0
    );
    const sumWinningTrades = Object.values(individualResults).reduce(
      (sum, res) => sum + res.winningTrades,
      0
    );
    const sumLosingTrades = Object.values(individualResults).reduce(
      (sum, res) => sum + res.losingTrades,
      0
    );

    const netProfitAmount = Math.round(sumIndividualNetProfit * 100) / 100;
    const netProfitPct = Math.round(((netProfitAmount / initialCapital) * 100) * 100) / 100;
    const finalCapital = Math.round((initialCapital + netProfitAmount) * 100) / 100;

    const totalTrades = sumTotalTrades;
    const winningTrades = sumWinningTrades;
    const losingTrades = sumLosingTrades;
    const winRate = totalTrades > 0 ? Math.round((winningTrades / totalTrades) * 1000) / 10 : 0;

    const grossProfit = allTrades.filter((t) => t.pnlAmount > 0).reduce((sum, t) => sum + t.pnlAmount, 0);
    const grossLoss = Math.abs(allTrades.filter((t) => t.pnlAmount < 0).reduce((sum, t) => sum + t.pnlAmount, 0));
    const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? 99 : 1) : Math.round((grossProfit / grossLoss) * 100) / 100;

    const totalFeesPaid = Math.round(allTrades.reduce((sum, t) => sum + t.feePaid, 0) * 100) / 100;
    const totalSlippageCost = Math.round(allTrades.reduce((sum, t) => sum + t.slippageCost, 0) * 100) / 100;

    // Sharpe & Sortino
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
      const downVariance =
        downReturns.length > 0 ? downReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downReturns.length : 0.0001;
      const downDev = Math.sqrt(downVariance);

      const periodsPerYear = 365 * 24;
      if (stdDev > 0) sharpeRatio = Math.round((meanReturn / stdDev) * Math.sqrt(periodsPerYear) * 100) / 100;
      if (downDev > 0) sortinoRatio = Math.round((meanReturn / downDev) * Math.sqrt(periodsPerYear) * 100) / 100;
    }

    const calmarRatio = maxDrawdownPct > 0 ? Math.round((netProfitPct / maxDrawdownPct) * 100) / 100 : 0;

    // 5. Per-Symbol Breakdown
    const symbolContributions: SymbolContribution[] = symbols.map((sym) => {
      const symStrats = strategies.filter((s) => s.symbol === sym);
      const symTrades = allTrades.filter((t) => t.symbol === sym);
      const symNetProfit = symStrats.reduce((sum, s) => {
        const res = individualResults[`${s.symbol}_${s.timeframe}`] || individualResults[s.timeframe];
        return sum + (res ? res.netProfitAmount : 0);
      }, 0);
      const symTradesCount = symStrats.reduce((sum, s) => {
        const res = individualResults[`${s.symbol}_${s.timeframe}`] || individualResults[s.timeframe];
        return sum + (res ? res.totalTrades : 0);
      }, 0);
      const symWins = symStrats.reduce((sum, s) => {
        const res = individualResults[`${s.symbol}_${s.timeframe}`] || individualResults[s.timeframe];
        return sum + (res ? res.winningTrades : 0);
      }, 0);
      const symWinRate = symTradesCount > 0 ? Math.round((symWins / symTradesCount) * 1000) / 10 : 0;
      const symNetPct = Math.round(((symNetProfit / initialCapital) * 100) * 100) / 100;
      const profitContrib = netProfitAmount > 0 ? Math.round((symNetProfit / netProfitAmount) * 1000) / 10 : 0;

      const symMaxDd = symStrats.reduce((max, s) => {
        const res = individualResults[`${s.symbol}_${s.timeframe}`] || individualResults[s.timeframe];
        return Math.max(max, res ? res.maxDrawdownPct : 0);
      }, 0);

      const grossWin = symTrades.filter((t) => t.pnlAmount > 0).reduce((sum, t) => sum + t.pnlAmount, 0);
      const grossLoss = Math.abs(symTrades.filter((t) => t.pnlAmount < 0).reduce((sum, t) => sum + t.pnlAmount, 0));
      const symPf = grossLoss === 0 ? (grossWin > 0 ? 99 : 1) : Math.round((grossWin / grossLoss) * 100) / 100;

      return {
        symbol: sym,
        tradesCount: symTradesCount,
        winRate: symWinRate,
        netProfitAmount: Math.round(symNetProfit * 100) / 100,
        netProfitPct: symNetPct,
        profitContributionPct: profitContrib,
        maxDrawdownPct: symMaxDd,
        profitFactor: symPf,
      };
    });

    // 6. Per-Strategy Contributions & Breakdown
    const strategyContributions: StrategyContribution[] = strategies.map((strat) => {
      const key = `${strat.symbol}_${strat.timeframe}`;
      const stratRes = individualResults[key] || individualResults[strat.timeframe];
      const stratTrades = allTrades.filter((t) => t.symbol === strat.symbol && t.timeframe === strat.timeframe);

      const netProfit = stratRes ? stratRes.netProfitAmount : 0;
      const netPct = stratRes ? stratRes.netProfitPct : 0;
      const stratWinRate = stratRes ? stratRes.winRate : 0;
      const tradesCount = stratRes ? stratRes.totalTrades : stratTrades.length;
      const stratMaxDrawdown = stratRes ? stratRes.maxDrawdownPct : 0;
      const stratPf = stratRes ? stratRes.profitFactor : 1;
      const stratSharpe = stratRes ? stratRes.sharpeRatio : 0;

      const contributionPct =
        netProfitAmount > 0 ? Math.round((netProfit / netProfitAmount) * 1000) / 10 : 0;

      return {
        timeframe: strat.timeframe,
        name: strat.name,
        symbol: strat.symbol,
        tradesCount,
        winRate: stratWinRate,
        netProfitAmount: netProfit,
        netProfitPct: netPct,
        profitContributionPct: contributionPct,
        maxDrawdownPct: stratMaxDrawdown,
        profitFactor: stratPf,
        sharpeRatio: stratSharpe,
      };
    });

    const isAllSymbols = symbols.length > 1;

    return {
      runId: `portfolio-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      symbol: isAllSymbols ? 'ALL' : symbols[0],
      symbols,
      timeframes: Array.from(new Set(strategies.map((s) => s.timeframe))),
      startTime: baseCandles.length > 0 ? baseCandles[0].time : 0,
      endTime: baseCandles.length > 0 ? baseCandles[baseCandles.length - 1].time : 0,
      initialCapital,
      finalCapital,
      netProfitAmount,
      netProfitPct,
      winRate,
      profitFactor,
      maxDrawdownPct: Math.round(maxDrawdownPct * 100) / 100,
      sharpeRatio,
      sortinoRatio,
      calmarRatio,
      totalTrades,
      winningTrades,
      losingTrades,
      totalFeesPaid,
      totalSlippageCost,
      trades: allTrades,
      equityCurve,
      strategyContributions,
      symbolContributions,
      individualResults,
    };
  }

  /**
   * Run single-symbol multi-strategy backtest (legacy convenience wrapper)
   */
  static run(
    symbol: string,
    strategies: StrategyModel[],
    candlesByTimeframe: Record<Timeframe, Candle[]>,
    htfCandlesMap?: TimeframeCandleMap,
    initialCapital: number = 10000
  ): PortfolioBacktestResult {
    return this.runMultiSymbol(
      [symbol],
      strategies,
      { [symbol]: candlesByTimeframe },
      htfCandlesMap ? { [symbol]: htfCandlesMap } : undefined,
      initialCapital
    );
  }
}
