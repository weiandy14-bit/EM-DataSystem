export interface Env {
  NOTION_TOKEN: string
  NOTION_DB_EQUIPMENT: string
  NOTION_DB_MATERIALS: string
  NOTION_DB_SPECIFICATIONS: string
  NOTION_DB_PRICING: string
  NOTION_DB_INSPECTIONS: string
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
  const body: Record<string, unknown> = { page_size: 100 }
  if (filter) body.filter = filter
  if (sorts) body.sorts = sorts
  const data = await notionRequest(env, 'POST', `/databases/${dbId}/query`, body)
  return data.results as any[]
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
  const specDataStr = getText(p['規格資料'])
  let specData: Record<string, string> = {}
  try { specData = JSON.parse(specDataStr) } catch { /* ignore */ }
  return {
    id: page.id,
    entityType: getSelect(p['資料類型']) as 'equipment' | 'material',
    entityId: getText(p['資料ID']),
    entityName: getText(p['資料名稱']),
    effectiveFrom: getDate(p['生效日期']),
    effectiveTo: getDate(p['失效日期']) || null,
    specData,
    versionLabel: getText(p['版本標籤']),
    changeSummary: getText(p['變更摘要']),
  }
}

export function pageToPricingRecord(page: any) {
  const p = page.properties
  return {
    id: page.id,
    entityType: getSelect(p['資料類型']) as 'equipment' | 'material',
    entityId: getText(p['資料ID']),
    entityName: getText(p['資料名稱']),
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
  const snapshotStr = getText(p['規格快照'])
  let specSnapshot: Record<string, string> = {}
  try { specSnapshot = JSON.parse(snapshotStr) } catch { /* ignore */ }
  return {
    id: page.id,
    inspectionDate: getDate(p['驗收日期']),
    entityType: getSelect(p['資料類型']) as 'equipment' | 'material',
    entityId: getText(p['資料ID']),
    entityName: getText(p['資料名稱']),
    specSnapshot,
    priceAtInspection: getNumber(p['驗收時單價']),
    result: getSelect(p['驗收結果']) as 'pass' | 'fail' | 'conditional',
    findings: getText(p['發現事項']),
    inspector: getText(p['驗收人員']),
  }
}
