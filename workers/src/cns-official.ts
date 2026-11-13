import {
  resolveCnsCheck,
  upsertCnsReplacement,
  upsertCnsStandard,
  type CnsOfficialRecord,
  type Env,
} from './notion'

const CNS_DATA_URL = 'https://data.bsmi.gov.tw/opendata/download/313000000G-000131-001.action'
const CNS_DATASET_PAGE = 'https://data.gov.tw/dataset/85993'
const CNS_CACHE_KEY = 'cns-official-dataset:v1'

export async function verifyCnsReferences(env: Env, caseId: string, references: string[]) {
  const records = await loadOfficialCnsRecords(env)
  const byNumber = new Map(records.map(record => [record.number, record]))
  const results: Array<{ reference: string; result: string; complete: boolean }> = []

  for (const reference of references) {
    const number = normalizeCnsNumber(reference)
    const record = byNumber.get(number)
    if (!number || !record) {
      const resolution = await resolveCnsCheck(env, caseId, reference, {
        result: '官方來源無法查證',
        officialStatus: `標檢局開放資料中找不到 ${reference}`,
        replacementChain: '',
        suggestion: '請確認 CNS 編號、分部編號及原始規範文字是否完整，並由人工至 CNS 網路服務系統覆核。',
        officialUrl: CNS_DATASET_PAGE,
        completed: false,
        humanCheck: true,
        risk: '無法判定',
      })
      results.push({ reference, result: '官方來源無法查證', complete: !resolution.hasMore })
      continue
    }

    const graph = buildReplacementGraph(record, byNumber)
    const standardIds = new Map<string, string>()
    for (const item of graph.records) {
      standardIds.set(item.number, await upsertCnsStandard(env, item, CNS_DATASET_PAGE))
    }
    for (const edge of graph.edges) {
      await upsertCnsReplacement(env, {
        fromId: standardIds.get(edge.from.number)!,
        toId: standardIds.get(edge.to.number)!,
        fromNumber: edge.from.number,
        toNumber: edge.to.number,
        effectiveDate: edge.from.withdrawnDate,
        officialUrl: CNS_DATASET_PAGE,
      })
    }

    const replacementText = replacementChainText(record, byNumber)
    const masterId = standardIds.get(record.number)!
    if (!record.withdrawnDate) {
      const resolution = await resolveCnsCheck(env, caseId, reference, {
        result: '最新有效',
        officialStatus: officialStatusText(record),
        replacementChain: '',
        suggestion: `CNS ${record.number} 目前未列廢止日期，可保留引用；仍應以決標或送審當日官方資料再次確認。`,
        officialUrl: CNS_DATASET_PAGE,
        completed: true,
        humanCheck: false,
        risk: '通過',
        standardId: masterId,
      })
      results.push({ reference, result: '最新有效', complete: !resolution.hasMore })
      continue
    }

    const hasReplacement = record.replacements.length > 0
    const result = hasReplacement ? '已廢止有取代' : '已廢止無取代'
    const suggestion = hasReplacement
      ? `原引用 CNS ${record.number} 已廢止，建議改為「應符合取代鏈所列之現行有效 CNS 標準，或具同等功能及安全水準之現行適用標準」。`
      : `原引用 CNS ${record.number} 已廢止且官方資料未列取代標準；請依設備功能、現行法規及設計需求重新選定適用標準。`
    const resolution = await resolveCnsCheck(env, caseId, reference, {
      result,
      officialStatus: officialStatusText(record),
      replacementChain: hasReplacement ? replacementText : '',
      suggestion,
      officialUrl: CNS_DATASET_PAGE,
      completed: true,
      humanCheck: !hasReplacement,
      risk: '不符合',
      standardId: masterId,
    })
    results.push({ reference, result, complete: !resolution.hasMore })
  }
  return results
}

export function parseOfficialCnsXml(xml: string): CnsOfficialRecord[] {
  const records: CnsOfficialRecord[] = []
  for (const rowMatch of xml.matchAll(/<row>([\s\S]*?)<\/row>/g)) {
    const row = rowMatch[1]
    const number = field(row, '標準總號').replace(/^CNS\s*/i, '').trim()
    if (!number) continue
    const name = field(row, '標準名稱')
    records.push({
      number,
      categoryNumber: field(row, '標準類號'),
      name,
      publishedDate: rocDate(field(row, '公布日期')),
      revisedDate: rocDate(field(row, '修訂日期')),
      withdrawnDate: rocDate(field(row, '廢止日期')),
      internationalOrganization: field(row, '相對應國際標準組織'),
      internationalNumber: field(row, '相對應國際標準編號'),
      internationalYear: field(row, '相對應國際標準年度'),
      replacements: extractReplacements(name),
    })
  }
  return records
}

async function loadOfficialCnsRecords(env: Env) {
  let xml = await env.AUTH_KV.get(CNS_CACHE_KEY)
  if (!xml) {
    const response = await fetch(CNS_DATA_URL, { headers: { Accept: 'application/xml' } })
    if (!response.ok) throw new Error(`CNS 官方資料下載失敗：HTTP ${response.status}`)
    xml = await response.text()
    if (!xml.includes('<bsmi>') || !xml.includes('<標準總號>')) {
      throw new Error('CNS 官方資料格式無法辨識')
    }
    await env.AUTH_KV.put(CNS_CACHE_KEY, xml, { expirationTtl: 60 * 60 * 24 * 7 })
  }
  return parseOfficialCnsXml(xml)
}

function buildReplacementGraph(first: CnsOfficialRecord, byNumber: Map<string, CnsOfficialRecord>) {
  const records = [first]
  const edges: Array<{ from: CnsOfficialRecord; to: CnsOfficialRecord }> = []
  const visited = new Set([first.number])
  const queue = [first]
  while (queue.length && records.length < 20) {
    const current = queue.shift()!
    for (const nextNumber of current.replacements) {
      const next = byNumber.get(nextNumber)
      if (!next) continue
      edges.push({ from: current, to: next })
      if (!visited.has(nextNumber)) {
        visited.add(nextNumber)
        records.push(next)
        queue.push(next)
      }
    }
  }
  return { records, edges }
}

function replacementChainText(first: CnsOfficialRecord, byNumber: Map<string, CnsOfficialRecord>) {
  const render = (record: CnsOfficialRecord, visited: Set<string>): string => {
    const nextNumbers = record.replacements.filter(number => !visited.has(number))
    if (!nextNumbers.length) return `CNS ${record.number}`
    const branchVisited = new Set(visited).add(record.number)
    return `CNS ${record.number} → ${nextNumbers.map(number => {
      const item = byNumber.get(number)
      return item ? render(item, branchVisited) : `CNS ${number}`
    }).join('、')}`
  }
  return render(first, new Set())
}

function normalizeCnsNumber(value: string) {
  return value.match(/CNS\s*(\d+(?:-\d+)*)/i)?.[1] ?? ''
}

function extractReplacements(name: string) {
  const note = name.match(/[（(]被(.+?)取代[）)]/)?.[1] ?? ''
  return [...note.matchAll(/CNS\s*(\d+(?:-\d+)*)/gi)].map(match => match[1])
}

function officialStatusText(record: CnsOfficialRecord) {
  const dates = [
    record.publishedDate && `公布 ${record.publishedDate}`,
    record.revisedDate && `修訂 ${record.revisedDate}`,
    record.withdrawnDate && `廢止 ${record.withdrawnDate}`,
  ].filter(Boolean).join('；')
  return `CNS ${record.number}「${record.name}」；${dates || '官方資料未列日期'}`
}

function field(row: string, tag: string) {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const value = row.match(new RegExp(`<${escaped}>([\\s\\S]*?)<\\/${escaped}>|<${escaped}\\s*\\/>`))?.[1] ?? ''
  return decodeXml(value).trim()
}

function decodeXml(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&amp;/g, '&')
}

function rocDate(value: string) {
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 7) return ''
  const year = Number(digits.slice(0, 3)) + 1911
  const month = digits.slice(3, 5)
  const day = digits.slice(5, 7)
  return `${year}-${month}-${day}`
}
