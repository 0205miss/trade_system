# 🌐 系統 API 規格與整合參考手冊 (API Reference Manual)

本系統基於 **Next.js 15 App Router** 提供完整的後端 REST API，支援行情數據讀取、策略回測與走步式基因優化運算、BingX VST 實盤持倉管理、以及定時任務（Cron / Webhook）調度。

---

## 📑 目錄 (Table of Contents)

- [基礎設定與回傳格式 (Conventions)](#基礎設定與回傳格式-conventions)
- [1. 行情數據 API (`/api/candles`)](#1-行情數據-api-apicandles)
- [2. 回測與策略優化 API (`/api/optimizer/run`)](#2-回測與策略優化-api-apioptimizerrun)
- [3. BingX VST 實盤交易 API (`/api/vst`)](#3-bingx-vst-實盤交易-api-apivst)
- [4. 全市場自動交易掃描 Webhook (`/api/cron/auto-trade`)](#4-全市場自動交易掃描-webhook-apicronauto-trade)
- [5. 定時任務管理 API (`/api/vst/cron`)](#5-定時任務管理-api-apivstcron)
- [錯誤代碼與異常處理 (Error Handling)](#錯誤代碼與異常處理-error-handling)

---

## 基礎設定與回傳格式 (Conventions)

- **預設基礎路徑**：`http://localhost:3002` (開發環境) 或 生產域名
- **資料格式**：所有請求與回應主體均為 `application/json; charset=utf-8`
- **通用成功結構**：
  ```json
  {
    "success": true,
    "data": { ... }
  }
  ```
- **通用失敗結構**：
  ```json
  {
    "success": false,
    "error": "詳細錯誤原因描述"
  }
  ```

---

## 1. 行情數據 API (`/api/candles`)

提供多週期歷史與即時 K 線查詢，內建 Supabase 快取與記憶體快取層。

### 請求說明
- **端點**：`GET /api/candles`
- **查詢參數 (Query Parameters)**：

| 參數名 | 型別 | 必填 | 預設值 | 說明 |
| :--- | :--- | :---: | :--- | :--- |
| `symbol` | `string` | 否 | `BTC-USDT` | 交易對標的 (如 `ETH-USDT`, `SOL-USDT`) |
| `timeframe` | `string` | 否 | `1h` | 時間週期，可選：`5m`, `15m`, `1h`, `4h` |
| `limit` | `number` | 否 | `500` | 獲取之 K 棒數量上限 (最大 1000) |

### 範例請求
```http
GET /api/candles?symbol=ETH-USDT&timeframe=15m&limit=200 HTTP/1.1
Host: localhost:3002
```

### 範例回應
```json
{
  "success": true,
  "symbol": "ETH-USDT",
  "timeframe": "15m",
  "count": 200,
  "candles": [
    {
      "time": 1731405600000,
      "open": 3150.2,
      "high": 3168.0,
      "low": 3145.5,
      "close": 3162.8,
      "volume": 1284.55
    }
  ]
}
```

---

## 2. 回測與策略優化 API (`/api/optimizer/run`)

觸發單一幣種回測、全投資組合回測、或啟用走步式前向基因演算法（Walk-Forward Genetic Optimizer）。

### 請求說明
- **端點**：`POST /api/optimizer/run`
- **請求體參數 (JSON Body)**：

| 欄位名 | 型別 | 必填 | 預設值 | 說明 |
| :--- | :--- | :---: | :--- | :--- |
| `symbol` | `string` | 否 | `BTC-USDT` | 交易對，或傳入 `"ALL"` 啟動全幣種組合回測 |
| `timeframe` | `string` | 否 | `1h` | 時間週期，或傳入 `"ALL"` |
| `optimize` | `boolean` | 否 | `false` | `true`: 執行基因演算法優化；`false`: 執行單次回測 |
| `mode` | `string` | 否 | `SINGLE` | 可選：`"SINGLE"` 或 `"PORTFOLIO"` |
| `options` | `object` | 否 | `{}` | 優化進階選項 (見下方) |

#### `options` 物件結構
- `inSampleRatio` (`number`, 預設 `0.7`)：樣本內資料比例 (70%)。
- `populationSize` (`number`, 預設 `16`)：遺傳演算法每代群體數量。
- `generations` (`number`, 預設 `3`)：進化代數。

### 範例請求 (單次回測)
```json
{
  "symbol": "SOL-USDT",
  "timeframe": "1h",
  "optimize": false
}
```

### 範例回應 (單次回測)
```json
{
  "success": true,
  "symbol": "SOL-USDT",
  "timeframe": "1h",
  "isOptimized": false,
  "result": {
    "initialCapital": 10000,
    "finalCapital": 11480.5,
    "netProfit": 1480.5,
    "netProfitPct": 14.81,
    "totalTrades": 32,
    "winningTrades": 21,
    "losingTrades": 11,
    "winRate": 65.63,
    "profitFactor": 2.14,
    "sharpeRatio": 1.84,
    "sortinoRatio": 2.45,
    "maxDrawdownPct": 6.82,
    "totalFeesPaid": 78.4,
    "totalSlippageCost": 23.5,
    "trades": [ ... ],
    "equityCurve": [ ... ]
  }
}
```

### 範例請求 (基因演算法優化)
```json
{
  "symbol": "BTC-USDT",
  "timeframe": "15m",
  "optimize": true,
  "options": {
    "inSampleRatio": 0.7,
    "populationSize": 12,
    "generations": 3
  }
}
```

---

## 3. BingX VST 實盤交易 API (`/api/vst`)

查詢 BingX VST 虛擬實盤資產帳戶、當前即時多空持倉、歷史訂單成交紀錄，或手動執行緊急平倉。

### 3.1 查詢 VST 帳戶與持倉
- **端點**：`GET /api/vst`
- **範例回應**：
```json
{
  "success": true,
  "isConfigured": true,
  "balance": {
    "asset": "VST",
    "balance": 100000.0,
    "equity": 101250.4,
    "unrealizedProfit": 1250.4,
    "availableMargin": 95400.0,
    "usedMargin": 4600.0
  },
  "positions": [
    {
      "id": "pos_abc123",
      "symbol": "BTC-USDT",
      "timeframe": "1h",
      "direction": "LONG",
      "entry_price": "91250.0",
      "total_qty": "0.5",
      "remaining_qty": "0.325",
      "current_sl": "91250.0",
      "tp1_price": "92800.0",
      "tp2_price": "94500.0",
      "is_be_triggered": true,
      "status": "OPEN",
      "created_at": "2026-11-12T04:15:00Z"
    }
  ],
  "orders": [ ... ]
}
```

### 3.2 手動觸發市場掃描或平倉
- **端點**：`POST /api/vst`
- **操作一：觸發單一幣種週期信號掃描**
  ```json
  {
    "action": "scan",
    "symbol": "BTC-USDT",
    "timeframe": "1h"
  }
  ```
- **操作二：緊急手動平倉指定持倉**
  ```json
  {
    "action": "close",
    "positionId": "pos_abc123"
  }
  ```

---

## 4. 全市場自動交易掃描 Webhook (`/api/cron/auto-trade`)

專門設計供排程服務（例如 Vercel Cron、雲端外部 Webhook 或 Supabase pg_cron）定期呼叫。自動輪詢所有支援幣種與時間週期，執行撮合開平倉與保本邏輯。

### 請求說明
- **端點**：`GET /api/cron/auto-trade` 或 `POST /api/cron/auto-trade`
- **範例回應**：
```json
{
  "success": true,
  "timestamp": 1731405623000,
  "scannedCount": 36,
  "executedCount": 2,
  "executedActions": [
    {
      "symbol": "SOL-USDT",
      "timeframe": "15m",
      "actionTaken": "OPENED_LONG",
      "currentPrice": 214.5,
      "detail": "RSI Oversold 28.5 + EMA Bullish Cross. Opened Scout Tranche (15%)."
    },
    {
      "symbol": "BTC-USDT",
      "timeframe": "1h",
      "actionTaken": "MOVED_TO_BE",
      "currentPrice": 92950.0,
      "detail": "TP1 target reached. Closed 35% and adjusted SL to Break-Even."
    }
  ],
  "reports": [ ... ]
}
```

---

## 5. 定時任務管理 API (`/api/vst/cron`)

用於管理 Supabase `pg_cron` 與 `pg_net` 整合配置，支援遠端手動觸發與歷史日誌查詢。

### 5.1 查詢 Cron 狀態與日誌
- **端點**：`GET /api/vst/cron`
- **範例回應**：
```json
{
  "success": true,
  "configs": {
    "is_enabled": "true",
    "scan_interval": "60",
    "webhook_url": "https://your-domain.com/api/cron/auto-trade"
  },
  "logs": [
    {
      "id": 105,
      "job_name": "opt-auto-trade-vst",
      "status": "SUCCESS",
      "duration_ms": 1240,
      "created_at": "2026-11-12T06:25:00Z"
    }
  ],
  "jobInfo": {
    "jobName": "opt-auto-trade-vst",
    "schedule": "*/1 * * * * (每 1 分鐘雲端執行)",
    "engine": "Supabase pg_cron + pg_net",
    "active": true
  }
}
```

### 5.2 觸發或更新定時排程
- **端點**：`POST /api/vst/cron`
- **啟用/停用排程**：
  ```json
  {
    "action": "toggle",
    "enabled": true
  }
  ```
- **立即手動觸發一次排程**：
  ```json
  {
    "action": "trigger"
  }
  ```

---

## 錯誤代碼與異常處理 (Error Handling)

當發生錯誤時，API 端點將回傳相應的 HTTP 狀態碼：

| HTTP 狀態碼 | 意義 | 常見原因 |
| :---: | :--- | :--- |
| `200 OK` | 請求處理成功 | 正確返回數據 |
| `400 Bad Request` | 參數有誤 | 缺少必填參數或提供了不支援的交易對/週期 |
| `401 Unauthorized` | 憑證無效或缺少登入 | 未通過 Supabase Auth 身分驗證 |
| `403 Forbidden` | 權限不足 | API 密鑰權限不足以執行合約交易 |
| `429 Too Many Requests` | 超出交易所速率限制 | BingX REST API 頻率超標，建議增加快取使用率 |
| `500 Internal Server Error` | 伺服器端錯誤 | 資料庫連線異常或計算邏輯異常 |
