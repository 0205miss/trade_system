'use client';

import React, { useState, useEffect } from 'react';
import { Database, Play, Pause, RefreshCw, Send, CheckCircle2, Clock, Globe, AlertCircle } from 'lucide-react';

interface CronLog {
  id: number;
  job_name: string;
  status: string;
  target_url: string;
  created_at: string;
}

export function SupabaseCronCard({ onTriggerComplete }: { onTriggerComplete?: () => void }) {
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<CronLog[]>([]);
  const [jobInfo, setJobInfo] = useState<any>(null);
  const [urlInput, setUrlInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isTriggering, setIsTriggering] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchCronData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/vst/cron');
      const data = await res.json();
      if (data.success) {
        setConfigs(data.configs);
        setLogs(data.logs || []);
        setJobInfo(data.jobInfo);
        setUrlInput(data.configs['auto_trade_url'] || 'https://quant.kaikai.app/api/cron/auto-trade');
      }
    } catch (err: any) {
      console.error('Failed to fetch cron data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCronData();
    const interval = setInterval(fetchCronData, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleToggle = async () => {
    const nextState = configs['is_enabled'] === 'false';
    try {
      setIsSaving(true);
      const res = await fetch('/api/vst/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', enabled: nextState }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: data.message });
        await fetchCronData();
      } else {
        setFeedback({ type: 'error', message: data.error });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const res = await fetch('/api/vst/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_url', url: urlInput }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: data.message });
        await fetchCronData();
      } else {
        setFeedback({ type: 'error', message: data.error });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualTrigger = async () => {
    try {
      setIsTriggering(true);
      setFeedback(null);
      const res = await fetch('/api/vst/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trigger' }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: data.message });
        await fetchCronData();
        if (onTriggerComplete) onTriggerComplete();
      } else {
        setFeedback({ type: 'error', message: data.error });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setIsTriggering(false);
    }
  };

  const isEnabled = configs['is_enabled'] !== 'false';

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 rounded-lg overflow-hidden text-xs font-mono shadow-sm transition-colors">
      {/* Header Banner */}
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">Supabase pg_cron 雲端定時排程引擎</span>
          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
            Cloud Native 24/7
          </span>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 hidden sm:inline">
            (獨立運行於 PostgreSQL，無須本地 daemon 常駐)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCronData}
            disabled={isLoading}
            className="p-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded transition-colors"
            title="刷新 Supabase 排程狀態"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Status Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800/80 rounded-lg">
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">雲端任務名稱 (cron.job)</span>
            <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-200 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
              <span>{jobInfo?.jobName || 'opt-auto-trade-vst'}</span>
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">調用 opt_trigger_auto_trade()</span>
          </div>

          <div className="p-3 bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800/80 rounded-lg">
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">執行週期 (Schedule)</span>
            <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-200 font-semibold">
              <Clock className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
              <span>*/1 * * * * (每分鐘)</span>
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">擴充套件: pg_cron + pg_net</span>
          </div>

          <div className="p-3 bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800/80 rounded-lg flex flex-col justify-between">
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">排程啟用狀態 (Status)</span>
            <div className="flex items-center justify-between">
              <span className={`font-bold ${isEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500'}`}>
                {isEnabled ? '● 雲端自動下單運行中' : '○ 已暫停雲端下單'}
              </span>
              <button
                onClick={handleToggle}
                disabled={isSaving}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${
                  isEnabled
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                }`}
              >
                {isEnabled ? '暫停雲端排程' : '啟用雲端排程'}
              </button>
            </div>
          </div>
        </div>

        {/* Webhook Configuration & Manual Trigger */}
        <div className="p-3 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/60 rounded-lg space-y-3">
          <form onSubmit={handleUpdateUrl} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 text-[11px] shrink-0">
              <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Webhook 目標:</span>
            </div>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://quant.kaikai.app/api/cron/auto-trade"
              className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-900 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-700 font-mono shadow-sm"
            />
            <button
              type="submit"
              disabled={isSaving}
              className="px-3 py-1 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded font-semibold transition-colors disabled:opacity-50"
            >
              {isSaving ? '儲存中...' : '儲存網址'}
            </button>
            <button
              type="button"
              onClick={handleManualTrigger}
              disabled={isTriggering}
              className="flex items-center justify-center gap-1 px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 rounded font-semibold transition-all disabled:opacity-50"
            >
              <Send className={`w-3 h-3 ${isTriggering ? 'animate-spin' : ''}`} />
              {isTriggering ? '正在發送...' : '手動觸發 Supabase 排程'}
            </button>
          </form>

          {feedback && (
            <div
              className={`p-2 rounded text-[11px] flex items-center gap-1.5 ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}
        </div>

        {/* Cloud Execution Logs */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mb-1.5 px-0.5">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">Supabase 雲端觸發日誌 (opt_cron_logs)</span>
            <span>最新 {logs.length} 筆執行</span>
          </div>

          <div className="border border-zinc-200 dark:border-zinc-800/80 rounded bg-white dark:bg-zinc-950/80 overflow-hidden max-h-36 overflow-y-auto shadow-sm">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-zinc-50 dark:bg-zinc-900/90 text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 text-[10px]">
                <tr>
                  <th className="py-1.5 px-2.5">時間 (Time)</th>
                  <th className="py-1.5 px-2.5">任務名稱</th>
                  <th className="py-1.5 px-2.5">狀態</th>
                  <th className="py-1.5 px-2.5">目標 Webhook</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800/50 text-zinc-800 dark:text-zinc-300">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-zinc-400 dark:text-zinc-500">
                      尚未有 Supabase 雲端排程紀錄。
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                      <td className="py-1.5 px-2.5 text-zinc-500 dark:text-zinc-400">
                        {new Date(log.created_at).toLocaleTimeString('zh-TW')}
                      </td>
                      <td className="py-1.5 px-2.5 font-bold text-zinc-900 dark:text-zinc-300">{log.job_name}</td>
                      <td className="py-1.5 px-2.5">
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          {log.status}
                        </span>
                      </td>
                      <td className="py-1.5 px-2.5 text-zinc-500 font-mono truncate max-w-xs">{log.target_url}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
