# 🤝 開發者貢獻與擴充指南 (Developer Contributing Guide)

感謝您對 **Crypto Strategy Optimizer & VST Automated Trading System** 的關注與貢獻！  
本指南旨在協助開發人員快速理解專案規範、進行功能擴充（例如新增技術指標、支援更多交易幣種）、編寫單元測試並遵循 Git 協作流程。

---

## 📑 目錄 (Table of Contents)

- [開發環境要求 (Prerequisites)](#開發環境要求-prerequisites)
- [程式碼風格與規範 (Coding Standards)](#程式碼風格與規範-coding-standards)
- [如何新增自訂技術指標 (Adding a New Indicator)](#如何新增自訂技術指標-adding-a-new-indicator)
- [如何新增支援幣種 (Adding a New Supported Symbol)](#如何新增支援幣種-adding-a-new-supported-symbol)
- [測試規範與執行 (Testing Guidelines)](#測試規範與執行-testing-guidelines)
- [分支管理與 Pull Request 流程 (PR Workflow)](#分支管理與-pull-request-流程-pr-workflow)

---

## 開發環境要求 (Prerequisites)

- **Node.js**: >= 20.0.0 (建議 Node 22.x LTS)
- **TypeScript**: 5.7+
- **套件管理器**: `npm` (或相容之 `pnpm` / `yarn`)
- **VS Code 推薦套件**：ESLint, Prettier, Tailwind CSS IntelliSense, Even Better TOML.

---

## 程式碼風格與規範 (Coding Standards)

1. **嚴格型別定義 (Strict TypeScript)**：
   - 儘量避免使用 `any`，請於 `src/lib/engine/types.ts` 定義清晰的介面與型別別名。
2. **無副作用函數 (Pure Math Functions)**：
   - 指標計算（`src/lib/engine/indicators/`）必須為純函數，輸入數據陣列，輸出數值陣列或信號物件，不依賴外部全域狀態或 I/O 操作。
3. **錯誤防禦與優雅降級**：
   - 陣列取值請檢查邊界（如 `array.length < period` 時安全回傳 `null` 或預設值）。
   - 浮點數除法請主動防範除以零（`division by zero`）。

---

## 如何新增自訂技術指標 (Adding a New Indicator)

若您想在策略引擎中加入全新的技術指標（例如 Hull Moving Average - HMA）：

### 步驟 1：於指標模組中實作數學公式
依指標屬性放入對應的資料夾檔案（如 `src/lib/engine/indicators/trend.ts`）：

```typescript
/**
 * Hull Moving Average (HMA) 實作範例
 * HMA = WMA(2 * WMA(n/2) - WMA(n), sqrt(n))
 */
export function calculateHMA(values: number[], period = 14): (number | null)[] {
  if (values.length < period) return new Array(values.length).fill(null);
  
  // 實作 WMA 與 HMA 數學計算...
  // 回傳與原始 values 等長之 (number | null)[]
}
```

### 步驟 2：於 `src/lib/engine/indicators/index.ts` 匯出
```typescript
export * from './trend';
// 確保 calculateHMA 成功匯出
```

### 步驟 3：擴充指標設定型別
開啟 `src/lib/engine/types.ts`，在 `IndicatorsConfig` 介面中新增欄位：

```typescript
export interface IndicatorsConfig {
  // ...現有指標設定
  hmaPeriod?: number; // 新增 HMA 週期參數
}
```

### 步驟 4：於回測撮合器整合信號
開啟 `src/lib/engine/backtester.ts`，在信號判斷條件（`Long Condition` / `Short Condition`）中加入 HMA 交叉或斜率判斷。

### 步驟 5：編寫單元測試
在 `test/indicators.test.ts` 中新增該指標的數值準確度斷言測試：
```typescript
const hma = calculateHMA(sampleCloses, 14);
assert(hma.length === sampleCloses.length, 'HMA length must match');
console.log('✅ HMA verified.');
```

---

## 如何新增支援幣種 (Adding a New Supported Symbol)

本系統支援的交易對集中定義於 `src/lib/engine/types.ts`。

若要在掃描矩陣與回測系統中加入例如 `DOGE-USDT`：

1. 開啟 `src/lib/engine/types.ts`：
   ```typescript
   export const SUPPORTED_SYMBOLS = [
     'BTC-USDT',
     'ETH-USDT',
     'SOL-USDT',
     'BNB-USDT',
     'XRP-USDT',
     'ADA-USDT',
     'LINK-USDT',
     'XLM-USDT',
     'HYPE-USDT',
     'DOGE-USDT', // <-- 在此新增交易對
   ] as const;
   ```
2. 系統的前端下拉選單、後端回測 API、每日優化腳本及 24/7 守護進程將自動同步納入新幣種掃描。

---

## 測試規範與執行 (Testing Guidelines)

任何修改或新功能在發起 Pull Request 前，均必須通過現有測試套件：

```bash
# 1. 驗證所有技術指標演算法準確性
npm run test:indicators

# 2. 驗證撮合回測引擎、手續費扣除與滑點計算
npm run test:backtest

# 3. 驗證 BingX 交易所連線狀態
npm run test:bingx
```

---

## 分支管理與 Pull Request 流程 (PR Workflow)

1. **Fork 本儲存庫** 至您的個人帳號。
2. **建立功能分支 (Feature Branch)**：
   ```bash
   git checkout -b feature/awesome-indicator
   ```
3. **提交變更 (Commit Messages)**：遵循 Conventional Commits 規範：
   - `feat: add Hull Moving Average (HMA) indicator`
   - `fix: resolve division by zero in RVOL calculation`
   - `perf: optimize candle cache memory footprint`
   - `test: add unit tests for stochastic RSI`
4. **推送分支並發起 PR (Pull Request)**：
   - 清楚描述修改的內容、測試結果與預期效果。
   - 等待 CI 與維護者審查 (Code Review)。
