# 🛡️ 安全性格局與資安方針 (Security Policy)

本專案涉及到交易所 API 金鑰（API Key & Secret）以及自動化交易撮合執行，資訊安全至關重要。請仔細閱讀以下資安準則與漏洞回報機制。

---

## 1. 支援版本 (Supported Versions)

| 版本 | 支援資安修正 |
| :---: | :---: |
| 1.0.x | :white_check_mark: 目前支援 |

---

## 2. API 金鑰與敏感資訊管理規範

1. **嚴禁將金鑰提交至 Git 版本庫**：
   - 本專案預設在 `.gitignore` 中排除了 `.env`、`.env.local`、`*.pem` 等敏感設定檔。
   - 請勿在程式碼、註解、或公開 Issue 中硬編碼任何真實 API Key、API Secret 或 Supabase Service Role Key。
2. **交易所金鑰權限最小化原則**：
   - 建立 BingX API Key 時，**絕對不要勾選「提現 (Withdrawal)」或「劃轉 (Transfer)」權限**。
   - 僅需勾選「合約讀取 (Futures Read)」與「合約交易 (Futures Trade)」。
3. **IP 白名單綁定 (IP Whitelisting)**：
   - 生產環境部署時，務必在 BingX API 管理後台將 API Key 綁定至伺服器的固定對外靜態 IP。
4. **模擬盤環境優先**：
   - 開發、測試與回測期間，一律使用 BingX VST 虛擬實盤或離線 K 線快取。

---

## 3. 回報資安弱點 (Reporting a Vulnerability)

若您在系統中發現任何潛在的資安漏洞（包括但不限於金鑰暴露、未授權端點存取、交易參數注入風險）：

- 請**勿公開發布**公開 Issue。
- 請透過私人信件向專案維護團隊或建立 GitHub Security Advisory 進行回報。
- 團隊將於 48 小時內確認問題並安排修補。
