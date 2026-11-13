export interface Env {
  NOTION_TOKEN: string
  OPENAI_API_KEY: string
  OPENAI_RESEARCH_MODEL?: string
  NOTION_DB_EQUIPMENT: string
  NOTION_DB_MATERIALS: string
  NOTION_DB_SPECIFICATIONS: string
  NOTION_DB_PRICING: string
  NOTION_DB_INSPECTIONS: string
  NOTION_DB_BRAND_MASTER: string
  NOTION_DB_BRAND_REPORTS: string
  NOTION_DB_PROJECTS: string
  NOTION_DB_COMPLIANCE_CASES: string
  NOTION_DB_COMPLIANCE_FINDINGS: string
  NOTION_DB_COMPLIANCE_EVIDENCE: string
  NOTION_DB_SPECIFICATION_CHAPTERS: string
  NOTION_DB_SPECIFICATION_REQUIREMENTS: string
  NOTION_DB_CNS_STANDARDS: string
  NOTION_DB_CNS_REPLACEMENTS: string
  NOTION_DB_CNS_CHECKS: string
  AUTH_KV: KVNamespace
}

const NOTION_VERSION = '2022-06-28'
const NOTION_FILE_UPLOAD_VERSION = '2026-03-11'

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

  // Extract savedAt and changeDiff from embedded header lines
  let savedAt: string | undefined
  let changeDiff: string | undefined
  let notes = notesRaw
  if (notesRaw.startsWith('savedAt:')) {
    const nl = notesRaw.indexOf('\n')
    savedAt = nl === -1 ? notesRaw.slice(8) : notesRaw.slice(8, nl)
    notes = nl === -1 ? '' : notesRaw.slice(nl + 1)
  }
  if (notes.startsWith('changeDiff:')) {
    const nl = notes.indexOf('\n')
    const raw = nl === -1 ? notes.slice(11) : notes.slice(11, nl)
    changeDiff = raw.replace(/;;/g, '\n')
    notes = nl === -1 ? '' : notes.slice(nl + 1)
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
    changeDiff,
    notes,
    changeSummary: getText(p['修改摘要']) || undefined,
  }
}

export function pageToProject(page: any) {
  const p = page.properties
  return {
    id: page.id,
    projectCode: getText(p['工程編號']),
    projectName: getText(p['工程名稱']),
    year: getNumber(p['年度']),
    createdDate: getDate(p['建立日期']),
  }
}

export async function createProject(env: Env, data: { year: number; projectCode: string; projectName: string }) {
  return notionRequest(env, 'POST', '/pages', {
    parent: { database_id: env.NOTION_DB_PROJECTS },
    properties: {
      '工程編號': { title: [{ text: { content: data.projectCode } }] },
      '工程名稱': { rich_text: [{ text: { content: data.projectName } }] },
      '年度': { number: data.year },
      '建立日期': { date: { start: new Date().toISOString().split('T')[0] } },
    },
  })
}

async function archivePage(env: Env, pageId: string) {
  return notionRequest(env, 'PATCH', `/pages/${pageId}`, { archived: true })
}

export async function deleteProjectById(env: Env, projectId: string, cascadeReports: boolean) {
  if (cascadeReports) {
    const project = await getPage(env, projectId)
    const code = getText(project.properties['工程編號'])
    if (code) {
      const reports = await queryDatabase(env, env.NOTION_DB_BRAND_REPORTS, {
        property: '案件工號',
        rich_text: { equals: code },
      })
      await Promise.all(reports.map((r: any) => archivePage(env, r.id)))
    }
  }
  return archivePage(env, projectId)
}

export async function getProjectsWithStats(env: Env) {
  const [projectPages, reportPages] = await Promise.all([
    queryDatabase(env, env.NOTION_DB_PROJECTS, undefined, [
      { property: '年度', direction: 'descending' },
    ]),
    queryDatabase(env, env.NOTION_DB_BRAND_REPORTS, undefined, [
      { property: '建立日期', direction: 'descending' },
    ]),
  ])

  const reportsByCode: Record<string, { count: number; lastSavedAt?: string }> = {}
  for (const page of reportPages) {
    const code = getText(page.properties['案件工號'])
    if (!code) continue
    if (!reportsByCode[code]) reportsByCode[code] = { count: 0 }
    reportsByCode[code].count++
    if (!reportsByCode[code].lastSavedAt) {
      const notesRaw = getText(page.properties['備註'])
      if (notesRaw.startsWith('savedAt:')) {
        const nl = notesRaw.indexOf('\n')
        reportsByCode[code].lastSavedAt = nl === -1 ? notesRaw.slice(8) : notesRaw.slice(8, nl)
      }
    }
  }

  return projectPages.map((page: any) => {
    const p = pageToProject(page)
    const stats = reportsByCode[p.projectCode]
    return { ...p, versionCount: stats?.count ?? 0, lastSavedAt: stats?.lastSavedAt }
  })
}

function toRichTextChunks(str: string) {
  const chunks = []
  for (let i = 0; i < str.length; i += 2000) {
    chunks.push({ text: { content: str.slice(i, i + 2000) } })
  }
  return chunks.length ? chunks : [{ text: { content: '' } }]
}

async function uploadWordFileToNotion(env: Env, fileBase64: string, fileName: string): Promise<string | null> {
  try {
    const createRes = await fetch('https://api.notion.com/v1/file_uploads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.NOTION_TOKEN}`,
        'Notion-Version': NOTION_FILE_UPLOAD_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        filename: fileName,
        mode: 'single_part',
      }),
    })
    if (!createRes.ok) {
      console.error('File upload create failed:', await createRes.text())
      return null
    }
    const uploadInfo = await createRes.json() as { id: string; upload_url: string }

    const bytes = Uint8Array.from(atob(fileBase64), (c: string) => c.charCodeAt(0))
    const form = new FormData()
    form.append('file', new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }), fileName)

    const sendRes = await fetch(uploadInfo.upload_url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.NOTION_TOKEN}`,
        'Notion-Version': NOTION_FILE_UPLOAD_VERSION,
      },
      body: form,
    })
    if (!sendRes.ok) {
      console.error('File upload send failed:', await sendRes.text())
      return null
    }
    return uploadInfo.id
  } catch (e) {
    console.error('uploadWordFileToNotion error:', e)
    return null
  }
}

async function uploadComplianceFileToNotion(
  env: Env,
  fileBase64: string,
  fileName: string,
  contentType: string,
): Promise<string> {
  const createRes = await fetch('https://api.notion.com/v1/file_uploads', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.NOTION_TOKEN}`,
      'Notion-Version': NOTION_FILE_UPLOAD_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content_type: contentType, filename: fileName, mode: 'single_part' }),
  })
  if (!createRes.ok) {
    throw new Error(`Notion file upload create failed: ${await createRes.text()}`)
  }

  const uploadInfo = await createRes.json() as { id: string; upload_url: string }
  const bytes = Uint8Array.from(atob(fileBase64), (c: string) => c.charCodeAt(0))
  const form = new FormData()
  form.append('file', new Blob([bytes], { type: contentType }), fileName)

  const sendRes = await fetch(uploadInfo.upload_url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.NOTION_TOKEN}`,
      'Notion-Version': NOTION_FILE_UPLOAD_VERSION,
    },
    body: form,
  })
  if (!sendRes.ok) {
    throw new Error(`Notion file upload send failed: ${await sendRes.text()}`)
  }
  return uploadInfo.id
}

export type ComplianceCandidateProduct = {
  brand: string
  series?: string
  model?: string
}

export type CreateComplianceCaseData = {
  caseName: string
  projectId?: string
  systems: string[]
  scopeNotes?: string
  candidates: ComplianceCandidateProduct[]
  notes?: string
  files: Array<{ fileBase64: string; fileName: string; fileType: string }>
}

export async function createComplianceCase(env: Env, data: CreateComplianceCaseData) {
  const uploadedFiles: Array<{ name: string; id: string }> = []
  for (const file of data.files) {
    const id = await uploadComplianceFileToNotion(env, file.fileBase64, file.fileName, file.fileType)
    uploadedFiles.push({ name: file.fileName, id })
  }

  const properties: Record<string, unknown> = {
    '案件名稱': { title: [{ text: { content: data.caseName } }] },
    '狀態': { status: { name: '待分析' } },
    '最高風險': { select: { name: '未判定' } },
    '工程系統': { multi_select: data.systems.map(name => ({ name })) },
    '規範範圍說明': { rich_text: toRichTextChunks(data.scopeNotes ?? '') },
    '原始文件數': { number: data.files.length },
    '候選產品資料': { rich_text: toRichTextChunks(JSON.stringify(data.candidates)) },
    '備註': { rich_text: toRichTextChunks(data.notes ?? '') },
    '原始規範': {
      files: uploadedFiles.map(file => ({
        name: file.name,
        type: 'file_upload',
        file_upload: { id: file.id },
      })),
    },
  }

  if (data.projectId) properties['工程'] = { relation: [{ id: data.projectId }] }

  return notionRequest(env, 'POST', '/pages', {
    parent: { database_id: env.NOTION_DB_COMPLIANCE_CASES },
    properties,
  })
}

export function pageToComplianceCase(page: any) {
  const p = page.properties
  return {
    id: page.id,
    caseName: getText(p['案件名稱']),
    status: p['狀態']?.status?.name ?? '',
    highestRisk: getSelect(p['最高風險']),
    systems: p['工程系統']?.multi_select?.map((item: any) => item.name) ?? [],
    fileCount: getNumber(p['原始文件數']),
    createdTime: page.created_time ?? '',
    lastEditedTime: page.last_edited_time ?? '',
  }
}

export async function listComplianceCases(env: Env) {
  const pages = await queryDatabase(env, env.NOTION_DB_COMPLIANCE_CASES, undefined, [
    { timestamp: 'created_time', direction: 'descending' },
  ])
  return pages.map(pageToComplianceCase)
}

export function pageToSpecificationRequirement(page: any) {
  const p = page.properties
  return {
    id: page.id,
    title: getText(p['規範條件']),
    fileName: getText(p['文件名稱']),
    location: getText(p['段落位置']) || getText(p['章節頁碼']),
    sourceText: getText(p['原始規範文字']),
    conditionType: getSelect(p['條件類型']),
    matchedText: getText(p['原始數值文字']),
    standardRef: getText(p['標準或法規編號']),
    risk: getSelect(p['風險等級']),
    reason: getText(p['判定理由']),
    suggestion: getText(p['建議中性文字']),
    status: p['處理狀態']?.status?.name ?? '',
    marketCheck: Boolean(p['需市場驗證']?.checkbox),
    humanCheck: Boolean(p['需人工確認']?.checkbox),
  }
}

export async function listSpecificationRequirements(env: Env, caseId: string) {
  const pages = await queryDatabase(env, env.NOTION_DB_SPECIFICATION_REQUIREMENTS, {
    property: '檢查案件',
    relation: { contains: caseId },
  }, [
    { timestamp: 'created_time', direction: 'ascending' },
  ])
  return pages.map(pageToSpecificationRequirement)
}

export function pageToAnalyzerCase(page: any) {
  const p = page.properties
  let candidates: Array<{ brand: string; series?: string; model?: string }> = []
  try { candidates = JSON.parse(getText(p['候選產品資料']) || '[]') } catch { /* ignore */ }
  return {
    ...pageToComplianceCase(page),
    candidates,
    files: (p['原始規範']?.files ?? []).flatMap((file: any) => {
      const url = file[file.type]?.url
      return url ? [{ name: file.name, url }] : []
    }),
  }
}

export async function listPendingAnalyzerCases(env: Env) {
  const pages = await queryDatabase(env, env.NOTION_DB_COMPLIANCE_CASES, {
    property: '狀態',
    status: { equals: '待分析' },
  }, [
    { timestamp: 'created_time', direction: 'ascending' },
  ])
  return pages.map(pageToAnalyzerCase)
}

export async function getAnalyzerCase(env: Env, caseId: string) {
  return pageToAnalyzerCase(await getPage(env, caseId))
}

export async function updateComplianceCaseStatus(
  env: Env,
  caseId: string,
  status: string,
  highestRisk?: string,
) {
  const properties: Record<string, unknown> = {
    '狀態': { status: { name: status } },
  }
  if (highestRisk) properties['最高風險'] = { select: { name: highestRisk } }
  if (status === '待覆核') properties['分析日期'] = { date: { start: new Date().toISOString() } }
  return notionRequest(env, 'PATCH', `/pages/${caseId}`, { properties })
}

export async function appendComplianceReportToCase(
  env: Env,
  caseId: string,
  summary: string,
  clauses: Array<{ title: string; body: string; replacement: string }>,
) {
  const children: any[] = [
    {
      object: 'block', type: 'heading_2',
      heading_2: { rich_text: [{ type: 'text', text: { content: '線上規範查證報告' } }] },
    },
    {
      object: 'block', type: 'paragraph',
      paragraph: { rich_text: toRichTextChunks(summary) },
    },
  ]
  for (const clause of clauses) {
    children.push({
      object: 'block', type: 'heading_3',
      heading_3: { rich_text: toRichTextChunks(clause.title) },
    })
    children.push({
      object: 'block', type: 'paragraph',
      paragraph: { rich_text: toRichTextChunks(clause.body) },
    })
    if (clause.replacement) {
      children.push({
        object: 'block', type: 'quote',
        quote: { rich_text: toRichTextChunks(`建議替代條文：${clause.replacement}`) },
      })
    }
  }
  return notionRequest(env, 'PATCH', `/blocks/${caseId}/children`, { children: children.slice(0, 100) })
}

export type LocalAnalyzerRequirement = {
  file: string
  title: string
  condition_type: string
  matched_text: string
  source_text: string
  location: string
  page: number | null
  standard_ref: string
  normalized_value: number | null
  unit: string
  risk: string
  reason: string
  suggestion: string
  market_check: boolean
  human_check: boolean
}

export type CnsOfficialRecord = {
  number: string
  categoryNumber: string
  name: string
  publishedDate: string
  revisedDate: string
  withdrawnDate: string
  internationalOrganization: string
  internationalNumber: string
  internationalYear: string
  replacements: string[]
}

export async function upsertCnsStandard(env: Env, record: CnsOfficialRecord, officialUrl: string) {
  const existing = await queryDatabase(env, env.NOTION_DB_CNS_STANDARDS, {
    property: 'CNS總號', rich_text: { equals: record.number },
  })
  const currentStatus = record.withdrawnDate
    ? record.replacements.length ? '已廢止有取代' : '已廢止無取代'
    : '最新有效'
  const international = [record.internationalOrganization, record.internationalNumber, record.internationalYear]
    .filter(Boolean).join(' ')
  const properties: Record<string, unknown> = {
    'CNS標準': { title: [{ text: { content: `CNS ${record.number}` } }] },
    'CNS總號': { rich_text: toRichTextChunks(record.number) },
    '類號': { rich_text: toRichTextChunks(record.categoryNumber) },
    '中文名稱': { rich_text: toRichTextChunks(record.name) },
    '目前狀態': { select: { name: currentStatus } },
    '官方來源': { url: officialUrl },
    '最後查核時間': { date: { start: new Date().toISOString() } },
    '確認日期': { date: { start: new Date().toISOString().slice(0, 10) } },
    '最新版資訊': { rich_text: toRichTextChunks(international ? `對應 ${international}` : '官方資料未列對應國際標準') },
    '查核摘要': { rich_text: toRichTextChunks(record.withdrawnDate
      ? `已於 ${record.withdrawnDate} 廢止${record.replacements.length ? `，被 CNS ${record.replacements.join('、CNS ')} 取代` : ''}`
      : '官方資料未列廢止日期') },
  }
  if (record.publishedDate) properties['制定日期'] = { date: { start: record.publishedDate } }
  if (record.revisedDate) properties['修訂日期'] = { date: { start: record.revisedDate } }
  if (record.withdrawnDate) properties['廢止日期'] = { date: { start: record.withdrawnDate } }
  if (existing[0]) {
    await notionRequest(env, 'PATCH', `/pages/${existing[0].id}`, { properties })
    return existing[0].id as string
  }
  const page = await notionRequest(env, 'POST', '/pages', {
    parent: { database_id: env.NOTION_DB_CNS_STANDARDS }, properties,
  })
  return page.id as string
}

export async function upsertCnsReplacement(env: Env, data: {
  fromId: string
  toId: string
  fromNumber: string
  toNumber: string
  effectiveDate: string
  officialUrl: string
}) {
  const title = `CNS ${data.fromNumber} → CNS ${data.toNumber}`
  const existing = await queryDatabase(env, env.NOTION_DB_CNS_REPLACEMENTS, {
    property: '取代關係', title: { equals: title },
  })
  const properties: Record<string, unknown> = {
    '取代關係': { title: [{ text: { content: title } }] },
    '原CNS': { relation: [{ id: data.fromId }] },
    '取代CNS': { relation: [{ id: data.toId }] },
    '關係類型': { select: { name: '直接取代' } },
    '官方證據': { url: data.officialUrl },
    '證據摘要': { rich_text: toRichTextChunks(`標檢局開放資料記載 CNS ${data.fromNumber} 被 CNS ${data.toNumber} 取代`) },
    '人工確認': { checkbox: false },
  }
  if (data.effectiveDate) properties['生效日期'] = { date: { start: data.effectiveDate } }
  if (existing[0]) return notionRequest(env, 'PATCH', `/pages/${existing[0].id}`, { properties })
  return notionRequest(env, 'POST', '/pages', {
    parent: { database_id: env.NOTION_DB_CNS_REPLACEMENTS }, properties,
  })
}

export async function resolveCnsCheck(env: Env, caseId: string, reference: string, data: {
  result: string
  officialStatus: string
  replacementChain: string
  suggestion: string
  officialUrl: string
  completed: boolean
  humanCheck: boolean
  risk: string
  standardId?: string
}) {
  const checks = await queryDatabase(env, env.NOTION_DB_CNS_CHECKS, {
    and: [
      { property: '檢查案件', relation: { contains: caseId } },
      { property: '正規化引用', rich_text: { equals: reference } },
      { property: '查核結果', select: { equals: '待查核' } },
    ],
  })
  for (const check of checks.slice(0, 10)) {
    const properties: Record<string, unknown> = {
      '查核結果': { select: { name: data.result } },
      '官方當時狀態': { rich_text: toRichTextChunks(data.officialStatus) },
      '取代鏈': { rich_text: toRichTextChunks(data.replacementChain) },
      '問題與處理建議': { rich_text: toRichTextChunks(data.suggestion) },
      '官方來源': { url: data.officialUrl },
      '查核時間': { date: { start: new Date().toISOString() } },
      '查核完成': { checkbox: data.completed },
      '需人工確認': { checkbox: data.humanCheck },
    }
    if (data.standardId) properties['CNS標準'] = { relation: [{ id: data.standardId }] }
    await notionRequest(env, 'PATCH', `/pages/${check.id}`, { properties })

    const requirementId = getRelationId(check.properties['規範條件'])
    if (requirementId) {
      await notionRequest(env, 'PATCH', `/pages/${requirementId}`, { properties: {
        '風險等級': { select: { name: data.risk } },
        '判定理由': { rich_text: toRichTextChunks(data.officialStatus) },
        '建議中性文字': { rich_text: toRichTextChunks(data.suggestion) },
        '需人工確認': { checkbox: data.humanCheck },
      } })
    }
  }
  return { hasMore: checks.length > 10 }
}

export async function saveAnalyzerResults(
  env: Env,
  caseId: string,
  systems: string[],
  requirements: LocalAnalyzerRequirement[],
) {
  let cnsCount = 0
  for (const requirement of requirements) {
    const uniqueTitle = `${requirement.file}｜${requirement.location}｜${requirement.title}`.slice(0, 180)
    const existing = await queryDatabase(env, env.NOTION_DB_SPECIFICATION_REQUIREMENTS, {
      and: [
        { property: '檢查案件', relation: { contains: caseId } },
        { property: '規範條件', title: { equals: uniqueTitle } },
      ],
    })
    const properties: Record<string, unknown> = {
      '規範條件': { title: [{ text: { content: uniqueTitle } }] },
      '檢查案件': { relation: [{ id: caseId }] },
      '文件名稱': { rich_text: toRichTextChunks(requirement.file) },
      '原始規範文字': { rich_text: toRichTextChunks(requirement.source_text) },
      '章節頁碼': { rich_text: toRichTextChunks(requirement.page ? `第 ${requirement.page} 頁` : requirement.location) },
      '段落位置': { rich_text: toRichTextChunks(requirement.location) },
      '條件類型': { select: { name: requirement.condition_type } },
      '原始數值文字': { rich_text: toRichTextChunks(requirement.matched_text) },
      '單位': { rich_text: toRichTextChunks(requirement.unit) },
      '標準或法規編號': { rich_text: toRichTextChunks(requirement.standard_ref) },
      '工程系統': { multi_select: systems.map(name => ({ name })) },
      '需市場驗證': { checkbox: requirement.market_check },
      '需人工確認': { checkbox: requirement.human_check },
      '風險等級': { select: { name: requirement.risk } },
      '判定理由': { rich_text: toRichTextChunks(requirement.reason) },
      '建議中性文字': { rich_text: toRichTextChunks(requirement.suggestion) },
      '處理狀態': { status: { name: '待覆核' } },
    }
    if (requirement.normalized_value !== null) {
      properties['標準化數值'] = { number: requirement.normalized_value }
    }
    let requirementId: string
    if (existing[0]) {
      await notionRequest(env, 'PATCH', `/pages/${existing[0].id}`, { properties })
      requirementId = existing[0].id
    } else {
      const page = await notionRequest(env, 'POST', '/pages', {
        parent: { database_id: env.NOTION_DB_SPECIFICATION_REQUIREMENTS },
        properties,
      })
      requirementId = page.id
    }

    if (requirement.standard_ref.startsWith('CNS')) {
      cnsCount++
      await upsertPendingCnsCheck(env, caseId, requirementId, requirement)
    }
  }
  return { requirements: requirements.length, cnsReferences: cnsCount }
}

async function upsertPendingCnsCheck(
  env: Env,
  caseId: string,
  requirementId: string,
  requirement: LocalAnalyzerRequirement,
) {
  const uniqueTitle = `${requirement.file}｜${requirement.location}｜${requirement.standard_ref}`.slice(0, 180)
  const existing = await queryDatabase(env, env.NOTION_DB_CNS_CHECKS, {
    and: [
      { property: '檢查案件', relation: { contains: caseId } },
      { property: 'CNS查核紀錄', title: { equals: uniqueTitle } },
    ],
  })
  const properties = {
    'CNS查核紀錄': { title: [{ text: { content: uniqueTitle } }] },
    '檢查案件': { relation: [{ id: caseId }] },
    '規範條件': { relation: [{ id: requirementId }] },
    '文件原始引用': { rich_text: toRichTextChunks(requirement.matched_text) },
    '正規化引用': { rich_text: toRichTextChunks(requirement.standard_ref) },
    '查核結果': { select: { name: '待查核' } },
    '官方當時狀態': { rich_text: toRichTextChunks('系統已擷取引用，請依線上證據覆核官方有效狀態') },
    '問題與處理建議': { rich_text: toRichTextChunks('必須查核CNS官方有效版本、廢止狀態及完整取代鏈。') },
    '查核完成': { checkbox: false },
    '需人工確認': { checkbox: true },
  }
  if (existing[0]) {
    await notionRequest(env, 'PATCH', `/pages/${existing[0].id}`, { properties })
  } else {
    await notionRequest(env, 'POST', '/pages', {
      parent: { database_id: env.NOTION_DB_CNS_CHECKS },
      properties,
    })
  }
}

export async function createBrandReport(
  env: Env,
  data: {
    reportName: string
    projectCode: string
    selections: Record<string, Record<string, string[]>>
    notes?: string
    changeSummary?: string
    changeDiff?: string
    wordFileBase64?: string
    wordFileName?: string
  }
) {
  const savedAt = new Date().toISOString()
  let notesContent = `savedAt:${savedAt}`
  if (data.changeDiff?.trim()) {
    notesContent += `\nchangeDiff:${data.changeDiff.replace(/\n/g, ';;')}`
  }
  if (data.notes) notesContent += '\n' + data.notes

  const properties: Record<string, unknown> = {
    '報表名稱': { title: [{ text: { content: data.reportName } }] },
    '案件工號': { rich_text: [{ text: { content: data.projectCode } }] },
    '選定廠牌清單': { rich_text: toRichTextChunks(JSON.stringify(data.selections)) },
    '建立日期': { date: { start: new Date().toISOString().split('T')[0] } },
    '備註': { rich_text: [{ text: { content: notesContent } }] },
    '修改摘要': { rich_text: [{ text: { content: data.changeSummary ?? '' } }] },
  }

  if (data.wordFileBase64 && data.wordFileName) {
    const fileUploadId = await uploadWordFileToNotion(env, data.wordFileBase64, data.wordFileName)
    if (fileUploadId) {
      properties['Word附件'] = { files: [{ type: 'file_upload', file_upload: { id: fileUploadId } }] }
    }
  }

  return notionRequest(env, 'POST', '/pages', { parent: { database_id: env.NOTION_DB_BRAND_REPORTS }, properties })
}
