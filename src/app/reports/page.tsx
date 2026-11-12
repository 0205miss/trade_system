'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { OptReportService } from '@/lib/services/optReportService';
import { Calendar } from 'lucide-react';

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const data = await OptReportService.getReports(50);
      setReports(data || []);
      setIsLoading(false);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div>
            <h1 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">每日優化審計日報 (Daily Audit Reports)</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
              檢視 Antigravity 每日排程自動執行之參數演化、樣本外盲測與客觀審計紀錄
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-500 dark:text-zinc-400">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            <span>自動保存於 Supabase opt_daily_reports</span>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-zinc-100 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/60 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-xs font-mono border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950">
            尚無審計日報。您可以手動執行 npx tsx scripts/daily_optimize.ts 產生首份日報。
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((rpt) => (
              <div
                key={rpt.id}
                className="p-4 bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors shadow-sm"
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                      {rpt.symbol} &bull; {rpt.timeframe?.toUpperCase()}
                    </span>
                    <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">{rpt.report_date}</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                        rpt.status === 'OPTIMIZED'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {rpt.status === 'OPTIMIZED' ? '參數已更新' : '維持原參數'}
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-zinc-500">
                    波動狀態: {rpt.volatility_regime}
                  </span>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded border border-zinc-200 dark:border-zinc-800/80 font-mono text-xs text-zinc-800 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {rpt.report_markdown}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
