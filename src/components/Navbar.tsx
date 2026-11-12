'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/components/AuthProvider';
import { BarChart3, Sliders, FileText, Cpu, Sun, Moon, LogIn, LogOut, User as UserIcon, Lock } from 'lucide-react';

interface NavbarProps {
  price?: number;
  symbol?: string;
}

export function Navbar({ price, symbol = 'BTC-USDT' }: NavbarProps) {
  const pathname = usePathname();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { user, signOut, loading: authLoading } = useAuth();

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/90 backdrop-blur sticky top-0 z-50 transition-colors duration-150">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Brand & Main Links */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
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
              {!authLoading && !user && <Lock className="w-2.5 h-2.5 opacity-60 text-amber-500" />}
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
              {!authLoading && !user && <Lock className="w-2.5 h-2.5 opacity-60 text-amber-500" />}
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
              {!authLoading && !user && <Lock className="w-2.5 h-2.5 opacity-60 text-amber-500" />}
            </Link>
          </nav>
        </div>

        {/* Right side: Live Price + Automation Status + Theme Toggle + Auth */}
        <div className="flex items-center gap-2.5">
          {price && (
            <div className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 bg-zinc-50 dark:bg-zinc-900/60 rounded-md border border-zinc-200 dark:border-zinc-800/80">
              <span className="text-zinc-500">BingX {symbol === 'ALL' ? 'BTC' : symbol.replace('-USDT', '')}:</span>
              <span className="text-zinc-900 dark:text-zinc-200 font-medium">
                ${price.toLocaleString('en-US', { minimumFractionDigits: 1 })}
              </span>
            </div>
          )}

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/80 px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-800">
            <Cpu className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
            <span>08:00 自動排程已連線</span>
          </div>

          {/* Theme Switcher Toggle */}
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

          {/* Auth State Button */}
          {!authLoading && (
            <>
              {user ? (
                <div className="flex items-center gap-2 pl-2 border-l border-zinc-200 dark:border-zinc-800">
                  <div className="hidden lg:flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-900 px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-800 max-w-[160px]">
                    <UserIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="truncate font-mono text-[11px]">{user.email}</span>
                  </div>
                  <button
                    onClick={signOut}
                    className="px-2.5 py-1 text-xs rounded-md text-zinc-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-zinc-200 dark:border-zinc-800 hover:border-rose-200 dark:hover:border-rose-900/50 flex items-center gap-1 transition-colors"
                    title="登出"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">登出</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center pl-2 border-l border-zinc-200 dark:border-zinc-800">
                  <Link
                    href={`/login?redirectTo=${encodeURIComponent(pathname)}`}
                    className="px-3 py-1 text-xs font-medium rounded-md bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>登入</span>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
