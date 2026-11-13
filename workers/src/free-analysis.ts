import {
  saveAnalyzerResults,
  updateComplianceCaseStatus,
  type Env,
  type LocalAnalyzerRequirement,
} from './notion'

const JOB_PREFIX = 'compliance-free-job:'

type FreeAnalysisJob = {
  caseId: string
  systems: string[]
  requirements: LocalAnalyzerRequirement[]
  savedCount: number
  status: 'queued' | 'in_progress' | 'completed' | 'failed'
  error?: string
}

export async function queueFreeAnalysis(
  env: Env,
  caseId: string,
  systems: string[],
  requirements: LocalAnalyzerRequirement[],
) {
  const job: FreeAnalysisJob = {
    caseId,
    systems,
    requirements: requirements.slice(0, 100),
    savedCount: 0,
    status: 'queued',
  }
  await env.AUTH_KV.put(`${JOB_PREFIX}${caseId}`, JSON.stringify(job), { expirationTtl: 60 * 60 * 24 * 30 })
  await updateComplianceCaseStatus(env, caseId, '分析中')
  return job
}

export async function syncFreeAnalysis(env: Env) {
  const keys = await env.AUTH_KV.list({ prefix: JOB_PREFIX, limit: 5 })
  const results: Array<{ caseId: string; status: string; error?: string }> = []
  for (const key of keys.keys) {
    const job = await env.AUTH_KV.get<FreeAnalysisJob>(key.name, 'json')
    if (!job || job.status === 'completed' || job.status === 'failed') continue
    try {
      job.status = 'in_progress'
      const batch = job.requirements.slice(job.savedCount, job.savedCount + 5)
      if (batch.length) {
        await saveAnalyzerResults(env, job.caseId, job.systems, batch)
        job.savedCount += batch.length
      }
      if (job.savedCount >= job.requirements.length) {
        job.status = 'completed'
        await updateComplianceCaseStatus(env, job.caseId, '待覆核', highestCaseRisk(job.requirements))
      }
    } catch (error) {
      job.status = 'failed'
      job.error = error instanceof Error ? error.message : '免費規則檢核寫入失敗'
    }
    await env.AUTH_KV.put(key.name, JSON.stringify(job), { expirationTtl: 60 * 60 * 24 * 30 })
    results.push({ caseId: job.caseId, status: job.status, error: job.error })
    break
  }
  return results
}

export async function getFreeAnalysis(env: Env, caseId: string) {
  const job = await env.AUTH_KV.get<FreeAnalysisJob>(`${JOB_PREFIX}${caseId}`, 'json')
  return job ? { status: job.status, error: job.error, savedCount: job.savedCount, total: job.requirements.length } : null
}

function highestCaseRisk(requirements: LocalAnalyzerRequirement[]) {
  if (requirements.some(item => item.risk === '不符合')) return '重大'
  if (requirements.some(item => item.risk === '高風險')) return '高'
  if (requirements.some(item => item.risk === '注意' || item.risk === '無法判定')) return '中'
  return '低'
}
