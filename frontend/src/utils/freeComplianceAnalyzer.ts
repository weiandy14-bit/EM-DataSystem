import { unzipSync } from 'fflate'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { FreeComplianceRequirement } from '../types'

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

type SourceLine = { text: string; location: string }

type Rule = {
  conditionType: string
  pattern: RegExp
  risk: '注意' | '高風險'
  reason: string
  suggestion: (source: string) => string
  standard?: boolean
}

const rules: Rule[] = [
  {
    conditionType: '標準認證',
    pattern: /CNS\s*\d+(?:[-–]\d+)?(?:\s*[A-Z][A-Z0-9.-]*)?/gi,
    risk: '注意',
    reason: '已擷取 CNS 引用；必須再向官方來源確認名稱、最新版、廢止狀態及完整取代鏈。',
    suggestion: source => `應符合本項功能所適用之現行有效 CNS 標準；原引用「${source}」如已修訂、廢止或取代，應採最新有效版本。`,
    standard: true,
  },
  {
    conditionType: '標準認證',
    pattern: /(?:NEMA\s+ICS|NFPA|IEC|JIS|SAS|UL|ISO|ASTM)\s*[A-Z0-9.-]*(?:\s+[A-Z0-9.-]+)?/gi,
    risk: '注意',
    reason: '已擷取非 CNS 標準或認證；免費模式不會推論特定產品已取得該認證，須以官方證書或原廠文件確認。',
    suggestion: source => `設備應符合「${source}」或經設計單位確認之同等安全與性能標準，並提出有效證明文件；法規指定不得替代者除外。`,
    standard: true,
  },
  {
    conditionType: '尺寸公差',
    pattern: /\d+(?:\.\d+)?\s*(?:mm|cm|m)\s*[x×X＊*]\s*\d+(?:\.\d+)?\s*(?:mm|cm|m)?/gi,
    risk: '高風險',
    reason: '固定外形尺寸可能排除功能相同的產品，應確認是否為實際安裝介面的必要限制。',
    suggestion: () => '設備外形尺寸應配合盤面、維修空間及既有安裝介面；在不影響功能、安全、散熱及操作需求下，得採經核可之等效尺寸。',
  },
  {
    conditionType: '百分比倍率',
    pattern: /\d+(?:\.\d+)?\s*%/g,
    risk: '注意',
    reason: '百分比性能條件須確認必要性、適用負載及持續時間，並以三家特定產品資料驗證。',
    suggestion: () => '設備之過載或性能能力應符合本工程實際負載、啟動及運轉需求；廠商應提出完整性能曲線及持續時間證明，經審查確認後採用。',
  },
  {
    conditionType: '持續時間',
    pattern: /\d+(?:\.\d+)?\s*(?:秒|分鐘|分|min(?:ute)?s?|小時|hr|hours?)/gi,
    risk: '注意',
    reason: '持續時間與性能倍率通常為組合條件，必須在同一產品、額定值及適用條件下查證。',
    suggestion: () => '設備應在本工程最不利運轉條件下維持所需性能達必要時間，並由原廠文件或試驗報告證明；不得僅以瞬時峰值代替。',
  },
  {
    conditionType: '壓力溫度',
    pattern: /[-+]?\d+(?:\.\d+)?\s*(?:MPa|kPa|bar|kgf\/?cm²?|℃|°C)/gi,
    risk: '注意',
    reason: '壓力或溫度數值須對照系統設計條件、試驗條件及產品額定範圍。',
    suggestion: () => '材料或設備之額定壓力與使用溫度應不低於本工程設計及試驗條件，並提出適用範圍與原廠證明。',
  },
  {
    conditionType: '容量點數迴路',
    pattern: /\d+(?:\.\d+)?\s*(?:L|迴路|回路|點位|點)/gi,
    risk: '高風險',
    reason: '容量、點數或迴路代號可能屬特定系統架構，不能只用日系或美系命名判斷功能。',
    suggestion: source => /(?:10|20)\s*L/i.test(source)
      ? '受信總機應支援本工程所需之探測迴路、警報分區及設備點數，並保留不低於指定比例的擴充容量；其顯示、事件紀錄、斷線監視、連動及備用電源功能應符合臺灣現行消防法規與認可基準。'
      : '設備容量、迴路及點數應依本工程實際需求與擴充容量表示，不得以單一廠牌或單一國家系統的型式代號作為唯一條件。',
  },
  {
    conditionType: '型式代號',
    pattern: /(?:GR型|P型|R型|10\s*L|20\s*L)/gi,
    risk: '高風險',
    reason: '型式代號可能為特定國家或廠牌架構，須改以實際功能、法規及介面需求比較。',
    suggestion: () => '設備型式應以本工程所需功能、容量、連動介面、監視能力及臺灣現行法規認可條件表示；不同技術架構具同等功能與安全性者均得採用。',
  },
  {
    conditionType: '品牌產地',
    pattern: /(?:指定廠牌|限用|唯一|專用|原廠指定|不得採用其他|僅得採用)/g,
    risk: '高風險',
    reason: '文字可能直接限制競爭，須提出不可替代的功能或相容性依據。',
    suggestion: () => '產品應符合本規範所列必要功能、性能、安全、相容性及法規要求；符合條件並提出證明之同等品均得依程序送審。',
  },
]

export async function analyzeFilesFree(files: File[]): Promise<FreeComplianceRequirement[]> {
  const results: FreeComplianceRequirement[] = []
  for (const file of files) {
    const lines = file.name.toLowerCase().endsWith('.pdf')
      ? await readPdf(file)
      : await readDocx(file)
    results.push(...analyzeLines(file.name, lines))
  }
  return deduplicate(results).slice(0, 100)
}

async function readDocx(file: File): Promise<SourceLine[]> {
  const archive = unzipSync(new Uint8Array(await file.arrayBuffer()))
  const xmlBytes = archive['word/document.xml']
  if (!xmlBytes) throw new Error(`${file.name} 不是可讀取的 DOCX 文件`)
  const xml = new DOMParser().parseFromString(new TextDecoder().decode(xmlBytes), 'application/xml')
  return Array.from(xml.getElementsByTagName('w:p')).flatMap((paragraph, index) => {
    const text = Array.from(paragraph.getElementsByTagName('w:t'))
      .map(node => node.textContent ?? '')
      .join('')
      .replace(/\s+/g, ' ')
      .trim()
    return text ? [{ text, location: `段落 ${index + 1}` }] : []
  })
}

async function readPdf(file: File): Promise<SourceLine[]> {
  const document = await getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  const lines: SourceLine[] = []
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
    const page = await document.getPage(pageNumber)
    const content = await page.getTextContent()
    let current = ''
    for (const rawItem of content.items) {
      const item = rawItem as { str?: string; hasEOL?: boolean }
      if (item.str) current += `${item.str} `
      if (item.hasEOL && current.trim()) {
        lines.push({ text: current.replace(/\s+/g, ' ').trim(), location: `第 ${pageNumber} 頁` })
        current = ''
      }
    }
    if (current.trim()) lines.push({ text: current.replace(/\s+/g, ' ').trim(), location: `第 ${pageNumber} 頁` })
  }
  return lines
}

function analyzeLines(fileName: string, lines: SourceLine[]): FreeComplianceRequirement[] {
  const results: FreeComplianceRequirement[] = []
  for (const line of lines) {
    if (line.text.length < 4) continue
    for (const rule of rules) {
      const matches = line.text.match(rule.pattern) ?? []
      for (const matched of [...new Set(matches.map(value => value.trim()))]) {
        results.push({
          file: fileName,
          title: `${rule.conditionType}：${matched}`,
          condition_type: rule.conditionType,
          matched_text: matched,
          source_text: line.text.slice(0, 1800),
          location: line.location,
          page: pageNumber(line.location),
          standard_ref: rule.standard ? matched.replace(/\s+/g, ' ').trim() : '',
          normalized_value: numericValue(matched),
          unit: matched.replace(/[-+]?\d+(?:\.\d+)?\s*/g, '').trim(),
          risk: rule.risk,
          reason: rule.reason,
          suggestion: rule.suggestion(line.text),
          market_check: true,
          human_check: true,
        })
      }
    }
  }
  return results
}

function pageNumber(location: string) {
  const match = location.match(/第\s*(\d+)\s*頁/)
  return match ? Number(match[1]) : null
}

function numericValue(value: string) {
  const match = value.match(/[-+]?\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : null
}

function deduplicate(items: FreeComplianceRequirement[]) {
  const seen = new Set<string>()
  return items.filter(item => {
    const key = `${item.file}|${item.location}|${item.condition_type}|${item.matched_text.toUpperCase()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
