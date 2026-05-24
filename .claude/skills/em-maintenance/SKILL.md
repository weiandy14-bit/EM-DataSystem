# EM-DataSystem 網路維護檢查 SKILL

當使用者輸入 `/em-maintenance` 時，執行以下完整的系統維護檢查流程。

---

## 執行步驟

### STEP 1 — 讀取系統現狀

先讀取以下檔案，掌握目前系統狀態：
- `CLAUDE.md`：系統架構與設定
- `workers/wrangler.toml`：Workers 設定與 KV binding
- `.github/workflows/deploy-frontend.yml`
- `.github/workflows/deploy-workers.yml`

---

### STEP 2 — 程式碼健康檢查

依序執行：

```bash
# 前端 TypeScript 型別檢查
cd frontend && npx tsc --noEmit

# Workers TypeScript 型別檢查
cd workers && npx tsc --noEmit
```

回報：通過 ✅ 或錯誤清單 ❌

---

### STEP 3 — 依賴套件檢查

```bash
# 檢查前端套件版本（找出重大過期）
cd frontend && npm outdated 2>/dev/null | head -20

# 檢查 Workers 套件版本
cd workers && npm outdated 2>/dev/null | head -20
```

回報：需要升級的套件清單（只列 major version 過期的）

---

### STEP 4 — 安全性掃描

```bash
# 前端安全漏洞
cd frontend && npm audit --audit-level=high 2>/dev/null

# Workers 安全漏洞
cd workers && npm audit --audit-level=high 2>/dev/null
```

回報：高危漏洞清單（low/moderate 可忽略）

---

### STEP 5 — 設定完整性檢查

確認以下項目是否正確：

**wrangler.toml 必要設定：**
- `AUTH_KV` binding 的 `id` 不是 `REPLACE_WITH_KV_ID`
- 5 個 Notion DB ID 都已填入（非空）

**deploy-frontend.yml 必要設定：**
- `VITE_USE_MOCK: 'false'`（生產環境不能用 mock）
- `VITE_API_BASE: ${{ vars.VITE_API_BASE }}`（不能 hardcode URL）
- node-version 是 `'24'`（不是舊版）

**deploy-workers.yml 必要設定：**
- node-version 是 `'24'`

---

### STEP 6 — 安全規則驗證

掃描前端程式碼，確認沒有洩漏機密：

```bash
# 確認前端沒有直接使用 NOTION_TOKEN
grep -r "NOTION_TOKEN\|ntn_" frontend/src/ 2>/dev/null

# 確認前端沒有 hardcode Cloudflare 帳號資訊
grep -r "279f7f87\|AUTH_KV" frontend/src/ 2>/dev/null

# 確認 .dev.vars 沒有被 commit
git ls-files workers/.dev.vars 2>/dev/null
```

回報：若有任何輸出則為安全風險 ❌，無輸出則安全 ✅

---

### STEP 7 — API 端點清單確認

確認 `workers/src/index.ts` 中所有路由都有：
1. 認證保護（除 `/api/auth/*` 外都呼叫 `verifySession`）
2. CORS 標頭正確（包含 `Authorization`）

---

### STEP 8 — 產出維護報告

格式如下：

```
## EM-DataSystem 維護檢查報告
檢查時間：YYYY-MM-DD

### 整體狀態：✅ 健康 / ⚠️ 需注意 / ❌ 需修復

| 檢查項目 | 狀態 | 說明 |
|----------|------|------|
| 前端 TypeScript | ✅/❌ | ... |
| Workers TypeScript | ✅/❌ | ... |
| 前端安全漏洞 | ✅/⚠️/❌ | ... |
| Workers 安全漏洞 | ✅/⚠️/❌ | ... |
| wrangler.toml 設定 | ✅/❌ | ... |
| CI/CD workflow 設定 | ✅/❌ | ... |
| 安全規則（Token 未外洩）| ✅/❌ | ... |
| API 認證保護 | ✅/❌ | ... |

### 需要處理的問題：
（列出所有 ❌ 項目的具體修復建議）

### 建議升級的套件：
（列出 major version 過期的套件）
```

---

## 快速修復指令參考

**前端套件安全修復：**
```bash
cd frontend && npm audit fix
```

**Workers 套件安全修復：**
```bash
cd workers && npm audit fix
```

**重設管理員密碼（需先刪除 KV 中 `user:管理員`）：**
```powershell
$bytes = [System.Text.Encoding]::UTF8.GetBytes('{"username":"管理員","password":"新密碼"}')
Invoke-WebRequest -Uri "https://em-datasystem-api.weiandy14.workers.dev/api/auth/init" -Method POST -Headers @{"Content-Type"="application/json; charset=utf-8"} -Body $bytes -UseBasicParsing
```

**手動觸發部署：**
- 前端：GitHub Actions → Deploy Frontend → Run workflow
- Workers：GitHub Actions → Deploy Workers API → Run workflow

---

## 系統關鍵網址速查

| 用途 | 網址 |
|------|------|
| 前端 | `https://em-datasystem.pages.dev` |
| Workers API | `https://em-datasystem-api.weiandy14.workers.dev` |
| GitHub Actions | `https://github.com/weiandy14-bit/EM-DataSystem/actions` |
| Cloudflare Dashboard | `https://dash.cloudflare.com` |
| Notion 資料庫 | `https://notion.so`（搜尋 Equipment / Materials 等） |
