import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Antigravity Quant Engine (策略優化與實盤系統)',
    short_name: 'Quant Engine',
    description: 'Deterministic Multi-Timeframe Crypto Strategy Optimizer & BingX VST Trading System',
    start_url: '/vst',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#09090b',
    theme_color: '#10b981',
    lang: 'zh-TW',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'VST 實盤交易',
        url: '/vst',
        description: '檢視 BingX VST 24/7 全自動下單與活躍持倉',
      },
      {
        name: '量化回測工作台',
        url: '/',
        description: '全週期多指標量化策略回測與遺傳演算法優化',
      },
      {
        name: '策略模型庫',
        url: '/strategies',
        description: '檢視當前已啟用之 BTC/ETH/SOL 最佳量化模型',
      },
      {
        name: '每日審計日報',
        url: '/reports',
        description: '每日清晨 08:00 自動產出之策略優化日報',
      },
    ],
    categories: ['finance', 'productivity', 'utilities'],
  };
}
