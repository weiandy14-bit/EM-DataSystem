import type { Equipment, Material, Specification, PricingRecord, InspectionRecord, PriceTrend, InspectionLookupResult, EntityType } from '../types'
import { mockEquipment, mockMaterials, mockSpecifications, mockPricing, mockInspections } from '../mock/data'

const delay = (ms = 300) => new Promise(r => setTimeout(r, ms))

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

export const api = {
  equipment: {
    list: async (filters?: { type?: string; status?: string; keyword?: string; buildingCategories?: string[]; yearStart?: number; yearEnd?: number }): Promise<Equipment[]> => {
      await delay()
      let data = [...mockEquipment]
      if (filters?.type) data = data.filter(e => e.type === filters.type)
      if (filters?.status) data = data.filter(e => e.status === filters.status)
      if (filters?.keyword) {
        const kw = filters.keyword.toLowerCase()
        data = data.filter(e => e.name.toLowerCase().includes(kw) || e.manufacturer.toLowerCase().includes(kw) || e.model.toLowerCase().includes(kw))
      }
      if (filters?.buildingCategories?.length) {
        data = data.filter(e => filters.buildingCategories!.includes(e.buildingCategory))
      }
      if (filters?.yearStart) {
        const gStart = filters.yearStart + 1911
        data = data.filter(e => new Date(e.installDate).getFullYear() >= gStart)
      }
      if (filters?.yearEnd) {
        const gEnd = filters.yearEnd + 1911
        data = data.filter(e => new Date(e.installDate).getFullYear() <= gEnd)
      }
      return data
    },
    get: async (id: string): Promise<Equipment | undefined> => {
      await delay()
      return mockEquipment.find(e => e.id === id)
    },
  },

  materials: {
    list: async (filters?: { type?: string; keyword?: string }): Promise<Material[]> => {
      await delay()
      let data = [...mockMaterials]
      if (filters?.type) data = data.filter(m => m.type === filters.type)
      if (filters?.keyword) {
        const kw = filters.keyword.toLowerCase()
        data = data.filter(m => m.name.toLowerCase().includes(kw) || m.supplier.toLowerCase().includes(kw))
      }
      return data
    },
    get: async (id: string): Promise<Material | undefined> => {
      await delay()
      return mockMaterials.find(m => m.id === id)
    },
  },

  specs: {
    list: async (entityType: EntityType, entityId: string): Promise<Specification[]> => {
      await delay()
      return mockSpecifications.filter(s => s.entityType === entityType && s.entityId === entityId)
        .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))
    },
    current: async (entityType: EntityType, entityId: string): Promise<Specification | null> => {
      await delay()
      const specs = mockSpecifications.filter(s => s.entityType === entityType && s.entityId === entityId && s.effectiveTo === null)
      return specs[0] ?? null
    },
  },

  pricing: {
    list: async (entityType: EntityType, entityId: string): Promise<PricingRecord[]> => {
      await delay()
      return mockPricing.filter(p => p.entityType === entityType && p.entityId === entityId)
        .sort((a, b) => b.priceDate.localeCompare(a.priceDate))
    },
    trend: async (entityType: EntityType, entityId: string): Promise<PriceTrend[]> => {
      await delay()
      const records = mockPricing.filter(p => p.entityType === entityType && p.entityId === entityId)
      return priceTrend(records)
    },
    allTrend: async (): Promise<PriceTrend[]> => {
      await delay()
      return priceTrend(mockPricing)
    },
    allEquipmentRecords: async (): Promise<PricingRecord[]> => {
      await delay()
      return mockPricing.filter(p => p.entityType === 'equipment')
    },
  },

  inspection: {
    lookup: async (entityType: EntityType, entityId: string): Promise<InspectionLookupResult | null> => {
      await delay()
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
    },
    list: async (entityType?: EntityType, entityId?: string): Promise<InspectionRecord[]> => {
      await delay()
      let data = [...mockInspections]
      if (entityType) data = data.filter(i => i.entityType === entityType)
      if (entityId) data = data.filter(i => i.entityId === entityId)
      return data.sort((a, b) => b.inspectionDate.localeCompare(a.inspectionDate))
    },
  },
}
