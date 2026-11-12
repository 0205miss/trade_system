import { supabase } from '../supabase/client';
import { BacktestResult } from '../engine/types';

export class OptBacktestService {
  static async saveRun(res: BacktestResult, strategyId?: string): Promise<string> {
    const runPayload = {
      strategy_id: strategyId || null,
      symbol: res.symbol,
      timeframe: res.timeframe,
      start_time: new Date(res.startTime).toISOString(),
      end_time: new Date(res.endTime).toISOString(),
      initial_capital: res.initialCapital,
      final_capital: res.finalCapital,
      net_profit_pct: res.netProfitPct,
      win_rate: res.winRate,
      profit_factor: res.profitFactor,
      max_drawdown_pct: res.maxDrawdownPct,
      sharpe_ratio: res.sharpeRatio,
      sortino_ratio: res.sortinoRatio,
      calmar_ratio: res.calmarRatio,
      total_trades: res.totalTrades,
      total_fees_paid: res.totalFeesPaid,
      total_slippage_cost: res.totalSlippageCost,
      is_in_sample: res.isInSample || false,
      out_of_sample_score: res.outOfSampleScore || null,
      config_snapshot: res.configSnapshot,
    };

    const { data: runData, error: runError } = await supabase
      .from('opt_backtest_runs')
      .insert(runPayload)
      .select('id')
      .single();

    if (runError) throw runError;
    const runId = runData.id;

    // Save individual trades (up to 100 most recent for detailed audit)
    if (res.trades && res.trades.length > 0) {
      const tradeRows = res.trades.slice(-100).map((t) => ({
        run_id: runId,
        symbol: t.symbol,
        timeframe: t.timeframe,
        direction: t.direction,
        entry_time: new Date(t.entryTime).toISOString(),
        exit_time: new Date(t.exitTime).toISOString(),
        entry_price: t.entryPrice,
        exit_price: t.exitPrice,
        quantity: t.quantity,
        tranches_filled: t.tranchesFilled,
        fee_paid: t.feePaid,
        slippage_cost: t.slippageCost,
        pnl_amount: t.pnlAmount,
        pnl_pct: t.pnlPct,
        exit_reason: t.exitReason,
        mtf_context: t.mtfContext || null,
        trade_log: {
          nominalValue: t.nominalValue,
          marginUsed: t.marginUsed,
          rMultiple: t.rMultiple,
        },
      }));

      await supabase.from('opt_backtest_trades').insert(tradeRows);
    }

    return runId;
  }

  static async getRecentRuns(limit = 20): Promise<any[]> {
    const { data, error } = await supabase
      .from('opt_backtest_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn(`Failed to fetch recent runs: ${error.message}`);
      return [];
    }
    return data || [];
  }
}
