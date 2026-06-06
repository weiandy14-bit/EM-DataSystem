#!/usr/bin/env node
/**
 * 批次將 Equipment.規格細項 匯入 Specifications.規格資料
 *
 * 用法：
 *   NOTION_TOKEN=secret_xxx \
 *   NOTION_DB_SPECIFICATIONS=<db_id> \
 *   NOTION_DB_EQUIPMENT=<db_id> \
 *   node scripts/seed-specs.mjs
 *
 * 只更新「規格資料為空」的 Specification 記錄，不會覆蓋已有內容的記錄。
 */

const TOKEN = process.env.NOTION_TOKEN
const DB_SPECS = process.env.NOTION_DB_SPECIFICATIONS
const DB_EQUIP = process.env.NOTION_DB_EQUIPMENT

if (!TOKEN || !DB_SPECS || !DB_EQUIP) {
  console.error('缺少必要環境變數：NOTION_TOKEN, NOTION_DB_SPECIFICATIONS, NOTION_DB_EQUIPMENT')
  process.exit(1)
}

const HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
  'Notion-Version': '2022-06-28',
  'Content-Type': 'application/json',
}

// --- Notion API helpers ---

async function notionPost(path, body) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Notion API ${res.status}: ${err}`)
  }
  return res.json()
}

async function notionPatch(path, body) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method: 'PATCH',
    headers: HEADERS,
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Notion API ${res.status}: ${err}`)
  }
  return res.json()
}

async function notionGet(path) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method: 'GET',
    headers: HEADERS,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Notion API ${res.status}: ${err}`)
  }
  return res.json()
}

/** 取得資料庫所有記錄（自動翻頁） */
async function queryAll(dbId, filter) {
  const results = []
  let cursor
  do {
    const body = { page_size: 100 }
    if (filter) body.filter = filter
    if (cursor) body.start_cursor = cursor
    const data = await notionPost(`/databases/${dbId}/query`, body)
    results.push(...data.results)
    cursor = data.has_more ? data.next_cursor : null
  } while (cursor)
  return results
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// --- 欄位提取 ---

function getText(prop) {
  if (!prop) return ''
  if (prop.type === 'title') return prop.title?.map(t => t.plain_text).join('') ?? ''
  if (prop.type === 'rich_text') return prop.rich_text?.map(t => t.plain_text).join('') ?? ''
  return ''
}

function getDate(prop) {
  return prop?.date?.start ?? ''
}

function getRelationIds(prop) {
  return prop?.relation?.map(r => r.id) ?? []
}

// --- 規格細項解析 ---

/**
 * 將 規格細項 字串解析為 {key: value} 物件
 *
 * 支援兩種格式：
 *   格式1（<br>分隔數字編號）："1.冷凍能力:900RT/<br>2.電壓:3P/380V/60HZ<br>..."
 *   格式2（/分隔）："數量:5台/循環水量:16434 LPM/入口39℃/..."
 */
function parseSpecDetail(raw) {
  if (!raw || !raw.trim()) return {}

  // 將 <br> 標籤換成換行
  const normalized = raw.replace(/<br\s*\/?>/gi, '\n').trim()

  // 格式1：含有換行符號，表示每行為一個規格項目
  if (normalized.includes('\n')) {
    const result = {}
    for (const line of normalized.split('\n')) {
      // 去掉開頭的數字序號（"1." "2." 等）和尾部斜線
      const seg = line.trim().replace(/^\d+[.)]\s*/, '').replace(/\/$/, '')
      if (!seg) continue
      const colonIdx = seg.indexOf(':')
      if (colonIdx > 0) {
        const key = seg.slice(0, colonIdx).trim()
        const value = seg.slice(colonIdx + 1).trim()
        if (key && value) result[key] = value
      }
    }
    return Object.keys(result).length > 0 ? result : { 規格: normalized }
  }

  // 格式2：/分隔，逐段解析
  // 規則：
  //   - 如果段落含有 ":"，且冒號前的部分是純中文/短文字 → 新的 key:value
  //   - 如果段落以中文字開頭但無冒號 → 新 key，剩餘為 value（如 "入口39℃"）
  //   - 否則 → 附加到前一個 key 的 value
  const parts = normalized.split('/')
  const result = {}
  let currentKey = ''
  let currentValue = ''

  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue

    const colonIdx = trimmed.indexOf(':')
    const beforeColon = colonIdx > 0 ? trimmed.slice(0, colonIdx) : ''
    const isValidKey = colonIdx > 0 && colonIdx <= 15 &&
      /^[一-鿿\w]+$/.test(beforeColon)

    if (isValidKey) {
      // 新的 key:value
      if (currentKey) result[currentKey] = currentValue
      currentKey = beforeColon.trim()
      currentValue = trimmed.slice(colonIdx + 1).trim()
    } else {
      // 沒有冒號但開頭是中文 → 拆出中文 key 和後面的數值
      const chineseKeyMatch = trimmed.match(/^([一-鿿]{1,10})(.+)$/)
      if (chineseKeyMatch) {
        if (currentKey) result[currentKey] = currentValue
        currentKey = chineseKeyMatch[1]
        currentValue = chineseKeyMatch[2].trim()
      } else {
        // 附加到前一個 value
        currentValue = currentValue ? `${currentValue}/${trimmed}` : trimmed
      }
    }
  }
  if (currentKey) result[currentKey] = currentValue

  return Object.keys(result).length > 0 ? result : { 規格: normalized }
}

// --- 主程式 ---

async function main() {
  console.log('🔍 查詢規格資料為空的 Specification 記錄…')

  // 查詢所有「規格資料為空、且連結了設備」的 Spec 記錄
  const specPages = await queryAll(DB_SPECS, {
    and: [
      { property: '設備', relation: { is_not_empty: true } },
    ],
  })

  // 過濾出規格資料真的是空的（Notion API 無法直接 filter text is_empty）
  const emptySpecs = specPages.filter(page => {
    const raw = getText(page.properties['規格資料'])
    return !raw || !raw.trim()
  })

  console.log(`找到 ${specPages.length} 筆有設備關聯的規格記錄，其中 ${emptySpecs.length} 筆規格資料為空`)

  if (emptySpecs.length === 0) {
    console.log('✅ 所有記錄都已有規格資料，無需更新')
    return
  }

  let updated = 0
  let skipped = 0

  for (const specPage of emptySpecs) {
    const specId = specPage.id
    const versionLabel = getText(specPage.properties['版本標籤'])
    const equipIds = getRelationIds(specPage.properties['設備'])

    if (equipIds.length === 0) {
      console.log(`  ⚠️  ${versionLabel} (${specId.slice(0, 8)}) — 無設備關聯，跳過`)
      skipped++
      continue
    }

    // Notion API rate limit：每次請求間隔 400ms
    await sleep(400)

    let equipPage
    try {
      equipPage = await notionGet(`/pages/${equipIds[0]}`)
    } catch (err) {
      console.log(`  ❌ 無法取得設備頁面 ${equipIds[0].slice(0, 8)}: ${err.message}`)
      skipped++
      continue
    }

    const p = equipPage.properties
    const equipName = getText(p['設備名稱'])
    const specDetailRaw = getText(p['規格細項'])
    const effectiveDate =
      getDate(p['報價日期']) ||
      getDate(p['詢價日期']) ||
      getDate(p['安裝日期']) ||
      new Date().toISOString().slice(0, 10)

    if (!specDetailRaw) {
      console.log(`  ⚠️  ${equipName} — 規格細項為空，寫入空物件`)
    }

    const specData = parseSpecDetail(specDetailRaw)
    const specDataJson = JSON.stringify(specData, null, 0)

    // 更新 Specification 記錄
    await sleep(400)
    try {
      await notionPatch(`/pages/${specId}`, {
        properties: {
          規格資料: {
            rich_text: [{ type: 'text', text: { content: specDataJson } }],
          },
          生效日期: {
            date: { start: effectiveDate },
          },
          變更摘要: {
            rich_text: [{ type: 'text', text: { content: '初始版本（由規格細項自動匯入）' } }],
          },
        },
      })
      console.log(`  ✅ ${equipName} — 寫入 ${Object.keys(specData).length} 個規格欄位，生效日期 ${effectiveDate}`)
      updated++
    } catch (err) {
      console.log(`  ❌ 更新失敗 ${specId.slice(0, 8)}: ${err.message}`)
      skipped++
    }
  }

  console.log(`\n完成：更新 ${updated} 筆，跳過 ${skipped} 筆`)
}

main().catch(err => {
  console.error('執行失敗：', err)
  process.exit(1)
})
