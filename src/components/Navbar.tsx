'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Timeframe } from '@/lib/engine/types';
import { useTheme } from '@/components/ThemeProvider';
import { BarChart3, Sliders, FileText, Cpu, Sun, Moon } from 'lucide-react';

interface NavbarProps {
  symbol?: string;
  onSymbolChange?: (symbol: string) => void;
  timeframe?: Timeframe;
  onTimeframeChange?: (tf: Timeframe) => void;
  price?: number;
}

export function Navbar({
  symbol = 'BTC-USDT',
  onSymbolChange,
  timeframe = '1h',
  onTimeframeChange,
  price,
}: NavbarProps) {
  const pathname = usePathname();
  const { resolvedTheme, toggleTheme } = useTheme();

  const symbols = ['BTC-USDT', 'ETH-USDT', 'SOL-USDT'];
  const timeframes: Timeframe[] = ['4h', '1h', '15m', '5m'];

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/90 backdrop-blur sticky top-0 z-50 transition-colors duration-150">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Brand & Main Links */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 group-hover:scale-110 transition-transform" />
            <span className="font-semibold text-sm tracking-tight text-zinc-900 dark:text-zinc-100">
              Antigravity <span className="text-zinc-500 dark:text-zinc-400 font-normal">Quant Engine</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-xs">
            <Link
              href="/"
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
                pathname === '/'
                  ? 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 font-medium'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              回測工作台 (Studio)
            </Link>
            <Link
              href="/strategies"
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
                pathname === '/strategies'
                  ? 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 font-medium'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              策略模型庫 (Models)
            </Link>
            <Link
              href="/reports"
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
                pathname === '/reports'
                  ? 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 font-medium'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              優化日報 (Audit Logs)
            </Link>
            <Link
              href="/vst"
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
                pathname === '/vst'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              VST 實盤測試 (Forward Test)
            </Link>
          </nav>
        </div>

        {/* Center: Controls (Only rendered if passed) */}
        <div className="flex items-center gap-2.5">
          {onSymbolChange && (
            <select
              value={symbol}
              onChange={(e) => onSymbolChange(e.target.value)}
              className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-900 dark:text-zinc-200 rounded px-2.5 py-1 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-700 shadow-sm"
            >
              {symbols.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}

          {price && (
            <div className="hidden lg:flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 bg-zinc-50 dark:bg-zinc-900/60 rounded border border-zinc-200 dark:border-zinc-800/60">
              <span className="text-zinc-500">BingX:</span>
              <span className="text-zinc-900 dark:text-zinc-200 font-medium">${price.toLocaleString('en-US', { minimumFractionDigits: 1 })}</span>
            </div>
          )}

          {/* Timeframe Segmented Control */}
          {onTimeframeChange && (
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded border border-zinc-200 dark:border-zinc-800">
              {timeframes.map((tf) => (
                <button
                  key={tf}
                  onClick={() => onTimeframeChange(tf)}
                  className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
                    timeframe === tf
                      ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 font-semibold shadow-sm'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  {tf.toUpperCase()}
                </button>
              ))}
            </div>
          )}

          {/* Theme Switcher Toggle (Light / Dark) */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-sm"
            title={`切換為${resolvedTheme === 'dark' ? '明亮模式 (Light)' : '暗色模式 (Dark)'}`}
            aria-label="切換主題"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-zinc-700" />
            )}
          </button>
        </div>

        {/* Automation Sidecar Status Badge */}
        <div className="hidden sm:flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/80 px-2.5 py-1 rounded border border-zinc-200 dark:border-zinc-800">
            <Cpu className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
            <span>08:00 自動排程已連線</span>
          </div>
        </div>
      </div>
    </header>
  );
}
