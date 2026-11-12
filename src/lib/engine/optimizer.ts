import { Candle, StrategyModel, BacktestResult, Timeframe } from './types';
import { BacktestEngine } from './backtester';
import { TimeframeCandleMap } from './mtf';

export interface OptimizationCandidate {
  strategy: StrategyModel;
  inSampleResult: BacktestResult;
  outOfSampleResult: BacktestResult;
  fitnessScore: number;
  robustnessRatio: number; // Out-of-sample / In-sample Sharpe ratio
}

export class StrategyOptimizer {
  /**
   * Calculate multi-objective mathematical fitness score
   */
  static calculateFitness(res: BacktestResult): number {
    if (res.totalTrades < 5) return -100; // Penalize statistically insignificant sample

    const tradePenalty = Math.min(1.0, res.totalTrades / 20); // Scale up to 1.0 when trades >= 20
    const sharpeComp = Math.max(0, res.sharpeRatio) * 0.35;
    const sortinoComp = Math.max(0, res.sortinoRatio) * 0.25;
    const profitFactorComp = Math.min(5, res.profitFactor) * 0.2;
    const winRateComp = (res.winRate / 100) * 0.2;
    const ddPenalty = (res.maxDrawdownPct / 100) * 0.5;

    return (sharpeComp + sortinoComp + profitFactorComp + winRateComp) * tradePenalty - ddPenalty;
  }

  /**
   * Run Walk-Forward Genetic Optimization on Candle Series
   */
  static optimize(
    candles: Candle[],
    baseStrategy: StrategyModel,
    htfCandlesMap?: TimeframeCandleMap,
    options: {
      inSampleRatio?: number; // default 0.7 (70% training, 30% testing)
      populationSize?: number; // default 16
      generations?: number; // default 3
    } = {}
  ): {
    bestCandidate: OptimizationCandidate;
    topCandidates: OptimizationCandidate[];
    inSampleCandlesCount: number;
    outOfSampleCandlesCount: number;
  } {
    const { inSampleRatio = 0.7, populationSize = 16, generations = 3 } = options;
    const splitIndex = Math.floor(candles.length * inSampleRatio);

    const inSampleCandles = candles.slice(0, splitIndex);
    const outOfSampleCandles = candles.slice(splitIndex);

    if (inSampleCandles.length < 50 || outOfSampleCandles.length < 30) {
      throw new Error(
        `Insufficient candle data for walk-forward optimization. Total: ${candles.length}, split at ${splitIndex}.`
      );
    }

    // Generate initial randomized parameter population around baseStrategy
    let population: StrategyModel[] = this.generatePopulation(baseStrategy, populationSize);

    for (let gen = 0; gen < generations; gen++) {
      const evaluated = population.map((strat) => {
        try {
          const res = BacktestEngine.run(inSampleCandles, strat, htfCandlesMap, true);
          const score = this.calculateFitness(res);
          return { strat, res, score };
        } catch {
          return { strat, res: null as any, score: -999 };
        }
      });

      // Sort by score descending
      evaluated.sort((a, b) => b.score - a.score);

      // Elitism: keep top 25%
      const eliteCount = Math.max(2, Math.floor(populationSize * 0.25));
      const elites = evaluated.slice(0, eliteCount).map((e) => e.strat);

      // Reproduce & mutate to fill next generation
      const nextGen: StrategyModel[] = [...elites];
      while (nextGen.length < populationSize) {
        const parent1 = elites[Math.floor(Math.random() * elites.length)];
        const parent2 = elites[Math.floor(Math.random() * elites.length)];
        const child = this.crossover(parent1, parent2);
        const mutated = this.mutate(child, baseStrategy.timeframe);
        nextGen.push(mutated);
      }
      population = nextGen;
    }

    // Final evaluation on both In-Sample and Out-of-Sample
    const candidateResults: OptimizationCandidate[] = [];

    for (const strat of population) {
      try {
        const inSample = BacktestEngine.run(inSampleCandles, strat, htfCandlesMap, true);
        const outOfSample = BacktestEngine.run(outOfSampleCandles, strat, htfCandlesMap, false);

        const fitnessScore = this.calculateFitness(outOfSample);
        const robustnessRatio =
          inSample.sharpeRatio > 0 && outOfSample.sharpeRatio > 0
            ? Math.round((outOfSample.sharpeRatio / inSample.sharpeRatio) * 100) / 100
            : 0;

        candidateResults.push({
          strategy: strat,
          inSampleResult: inSample,
          outOfSampleResult: outOfSample,
          fitnessScore: Math.round(fitnessScore * 100) / 100,
          robustnessRatio,
        });
      } catch {
        // Skip failed candidates
      }
    }

    candidateResults.sort((a, b) => b.fitnessScore - a.fitnessScore);

    const bestCandidate = candidateResults[0];

    return {
      bestCandidate,
      topCandidates: candidateResults.slice(0, 5),
      inSampleCandlesCount: inSampleCandles.length,
      outOfSampleCandlesCount: outOfSampleCandles.length,
    };
  }

  private static generatePopulation(base: StrategyModel, size: number): StrategyModel[] {
    const list: StrategyModel[] = [base];
    for (let i = 1; i < size; i++) {
      list.push(this.mutate(JSON.parse(JSON.stringify(base)), base.timeframe));
    }
    return list;
  }

  private static crossover(p1: StrategyModel, p2: StrategyModel): StrategyModel {
    const child: StrategyModel = JSON.parse(JSON.stringify(p1));

    // 50% chance to inherit individual indicator parameter from p2
    const keys = Object.keys(p2.indicatorsConfig) as (keyof typeof p2.indicatorsConfig)[];
    for (const key of keys) {
      if (Math.random() > 0.5 && p2.indicatorsConfig[key] !== undefined) {
        (child.indicatorsConfig as any)[key] = p2.indicatorsConfig[key];
      }
    }

    if (Math.random() > 0.5) {
      child.riskConfig.slAtrMultiplier = p2.riskConfig.slAtrMultiplier;
    }
    return child;
  }

  private static mutate(strat: StrategyModel, tf: Timeframe): StrategyModel {
    const s: StrategyModel = JSON.parse(JSON.stringify(strat));

    // Tailor parameter mutations based on timeframe scale
    const isFast = tf === '5m' || tf === '15m';

    // Mutate RSI
    if (Math.random() < 0.4) {
      s.indicatorsConfig.rsiPeriod = Math.floor(10 + Math.random() * 11); // 10..20
      s.indicatorsConfig.rsiOversold = Math.floor(25 + Math.random() * 12); // 25..36
      s.indicatorsConfig.rsiOverbought = Math.floor(65 + Math.random() * 12); // 65..76
    }

    // Mutate EMA
    if (Math.random() < 0.4) {
      s.indicatorsConfig.emaFast = isFast ? Math.floor(8 + Math.random() * 9) : Math.floor(15 + Math.random() * 16);
      s.indicatorsConfig.emaSlow = isFast ? Math.floor(21 + Math.random() * 15) : Math.floor(45 + Math.random() * 30);
    }

    // Mutate Supertrend
    if (Math.random() < 0.4) {
      s.indicatorsConfig.supertrendPeriod = Math.floor(7 + Math.random() * 8); // 7..14
      s.indicatorsConfig.supertrendMultiplier = Number((1.8 + Math.random() * 1.8).toFixed(1)); // 1.8..3.5
    }

    // Mutate SL multiplier
    if (Math.random() < 0.4) {
      s.riskConfig.slAtrMultiplier = Number((isFast ? 1.2 + Math.random() * 1.0 : 1.8 + Math.random() * 1.2).toFixed(2));
    }

    // Mutate TP targets
    if (Math.random() < 0.3 && s.takeProfits) {
      s.takeProfits[0].rrMultiple = Number((1.2 + Math.random() * 0.8).toFixed(1)); // 1.2..2.0
      s.takeProfits[1].rrMultiple = Number((2.5 + Math.random() * 1.5).toFixed(1)); // 2.5..4.0
    }

    return s;
  }
}
