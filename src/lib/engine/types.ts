export type Timeframe = '4h' | '1h' | '15m' | '5m';

export interface Candle {
  time: number; // Unix timestamp in ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type TradeDirection = 'LONG' | 'SHORT';
export type ExitReason = 'TP1' | 'TP2' | 'TP3' | 'SL' | 'TRAILING_SL' | 'BE' | 'MAX_TIME' | 'SIGNAL_REVERSAL';

export interface TrancheConfig {
  index: number;
  name: string;
  pct: number; // e.g. 15, 30, 40, 15
  trigger: 'IMMEDIATE' | 'PULLBACK' | 'CONFIRMATION' | 'BREAKOUT';
}

export interface TakeProfitTarget {
  target: number; // 1, 2, 3
  rrMultiple: number; // e.g. 1.5, 3.0, 6.0
  closePct: number; // e.g. 35, 35, 30
  moveSlToBe?: boolean;
  trailSl?: boolean;
}

export interface IndicatorsConfig {
  // Trend
  emaFast?: number;
  emaSlow?: number;
  emaTrend?: number; // e.g. 200
  macdFast?: number;
  macdSlow?: number;
  macdSignal?: number;
  supertrendPeriod?: number;
  supertrendMultiplier?: number;
  adxPeriod?: number;
  adxThreshold?: number;

  // Momentum
  rsiPeriod?: number;
  rsiOversold?: number;
  rsiOverbought?: number;
  stochK?: number;
  stochD?: number;
  stochSmooth?: number;
  stochRsiPeriod?: number;
  williamsPeriod?: number;
  cciPeriod?: number;
  mfiPeriod?: number;

  // Volatility
  atrPeriod?: number;
  bbPeriod?: number;
  bbStdDev?: number;
  keltnerPeriod?: number;
  keltnerMultiplier?: number;
  donchianPeriod?: number;

  // Volume
  rvolPeriod?: number;
  rvolThreshold?: number;
  cmfPeriod?: number;
}

export interface MTFReferenceConfig {
  useHigherTimeframeTrendFilter: boolean; // e.g. 5m reads 4h or 1h trend
  higherTimeframe: Timeframe;
  requireTrendAlignment: boolean; // e.g. long only if HTF trend is bullish
  volatilityRegimeScaling: boolean; // adjust position size or SL based on HTF ATR
  keyLevelAvoidance: boolean; // avoid buying into HTF resistance
}

export interface RiskConfig {
  initialCapital: number; // default 10,000 USDT
  leverage: number; // default 20x
  riskPerTradePct: number; // default 1%~2%
  maxDailyLossUsdt: number; // circuit breaker e.g. 80 USDT
  makerFeeRate: number; // default 0.0002 (0.02%)
  takerFeeRate: number; // default 0.0005 (0.05%)
  slippageBps: number; // default 3 bps = 0.0003
  slAtrMultiplier: number; // default 1.5 ~ 2.5
  enableTrailingSl: boolean;
  trailingSlAtrMultiplier: number;
}

export interface StrategyModel {
  id?: string;
  timeframe: Timeframe;
  name: string;
  symbol: string;
  description?: string;
  indicatorsConfig: IndicatorsConfig;
  mtfReferenceConfig: MTFReferenceConfig;
  riskConfig: RiskConfig;
  tranches: TrancheConfig[];
  takeProfits: TakeProfitTarget[];
  isActive?: boolean;
}

export interface TradeRecord {
  id: string;
  symbol: string;
  timeframe: Timeframe;
  direction: TradeDirection;
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  nominalValue: number;
  marginUsed: number;
  tranchesFilled: number;
  feePaid: number;
  slippageCost: number;
  pnlAmount: number;
  pnlPct: number;
  rMultiple: number;
  exitReason: ExitReason;
  mtfContext?: {
    htfTrend?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    htfAtr?: number;
    confluenceScore?: number;
  };
}

export interface EquityPoint {
  time: number;
  equity: number;
  drawdownPct: number;
  benchmarkEquity: number;
}

export interface BacktestResult {
  runId: string;
  symbol: string;
  timeframe: Timeframe;
  startTime: number;
  endTime: number;
  initialCapital: number;
  finalCapital: number;
  netProfitAmount: number;
  netProfitPct: number;
  winRate: number;
  profitFactor: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalFeesPaid: number;
  totalSlippageCost: number;
  trades: TradeRecord[];
  equityCurve: EquityPoint[];
  isInSample?: boolean;
  outOfSampleScore?: number;
  configSnapshot: StrategyModel;
}

export interface MTFSnapshot {
  time: number;
  symbol: string;
  tf4h?: { trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; atr: number; rsi: number; supertrendBull: boolean };
  tf1h?: { trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; atr: number; rsi: number; macdHist: number };
  tf15m?: { trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; vwap: number; rsi: number; bbWidth: number };
  tf5m?: { trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; stochRsiK: number; rvol: number };
  overallConfluenceScore: number; // 0 to 100
}

export interface StrategyContribution {
  timeframe: Timeframe;
  name: string;
  symbol: string;
  tradesCount: number;
  winRate: number;
  netProfitAmount: number;
  netProfitPct: number;
  profitContributionPct: number;
  maxDrawdownPct: number;
  profitFactor: number;
  sharpeRatio: number;
}

export interface PortfolioBacktestResult {
  runId: string;
  symbol: string;
  timeframes: Timeframe[];
  startTime: number;
  endTime: number;
  initialCapital: number;
  finalCapital: number;
  netProfitAmount: number;
  netProfitPct: number;
  winRate: number;
  profitFactor: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalFeesPaid: number;
  totalSlippageCost: number;
  trades: TradeRecord[];
  equityCurve: EquityPoint[];
  strategyContributions: StrategyContribution[];
  individualResults: Record<string, BacktestResult>;
}
