'use client';

import { useEffect, useState } from 'react';
import { Download, CheckCircle2, Smartphone } from 'lucide-react';

export function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 1. Register service worker in production or standard web browser
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('[PWA] ServiceWorker registered with scope:', registration.scope);
          })
          .catch((err) => {
            console.warn('[PWA] ServiceWorker registration failed:', err);
          });
      });
    }

    // 2. Check if already running in standalone (PWA) mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // 3. Listen for beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  if (!isInstallable && !isInstalled) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-3 duration-300">
      {isInstallable && (
        <button
          onClick={handleInstallClick}
          className="flex items-center gap-2 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold text-xs rounded-lg shadow-lg shadow-emerald-500/20 border border-emerald-400 transition-all cursor-pointer font-mono"
        >
          <Download className="w-3.5 h-3.5" />
          <span>安裝 PWA 桌面應用</span>
        </button>
      )}

      {isInstalled && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900/90 dark:bg-zinc-900/90 border border-zinc-700 text-zinc-300 text-[11px] rounded-md shadow font-mono">
          <Smartphone className="w-3 h-3 text-emerald-400" />
          <span>PWA 模式運行中</span>
        </div>
      )}
    </div>
  );
}
