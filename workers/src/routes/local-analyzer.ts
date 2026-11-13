import {
  getAnalyzerCase,
  listPendingAnalyzerCases,
  saveAnalyzerResults,
  updateComplianceCaseStatus,
  type Env,
  type LocalAnalyzerRequirement,
} from '../notion'

const ALLOWED_STATUSES = new Set(['待分析', '分析中', '待覆核'])
const ALLOWED_RISKS = new Set(['未判定', '低', '中', '高', '重大'])

export async function handleLocalAnalyzer(req: Request, env: Env, subpath: string): Promise<Response> {
  if (!authorized(req, env)) return json({ error: 'Unauthorized local analyzer' }, 401)

  if (req.method === 'GET' && (subpath === '/' || subpath === '' || subpath === '/cases')) {
    return json(await listPendingAnalyzerCases(env))
  }

  const caseMatch = subpath.match(/^\/cases\/([^/]+)$/)
  if (req.method === 'GET' && caseMatch) return json(await getAnalyzerCase(env, caseMatch[1]))

  const statusMatch = subpath.match(/^\/cases\/([^/]+)\/status$/)
  if (req.method === 'PATCH' && statusMatch) {
    const body = await req.json() as { status?: string; highestRisk?: string }
    if (!body.status || !ALLOWED_STATUSES.has(body.status)) return json({ error: 'Invalid status' }, 400)
    if (body.highestRisk && !ALLOWED_RISKS.has(body.highestRisk)) return json({ error: 'Invalid risk' }, 400)
    await updateComplianceCaseStatus(env, statusMatch[1], body.status, body.highestRisk)
    return json({ success: true })
  }

  const resultMatch = subpath.match(/^\/cases\/([^/]+)\/results$/)
  if (req.method === 'POST' && resultMatch) {
    const body = await req.json() as { systems?: string[]; requirements?: LocalAnalyzerRequirement[] }
    if (!Array.isArray(body.requirements)) return json({ error: 'Missing requirements' }, 400)
    if (body.requirements.length > 5000) return json({ error: 'Too many requirements' }, 400)
    return json(await saveAnalyzerResults(env, resultMatch[1], body.systems ?? [], body.requirements))
  }

  return json({ error: 'Method not allowed' }, 405)
}

function authorized(req: Request, env: Env) {
  if (!env.LOCAL_ANALYZER_TOKEN) return false
  return req.headers.get('Authorization') === `Bearer ${env.LOCAL_ANALYZER_TOKEN}`
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
