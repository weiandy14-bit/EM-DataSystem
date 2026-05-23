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
