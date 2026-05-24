# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## 專案資訊：EM-DataSystem

### 系統架構流程圖

```
┌─────────────────────────────────────────────────────────┐
│                      使用者瀏覽器                         │
│         https://em-datasystem.pages.dev                 │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Cloudflare Pages（前端）                     │
│   React 19 + Vite + TypeScript + Ant Design             │
│                                                         │
│  登入頁面 → 取得 Bearer Token                            │
│  查詢頁面 → 帶 Token 呼叫 API                             │
└──────────────────────────┬──────────────────────────────┘
                           │ Bearer Token + HTTPS
                           ▼
┌─────────────────────────────────────────────────────────┐
│         Cloudflare Workers（後端 API）                    │
│   https://em-datasystem-api.weiandy14.workers.dev       │
│                                                         │
│  /api/auth/*  ─────────────────────────► Cloudflare KV  │
│                   驗證 Token / 管理帳號     (AUTH_KV)    │
│                                                         │
│  /api/equipment                                         │
│  /api/materials  ──────────────────────► Notion API     │
│  /api/specs          需有效 Token          (5個資料庫)   │
│  /api/pricing                                           │
│  /api/inspection                                        │
└─────────────────────────────────────────────────────────┘
                           │                    │
              ┌────────────┘                    │
              ▼                                 ▼
┌─────────────────────┐           ┌─────────────────────────┐
│   Cloudflare KV     │           │      Notion 資料庫       │
│   (AUTH_KV)         │           │                         │
│                     │           │  Equipment（設備主檔）   │
│  user:<帳號>        │           │  Materials（材料主檔）   │
│  → 帳號 + 密碼Hash  │           │  Specifications（規格）  │
│                     │           │  PricingRecords（費用）  │
│  session:<UUID>     │           │  InspectionRecords（驗收）│
│  → 使用者 + 角色    │           └─────────────────────────┘
│  → TTL 7天          │
└─────────────────────┘

CI/CD 部署流程：
  git push → main branch
       ├─ frontend/** 有變動 → Deploy Frontend workflow
       │       → npm build → wrangler pages deploy
       │       → https://em-datasystem.pages.dev 更新
       │
       └─ workers/** 有變動 → Deploy Workers API workflow
               → wrangler secret put NOTION_TOKEN
               → wrangler deploy
               → https://em-datasystem-api.weiandy14.workers.dev 更新
```

---

### 架構摘要
```
Frontend (React 19 + Vite + TypeScript + Ant Design)
  → 呼叫 /api/... (Bearer Token)
  → Cloudflare Workers (TypeScript) — workers/
    ├→ Cloudflare KV (AUTH_KV) — 帳號/Session 管理
    └→ Notion API（5個資料庫）
```

**安全限制（必須維持）**：Notion Token 只放 Cloudflare Workers 環境變數，絕不能進前端程式碼。

---

### Repository 資訊
- GitHub: `weiandy14-bit/EM-DataSystem`
- 主分支: `main`（所有功能已上線）
- 開發分支: `claude/friendly-ptolemy-0iAMN`

---

### 線上網址
| 服務 | 網址 |
|------|------|
| 前端 | `https://em-datasystem.pages.dev` |
| Workers API | `https://em-datasystem-api.weiandy14.workers.dev` |

---

### 重要檔案位置

#### 前端 `frontend/src/`
| 檔案 | 用途 |
|------|------|
| `auth.ts` | 登入/登出/使用者管理（async，生產呼叫 Workers API） |
| `api/index.ts` | 所有 API 呼叫，自動帶 Bearer Token |
| `types.ts` | 所有 TypeScript 型別定義 |
| `App.tsx` | 主結構：Header + 路由 + 登入狀態 |
| `pages/Login.tsx` | 登入頁面 |
| `pages/EquipmentList.tsx` | 主查詢頁（篩選、查詢歷史、拖曳欄位、匯出） |
| `pages/UserManagement.tsx` | 使用者管理頁（管理員專用） |
| `components/SpecHistory.tsx` | 規格歷史元件 |
| `mock/data.ts` | 開發用假資料（USE_MOCK=true 時使用） |

#### Workers `workers/src/`
| 檔案 | 用途 |
|------|------|
| `index.ts` | 路由總入口，CORS 設定，Token 驗證中介層 |
| `notion.ts` | Notion API 呼叫、Env 介面、資料 mapper |
| `routes/auth.ts` | 登入/登出/me/init/使用者 CRUD |
| `routes/equipment.ts` | 設備查詢（列表 + 單筆） |
| `routes/materials.ts` | 材料查詢（列表 + 單筆） |
| `routes/specs.ts` | 規格歷史查詢 |
| `routes/pricing.ts` | 費用記錄查詢 |
| `routes/inspection.ts` | 驗收記錄查詢 |
| `wrangler.toml` | Workers 設定（Notion DB IDs、KV binding） |

#### CI/CD `.github/workflows/`
| 檔案 | 觸發條件 | 用途 |
|------|----------|------|
| `deploy-workers.yml` | push main，workers/** 有變動 | 部署 Workers API |
| `deploy-frontend.yml` | push main，frontend/** 有變動 | 部署前端 |

---

### 本機開發

**前端開發（Windows PowerShell）：**
```powershell
cd C:\Users\user\EM-DataSystem2\frontend
npm run dev -- --host 0.0.0.0
# 開啟 http://localhost:5173
# 帳號：管理員 / 密碼：1015（使用 localStorage mock）
```

**拉最新代碼：**
```powershell
git pull origin main
```

**Workers 本機開發 secret**（`workers/.dev.vars`，gitignored）：
```
NOTION_TOKEN=ntn_Y36273413265BhEzxfaYMjGKn31aEWz3WujRl6L46nE9fK
```

---

### Cloudflare 資源

| 資源 | 名稱 / ID |
|------|-----------|
| Workers 專案 | `em-datasystem-api` |
| Pages 專案 | `em-datasystem` |
| KV Namespace | `AUTH_KV` / `5d43a09ec41c4bc08c940d0964ca8759` |
| Account ID | `279f7f87bea3686ee6abe620cbcf4b7b` |

---

### GitHub Secrets（repo Settings → Secrets → Actions）
| Secret | 用途 |
|--------|------|
| `NOTION_TOKEN` | Notion Integration Token |
| `CLOUDFLARE_API_TOKEN` | Cloudflare 部署權限 |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 帳號 ID |

### GitHub Variables（repo Settings → Variables → Actions）
| Variable | 值 |
|----------|-----|
| `VITE_API_BASE` | `https://em-datasystem-api.weiandy14.workers.dev/api` |

---

### Notion 資料庫 ID
| 資料庫 | ID |
|--------|-----|
| Equipment（設備主檔） | `3690d834d60e81cc840ed14beced0b1c` |
| Materials（材料主檔） | `3690d834d60e81bcb6bee7bea490ca2f` |
| Specifications（規格版本歷史） | `3690d834d60e8139b68dc600f5bc1653` |
| PricingRecords（費用記錄） | `3690d834d60e819eb135dbf929e02c79` |
| InspectionRecords（檢查記錄） | `3690d834d60e816a9759c2297a7805eb` |

### Notion 欄位結構（最終版）

**Equipment**：設備名稱(title), 設備類別(select), 型號, 廠牌, 安裝日期(date), 狀態(select: active/decommissioned), 位置, 建築類別(select), 公共工程編碼, 產地, 特殊項目, 代理商, 規格細項, 備註
＋ 反向 Relation：規格歷史, 費用記錄, 驗收記錄

**Materials**：材料名稱(title), 材料類別(select), 等級規格, 單位, 供應商
＋ 反向 Relation：規格歷史, 費用記錄, 驗收記錄

**Specifications**：版本標籤(title), 設備(relation→Equipment), 材料(relation→Materials), 生效日期(date), 失效日期(date), 規格資料(text/JSON), 變更摘要

**PricingRecords**：案件工號(title), 設備(relation→Equipment), 材料(relation→Materials), 單價(number), 詢價日期(date), 供應商, 來源類型(select: contract/quote/actual/estimate), 備註

**InspectionRecords**：驗收人員(title), 設備(relation→Equipment), 材料(relation→Materials), 驗收日期(date), 驗收結果(select: pass/fail/conditional), 發現事項, 資料名稱

### Workers 查詢方式（Relation-based）
```typescript
// Specs/Pricing/Inspections 查詢用 Relation，不用文字 EntityId
{ property: '設備', relation: { contains: equipmentPageId } }
{ property: '材料', relation: { contains: materialPageId } }
// entityType/entityId 從 relation 欄位判斷，不從文字欄位讀
```

---

### 更新操作指引

#### 新增 / 修改資料
- **設備、材料、費用、驗收資料** → 直接在 Notion 資料庫編輯，前端查詢即時反映
- **新增使用者** → 登入系統 → 右上角「使用者管理」→ 新增使用者
- **刪除使用者** → 同上頁面操作

#### 修改程式碼後部署
- 任何 `frontend/` 變動 push 到 `main` → 自動觸發前端部署（約 1 分鐘）
- 任何 `workers/` 變動 push 到 `main` → 自動觸發 Workers 部署（約 1 分鐘）
- 部署狀態：`https://github.com/weiandy14-bit/EM-DataSystem/actions`

#### 新增 Notion 欄位後同步程式碼
1. 在 Notion 資料庫新增欄位
2. 在 `workers/src/notion.ts` 對應的 mapper 函式新增欄位讀取
3. 在 `frontend/src/types.ts` 新增對應 TypeScript 型別
4. push → 自動部署

---

### 故障排除

| 問題 | 排查位置 | 處理方式 |
|------|----------|----------|
| 前端登入失敗 | 確認 Workers API 是否正常 | 瀏覽器開啟 `https://em-datasystem-api.weiandy14.workers.dev/api/auth/me` 確認回應 |
| API 回傳 401 | Session 過期或 Token 遺失 | 重新登入 |
| API 回傳 500 | Workers 執行錯誤 | Cloudflare Dashboard → Workers & Pages → em-datasystem-api → Logs |
| 前端部署失敗 | GitHub Actions | Actions → Deploy Frontend → 查看錯誤 log |
| Workers 部署失敗 | GitHub Actions | Actions → Deploy Workers API → 查看錯誤 log |
| 忘記管理員密碼 | Cloudflare KV | Dashboard → Storage & Databases → Workers KV → AUTH_KV → 刪除 `user:管理員` → 重新呼叫 `/api/auth/init` |
| 查詢無資料 | Notion 連線 | 確認 `NOTION_TOKEN` Secret 仍有效；Token 在 Notion Integration 設定頁可查看 |
| Cloudflare Token 過期 | GitHub Secret | 重新建立 Cloudflare API Token，更新 GitHub Secret `CLOUDFLARE_API_TOKEN` |
