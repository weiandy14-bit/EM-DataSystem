/**
 * EM-DataSystem: 從 Excel 批次匯入設備資料到 Notion
 *
 * 使用方式（Windows PowerShell）：
 *   $env:NOTION_TOKEN="ntn_xxxx..."
 *   node import-to-notion.mjs "C:\路徑\Excel資料夾"
 *
 * 安裝依賴：
 *   npm install xlsx @notionhq/client
 */

import { Client } from '@notionhq/client'
import * as XLSX from 'xlsx'
import fs from 'fs'
import path from 'path'

// ─── 設定 ────────────────────────────────────────────────
const NOTION_TOKEN = process.env.NOTION_TOKEN
if (!NOTION_TOKEN) {
  console.error('❌ 請設定環境變數 NOTION_TOKEN')
  process.exit(1)
}

const EQUIPMENT_DB  = '3690d834d60e81cc840ed14beced0b1c'
const PRICING_DB    = '3690d834d60e819eb135dbf929e02c79'

// Notion API 速率限制：每秒最多 3 個請求
const RATE_LIMIT_MS = 350

const notion = new Client({ auth: NOTION_TOKEN })

// ─── 工具函式 ────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function withRetry(fn, maxAttempts = 4) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn()
    } catch (err) {
      const isTransient = err.message?.includes('fetch failed') ||
        err.message?.includes('network') ||
        err.status === 429 || err.status === 502 || err.status === 503
      if (!isTransient || i === maxAttempts - 1) throw err
      await sleep(2000 * Math.pow(2, i))
    }
  }
}

function richText(val) {
  const s = val == null ? '' : String(val).trim()
  if (!s) return []
  return [{ type: 'text', text: { content: s.substring(0, 2000) } }]
}

function toDateStr(val) {
  if (!val) return null
  if (val instanceof Date) {
    return val.toISOString().split('T')[0]
  }
  const s = String(val).trim()
  // 格式：2019-12-02 or 2019/12/02
  const m = s.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`
  return null
}

// ─── 建立 Equipment 頁面 ──────────────────────────────────
async function createEquipment(row) {
  const props = {
    '設備名稱': { title: richText(row.設備名稱) },
  }
  if (row.設備類別)    props['設備類別']    = { select: { name: String(row.設備類別) } }
  if (row.型號)        props['型號']        = { rich_text: richText(row.型號) }
  if (row.廠牌)        props['廠牌']        = { rich_text: richText(row.廠牌) }
  if (row.狀態)        props['狀態']        = { select: { name: String(row.狀態) } }
  if (row.位置)        props['位置']        = { rich_text: richText(row.位置) }
  if (row.建築類別)    props['建築類別']    = { select: { name: String(row.建築類別) } }
  if (row.公共工程編碼) props['公共工程編碼'] = { rich_text: richText(row.公共工程編碼) }
  if (row.產地)        props['產地']        = { rich_text: richText(row.產地) }
  if (row.代理商)      props['代理商']      = { rich_text: richText(row.代理商) }
  if (row.規格細項)    props['規格細項']    = { rich_text: richText(row.規格細項) }
  if (row.備註)        props['備註']        = { rich_text: richText(row.備註) }
  const dateStr = toDateStr(row.安裝日期)
  if (dateStr)         props['安裝日期']    = { date: { start: dateStr } }
  if (row.單價 != null && row.單價 !== '') {
    const n = Number(row.單價)
    if (!isNaN(n))     props['單價']        = { number: n }
  }
  const inquiryDateStr = toDateStr(row.報價日期)
  if (inquiryDateStr)  props['報價日期']    = { date: { start: inquiryDateStr } }
  if (row.案件工號)    props['案件工號']    = { rich_text: richText(row.案件工號) }

  const page = await notion.pages.create({
    parent: { database_id: EQUIPMENT_DB },
    properties: props,
  })
  return page.id
}

// ─── 建立 PricingRecord 頁面 ──────────────────────────────
async function createPricing(row, equipmentId) {
  const title = row.案件工號 || row.caseFromSheet || '未知案件'
  const props = {
    '案件工號': { title: richText(title) },
    '設備': { relation: [{ id: equipmentId }] },
  }
  if (row.供應商) props['供應商'] = { rich_text: richText(row.供應商) }
  if (row.單價 != null && row.單價 !== '') {
    const n = Number(row.單價)
    if (!isNaN(n)) props['單價'] = { number: n }
  }
  const dateStr = toDateStr(row.報價日期)
  if (dateStr) props['詢價日期'] = { date: { start: dateStr } }
  props['來源類型'] = { select: { name: 'quote' } }

  await notion.pages.create({
    parent: { database_id: PRICING_DB },
    properties: props,
  })
}

// ─── 解析單一 Excel 檔 ────────────────────────────────────
function parseExcel(filePath) {
  const wb = XLSX.read(fs.readFileSync(filePath), { cellDates: true, type: 'buffer' })
  // 取第一個工作表（跳過說明/清單等固定工作表）
  const skipSheets = new Set(['工作表說明', '清單', '所有項目內容文字都不可以用逗號', '綱要編碼章節對照表'])
  const sheetName = wb.SheetNames.find(n => !skipSheets.has(n))
  if (!sheetName) return []

  const ws = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null })
  if (!rows.length) return []

  // 群組標題列繼承邏輯：當設備名稱為空時，更新當前類別/狀態/建築
  let cur = { 設備類別: null, 狀態: null, 建築類別: null }
  const result = []

  for (const row of rows) {
    if (!row['設備名稱']) {
      // 群組標題列：更新繼承值
      if (row['設備類別'])  cur.設備類別  = row['設備類別']
      if (row['狀態'])      cur.狀態      = row['狀態']
      if (row['建築類別'])  cur.建築類別  = row['建築類別']
      continue
    }

    result.push({
      caseFromSheet: sheetName,
      案件工號:     row['案件工號']    || null,
      公共工程編碼: row['公共工程編碼'] || null,
      設備名稱:     String(row['設備名稱']).trim(),
      產地:         row['產地']        || null,
      設備類別:     row['設備類別']    || cur.設備類別,
      狀態:         row['狀態']        || cur.狀態 || 'active',
      建築類別:     row['建築類別']    || cur.建築類別,
      位置:         row['位置']        || null,
      廠牌:         row['廠牌']        || null,
      型號:         row['型號']        || null,
      供應商:       row['供應商']      || null,
      代理商:       row['供應商']      || null,  // 供應商也填入代理商
      單位:         row['單位']        || null,
      單價:         row['單價']        || null,
      規格細項:     row['規格細項']    || null,
      報價日期:     row['報價日期']    || null,
      安裝日期:     row['驗收日期']    || null,  // 以驗收日期近似安裝日期
      備註:         [row['備註'], row['原檔連結']].filter(Boolean).join(' | ') || null,
    })
  }

  return result
}

// ─── 主程式 ───────────────────────────────────────────────
async function main() {
  const folder = process.argv[2]
  if (!folder) {
    console.error('用法: node import-to-notion.mjs <Excel資料夾路徑>')
    process.exit(1)
  }

  const files = fs.readdirSync(folder)
    .filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'))
    .map(f => path.join(folder, f))

  console.log(`找到 ${files.length} 個 Excel 檔案`)

  let totalRows = 0, success = 0, failed = 0

  for (const [fi, filePath] of files.entries()) {
    const fileName = path.basename(filePath)
    const rows = parseExcel(filePath)
    console.log(`\n[${fi+1}/${files.length}] ${fileName}: ${rows.length} 筆`)

    for (const [ri, row] of rows.entries()) {
      totalRows++
      try {
        // 建立 Equipment
        await sleep(RATE_LIMIT_MS)
        const eqId = await withRetry(() => createEquipment(row))

        // 建立 PricingRecord（只在有報價資訊時建立）
        if (row.單價 || row.報價日期 || row.供應商) {
          await sleep(RATE_LIMIT_MS)
          await withRetry(() => createPricing(row, eqId))
        }

        success++
        process.stdout.write(`  ✅ [${ri+1}/${rows.length}] ${row.設備名稱}\r`)
      } catch (err) {
        failed++
        console.error(`\n  ❌ [${ri+1}] ${row.設備名稱}: ${err.message}`)
      }
    }
  }

  console.log(`\n\n========== 完成 ==========`)
  console.log(`總計 ${totalRows} 筆 | 成功 ${success} | 失敗 ${failed}`)
}

main().catch(err => { console.error(err); process.exit(1) })
