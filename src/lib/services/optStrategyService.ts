import { supabase } from '../supabase/client';
import { StrategyModel, Timeframe } from '../engine/types';

export class OptStrategyService {
  /**
   * Return default baseline strategy for a timeframe if none exists in database
   */
  static getDefaultBaseline(timeframe: Timeframe, symbol = 'BTC-USDT'): StrategyModel {
    return {
      timeframe,
      symbol,
      name: `${symbol} ${timeframe.toUpperCase()} Mathematical Optimizer`,
      description: `自動化多指標客觀優化模型，支援 MTF 跨週期共振與 15/30/40/15 分批風控`,
      indicatorsConfig: {
        emaFast: timeframe === '5m' ? 9 : 20,
        emaSlow: timeframe === '5m' ? 21 : 50,
        emaTrend: 200,
        rsiPeriod: 14,
        rsiOversold: 32,
        rsiOverbought: 68,
        atrPeriod: 14,
        supertrendPeriod: 10,
        supertrendMultiplier: timeframe === '5m' ? 2.0 : 3.0,
        bbPeriod: 20,
        bbStdDev: 2.0,
        rvolPeriod: 20,
        rvolThreshold: 1.15,
      },
      mtfReferenceConfig: {
        useHigherTimeframeTrendFilter: timeframe === '5m' || timeframe === '15m' || timeframe === '1h',
        higherTimeframe: timeframe === '5m' ? '15m' : timeframe === '15m' ? '1h' : '4h',
        requireTrendAlignment: true,
        volatilityRegimeScaling: true,
        keyLevelAvoidance: true,
      },
      riskConfig: {
        initialCapital: 10000,
        leverage: 20,
        riskPerTradePct: 1.5,
        maxDailyLossUsdt: 80,
        makerFeeRate: 0.0002, // 0.02%
        takerFeeRate: 0.0005, // 0.05%
        slippageBps: 0.0003, // 3 bps
        slAtrMultiplier: timeframe === '5m' ? 1.5 : timeframe === '15m' ? 1.8 : 2.2,
        enableTrailingSl: true,
        trailingSlAtrMultiplier: 2.0,
      },
      tranches: [
        { index: 1, name: '試單 (Scout)', pct: 15, trigger: 'IMMEDIATE' },
        { index: 2, name: '更優價加倉 (Scale-in)', pct: 30, trigger: 'PULLBACK' },
        { index: 3, name: '結構確認主倉 (Confirmed)', pct: 40, trigger: 'CONFIRMATION' },
        { index: 4, name: '尾倉順勢 (Runner)', pct: 15, trigger: 'BREAKOUT' },
      ],
      takeProfits: [
        { target: 1, rrMultiple: 1.5, closePct: 35, moveSlToBe: true },
        { target: 2, rrMultiple: 3.0, closePct: 35, trailSl: true },
        { target: 3, rrMultiple: 6.0, closePct: 30 },
      ],
      isActive: true,
    };
  }

  static async getStrategies(timeframe?: Timeframe): Promise<StrategyModel[]> {
    let query = supabase.from('opt_strategies').select('*').order('created_at', { ascending: false });
    if (timeframe) query = query.eq('timeframe', timeframe);

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      if (timeframe) return [this.getDefaultBaseline(timeframe)];
      return [
        this.getDefaultBaseline('4h'),
        this.getDefaultBaseline('1h'),
        this.getDefaultBaseline('15m'),
        this.getDefaultBaseline('5m'),
      ];
    }

    return data.map((r: any) => ({
      id: r.id,
      timeframe: r.timeframe,
      name: r.name,
      symbol: r.symbol,
      description: r.description,
      indicatorsConfig: r.indicators_config,
      mtfReferenceConfig: r.mtf_reference_config,
      riskConfig: r.risk_config,
      tranches: r.tranche_config,
      takeProfits: r.tp_sl_config,
      isActive: r.is_active,
    }));
  }

  static async saveStrategy(strategy: StrategyModel): Promise<string> {
    const payload = {
      timeframe: strategy.timeframe,
      name: strategy.name,
      symbol: strategy.symbol,
      description: strategy.description,
      indicators_config: strategy.indicatorsConfig,
      mtf_reference_config: strategy.mtfReferenceConfig,
      risk_config: strategy.riskConfig,
      tranche_config: strategy.tranches,
      tp_sl_config: strategy.takeProfits,
      is_active: strategy.isActive ?? false,
    };

    if (strategy.id) {
      const { data, error } = await supabase
        .from('opt_strategies')
        .update(payload)
        .eq('id', strategy.id)
        .select('id')
        .single();
      if (error) throw error;
      return data.id;
    } else {
      const { data, error } = await supabase.from('opt_strategies').insert(payload).select('id').single();
      if (error) throw error;
      return data.id;
    }
  }

  static async setActive(id: string, timeframe: Timeframe): Promise<void> {
    // Set all other strategies of this timeframe to inactive
    await supabase.from('opt_strategies').update({ is_active: false }).eq('timeframe', timeframe);
    await supabase.from('opt_strategies').update({ is_active: true }).eq('id', id);
  }
}
