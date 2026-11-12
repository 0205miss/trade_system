import {
  Candle,
  StrategyModel,
  BacktestResult,
  TradeRecord,
  EquityPoint,
  Timeframe,
  PortfolioBacktestResult,
  StrategyContribution,
} from './types';
import { BacktestEngine } from './backtester';
import { TimeframeCandleMap } from './mtf';

export class PortfolioEngine {
  /**
   * Run multi-strategy concurrent backtest
   */
  static run(
    symbol: string,
    strategies: StrategyModel[],
    candlesByTimeframe: Record<Timeframe, Candle[]>,
    htfCandlesMap?: TimeframeCandleMap,
    initialCapital: number = 10000
  ): PortfolioBacktestResult {
    const individualResults: Record<string, BacktestResult> = {};
    const allTrades: TradeRecord[] = [];

    // 1. Run backtest for each strategy
    for (const strat of strategies) {
      const candles = candlesByTimeframe[strat.timeframe];
      if (!candles || candles.length < 50) continue;

      const res = BacktestEngine.run(candles, strat, htfCandlesMap, false);
      individualResults[strat.timeframe] = res;

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
    // Use 1h or 15m candles as time base, falling back to any available timeframe
    const baseCandles =
      candlesByTimeframe['1h'] ||
      candlesByTimeframe['15m'] ||
      candlesByTimeframe['4h'] ||
      candlesByTimeframe['5m'] ||
      [];

    const equityCurve: EquityPoint[] = [];
    let cash = initialCapital;
    let peakEquity = initialCapital;
    let maxDrawdownPct = 0;

    const initialBenchmarkPrice = baseCandles.length > 0 ? baseCandles[0].close : 1;

    // Simulate equity curve step by step
    for (let i = 0; i < baseCandles.length; i++) {
      const c = baseCandles[i];
      const t = c.time;

      // Realized PnL from trades that exited at or before time t
      // To ensure no double counting, sum PnL of trades closed <= t
      let realizedPnL = 0;
      let totalFees = 0;
      let totalSlippage = 0;

      for (const trade of allTrades) {
        if (trade.exitTime <= t) {
          realizedPnL += trade.pnlAmount;
          totalFees += trade.feePaid;
          totalSlippage += trade.slippageCost;
        }
      }

      // Mark-to-market unrealized PnL of open trades at time t
      let unrealizedPnL = 0;
      for (const trade of allTrades) {
        if (trade.entryTime <= t && trade.exitTime > t) {
          // Find price for this trade's symbol at time t (approximate with close)
          const isLong = trade.direction === 'LONG';
          const pnl = isLong
            ? (c.close - trade.entryPrice) * trade.quantity
            : (trade.entryPrice - c.close) * trade.quantity;
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
    const finalCapital = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].equity : initialCapital;
    const netProfitAmount = finalCapital - initialCapital;
    const netProfitPct = (netProfitAmount / initialCapital) * 100;

    const totalTrades = allTrades.length;
    const winningTrades = allTrades.filter((t) => t.pnlAmount > 0).length;
    const losingTrades = allTrades.filter((t) => t.pnlAmount <= 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    const grossProfit = allTrades.filter((t) => t.pnlAmount > 0).reduce((sum, t) => sum + t.pnlAmount, 0);
    const grossLoss = Math.abs(allTrades.filter((t) => t.pnlAmount < 0).reduce((sum, t) => sum + t.pnlAmount, 0));
    const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? 99 : 1) : grossProfit / grossLoss;

    const totalFeesPaid = allTrades.reduce((sum, t) => sum + t.feePaid, 0);
    const totalSlippageCost = allTrades.reduce((sum, t) => sum + t.slippageCost, 0);

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

      const periodsPerYear = 365 * 24; // 1h base
      if (stdDev > 0) sharpeRatio = (meanReturn / stdDev) * Math.sqrt(periodsPerYear);
      if (downDev > 0) sortinoRatio = (meanReturn / downDev) * Math.sqrt(periodsPerYear);
    }

    const calmarRatio = maxDrawdownPct > 0 ? netProfitPct / maxDrawdownPct : 0;

    // 5. Per-Strategy Contributions & Breakdown
    const strategyContributions: StrategyContribution[] = strategies.map((strat) => {
      const stratRes = individualResults[strat.timeframe];
      const stratTrades = allTrades.filter((t) => t.timeframe === strat.timeframe);
      const stratProfit = stratTrades.reduce((sum, t) => sum + t.pnlAmount, 0);
      const stratWins = stratTrades.filter((t) => t.pnlAmount > 0).length;
      const stratGrossWin = stratTrades.filter((t) => t.pnlAmount > 0).reduce((sum, t) => sum + t.pnlAmount, 0);
      const stratGrossLoss = Math.abs(stratTrades.filter((t) => t.pnlAmount < 0).reduce((sum, t) => sum + t.pnlAmount, 0));

      const contributionPct =
        netProfitAmount > 0 ? Math.round((stratProfit / netProfitAmount) * 1000) / 10 : 0;

      return {
        timeframe: strat.timeframe,
        name: strat.name,
        symbol: strat.symbol,
        tradesCount: stratTrades.length,
        winRate: stratTrades.length > 0 ? Math.round((stratWins / stratTrades.length) * 1000) / 10 : 0,
        netProfitAmount: Math.round(stratProfit * 100) / 100,
        netProfitPct: Math.round(((stratProfit / initialCapital) * 100) * 100) / 100,
        profitContributionPct: contributionPct,
        maxDrawdownPct: stratRes ? stratRes.maxDrawdownPct : 0,
        profitFactor: stratGrossLoss === 0 ? (stratGrossWin > 0 ? 99 : 1) : Math.round((stratGrossWin / stratGrossLoss) * 100) / 100,
        sharpeRatio: stratRes ? stratRes.sharpeRatio : 0,
      };
    });

    return {
      runId: `portfolio-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      symbol,
      timeframes: strategies.map((s) => s.timeframe),
      startTime: baseCandles.length > 0 ? baseCandles[0].time : 0,
      endTime: baseCandles.length > 0 ? baseCandles[baseCandles.length - 1].time : 0,
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
      trades: allTrades,
      equityCurve,
      strategyContributions,
      individualResults,
    };
  }
}
