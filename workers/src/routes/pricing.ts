import { queryDatabase, pageToPricingRecord, type Env } from '../notion'

interface PriceTrend {
  year: number
  avgPrice: number
  minPrice: number
  maxPrice: number
  count: number
}

function calcTrend(records: ReturnType<typeof pageToPricingRecord>[]): PriceTrend[] {
  const byYear: Record<number, number[]> = {}
  for (const r of records) {
    const y = new Date(r.priceDate).getFullYear()
    if (!byYear[y]) byYear[y] = []
    byYear[y].push(r.price)
  }
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

export async function handlePricing(req: Request, env: Env, subpath: string): Promise<Response> {
  const url = new URL(req.url)
  const entityType = url.searchParams.get('entityType')
  const entityId = url.searchParams.get('entityId')

  // GET /api/pricing/allTrend
  if (subpath === '/allTrend') {
    const pages = await queryDatabase(env, env.NOTION_DB_PRICING, undefined, [
      { property: 'PriceDate', direction: 'descending' }
    ])
    const records = pages.map(pageToPricingRecord)
    return json(calcTrend(records))
  }

  // GET /api/pricing/allEquipmentRecords
  if (subpath === '/allEquipmentRecords') {
    const pages = await queryDatabase(env, env.NOTION_DB_PRICING, {
      property: 'EntityType',
      select: { equals: 'equipment' }
    }, [{ property: 'PriceDate', direction: 'descending' }])
    return json(pages.map(pageToPricingRecord))
  }

  if (!entityType || !entityId) return json({ error: 'entityType and entityId required' }, 400)

  const filter = {
    and: [
      { property: 'EntityType', select: { equals: entityType } },
      { property: 'EntityId', rich_text: { equals: entityId } },
    ]
  }

  const pages = await queryDatabase(env, env.NOTION_DB_PRICING, filter, [
    { property: 'PriceDate', direction: 'descending' }
  ])
  const records = pages.map(pageToPricingRecord)

  // GET /api/pricing/trend
  if (subpath === '/trend') return json(calcTrend(records))

  // GET /api/pricing
  return json(records)
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
