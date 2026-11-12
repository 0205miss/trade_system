# 📝 版本變更日誌 (Changelog)

本專案遵循 [Semantic Versioning (語意化版本)](https://semver.org/lang/zh-TW/) 與 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/) 規範記錄重大功能與版本迭代。

---

## [1.0.0] - 2026-11-12

### 🚀 初始版本發布 (Initial Major Release)

#### 🌟 核心量化引擎 (Quantitative Engine)
- **多維技術指標庫 (`src/lib/engine/indicators/`)**：
  - **Trend**: 指數移動平均線 (EMA)、平滑異同移動平均線 (MACD)、超級趨勢 (Supertrend)、平均方向性指數 (ADX)。
  - **Momentum**: 相對強弱指標 (RSI)、隨機指標 RSI (StochRSI)、威廉指標 (Williams %R)、順勢指標 (CCI)、資金流量指標 (MFI)。
  - **Volatility**: 真實波動區間 (ATR)、布林通道 (Bollinger Bands)、肯特納通道 (Keltner Channels)、唐奇安通道 (Donchian)。
  - **Volume**: 相對成交量 (RVOL)、蔡金資金流 (CMF)、成交量加權平均價 (VWAP)。
  - **Price Action**: 公允價值缺口 (FVG)、支撐阻力關鍵位、長針拒絕形態。
- **跨週期共振驗證 (Multi-Timeframe / MTF)**：
  - 支援 `5m`, `15m`, `1h`, `4h` 多週期矩陣運算。
  - 次週期開倉強制校驗高階主趨勢濾網，避免逆向交易。
- **高擬真事件驅動回測器 (`BacktestEngine`)**：
  - 內建精準 Maker (0.02%) 與 Taker (0.05%) 手續費模型。
  - 內建 3 bps 滑點損耗計算法。
  - **15 / 30 / 40 / 15 動態分批建倉模型**（試單、回踩加倉、確認主倉、尾倉順勢）。
  - **三段階梯止盈與動態防守**（TP1 觸發 1.5R 獲利並推保本 Break-Even、TP2 觸發 3.0R 並啟動 Trailing SL 移動止損）。
  - **單日最大虧損熔斷機制**（`maxDailyLossUsdt` 預設 80 USDT）。

#### 🧬 走步式基因優化器 (Walk-Forward Genetic Optimizer)
- 實作前向滾動優化（70% 樣本內訓練 + 30% 樣本外盲測驗證）。
- 多目標適應度函數（結合 Sharpe、Sortino、Profit Factor、勝率與樣本量權重，並重度扣減 Max Drawdown）。
- 產出 Robustness Ratio 指標，自動審核合格策略上線。

#### 🤖 實盤交易與背景進程 (Execution & Daemons)
- **BingX VST 介面封裝 (`BingXVSTClient`, `VSTTrader`)**：
  - 支援模擬實盤合約查詢、槓桿設定、保證金計算、市價/限價訂單發送與倉位追蹤。
- **24/7 自動交易守護進程 (`scripts/auto_trader_daemon.ts`)**：
  - 支援 30 秒間隔全週期全幣種掃描與即時下單。
- **每日自適應重訓腳本 (`scripts/daily_optimize.ts`)**：
  - 每日定時抓取最新 K 棒並自動更新至 Supabase 策略庫。

#### 💻 前端視覺化與儀表板 (Next.js 15 Web Application)
- 基於 Next.js 15 App Router + React 19 + Tailwind CSS。
- 整合 TradingView Lightweight Charts（互動式權益走勢曲線圖與 K 線信號圖）。
- 儀表板首頁 (`/`)、策略管理 (`/strategies`)、審計日誌 (`/reports`) 與 VST 實盤面板 (`/vst`)。
- 支援 PWA 漸進式網頁應用安裝體驗。

#### 🗄️ 雲端持久化 (Supabase PostgreSQL)
- 建立 9 張專業資料庫綱要：
  - `opt_strategies`
  - `opt_backtest_runs`
  - `opt_backtest_trades`
  - `opt_daily_reports`
  - `opt_market_candles`
  - `opt_live_positions`
  - `opt_live_orders`
  - `opt_cron_configs`
  - `opt_cron_logs`

#### 🧪 測試套件 (Test Suites)
- `test/indicators.test.ts`
- `test/backtest.test.ts`
- `test/bingx.test.ts`
- `test/supabase_isolation.test.ts`
- `test/vst_trader.test.ts`
