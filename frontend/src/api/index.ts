import type {
  Equipment, Material, Specification, PricingRecord,
  InspectionRecord, PriceTrend, InspectionLookupResult, EntityType
} from '../types'

// 開發時用 mock；生產環境呼叫 Cloudflare Workers
const USE_MOCK = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK !== 'false'

// Workers API base — 生產環境改成你的 Worker URL
const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

// ---- mock fallback (開發用) ----
async function loadMock() {
  const { mockEquipment, mockMaterials, mockSpecifications, mockPricing, mockInspections } =
    await import('../mock/data')
  return { mockEquipment, mockMaterials, mockSpecifications, mockPricing, mockInspections }
}

async function get<T>(path: string, params?: Record<string, string | string[] | undefined>): Promise<T> {
  const url = new URL(`${API_BASE}${path}`, location.origin)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined) continue
      if (Array.isArray(v)) v.forEach(val => url.searchParams.append(k, val))
      else url.searchParams.set(k, v)
    }
  }
  const token = localStorage.getItem('em_auth_token')
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(url.toString(), { headers })
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json()
}

function priceTrend(records: PricingRecord[]): PriceTrend[] {
  const byYear: Record<number, number[]> = {}
  records.forEach(r => {
    const y = new Date(r.priceDate).getFullYear()
    byYear[y] = [...(byYear[y] || []), r.price]
  })
  return Object.entries(byYear)
    .map(([year, prices]) => ({
      year: Number(year),
      avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      count: prices.length,
    }))
    .sort((a, b) => a.year - b.year)
}

// ---- API ----

export const api = {
  equipment: {
    list: async (filters?: {
      type?: string; status?: string; keyword?: string
      buildingCategories?: string[]; yearStart?: number; yearEnd?: number
    }): Promise<Equipment[]> => {
      if (USE_MOCK) {
        const { mockEquipment } = await loadMock()
        let data = [...mockEquipment]
        if (filters?.type) data = data.filter(e => e.type === filters.type)
        if (filters?.status) data = data.filter(e => e.status === filters.status)
        if (filters?.keyword) {
          const kw = filters.keyword.toLowerCase()
          data = data.filter(e => e.name.toLowerCase().includes(kw) || e.manufacturer.toLowerCase().includes(kw) || e.model.toLowerCase().includes(kw))
        }
        if (filters?.buildingCategories?.length) data = data.filter(e => filters.buildingCategories!.includes(e.buildingCategory))
        if (filters?.yearStart) data = data.filter(e => new Date(e.installDate).getFullYear() >= filters.yearStart! + 1911)
        if (filters?.yearEnd) data = data.filter(e => new Date(e.installDate).getFullYear() <= filters.yearEnd! + 1911)
        return data
      }
      return get<Equipment[]>('/equipment', {
        type: filters?.type,
        status: filters?.status,
        keyword: filters?.keyword,
        buildingCategories: filters?.buildingCategories,
        yearStart: filters?.yearStart?.toString(),
        yearEnd: filters?.yearEnd?.toString(),
      })
    },
    get: async (id: string): Promise<Equipment | undefined> => {
      if (USE_MOCK) {
        const { mockEquipment } = await loadMock()
        return mockEquipment.find(e => e.id === id)
      }
      return get<Equipment>(`/equipment/${id}`)
    },
  },

  materials: {
    list: async (filters?: { type?: string; keyword?: string }): Promise<Material[]> => {
      if (USE_MOCK) {
        const { mockMaterials } = await loadMock()
        let data = [...mockMaterials]
        if (filters?.type) data = data.filter(m => m.type === filters.type)
        if (filters?.keyword) {
          const kw = filters.keyword.toLowerCase()
          data = data.filter(m => m.name.toLowerCase().includes(kw) || m.supplier.toLowerCase().includes(kw))
        }
        return data
      }
      return get<Material[]>('/materials', { type: filters?.type, keyword: filters?.keyword })
    },
    get: async (id: string): Promise<Material | undefined> => {
      if (USE_MOCK) {
        const { mockMaterials } = await loadMock()
        return mockMaterials.find(m => m.id === id)
      }
      return get<Material>(`/materials/${id}`)
    },
  },

  specs: {
    list: async (entityType: EntityType, entityId: string): Promise<Specification[]> => {
      if (USE_MOCK) {
        const { mockSpecifications } = await loadMock()
        return mockSpecifications
          .filter(s => s.entityType === entityType && s.entityId === entityId)
          .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))
      }
      return get<Specification[]>('/specs', { entityType, entityId })
    },
    current: async (entityType: EntityType, entityId: string): Promise<Specification | null> => {
      if (USE_MOCK) {
        const { mockSpecifications } = await loadMock()
        return mockSpecifications.find(s => s.entityType === entityType && s.entityId === entityId && s.effectiveTo === null) ?? null
      }
      return get<Specification | null>('/specs/current', { entityType, entityId })
    },
  },

  pricing: {
    list: async (entityType: EntityType, entityId: string): Promise<PricingRecord[]> => {
      if (USE_MOCK) {
        const { mockPricing } = await loadMock()
        return mockPricing.filter(p => p.entityType === entityType && p.entityId === entityId)
          .sort((a, b) => b.priceDate.localeCompare(a.priceDate))
      }
      return get<PricingRecord[]>('/pricing', { entityType, entityId })
    },
    trend: async (entityType: EntityType, entityId: string): Promise<PriceTrend[]> => {
      if (USE_MOCK) {
        const { mockPricing } = await loadMock()
        return priceTrend(mockPricing.filter(p => p.entityType === entityType && p.entityId === entityId))
      }
      return get<PriceTrend[]>('/pricing/trend', { entityType, entityId })
    },
    allTrend: async (): Promise<PriceTrend[]> => {
      if (USE_MOCK) {
        const { mockPricing } = await loadMock()
        return priceTrend(mockPricing)
      }
      return get<PriceTrend[]>('/pricing/allTrend')
    },
    allEquipmentRecords: async (): Promise<PricingRecord[]> => {
      if (USE_MOCK) {
        const { mockPricing } = await loadMock()
        return mockPricing.filter(p => p.entityType === 'equipment')
      }
      return get<PricingRecord[]>('/pricing/allEquipmentRecords')
    },
  },

  inspection: {
    lookup: async (entityType: EntityType, entityId: string): Promise<InspectionLookupResult | null> => {
      if (USE_MOCK) {
        const { mockEquipment, mockMaterials, mockSpecifications, mockPricing, mockInspections } = await loadMock()
        const entity = entityType === 'equipment'
          ? mockEquipment.find(e => e.id === entityId)
          : mockMaterials.find(m => m.id === entityId)
        if (!entity) return null
        const currentSpec = mockSpecifications.find(s => s.entityType === entityType && s.entityId === entityId && s.effectiveTo === null) ?? null
        const recentPrices = mockPricing.filter(p => p.entityType === entityType && p.entityId === entityId)
          .sort((a, b) => b.priceDate.localeCompare(a.priceDate)).slice(0, 3)
        const lastInspection = mockInspections.filter(i => i.entityType === entityType && i.entityId === entityId)
          .sort((a, b) => b.inspectionDate.localeCompare(a.inspectionDate))[0] ?? null
        return { entity, entityType, currentSpec, recentPrices, lastInspection }
      }
      return get<InspectionLookupResult | null>('/inspection/lookup', { entityType, entityId })
    },
    list: async (entityType?: EntityType, entityId?: string): Promise<InspectionRecord[]> => {
      if (USE_MOCK) {
        const { mockInspections } = await loadMock()
        let data = [...mockInspections]
        if (entityType) data = data.filter(i => i.entityType === entityType)
        if (entityId) data = data.filter(i => i.entityId === entityId)
        return data.sort((a, b) => b.inspectionDate.localeCompare(a.inspectionDate))
      }
      return get<InspectionRecord[]>('/inspection', { entityType, entityId })
    },
  },
}
