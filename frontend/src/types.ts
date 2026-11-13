export type EntityType = 'equipment' | 'material'

export type EquipmentStatus = 'active' | 'decommissioned'
export type InspectionResult = 'pass' | 'fail' | 'conditional'
export type PriceSourceType = 'contract' | 'quote' | 'actual' | 'estimate'

export interface Equipment {
  id: string
  name: string
  type: string
  model: string
  manufacturer: string
  installDate: string
  status: EquipmentStatus
  location: string
  buildingCategory: string
  publicWorkCode: string
  origin: string
  specialItem: string
  agent: string
  specDetail: string
  notes: string
  budgetPrice?: number | null
  inquiryDate?: string
  projectCode?: string
}

export interface Material {
  id: string
  name: string
  type: string
  grade: string
  unit: string
  supplier: string
}

export interface Specification {
  id: string
  entityType: EntityType
  entityId: string
  entityName: string
  effectiveFrom: string
  effectiveTo: string | null
  specData: Record<string, string>
  versionLabel: string
  changeSummary: string
}

export interface PricingRecord {
  id: string
  entityType: EntityType
  entityId: string
  entityName: string
  price: number
  priceDate: string
  supplier: string
  projectRef: string
  sourceType: PriceSourceType
  notes: string
}

export interface InspectionRecord {
  id: string
  inspectionDate: string
  entityType: EntityType
  entityId: string
  entityName: string
  specSnapshot: Record<string, string>
  priceAtInspection: number
  result: InspectionResult
  findings: string
  inspector: string
}

export interface BrandItem {
  name: string
  grade: string
}

export interface BrandMaster {
  id: string
  productName: string
  category: string
  brands: BrandItem[]
}

export interface BrandReport {
  id: string
  reportName: string
  projectCode: string
  category: string
  selections: Record<string, Record<string, string[]>>
  createdDate: string
  savedAt?: string
  changeDiff?: string
  notes: string
  changeSummary?: string
}

export interface Project {
  id: string
  projectCode: string
  projectName: string
  year: number
  createdDate: string
}

export interface ProjectWithStats extends Project {
  versionCount: number
  lastSavedAt?: string
}

export interface ComplianceCandidateProduct {
  brand: string
  series?: string
  model?: string
}

export interface ComplianceSourceFile {
  fileBase64: string
  fileName: string
  fileType: string
}

export interface ComplianceCase {
  id: string
  caseName: string
  status: string
  highestRisk: string
  systems: string[]
  fileCount: number
  createdTime: string
  lastEditedTime: string
  analysisError?: string
}

export interface ComplianceEvidence {
  title: string
  url: string
  sourceType: string
  pageOrSection: string
  retrievedAt: string
}

export interface ComplianceProductResult {
  brand: string
  series: string
  model: string
  verdict: '符合' | '條件符合' | '不符合' | '無法確認'
  evidenceSummary: string
  evidence: ComplianceEvidence[]
}

export interface ComplianceClauseResult {
  clauseId: string
  fileName: string
  location: string
  originalText: string
  requirement: string
  conditionType: string
  standardRef: string
  risk: string
  allThreeComply: boolean
  conclusion: string
  neutralSuggestion: string
  adjustmentRationale: string
  products: ComplianceProductResult[]
}

export interface ComplianceOnlineReport {
  documentSummary: string
  clauses: ComplianceClauseResult[]
}

export interface ComplianceResearchState {
  job: { status: string; error?: string; finalized?: boolean } | null
  report: ComplianceOnlineReport | null
}

export interface ComplianceRequirement {
  id: string
  title: string
  fileName: string
  location: string
  sourceText: string
  conditionType: string
  matchedText: string
  standardRef: string
  risk: string
  reason: string
  suggestion: string
  status: string
  marketCheck: boolean
  humanCheck: boolean
}

export interface PriceTrend {
  year: number
  avgPrice: number
  minPrice: number
  maxPrice: number
  count: number
}

export interface InspectionLookupResult {
  entity: Equipment | Material
  entityType: EntityType
  currentSpec: Specification | null
  recentPrices: PricingRecord[]
  lastInspection: InspectionRecord | null
}
