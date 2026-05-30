/**
 * 執行方式：
 * 1. 先到 https://www.notion.so/my-integrations 建立 Integration，複製 token
 * 2. 在 Notion 建一個頁面作為根目錄，分享給你的 Integration
 * 3. 執行：NOTION_TOKEN=secret_xxx NOTION_PARENT_PAGE_ID=xxx node setup-notion.js
 *
 * 執行後會輸出 5 個 Database ID，填入 Cloudflare Workers 環境變數
 */

const NOTION_TOKEN = process.env.NOTION_TOKEN
const PARENT_PAGE_ID = process.env.NOTION_PARENT_PAGE_ID

if (!NOTION_TOKEN || !PARENT_PAGE_ID) {
  console.error('請設定環境變數：NOTION_TOKEN 和 NOTION_PARENT_PAGE_ID')
  process.exit(1)
}

const NOTION_VERSION = '2022-06-28'

async function notion(method, path, body) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Notion ${res.status}: ${text}`)
  }
  return res.json()
}

function titleProp() { return { title: {} } }
function richText() { return { rich_text: {} } }
function selectProp(...options) {
  return { select: { options: options.map(name => ({ name })) } }
}
function dateProp() { return { date: {} } }
function numberProp() { return { number: { format: 'number' } } }

async function createDB(title, properties) {
  console.log(`建立資料庫：${title}...`)
  const db = await notion('POST', '/databases', {
    parent: { type: 'page_id', page_id: PARENT_PAGE_ID },
    title: [{ type: 'text', text: { content: title } }],
    properties,
  })
  console.log(`  ✓ ${title}：${db.id}`)
  return db.id
}

async function main() {
  console.log('開始建立 Notion 資料庫...\n')

  const equipmentId = await createDB('Equipment（設備主檔）', {
    Name: titleProp(),
    Type: selectProp('空調設備', '電力設備', '消防設備', '電梯/電扶梯', '弱電系統', '給排水設備', '其他'),
    Model: richText(),
    Manufacturer: richText(),
    InstallDate: dateProp(),
    Status: selectProp('active', 'decommissioned'),
    Location: richText(),
    BuildingCategory: selectProp('辦公大樓', '商辦大樓', '五星旅館', 'Internet Data Center', '二工裝修', '廠辦', '住宅'),
    PublicWorkCode: richText(),
    Origin: richText(),
    SpecialItem: richText(),
    Agent: richText(),
    SpecDetail: richText(),
    Notes: richText(),
  })

  const materialsId = await createDB('Materials（材料主檔）', {
    Name: titleProp(),
    Type: selectProp('空調材料', '電力材料', '消防材料', '給排水材料', '弱電材料', '建材', '其他'),
    Grade: richText(),
    Unit: richText(),
    Supplier: richText(),
  })

  const specificationsId = await createDB('Specifications（規格版本歷史）', {
    VersionLabel: titleProp(),
    EntityType: selectProp('equipment', 'material'),
    EntityId: richText(),
    EntityName: richText(),
    EffectiveFrom: dateProp(),
    EffectiveTo: dateProp(),
    SpecData: richText(),       // JSON 字串
    ChangeSummary: richText(),
  })

  const pricingId = await createDB('PricingRecords（費用記錄）', {
    ProjectRef: titleProp(),
    EntityType: selectProp('equipment', 'material'),
    EntityId: richText(),
    EntityName: richText(),
    Price: numberProp(),
    PriceDate: dateProp(),
    Supplier: richText(),
    SourceType: selectProp('contract', 'quote', 'actual', 'estimate'),
    Notes: richText(),
  })

  const inspectionsId = await createDB('InspectionRecords（檢查記錄）', {
    Inspector: titleProp(),     // 用驗收人員當標題
    InspectionDate: dateProp(),
    EntityType: selectProp('equipment', 'material'),
    EntityId: richText(),
    EntityName: richText(),
    SpecSnapshot: richText(),   // JSON 字串
    PriceAtInspection: numberProp(),
    Result: selectProp('pass', 'fail', 'conditional'),
    Findings: richText(),
  })

  console.log('\n==================================================')
  console.log('Cloudflare Workers 環境變數（複製到 Dashboard）：')
  console.log('==================================================')
  console.log(`NOTION_DB_EQUIPMENT      = ${equipmentId}`)
  console.log(`NOTION_DB_MATERIALS      = ${materialsId}`)
  console.log(`NOTION_DB_SPECIFICATIONS = ${specificationsId}`)
  console.log(`NOTION_DB_PRICING        = ${pricingId}`)
  console.log(`NOTION_DB_INSPECTIONS    = ${inspectionsId}`)
  console.log('==================================================\n')
  console.log('完成！請將以上 ID 設定到 Cloudflare Workers 的 Secrets。')
}

main().catch(err => {
  console.error('錯誤：', err.message)
  process.exit(1)
})
