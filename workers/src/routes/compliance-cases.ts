import {
  createComplianceCase,
  listComplianceCases,
  listSpecificationRequirements,
  pageToComplianceCase,
  type ComplianceCandidateProduct,
  type Env,
} from '../notion'

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
    const match = subpath.match(/^\/([^/]+)\/requirements$/)
    if (match) return json(await listSpecificationRequirements(env, match[1]))
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
  return json(pageToComplianceCase(page), 201)
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
