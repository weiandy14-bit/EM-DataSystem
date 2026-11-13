import {
  saveAnalyzerResults,
  appendComplianceReportToCase,
  updateComplianceCaseStatus,
  type ComplianceCandidateProduct,
  type Env,
  type LocalAnalyzerRequirement,
} from './notion'

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'
const JOB_PREFIX = 'compliance-online-job:'
const REPORT_PREFIX = 'compliance-online-report:'

export type OnlineEvidence = {
  title: string
  url: string
  sourceType: string
  pageOrSection: string
  retrievedAt: string
}

export type OnlineProductResult = {
  brand: string
  series: string
  model: string
  verdict: '符合' | '條件符合' | '不符合' | '無法確認'
  evidenceSummary: string
  evidence: OnlineEvidence[]
}

export type OnlineClauseResult = {
  clauseId: string
  fileName: string
  location: string
  originalText: string
  requirement: string
  conditionType: string
  standardRef: string
  risk: '通過' | '注意' | '高風險' | '不符合' | '無法判定'
  allThreeComply: boolean
  conclusion: string
  neutralSuggestion: string
  adjustmentRationale: string
  products: OnlineProductResult[]
}

export type OnlineComplianceReport = {
  documentSummary: string
  clauses: OnlineClauseResult[]
}

type OnlineResearchJob = {
  caseId: string
  responseId: string
  status: string
  systems: string[]
  createdAt: string
  error?: string
  finalized?: boolean
  reportAppended?: boolean
  savedClauseCount?: number
}

type SourceFile = { fileBase64: string; fileName: string; fileType: string }

export async function startOnlineResearch(
  env: Env,
  data: {
    caseId: string
    caseName: string
    systems: string[]
    scopeNotes?: string
    notes?: string
    candidates: ComplianceCandidateProduct[]
    files: SourceFile[]
  },
) {
  if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY 尚未設定')

  const content: Array<Record<string, string>> = data.files.map(file => ({
    type: 'input_file',
    filename: file.fileName,
    file_data: `data:${file.fileType};base64,${file.fileBase64}`,
  }))
  content.push({ type: 'input_text', text: buildResearchPrompt(data) })

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.OPENAI_RESEARCH_MODEL || 'gpt-6-astra',
      background: true,
      store: true,
      reasoning: { effort: 'high' },
      tools: [{ type: 'web_search', search_context_size: 'high', external_web_access: true }],
      include: ['web_search_call.action.sources'],
      input: [{ role: 'user', content }],
      text: { format: reportFormat },
    }),
  })
  const payload = await response.json() as any
  if (!response.ok) {
    throw new Error(`OpenAI 線上分析啟動失敗：${payload?.error?.message ?? response.status}`)
  }

  const job: OnlineResearchJob = {
    caseId: data.caseId,
    responseId: payload.id,
    status: payload.status ?? 'queued',
    systems: data.systems,
    createdAt: new Date().toISOString(),
  }
  await env.AUTH_KV.put(`${JOB_PREFIX}${data.caseId}`, JSON.stringify(job), { expirationTtl: 60 * 60 * 24 * 30 })
  await updateComplianceCaseStatus(env, data.caseId, '分析中')
  return job
}

export async function syncOnlineResearch(env: Env) {
  const keys = await env.AUTH_KV.list({ prefix: JOB_PREFIX, limit: 5 })
  const results: Array<{ caseId: string; status: string; error?: string }> = []

  for (const key of keys.keys) {
    const job = await env.AUTH_KV.get<OnlineResearchJob>(key.name, 'json')
    if (!job || job.finalized || job.status === 'failed' || job.status === 'cancelled') continue

    const response = await fetch(`${OPENAI_RESPONSES_URL}/${job.responseId}`, {
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    })
    const payload = await response.json() as any
    if (!response.ok) {
      job.status = 'failed'
      job.error = payload?.error?.message ?? `OpenAI API ${response.status}`
      await saveJob(env, job)
      results.push({ caseId: job.caseId, status: job.status, error: job.error })
      continue
    }

    job.status = payload.status
    if (payload.status === 'completed') {
      try {
        const report = parseReport(payload)
        await env.AUTH_KV.put(`${REPORT_PREFIX}${job.caseId}`, JSON.stringify(report), { expirationTtl: 60 * 60 * 24 * 90 })
        if (!job.reportAppended) {
          await appendReportToNotion(env, job.caseId, report)
          job.reportAppended = true
        }
        const start = job.savedClauseCount ?? 0
        const batch = report.clauses.slice(start, start + 8)
        if (batch.length) {
          await saveClauseBatchToNotion(env, job, batch, start)
          job.savedClauseCount = start + batch.length
        }
        if ((job.savedClauseCount ?? 0) >= report.clauses.length) {
          await updateComplianceCaseStatus(env, job.caseId, '待覆核', highestRisk(report.clauses))
          job.finalized = true
        }
      } catch (error) {
        job.status = 'failed'
        job.error = error instanceof Error ? error.message : '分析結果處理失敗'
      }
    } else if (payload.status === 'failed' || payload.status === 'cancelled' || payload.status === 'incomplete') {
      job.error = payload?.error?.message ?? payload?.incomplete_details?.reason ?? '線上分析未完成'
    }
    await saveJob(env, job)
    results.push({ caseId: job.caseId, status: job.status, error: job.error })

    // Notion 寫入會使用多次 API 呼叫；一次同步只完成一個案件，避免超過 Worker 限制。
    if (job.finalized || job.status === 'completed') break
  }
  return results
}

export async function getOnlineResearch(env: Env, caseId: string) {
  const [job, report] = await Promise.all([
    env.AUTH_KV.get<OnlineResearchJob>(`${JOB_PREFIX}${caseId}`, 'json'),
    env.AUTH_KV.get<OnlineComplianceReport>(`${REPORT_PREFIX}${caseId}`, 'json'),
  ])
  return { job, report }
}

async function saveJob(env: Env, job: OnlineResearchJob) {
  await env.AUTH_KV.put(`${JOB_PREFIX}${job.caseId}`, JSON.stringify(job), { expirationTtl: 60 * 60 * 24 * 30 })
}

function parseReport(payload: any): OnlineComplianceReport {
  const direct = typeof payload.output_text === 'string' ? payload.output_text : ''
  const nested = (payload.output ?? [])
    .filter((item: any) => item.type === 'message')
    .flatMap((item: any) => item.content ?? [])
    .filter((item: any) => item.type === 'output_text')
    .map((item: any) => item.text)
    .join('')
  const text = direct || nested
  if (!text) throw new Error('OpenAI 未回傳可讀取的分析結果')
  const report = JSON.parse(text) as OnlineComplianceReport
  if (!Array.isArray(report.clauses)) throw new Error('OpenAI 分析結果格式不完整')
  return report
}

async function appendReportToNotion(env: Env, caseId: string, report: OnlineComplianceReport) {
  await appendComplianceReportToCase(env, caseId, report.documentSummary, report.clauses.map(clause => ({
    title: `${clause.location}｜${clause.requirement}｜${clause.risk}`,
    body: `${clause.originalText}\n${clause.conclusion}\n${clause.products.map(product => {
      const evidence = product.evidence.map(item => `${item.title} ${item.url}`).join('；')
      return `${product.brand}：${product.verdict}；${product.evidenceSummary}${evidence ? `；${evidence}` : ''}`
    }).join('\n')}`,
    replacement: clause.allThreeComply
      ? ''
      : `${clause.neutralSuggestion}\n調整理由：${clause.adjustmentRationale}`,
  })))
}

async function saveClauseBatchToNotion(
  env: Env,
  job: OnlineResearchJob,
  clauses: OnlineClauseResult[],
  offset: number,
) {
  const requirements: LocalAnalyzerRequirement[] = clauses.map((clause, index) => ({
    file: clause.fileName || '原始規範',
    title: clause.requirement || `規範條件 ${offset + index + 1}`,
    condition_type: clause.conditionType || '其他',
    matched_text: clause.standardRef || clause.requirement,
    source_text: clause.originalText,
    location: clause.location,
    page: null,
    standard_ref: clause.standardRef,
    normalized_value: null,
    unit: '',
    risk: clause.risk,
    reason: `${clause.conclusion}\n${clause.products.map(product => {
      const links = product.evidence.map(item => item.url).filter(Boolean).join('、')
      return `${product.brand}：${product.verdict}；${product.evidenceSummary}${links ? `；證據：${links}` : ''}`
    }).join('\n')}`,
    suggestion: `${clause.neutralSuggestion}${clause.adjustmentRationale ? `\n調整理由：${clause.adjustmentRationale}` : ''}`,
    market_check: true,
    human_check: clause.products.some(product => product.verdict === '無法確認'),
  }))
  await saveAnalyzerResults(env, job.caseId, job.systems, requirements)
}

function highestRisk(clauses: OnlineClauseResult[]) {
  const ranks: Record<string, number> = { '通過': 0, '注意': 1, '無法判定': 2, '高風險': 3, '不符合': 4 }
  return clauses.reduce((highest, clause) =>
    (ranks[clause.risk] ?? 0) > (ranks[highest] ?? 0) ? clause.risk : highest, '通過')
}

function buildResearchPrompt(data: {
  caseName: string
  systems: string[]
  scopeNotes?: string
  notes?: string
  candidates: ComplianceCandidateProduct[]
}) {
  const products = data.candidates.map((item, index) =>
    `${index + 1}. 廠牌=${item.brand}；系列=${item.series || '未提供'}；型號=${item.model || '未提供'}`
  ).join('\n')
  return `你是臺灣公共工程機電規範合規審查員。請閱讀附加的全部 DOCX/PDF 規範，擷取會限制產品競爭或可能引用錯誤的實質條件，並針對下列三個候選產品進行即時網路查證。

案件：${data.caseName}
工程系統：${data.systems.join('、') || '由文件判讀'}
範圍說明：${data.scopeNotes || '無'}
補充要求：${data.notes || '無'}
候選產品：
${products}

審查規則：
1. 逐條擷取性能、持續時間、百分比、尺寸、容量、壓力、溫度、材質、型式、認證、標準與法規引用；例如「150% 1分鐘」、「96×96 mm」、「20L迴路」、「GR型」、「NEMA ICS 3.1」、「SAS 322 2.0MPa」。最多回報20條最具風險或最需查證的條件。
2. 每條都必須分別查三家特定產品。優先使用原廠產品頁、原廠型錄、原廠手冊、官方認證資料庫；經銷商或購物網站不能單獨作為符合證明。
3. 不可從廠牌整體能力推論特定系列或型號。電壓、功率、負載等級或選配會影響結果時，必須說明適用條件。
4. 搜尋不到證據只能判定「無法確認」，不可判定「不符合」；只有官方資料明確衝突時才判定「不符合」。
5. 標準必須區分「明確宣告符合」與「具有類似安全功能」。CNS引用須查目前有效性、廢止及取代關係；沒有官方證據時標示無法確認。
6. 若只有一家符合，該條風險至少為「高風險」，並指出排除另外兩家的精確條件。若三家都無法證明，不得宣稱獨家。
7. allThreeComply 只有在三家特定產品都有足夠證據符合該條時才能為 true。只要不是三家全部符合，neutralSuggestion 必須提供一段可直接取代原條文的完整繁體中文規範文字，以必要功能、容量、性能及臺灣現行法規重寫，使三家可在不降低安全與必要功能的前提下公平競爭；不可只寫原則、提醒或「建議修改」。adjustmentRationale 要說明刪除或放寬了哪些非必要限制，以及必要功能如何保留。
8. 例如火警受信總機，不應以日系 10L／20L 或美系不同點數架構作唯一門檻，而應改寫為本工程所需探測迴路、警報分區、設備點數、擴充容量、顯示、事件紀錄、斷線監視、連動、備用電源及臺灣現行消防法規等功能性條件。其他設備也採相同原則，但不得捏造三家都能達到的數值。
9. 每個符合或不符合判定都附可直接開啟的證據網址、文件名稱，以及頁碼或章節；查閱日期使用今天日期。全部內容以繁體中文輸出。`
}

const reportFormat = {
  type: 'json_schema',
  name: 'compliance_research_report',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['documentSummary', 'clauses'],
    properties: {
      documentSummary: { type: 'string' },
      clauses: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['clauseId', 'fileName', 'location', 'originalText', 'requirement', 'conditionType', 'standardRef', 'risk', 'allThreeComply', 'conclusion', 'neutralSuggestion', 'adjustmentRationale', 'products'],
          properties: {
            clauseId: { type: 'string' },
            fileName: { type: 'string' },
            location: { type: 'string' },
            originalText: { type: 'string' },
            requirement: { type: 'string' },
            conditionType: { type: 'string', enum: ['CNS標準', '法規引用', '性能數值', '尺寸', '容量', '型式', '材質', '試驗', '其他'] },
            standardRef: { type: 'string' },
            risk: { type: 'string', enum: ['通過', '注意', '高風險', '不符合', '無法判定'] },
            allThreeComply: { type: 'boolean' },
            conclusion: { type: 'string' },
            neutralSuggestion: { type: 'string' },
            adjustmentRationale: { type: 'string' },
            products: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['brand', 'series', 'model', 'verdict', 'evidenceSummary', 'evidence'],
                properties: {
                  brand: { type: 'string' }, series: { type: 'string' }, model: { type: 'string' },
                  verdict: { type: 'string', enum: ['符合', '條件符合', '不符合', '無法確認'] },
                  evidenceSummary: { type: 'string' },
                  evidence: {
                    type: 'array',
                    items: {
                      type: 'object', additionalProperties: false,
                      required: ['title', 'url', 'sourceType', 'pageOrSection', 'retrievedAt'],
                      properties: {
                        title: { type: 'string' }, url: { type: 'string' }, sourceType: { type: 'string' },
                        pageOrSection: { type: 'string' }, retrievedAt: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
}
