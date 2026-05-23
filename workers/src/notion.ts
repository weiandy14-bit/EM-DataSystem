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
    name: getText(p.Name),
    type: getSelect(p.Type),
    model: getText(p.Model),
    manufacturer: getText(p.Manufacturer),
    installDate: getDate(p.InstallDate),
    status: getSelect(p.Status) as 'active' | 'decommissioned',
    location: getText(p.Location),
    buildingCategory: getSelect(p.BuildingCategory),
    publicWorkCode: getText(p.PublicWorkCode),
    origin: getText(p.Origin),
    specialItem: getText(p.SpecialItem),
    agent: getText(p.Agent),
    specDetail: getText(p.SpecDetail),
    notes: getText(p.Notes),
  }
}

export function pageToMaterial(page: any) {
  const p = page.properties
  return {
    id: page.id,
    name: getText(p.Name),
    type: getSelect(p.Type),
    grade: getText(p.Grade),
    unit: getText(p.Unit),
    supplier: getText(p.Supplier),
  }
}

export function pageToSpecification(page: any) {
  const p = page.properties
  const specDataStr = getText(p.SpecData)
  let specData: Record<string, string> = {}
  try { specData = JSON.parse(specDataStr) } catch { /* ignore */ }
  return {
    id: page.id,
    entityType: getSelect(p.EntityType) as 'equipment' | 'material',
    entityId: getText(p.EntityId),
    entityName: getText(p.EntityName),
    effectiveFrom: getDate(p.EffectiveFrom),
    effectiveTo: getDate(p.EffectiveTo) || null,
    specData,
    versionLabel: getText(p.VersionLabel),
    changeSummary: getText(p.ChangeSummary),
  }
}

export function pageToPricingRecord(page: any) {
  const p = page.properties
  return {
    id: page.id,
    entityType: getSelect(p.EntityType) as 'equipment' | 'material',
    entityId: getText(p.EntityId),
    entityName: getText(p.EntityName),
    price: getNumber(p.Price),
    priceDate: getDate(p.PriceDate),
    supplier: getText(p.Supplier),
    projectRef: getText(p.ProjectRef),
    sourceType: getSelect(p.SourceType) as 'contract' | 'quote' | 'actual' | 'estimate',
    notes: getText(p.Notes),
  }
}

export function pageToInspectionRecord(page: any) {
  const p = page.properties
  const snapshotStr = getText(p.SpecSnapshot)
  let specSnapshot: Record<string, string> = {}
  try { specSnapshot = JSON.parse(snapshotStr) } catch { /* ignore */ }
  return {
    id: page.id,
    inspectionDate: getDate(p.InspectionDate),
    entityType: getSelect(p.EntityType) as 'equipment' | 'material',
    entityId: getText(p.EntityId),
    entityName: getText(p.EntityName),
    specSnapshot,
    priceAtInspection: getNumber(p.PriceAtInspection),
    result: getSelect(p.Result) as 'pass' | 'fail' | 'conditional',
    findings: getText(p.Findings),
    inspector: getText(p.Inspector),
  }
}
