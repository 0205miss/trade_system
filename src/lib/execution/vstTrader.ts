import { supabase } from '../supabase/client';
import { BingXVSTClient } from '../bingx/vstClient';
import { CandleCacheManager } from '../bingx/cache';
import { MultiTimeframeAggregator } from '../engine/mtf';
import { calculateATR, calculateSupertrend, calculateRSI, calculateStochRSI, calculateEMA, calculateRVOL } from '../engine/indicators';
import { Timeframe, StrategyModel, Candle, TradeDirection } from '../engine/types';
import { OptStrategyService } from '../services/optStrategyService';

export interface VSTScanReport {
  symbol: string;
  timeframe: Timeframe;
  timestamp: number;
  currentPrice: number;
  actionTaken: 'OPENED_LONG' | 'OPENED_SHORT' | 'CLOSED_SL' | 'CLOSED_TP' | 'MOVED_TO_BE' | 'HOLDING' | 'NO_SIGNAL';
  positionId?: string;
  orderId?: string;
  detail: string;
}

export class VSTTrader {
  /**
   * Scan market, manage active positions, and execute forward orders on BingX VST
   */
  static async scanAndExecute(symbol = 'BTC-USDT', timeframe: Timeframe = '1h'): Promise<VSTScanReport> {
    // 1. Fetch latest candles
    const candles = await CandleCacheManager.getCandles(symbol, timeframe, 150);
    if (candles.length < 35) {
      return {
        symbol,
        timeframe,
        timestamp: Date.now(),
        currentPrice: 0,
        actionTaken: 'NO_SIGNAL',
        detail: 'Insufficient candle data for signal generation',
      };
    }

    const currentCandle = candles[candles.length - 1];
    const currentPrice = currentCandle.close;

    // 2. Load active strategy from opt_strategies
    const strategies = await OptStrategyService.getStrategies(timeframe);
    const activeStrat = strategies.find((s) => s.isActive && s.symbol === symbol) || OptStrategyService.getDefaultBaseline(timeframe, symbol);

    // 3. Check for existing open position in opt_live_positions
    const { data: openPosList } = await supabase
      .from('opt_live_positions')
      .select('*')
      .eq('symbol', symbol)
      .eq('timeframe', timeframe)
      .eq('status', 'OPEN');

    const activePosition = openPosList && openPosList.length > 0 ? openPosList[0] : null;

    // 4. Manage active position (Check SL, TP, Break-even)
    if (activePosition) {
      const isLong = activePosition.direction === 'LONG';
      const curSl = parseFloat(activePosition.current_sl);
      const tp1 = parseFloat(activePosition.tp1_price);
      const tp2 = activePosition.tp2_price ? parseFloat(activePosition.tp2_price) : 0;
      const tp3 = activePosition.tp3_price ? parseFloat(activePosition.tp3_price) : 0;
      const entryPrice = parseFloat(activePosition.entry_avg_price);
      const totalQty = parseFloat(activePosition.total_qty);

      // Check Stop Loss
      const isSlHit = isLong ? currentPrice <= curSl : currentPrice >= curSl;
      if (isSlHit) {
        // Close position on BingX VST
        const closeSide = isLong ? 'SELL' : 'BUY';
        const orderRes = await BingXVSTClient.placeOrder({
          symbol,
          side: closeSide,
          positionSide: isLong ? 'LONG' : 'SHORT',
          type: 'MARKET',
          quantity: totalQty,
        });

        const realizedPnl = isLong ? (currentPrice - entryPrice) * totalQty : (entryPrice - currentPrice) * totalQty;

        // Update database
        await supabase
          .from('opt_live_positions')
          .update({
            status: 'CLOSED',
            pnl_realized: realizedPnl,
            pnl_unrealized: 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', activePosition.id);

        await supabase.from('opt_live_orders').insert({
          position_id: activePosition.id,
          symbol,
          side: closeSide,
          position_side: isLong ? 'LONG' : 'SHORT',
          order_type: 'MARKET',
          price: currentPrice,
          quantity: totalQty,
          status: 'FILLED',
          bingx_order_id: orderRes.orderId,
          filled_price: currentPrice,
          filled_qty: totalQty,
          filled_at: new Date().toISOString(),
        });

        return {
          symbol,
          timeframe,
          timestamp: Date.now(),
          currentPrice,
          actionTaken: 'CLOSED_SL',
          positionId: activePosition.id,
          orderId: orderRes.orderId,
          detail: `觸發止損 @ ${currentPrice} (損益: $${realizedPnl.toFixed(2)})`,
        };
      }

      // Check TP1 hit (and move to BE)
      const isTp1Hit = isLong ? currentPrice >= tp1 : currentPrice <= tp1;
      if (isTp1Hit && !activePosition.is_be_triggered) {
        // Move SL to Break-Even (Entry price)
        await supabase
          .from('opt_live_positions')
          .update({
            is_be_triggered: true,
            current_sl: entryPrice,
            tp1_hit: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', activePosition.id);

        return {
          symbol,
          timeframe,
          timestamp: Date.now(),
          currentPrice,
          actionTaken: 'MOVED_TO_BE',
          positionId: activePosition.id,
          detail: `達成 TP1 @ ${tp1}，止損已自動移至保本價 (BE: ${entryPrice})`,
        };
      }

      // Update unrealized PnL
      const curUnrealized = isLong ? (currentPrice - entryPrice) * totalQty : (entryPrice - currentPrice) * totalQty;
      await supabase
        .from('opt_live_positions')
        .update({
          pnl_unrealized: curUnrealized,
          updated_at: new Date().toISOString(),
        })
        .eq('id', activePosition.id);

      return {
        symbol,
        timeframe,
        timestamp: Date.now(),
        currentPrice,
        actionTaken: 'HOLDING',
        positionId: activePosition.id,
        detail: `持倉中: ${activePosition.direction} ${totalQty} @ ${entryPrice} (未實現: $${curUnrealized.toFixed(2)})`,
      };
    }

    // 5. If no active position, check for entry signals
    const closes = candles.map((c) => c.close);
    const indConfig = activeStrat.indicatorsConfig;
    const supertrend = calculateSupertrend(candles, indConfig.supertrendPeriod || 10, indConfig.supertrendMultiplier || 3.0);
    const rsi = calculateRSI(closes, indConfig.rsiPeriod || 14);
    const stochRsi = calculateStochRSI(closes, indConfig.rsiPeriod || 14, 14, 3, 3);
    const emaTrend = calculateEMA(closes, 200);
    const atr = calculateATR(candles, 14);
    const rvol = calculateRVOL(candles, 20);

    const i = candles.length - 1;
    const isSupertrendBull = supertrend.trend[i] === 1;
    const isRsiOversold = (rsi[i] || 50) < (indConfig.rsiOversold || 32);
    const isRsiOverbought = (rsi[i] || 50) > (indConfig.rsiOverbought || 68);
    const isStochRsiBull = (stochRsi.k[i] || 0) > (stochRsi.d[i] || 0) && (stochRsi.k[i] || 0) < 40;
    const isStochRsiBear = (stochRsi.k[i] || 0) < (stochRsi.d[i] || 0) && (stochRsi.k[i] || 0) > 60;
    const hasVolume = (rvol[i] || 1) >= (indConfig.rvolThreshold || 1.15);

    let signal: TradeDirection | null = null;
    if (isSupertrendBull && (isRsiOversold || isStochRsiBull) && hasVolume && currentPrice > (emaTrend[i] || 0) * 0.98) {
      signal = 'LONG';
    } else if (!isSupertrendBull && (isRsiOverbought || isStochRsiBear) && hasVolume && currentPrice < (emaTrend[i] || Infinity) * 1.02) {
      signal = 'SHORT';
    }

    if (!signal) {
      return {
        symbol,
        timeframe,
        timestamp: Date.now(),
        currentPrice,
        actionTaken: 'NO_SIGNAL',
        detail: `當前無觸發信號 (RSI: ${rsi[i]?.toFixed(1)}, Supertrend: ${isSupertrendBull ? '多' : '空'}, RVOL: ${rvol[i]?.toFixed(2)}x)`,
      };
    }

    // 6. Execute Order on BingX VST
    const isLong = signal === 'LONG';
    const currATR = atr[i] || currentPrice * 0.01;
    const slDist = currATR * (activeStrat.riskConfig.slAtrMultiplier || 1.8);
    const slPrice = isLong ? currentPrice - slDist : currentPrice + slDist;

    const tp1Price = isLong ? currentPrice + slDist * 1.5 : currentPrice - slDist * 1.5;
    const tp2Price = isLong ? currentPrice + slDist * 3.0 : currentPrice - slDist * 3.0;
    const tp3Price = isLong ? currentPrice + slDist * 6.0 : currentPrice - slDist * 6.0;

    // Sizing: 1.5% risk
    const balanceInfo = await BingXVSTClient.getBalance();
    const equity = balanceInfo.equity || 10000;
    const riskAmount = equity * ((activeStrat.riskConfig.riskPerTradePct || 1.5) / 100);

    let targetQty = slDist > 0 ? riskAmount / slDist : 0.001;
    // Precision format
    targetQty = Number(targetQty.toFixed(symbol.includes('BTC') ? 3 : symbol.includes('ETH') ? 2 : 1));
    if (targetQty <= 0) targetQty = symbol.includes('BTC') ? 0.001 : 0.01;

    // Set 20x leverage
    await BingXVSTClient.setLeverage(symbol, activeStrat.riskConfig.leverage || 20, signal);

    // Place BingX VST market order
    const orderRes = await BingXVSTClient.placeOrder({
      symbol,
      side: isLong ? 'BUY' : 'SELL',
      positionSide: isLong ? 'LONG' : 'SHORT',
      type: 'MARKET',
      quantity: targetQty,
    });

    const nominal = targetQty * currentPrice;
    const margin = nominal / (activeStrat.riskConfig.leverage || 20);

    // Record position in opt_live_positions
    const { data: posData, error: posErr } = await supabase
      .from('opt_live_positions')
      .insert({
        symbol,
        timeframe,
        direction: signal,
        entry_avg_price: currentPrice,
        total_qty: targetQty,
        nominal_value: nominal,
        margin_used: margin,
        leverage: activeStrat.riskConfig.leverage || 20,
        current_sl: slPrice,
        initial_sl_distance: slDist,
        tp1_price: tp1Price,
        tp2_price: tp2Price,
        tp3_price: tp3Price,
        bingx_order_id: orderRes.orderId,
      })
      .select('id')
      .single();

    if (posData?.id) {
      await supabase.from('opt_live_orders').insert({
        position_id: posData.id,
        symbol,
        side: isLong ? 'BUY' : 'SELL',
        position_side: isLong ? 'LONG' : 'SHORT',
        order_type: 'MARKET',
        price: currentPrice,
        quantity: targetQty,
        status: 'FILLED',
        bingx_order_id: orderRes.orderId,
        filled_price: currentPrice,
        filled_qty: targetQty,
        filled_at: new Date().toISOString(),
      });
    }

    return {
      symbol,
      timeframe,
      timestamp: Date.now(),
      currentPrice,
      actionTaken: isLong ? 'OPENED_LONG' : 'OPENED_SHORT',
      positionId: posData?.id,
      orderId: orderRes.orderId,
      detail: `成功開倉 ${signal} ${targetQty} @ ${currentPrice} (SL: ${slPrice.toFixed(1)}, TP1: ${tp1Price.toFixed(1)})`,
    };
  }

  /**
   * Close position manually from UI
   */
  static async closePosition(positionId: string): Promise<void> {
    const { data: pos } = await supabase.from('opt_live_positions').select('*').eq('id', positionId).single();
    if (!pos || pos.status === 'CLOSED') return;

    const isLong = pos.direction === 'LONG';
    const closeSide = isLong ? 'SELL' : 'BUY';
    const totalQty = parseFloat(pos.total_qty);

    // Place close order
    const orderRes = await BingXVSTClient.placeOrder({
      symbol: pos.symbol,
      side: closeSide,
      positionSide: isLong ? 'LONG' : 'SHORT',
      type: 'MARKET',
      quantity: totalQty,
    });

    // Fetch latest price
    const candles = await CandleCacheManager.getCandles(pos.symbol, pos.timeframe, 5);
    const exitPrice = candles.length > 0 ? candles[candles.length - 1].close : parseFloat(pos.entry_avg_price);
    const realizedPnl = isLong
      ? (exitPrice - parseFloat(pos.entry_avg_price)) * totalQty
      : (parseFloat(pos.entry_avg_price) - exitPrice) * totalQty;

    await supabase
      .from('opt_live_positions')
      .update({
        status: 'CLOSED',
        pnl_realized: realizedPnl,
        pnl_unrealized: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', positionId);

    await supabase.from('opt_live_orders').insert({
      position_id: positionId,
      symbol: pos.symbol,
      side: closeSide,
      position_side: isLong ? 'LONG' : 'SHORT',
      order_type: 'MARKET',
      price: exitPrice,
      quantity: totalQty,
      status: 'FILLED',
      bingx_order_id: orderRes.orderId,
      filled_price: exitPrice,
      filled_qty: totalQty,
      filled_at: new Date().toISOString(),
    });
  }
}
