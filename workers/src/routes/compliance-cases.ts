import {
  createComplianceCase,
  pageToComplianceCase,
  type ComplianceCandidateProduct,
  type Env,
} from '../notion'

const MAX_FILE_SIZE = 15 * 1024 * 1024
const ALLOWED_FILE_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

type CreateComplianceCaseBody = {
  caseName: string
  projectId?: string
  designPressure?: number
  testPressure?: number
  temperature?: number
  fluid?: string
  pipeRange?: string
  candidates?: ComplianceCandidateProduct[]
  notes?: string
  fileBase64: string
  fileName: string
  fileType: string
}

export async function handleComplianceCases(
  req: Request,
  env: Env,
  subpath: string,
): Promise<Response> {
  if (req.method !== 'POST' || (subpath !== '/' && subpath !== '')) {
    return json({ error: 'Method not allowed' }, 405)
  }

  const body = await req.json() as CreateComplianceCaseBody
  if (!body.caseName?.trim() || !body.fileBase64 || !body.fileName || !body.fileType) {
    return json({ error: '案件名稱與原始規範為必填' }, 400)
  }
  const extension = body.fileName.toLowerCase()
  const fileType = ALLOWED_FILE_TYPES.has(body.fileType)
    ? body.fileType
    : extension.endsWith('.pdf')
      ? 'application/pdf'
      : extension.endsWith('.docx')
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : ''
  if (!fileType) {
    return json({ error: '僅支援 DOCX 或 PDF 文件' }, 400)
  }

  const estimatedSize = Math.floor(body.fileBase64.length * 0.75)
  if (estimatedSize > MAX_FILE_SIZE) {
    return json({ error: '文件不得超過 15 MB' }, 400)
  }

  const candidates = (body.candidates ?? [])
    .map(candidate => ({
      brand: candidate.brand?.trim(),
      series: candidate.series?.trim(),
      model: candidate.model?.trim(),
    }))
    .filter(candidate => candidate.brand)
    .slice(0, 3)

  const page = await createComplianceCase(env, {
    ...body,
    caseName: body.caseName.trim(),
    candidates,
    fileType,
  })
  return json(pageToComplianceCase(page), 201)
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
