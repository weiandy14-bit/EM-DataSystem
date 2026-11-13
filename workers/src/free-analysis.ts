import {
  saveAnalyzerResults,
  updateComplianceCaseStatus,
  type Env,
  type LocalAnalyzerRequirement,
} from './notion'
import { verifyCnsReferences } from './cns-official'

const JOB_PREFIX = 'compliance-free-job:'

type FreeAnalysisJob = {
  caseId: string
  systems: string[]
  requirements: LocalAnalyzerRequirement[]
  savedCount: number
  cnsReferences: string[]
  cnsCheckedCount: number
  cnsResults: string[]
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
    cnsReferences: [...new Set(requirements
      .map(item => item.standard_ref)
      .filter(reference => /^CNS\s*\d/i.test(reference)))],
    cnsCheckedCount: 0,
    cnsResults: [],
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
      job.cnsReferences ??= [...new Set(job.requirements
        .map(item => item.standard_ref)
        .filter(reference => /^CNS\s*\d/i.test(reference)))]
      job.cnsCheckedCount ??= 0
      job.cnsResults ??= []
      job.status = 'in_progress'
      const batch = job.requirements.slice(job.savedCount, job.savedCount + 5)
      if (batch.length) {
        await saveAnalyzerResults(env, job.caseId, job.systems, batch)
        job.savedCount += batch.length
      }
      if (job.savedCount >= job.requirements.length && job.cnsCheckedCount < job.cnsReferences.length) {
        const references = job.cnsReferences.slice(job.cnsCheckedCount, job.cnsCheckedCount + 1)
        const cnsResults = await verifyCnsReferences(env, job.caseId, references)
        job.cnsResults.push(...cnsResults.map(item => item.result))
        if (cnsResults.every(item => item.complete)) job.cnsCheckedCount += references.length
      }
      if (job.savedCount >= job.requirements.length && job.cnsCheckedCount >= job.cnsReferences.length) {
        job.status = 'completed'
        await updateComplianceCaseStatus(env, job.caseId, '待覆核', highestCaseRisk(job.requirements, job.cnsResults))
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
  return job ? {
    status: job.status,
    error: job.error,
    savedCount: job.savedCount,
    total: job.requirements.length,
    cnsCheckedCount: job.cnsCheckedCount ?? 0,
    cnsTotal: job.cnsReferences?.length ?? 0,
  } : null
}

function highestCaseRisk(requirements: LocalAnalyzerRequirement[], cnsResults: string[]) {
  if (cnsResults.some(result => result.startsWith('已廢止'))) return '重大'
  if (requirements.some(item => item.risk === '不符合')) return '重大'
  if (requirements.some(item => item.risk === '高風險')) return '高'
  if (requirements.some(item => item.risk === '注意' || item.risk === '無法判定')) return '中'
  return '低'
}
