'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from '@/components/Navbar';
import { AuthGuard } from '@/components/AuthGuard';
import { StrategyDetailCard } from '@/components/StrategyDetailCard';
import { SupabaseCronCard } from '@/components/SupabaseCronCard';
import { Timeframe, StrategyModel } from '@/lib/engine/types';
import { OptStrategyService } from '@/lib/services/optStrategyService';
import { Play, Pause, RefreshCw, ArrowUpRight, ArrowDownRight, Radio, Terminal } from 'lucide-react';

export default function VSTTradingPage() {
  const [balance, setBalance] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Auto-Trading state
  const [isAutoTrading, setIsAutoTrading] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number>(15);
  const [logs, setLogs] = useState<string[]>([]);
  const [activeScanSummary, setActiveScanSummary] = useState<string>('系統初始化中...');
  const [activeStrategy, setActiveStrategy] = useState<StrategyModel>(
    OptStrategyService.getDefaultBaseline('1h', 'BTC-USDT')
  );

  useEffect(() => {
    async function loadActiveStrat() {
      const strats = await OptStrategyService.getStrategies('1h');
      const found = strats.find((s) => s.isActive) || OptStrategyService.getDefaultBaseline('1h', 'BTC-USDT');
      setActiveStrategy(found);
    }
    loadActiveStrat();
  }, []);

  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString('zh-TW');
    setLogs((prev) => [`[${time}] ${msg}`, ...prev.slice(0, 49)]);
  };

  const loadData = async () => {
    try {
      const res = await fetch('/api/vst');
      const data = await res.json();
      if (data.success) {
        setBalance(data.balance);
        setPositions(data.positions);
        setOrders(data.orders);
        setIsConfigured(data.isConfigured);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerAutoScan = async () => {
    try {
      setActiveScanSummary('全幣種與全週期多指標掃描中...');
      const res = await fetch('/api/cron/auto-trade');
      const data = await res.json();

      if (data.success) {
        const { scannedCount, executedCount, executedActions } = data;
        if (executedCount > 0) {
          executedActions.forEach((act: any) => {
            addLog(`🚨 ${act.symbol} [${act.timeframe.toUpperCase()}]: ${act.actionTaken} - ${act.detail}`);
          });
          setActiveScanSummary(`完成掃描 ${scannedCount} 組週期，執行了 ${executedCount} 筆自動報單！`);
        } else {
          setActiveScanSummary(`掃描完畢 (共 ${scannedCount} 組週期)，當前無突破/超買超賣信號，持倉正常監控。`);
        }
        await loadData();
      }
    } catch (err: any) {
      addLog(`❌ 自動掃描錯誤: ${err.message}`);
      setActiveScanSummary(`掃描異常: ${err.message}`);
    }
  };

  // Initial load
  useEffect(() => {
    loadData();
    triggerAutoScan();
  }, []);

  // Auto-Trading countdown & interval loop
  useEffect(() => {
    if (!isAutoTrading) {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      return;
    }

    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          triggerAutoScan();
          return 15; // Reset to 15s
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [isAutoTrading]);

  const handleClosePosition = async (positionId: string) => {
    try {
      const res = await fetch('/api/vst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close', positionId }),
      });
      const data = await res.json();
      if (data.success) {
        addLog(`手動平倉成功: ${positionId}`);
        await loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors">
        <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3.5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">BingX VST 全自動下單系統 (Auto-Trading Engine)</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
                24/7 雲端運作
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
              Supabase pg_cron 雲端定時排程 (*/1 * * * *) 24/7 自動輪詢 BTC、ETH、SOL 之 4H/1H/15M/5M 多指標信號並自動報單與移損保本
            </p>
          </div>

          {/* Master Auto-Trading Switch */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-mono shadow-sm">
              <button
                onClick={() => setIsAutoTrading(!isAutoTrading)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-semibold transition-all ${
                  isAutoTrading
                    ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {isAutoTrading ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3" />}
                {isAutoTrading ? '自動輪詢中 (ON)' : '已暫停輪詢 (OFF)'}
              </button>

              {isAutoTrading && (
                <div className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 pl-2 border-l border-zinc-200 dark:border-zinc-800">
                  <Radio className="w-3 h-3 text-emerald-500 dark:text-emerald-400 animate-pulse" />
                  <span>下次掃描: {countdown}s</span>
                </div>
              )}
            </div>

            <button
              onClick={loadData}
              disabled={isLoading}
              className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 shadow-sm"
              title="重新整理數據"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 1. Account Assets Card */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3.5 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg font-mono shadow-sm">
            <span className="text-[11px] text-zinc-500 block">VST 帳戶總權益 (Equity)</span>
            <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              ${(balance?.equity || 100000).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="p-3.5 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg font-mono shadow-sm">
            <span className="text-[11px] text-zinc-500 block">可用保證金 (Available)</span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              ${(balance?.availableMargin || 100000).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="p-3.5 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg font-mono shadow-sm">
            <span className="text-[11px] text-zinc-500 block">已用保證金 (Used Margin)</span>
            <span className="text-lg font-bold text-zinc-800 dark:text-zinc-200">
              ${(balance?.usedMargin || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="p-3.5 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg font-mono shadow-sm">
            <span className="text-[11px] text-zinc-500 block">持倉未實現損益 (Unrealized)</span>
            <span
              className={`text-lg font-bold ${
                (balance?.unrealizedProfit || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {(balance?.unrealizedProfit || 0) >= 0 ? '+' : ''}
              ${(balance?.unrealizedProfit || 0).toFixed(2)}
            </span>
          </div>
        </div>

        {/* 2. Real-time Status Banner */}
        <div className="p-3 bg-zinc-100/70 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center justify-between text-xs font-mono shadow-sm">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isAutoTrading ? 'bg-emerald-500 dark:bg-emerald-400 animate-ping' : 'bg-zinc-400 dark:bg-zinc-600'}`} />
            <span className="text-zinc-800 dark:text-zinc-300 font-medium">{activeScanSummary}</span>
          </div>
          <span className="text-zinc-500 hidden sm:inline">
            輪詢標的: BTC / ETH / SOL &bull; 週期: 5M, 15M, 1H, 4H
          </span>
        </div>

        {/* 2.1 Supabase pg_cron Cloud Scheduler Control */}
        <SupabaseCronCard onTriggerComplete={loadData} />

        {/* 2.2 Full Active Strategy Details & Indicators Suite */}
        <StrategyDetailCard strategy={activeStrategy} expandedDefault={true} />

        {/* 3. Open Positions Table */}
        <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-lg overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center justify-between">
            <span>當前活躍持倉 (Active VST Positions)</span>
            <span className="text-[11px] font-mono text-zinc-500">
              {positions.filter((p) => p.status === 'OPEN').length} 組持倉中
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-zinc-50 dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">幣種 / 週期</th>
                  <th className="py-2.5 px-3">方向</th>
                  <th className="py-2.5 px-3 text-right">進場均價</th>
                  <th className="py-2.5 px-3 text-right">數量 (Qty)</th>
                  <th className="py-2.5 px-3 text-right">止損 (SL)</th>
                  <th className="py-2.5 px-3 text-right">第一停利 (TP1)</th>
                  <th className="py-2.5 px-3 text-center">保本 (BE)</th>
                  <th className="py-2.5 px-3 text-right">未實現損益</th>
                  <th className="py-2.5 px-3 text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 text-zinc-800 dark:text-zinc-300">
                {positions.filter((p) => p.status === 'OPEN').length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-zinc-500 text-xs">
                      目前無活躍 VST 持倉。全自動下單引擎正每 15 秒持續監控入場機會。
                    </td>
                  </tr>
                ) : (
                  positions
                    .filter((p) => p.status === 'OPEN')
                    .map((pos) => {
                      const isLong = pos.direction === 'LONG';
                      const isProfit = parseFloat(pos.pnl_unrealized || '0') >= 0;
                      return (
                        <tr key={pos.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                          <td className="py-2.5 px-3 font-bold text-zinc-900 dark:text-zinc-100">
                            {pos.symbol} <span className="text-zinc-500 font-normal uppercase text-[10px]">[{pos.timeframe}]</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-flex items-center gap-1 font-bold px-1.5 py-0.5 rounded text-[11px] ${
                                isLong ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' : 'text-rose-600 dark:text-rose-400 bg-rose-500/10'
                              }`}
                            >
                              {isLong ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                              {pos.direction}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">${parseFloat(pos.entry_avg_price).toFixed(1)}</td>
                          <td className="py-2.5 px-3 text-right">{parseFloat(pos.total_qty)}</td>
                          <td className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400">${parseFloat(pos.current_sl).toFixed(1)}</td>
                          <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400">${parseFloat(pos.tp1_price).toFixed(1)}</td>
                          <td className="py-2.5 px-3 text-center">
                            {pos.is_be_triggered ? (
                              <span className="text-[10px] text-sky-600 dark:text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20 font-semibold">
                                已移至保本
                              </span>
                            ) : (
                              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">未觸發</span>
                            )}
                          </td>
                          <td className={`py-2.5 px-3 text-right font-bold ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {isProfit ? '+' : ''}${parseFloat(pos.pnl_unrealized || '0').toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => handleClosePosition(pos.id)}
                              className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded text-[11px] transition-colors"
                            >
                              市價平倉
                            </button>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Live Activity Terminal Log */}
        <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-lg overflow-hidden font-mono text-xs shadow-sm transition-colors">
          <div className="px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-between text-zinc-600 dark:text-zinc-400 text-[11px]">
            <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100 font-bold">
              <Terminal className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              自動下單即時日誌 (Live Activity Log)
            </div>
            <span className="text-zinc-500">最近 50 筆事件</span>
          </div>

          <div className="p-3 max-h-48 overflow-y-auto space-y-1 bg-zinc-50/50 dark:bg-zinc-950 text-[11px] text-zinc-700 dark:text-zinc-300">
            {logs.length === 0 ? (
              <div className="text-zinc-400 dark:text-zinc-600">全自動下單引擎就緒，等待信號觸發...</div>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className="leading-relaxed hover:text-zinc-950 dark:hover:text-zinc-100">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 5. Order History Table */}
        <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-lg overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center justify-between">
            <span>VST 歷史報單紀錄 (Order History)</span>
            <span className="text-[11px] font-mono text-zinc-500">已記錄至 opt_live_orders</span>
          </div>

          <div className="max-h-56 overflow-y-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 text-[11px]">
                <tr>
                  <th className="py-2 px-3">時間</th>
                  <th className="py-2 px-3">交易對</th>
                  <th className="py-2 px-3">買賣方向</th>
                  <th className="py-2 px-3">部位</th>
                  <th className="py-2 px-3 text-right">成交價格</th>
                  <th className="py-2 px-3 text-right">數量</th>
                  <th className="py-2 px-3 text-center">狀態</th>
                  <th className="py-2 px-3">BingX 委託 ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 text-zinc-800 dark:text-zinc-300 text-[11px]">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-zinc-400 dark:text-zinc-500 text-xs">
                      暫無訂單紀錄。
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                      <td className="py-2 px-3 text-zinc-500 dark:text-zinc-400">
                        {new Date(o.created_at).toLocaleTimeString('zh-TW')}
                      </td>
                      <td className="py-2 px-3 font-semibold text-zinc-900 dark:text-zinc-200">{o.symbol}</td>
                      <td className={`py-2 px-3 font-bold ${o.side === 'BUY' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {o.side}
                      </td>
                      <td className="py-2 px-3 text-zinc-500 dark:text-zinc-400">{o.position_side}</td>
                      <td className="py-2 px-3 text-right">${parseFloat(o.filled_price || o.price || 0).toFixed(1)}</td>
                      <td className="py-2 px-3 text-right">{parseFloat(o.quantity)}</td>
                      <td className="py-2 px-3 text-center">
                        <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                          {o.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-zinc-400 dark:text-zinc-500 text-[10px]">{o.bingx_order_id || 'LOCAL-SIM'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
    </AuthGuard>
  );
}
