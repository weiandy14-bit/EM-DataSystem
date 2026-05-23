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

### 架構
```
Frontend (React 19 + Vite + TypeScript + Ant Design)
  → 呼叫 /api/...
  → Cloudflare Workers (TypeScript) — workers/
    → Notion API（5個資料庫）
```

**安全限制（必須維持）**：Notion Token 只放 Cloudflare Workers 環境變數，絕不能進前端程式碼。

### Repository
- GitHub: `weiandy14-bit/EM-DataSystem`
- 開發分支: `claude/friendly-ptolemy-0iAMN`
- PR #4：所有目前變更，尚未 merge 到 main

### 本機開發
```powershell
cd C:\Users\user\EM-DataSystem2\frontend
npm run dev -- --host 0.0.0.0
# 開啟 http://localhost:5173
# 帳號：管理員 / 密碼：1015
```

```
# 拉最新代碼
git pull origin claude/friendly-ptolemy-0iAMN
```

Workers 本機開發 secret（`workers/.dev.vars`，gitignored）：
```
NOTION_TOKEN=ntn_Y36273413265BhEzxfaYMjGKn31aEWz3WujRl6L46nE9fK
```

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

### 待完成事項
1. **使用者操作**：GitHub Secrets 設定（`NOTION_TOKEN`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`）→ 合併 PR #4
2. **前端部署**：建立 `deploy-frontend.yml`，部署到 Cloudflare Pages
3. **前端 API URL 對接**：`VITE_API_BASE_URL` 環境變數指向已部署的 Worker（目前 dev 用 mock）
