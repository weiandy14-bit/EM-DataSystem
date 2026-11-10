export interface Env {
  NOTION_TOKEN: string
  NOTION_DB_EQUIPMENT: string
  NOTION_DB_MATERIALS: string
  NOTION_DB_SPECIFICATIONS: string
  NOTION_DB_PRICING: string
  NOTION_DB_INSPECTIONS: string
  NOTION_DB_BRAND_MASTER: string
  NOTION_DB_BRAND_REPORTS: string
  AUTH_KV: KVNamespace
}

const NOTION_VERSION = '2022-06-28'

async function notionRequest(env: Env, method: string, path: string, body?: unknown) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.NOTION_TOKEN}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Notion API error ${res.status}: ${err}`)
  }
  return res.json() as Promise<any>
}

export async function getPage(env: Env, pageId: string) {
  return notionRequest(env, 'GET', `/pages/${pageId}`)
}

export async function queryDatabase(env: Env, dbId: string, filter?: unknown, sorts?: unknown) {
  const results: any[] = []
  let cursor: string | undefined
  do {
    const body: Record<string, unknown> = { page_size: 100 }
    if (filter) body.filter = filter
    if (sorts) body.sorts = sorts
    if (cursor) body.start_cursor = cursor
    const data = await notionRequest(env, 'POST', `/databases/${dbId}/query`, body)
    results.push(...(data.results as any[]))
    cursor = data.has_more ? data.next_cursor : undefined
  } while (cursor)
  return results
}

// --- Property extractors ---

export function getText(prop: any): string {
  if (!prop) return ''
  if (prop.type === 'title') return prop.title?.map((t: any) => t.plain_text).join('') ?? ''
  if (prop.type === 'rich_text') return prop.rich_text?.map((t: any) => t.plain_text).join('') ?? ''
  return ''
}

export function getSelect(prop: any): string {
  return prop?.select?.name ?? ''
}

export function getNumber(prop: any): number {
  return prop?.number ?? 0
}

export function getDate(prop: any): string {
  return prop?.date?.start ?? ''
}

export function getDateEnd(prop: any): string | null {
  return prop?.date?.end ?? null
}

export function getRelationId(prop: any): string {
  return prop?.relation?.[0]?.id ?? ''
}

// --- Page to domain object mappers ---

export function pageToEquipment(page: any) {
  const p = page.properties
  return {
    id: page.id,
    name: getText(p['設備名稱']),
    type: getSelect(p['設備類別']),
    model: getText(p['型號']),
    manufacturer: getText(p['廠牌']),
    installDate: getDate(p['安裝日期']),
    status: getSelect(p['狀態']) as 'active' | 'decommissioned',
    location: getText(p['位置']),
    buildingCategory: getSelect(p['建築類別']),
    publicWorkCode: getText(p['公共工程編碼']),
    origin: getText(p['產地']),
    specialItem: getText(p['特殊項目']),
    agent: getText(p['代理商']),
    specDetail: getText(p['規格細項']),
    notes: getText(p['備註']),
    budgetPrice: getNumber(p['單價']) || getNumber(p['設備預算價']) || null,
    inquiryDate: getDate(p['報價日期']) || getDate(p['詢價日期']),
    projectCode: getText(p['案件工號']) || getText(p['位置']),
  }
}

export function pageToMaterial(page: any) {
  const p = page.properties
  return {
    id: page.id,
    name: getText(p['材料名稱']),
    type: getSelect(p['材料類別']),
    grade: getText(p['等級規格']),
    unit: getText(p['單位']),
    supplier: getText(p['供應商']),
  }
}

export function pageToSpecification(page: any) {
  const p = page.properties
  const hasEquipment = (p['設備']?.relation?.length ?? 0) > 0
  const specDataStr = getText(p['規格資料'])
  let specData: Record<string, string> = {}
  try { specData = JSON.parse(specDataStr) } catch { /* ignore */ }
  return {
    id: page.id,
    entityType: (hasEquipment ? 'equipment' : 'material') as 'equipment' | 'material',
    entityId: hasEquipment ? getRelationId(p['設備']) : getRelationId(p['材料']),
    effectiveFrom: getDate(p['生效日期']),
    effectiveTo: getDate(p['失效日期']) || null,
    specData,
    versionLabel: getText(p['版本標籤']),
    changeSummary: getText(p['變更摘要']),
  }
}

export function pageToPricingRecord(page: any) {
  const p = page.properties
  const hasEquipment = (p['設備']?.relation?.length ?? 0) > 0
  return {
    id: page.id,
    entityType: (hasEquipment ? 'equipment' : 'material') as 'equipment' | 'material',
    entityId: hasEquipment ? getRelationId(p['設備']) : getRelationId(p['材料']),
    price: getNumber(p['單價']),
    priceDate: getDate(p['詢價日期']),
    supplier: getText(p['供應商']),
    projectRef: getText(p['案件工號']),
    sourceType: getSelect(p['來源類型']) as 'contract' | 'quote' | 'actual' | 'estimate',
    notes: getText(p['備註']),
  }
}

export function pageToInspectionRecord(page: any) {
  const p = page.properties
  const hasEquipment = (p['設備']?.relation?.length ?? 0) > 0
  return {
    id: page.id,
    inspectionDate: getDate(p['驗收日期']),
    entityType: (hasEquipment ? 'equipment' : 'material') as 'equipment' | 'material',
    entityId: hasEquipment ? getRelationId(p['設備']) : getRelationId(p['材料']),
    entityName: getText(p['資料名稱']),
    result: getSelect(p['驗收結果']) as 'pass' | 'fail' | 'conditional',
    findings: getText(p['發現事項']),
    inspector: getText(p['驗收人員']),
  }
}

export function pageToBrandMaster(page: any) {
  const p = page.properties
  const brandCols: Array<[string, string]> = [
    ['國內A1', '國內A'], ['國內A2', '國內A'], ['國內A3', '國內A'],
    ['國內B1', '國內B'], ['國內B2', '國內B'], ['國內B3', '國內B'],
    ['國外A1', '國外A'], ['國外A2', '國外A'], ['國外A3', '國外A'],
  ]
  const brands: Array<{ name: string; grade: string }> = []
  for (const [col, grade] of brandCols) {
    const name = getText(p[col])
    if (name) brands.push({ name, grade })
  }
  return {
    id: page.id,
    productName: getText(p['產品項目']),
    category: getSelect(p['分類']),
    brands,
  }
}

export function pageToBrandReport(page: any) {
  const p = page.properties
  const selectionsStr = getText(p['選定廠牌清單'])
  const category = getSelect(p['類別'])
  const notesRaw = getText(p['備註'])

  // Extract savedAt timestamp embedded as first line: "savedAt:2024-01-15T10:30:00.000Z"
  let savedAt: string | undefined
  let notes = notesRaw
  if (notesRaw.startsWith('savedAt:')) {
    const nl = notesRaw.indexOf('\n')
    savedAt = nl === -1 ? notesRaw.slice(8) : notesRaw.slice(8, nl)
    notes = nl === -1 ? '' : notesRaw.slice(nl + 1)
  }

  let parsed: any = {}
  try { parsed = JSON.parse(selectionsStr) } catch { /* ignore */ }

  // Normalize to nested format: Record<string, Record<string, string[]>>
  // Old format: { productName: string[] }  (has non-empty category field)
  // New format: { category: { productName: string[] } }
  let selections: Record<string, Record<string, string[]>> = {}
  const firstVal = Object.values(parsed)[0]
  if (category && Array.isArray(firstVal)) {
    // Old single-category record → wrap with its category
    selections = { [category]: parsed as Record<string, string[]> }
  } else if (typeof firstVal === 'object' && firstVal !== null && !Array.isArray(firstVal)) {
    // New nested format
    selections = parsed
  }

  return {
    id: page.id,
    reportName: getText(p['報表名稱']),
    projectCode: getText(p['案件工號']),
    category,
    selections,
    createdDate: getDate(p['建立日期']),
    savedAt,
    notes,
  }
}

function toRichTextChunks(str: string) {
  const chunks = []
  for (let i = 0; i < str.length; i += 2000) {
    chunks.push({ text: { content: str.slice(i, i + 2000) } })
  }
  return chunks.length ? chunks : [{ text: { content: '' } }]
}

export async function createBrandReport(
  env: Env,
  data: { reportName: string; projectCode: string; selections: Record<string, Record<string, string[]>>; notes?: string }
) {
  const savedAt = new Date().toISOString()
  const notesContent = `savedAt:${savedAt}${data.notes ? '\n' + data.notes : ''}`
  const body = {
    parent: { database_id: env.NOTION_DB_BRAND_REPORTS },
    properties: {
      '報表名稱': { title: [{ text: { content: data.reportName } }] },
      '案件工號': { rich_text: [{ text: { content: data.projectCode } }] },
      '類別': { select: { name: '全部' } },
      '選定廠牌清單': { rich_text: toRichTextChunks(JSON.stringify(data.selections)) },
      '建立日期': { date: { start: new Date().toISOString().split('T')[0] } },
      '備註': { rich_text: [{ text: { content: notesContent } }] },
    },
  }
  return notionRequest(env, 'POST', '/pages', body)
}
