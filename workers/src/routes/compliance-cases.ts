import {
  createComplianceCase,
  listComplianceCases,
  listSpecificationRequirements,
  pageToComplianceCase,
  type ComplianceCandidateProduct,
  type Env,
  type LocalAnalyzerRequirement,
} from '../notion'
import { getOnlineResearch, startOnlineResearch, syncOnlineResearch } from '../online-research'
import { getFreeAnalysis, queueFreeAnalysis, syncFreeAnalysis } from '../free-analysis'

const MAX_FILE_SIZE = 15 * 1024 * 1024
const MAX_TOTAL_SIZE = 50 * 1024 * 1024
const MAX_FILE_COUNT = 10
const ALLOWED_FILE_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])
const ALLOWED_SYSTEMS = new Set(['給水', '排水', '消防', '空調', '電力', '弱電監控', '其他'])

type CreateComplianceCaseBody = {
  caseName: string
  projectId?: string
  systems?: string[]
  scopeNotes?: string
  candidates?: ComplianceCandidateProduct[]
  notes?: string
  files?: Array<{ fileBase64: string; fileName: string; fileType: string }>
  analysisMode?: 'rules' | 'ai'
  freeRequirements?: LocalAnalyzerRequirement[]
}

export async function handleComplianceCases(
  req: Request,
  env: Env,
  subpath: string,
): Promise<Response> {
  if (req.method === 'GET' && (subpath === '/' || subpath === '')) {
    return json(await listComplianceCases(env))
  }

  if (req.method === 'GET') {
    const reportMatch = subpath.match(/^\/([^/]+)\/report$/)
    if (reportMatch) {
      const online = await getOnlineResearch(env, reportMatch[1])
      const freeJob = await getFreeAnalysis(env, reportMatch[1])
      return json({ ...online, freeJob })
    }
    const match = subpath.match(/^\/([^/]+)\/requirements$/)
    if (match) return json(await listSpecificationRequirements(env, match[1]))
  }

  if (req.method === 'POST' && subpath === '/sync') {
    const online = await syncOnlineResearch(env)
    const free = await syncFreeAnalysis(env)
    return json([...online, ...free])
  }

  if (req.method !== 'POST' || (subpath !== '/' && subpath !== '')) {
    return json({ error: 'Method not allowed' }, 405)
  }

  const body = await req.json() as CreateComplianceCaseBody
  if (!body.caseName?.trim() || !body.files?.length) {
    return json({ error: '案件名稱與原始規範為必填' }, 400)
  }
  if (body.files.length > MAX_FILE_COUNT) {
    return json({ error: `一次最多上傳 ${MAX_FILE_COUNT} 份文件` }, 400)
  }

  let totalSize = 0
  const files: Array<{ fileBase64: string; fileName: string; fileType: string }> = []
  for (const file of body.files) {
    const extension = file.fileName.toLowerCase()
    const fileType = ALLOWED_FILE_TYPES.has(file.fileType)
      ? file.fileType
      : extension.endsWith('.pdf')
        ? 'application/pdf'
        : extension.endsWith('.docx')
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : ''
    if (!file.fileBase64 || !file.fileName || !fileType) {
      return json({ error: '僅支援 DOCX 或 PDF 文件' }, 400)
    }
    const estimatedSize = Math.floor(file.fileBase64.length * 0.75)
    if (estimatedSize > MAX_FILE_SIZE) return json({ error: '單一文件不得超過 15 MB' }, 400)
    totalSize += estimatedSize
    files.push({ ...file, fileName: file.fileName.trim(), fileType })
  }
  if (totalSize > MAX_TOTAL_SIZE) return json({ error: '全部文件合計不得超過 50 MB' }, 400)

  const candidates = (body.candidates ?? [])
    .map(candidate => ({
      brand: candidate.brand?.trim(),
      series: candidate.series?.trim(),
      model: candidate.model?.trim(),
    }))
    .filter(candidate => candidate.brand)
    .slice(0, 3)
  const analysisMode = body.analysisMode === 'rules' ? 'rules' : 'ai'
  if (analysisMode === 'ai' && candidates.length !== 3) {
    return json({ error: '線上比較必須填寫三家候選產品的廠牌' }, 400)
  }

  let page
  try {
    page = await createComplianceCase(env, {
      ...body,
      caseName: body.caseName.trim(),
      systems: [...new Set(body.systems ?? [])].filter(system => ALLOWED_SYSTEMS.has(system)),
      scopeNotes: body.scopeNotes?.trim(),
      candidates,
      files,
    })
  } catch (error) {
    if (error instanceof Error && /僅支援|不得超過/.test(error.message)) {
      return json({ error: error.message }, 400)
    }
    throw error
  }
  const createdCase = pageToComplianceCase(page)
  if (analysisMode === 'rules') {
    const requirements = sanitizeFreeRequirements(body.freeRequirements ?? [])
    await queueFreeAnalysis(env, page.id, [...new Set(body.systems ?? [])].filter(system => ALLOWED_SYSTEMS.has(system)), requirements)
    return json({ ...createdCase, status: '分析中' }, 201)
  }
  try {
    await startOnlineResearch(env, {
      caseId: page.id,
      caseName: body.caseName.trim(),
      systems: [...new Set(body.systems ?? [])].filter(system => ALLOWED_SYSTEMS.has(system)),
      scopeNotes: body.scopeNotes?.trim(),
      notes: body.notes?.trim(),
      candidates,
      files,
    })
    return json({ ...createdCase, status: '分析中' }, 201)
  } catch (error) {
    return json({
      ...createdCase,
      analysisError: error instanceof Error ? error.message : '線上分析啟動失敗',
    }, 201)
  }
}

function sanitizeFreeRequirements(requirements: LocalAnalyzerRequirement[]) {
  const allowedTypes = new Set(['尺寸公差', '壓力溫度', '容量點數迴路', '百分比倍率', '持續時間', '材質構造', '性能效率', '型式代號', '介面通訊', '標準認證', '品牌產地', '施工試驗', '其他'])
  const allowedRisks = new Set(['通過', '注意', '高風險', '不符合', '無法判定'])
  return requirements.slice(0, 100).map(item => ({
    ...item,
    file: String(item.file ?? '').slice(0, 300),
    title: String(item.title ?? '').slice(0, 500),
    condition_type: allowedTypes.has(item.condition_type) ? item.condition_type : '其他',
    matched_text: String(item.matched_text ?? '').slice(0, 500),
    source_text: String(item.source_text ?? '').slice(0, 4000),
    location: String(item.location ?? '').slice(0, 300),
    standard_ref: String(item.standard_ref ?? '').slice(0, 300),
    unit: String(item.unit ?? '').slice(0, 100),
    risk: allowedRisks.has(item.risk) ? item.risk : '注意',
    reason: String(item.reason ?? '').slice(0, 4000),
    suggestion: String(item.suggestion ?? '').slice(0, 4000),
    page: Number.isFinite(item.page) ? item.page : null,
    normalized_value: Number.isFinite(item.normalized_value) ? item.normalized_value : null,
    market_check: Boolean(item.market_check),
    human_check: Boolean(item.human_check),
  }))
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
