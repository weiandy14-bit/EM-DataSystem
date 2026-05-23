import { queryDatabase, getPage, pageToInspectionRecord, pageToEquipment, pageToMaterial, pageToSpecification, pageToPricingRecord, type Env } from '../notion'

export async function handleInspection(req: Request, env: Env, subpath: string): Promise<Response> {
  const url = new URL(req.url)
  const entityType = url.searchParams.get('entityType') as 'equipment' | 'material' | null
  const entityId = url.searchParams.get('entityId')

  // GET /api/inspection/lookup?entityType=&entityId=
  if (subpath === '/lookup') {
    if (!entityType || !entityId) return json({ error: 'entityType and entityId required' }, 400)

    const dbId = entityType === 'equipment' ? env.NOTION_DB_EQUIPMENT : env.NOTION_DB_MATERIALS
    const entityMapper = entityType === 'equipment' ? pageToEquipment : pageToMaterial

    const [entityPage, specPages, pricePages, inspPages] = await Promise.all([
      getPage(env, entityId).catch(() => null),
      queryDatabase(env, env.NOTION_DB_SPECIFICATIONS, {
        and: [
          { property: 'EntityType', select: { equals: entityType } },
          { property: 'EntityId', rich_text: { equals: entityId } },
          { property: 'EffectiveTo', date: { is_empty: true } },
        ]
      }),
      queryDatabase(env, env.NOTION_DB_PRICING, {
        and: [
          { property: 'EntityType', select: { equals: entityType } },
          { property: 'EntityId', rich_text: { equals: entityId } },
        ]
      }, [{ property: 'PriceDate', direction: 'descending' }]),
      queryDatabase(env, env.NOTION_DB_INSPECTIONS, {
        and: [
          { property: 'EntityType', select: { equals: entityType } },
          { property: 'EntityId', rich_text: { equals: entityId } },
        ]
      }, [{ property: 'InspectionDate', direction: 'descending' }]),
    ])

    if (!entityPage) return json(null, 404)

    return json({
      entity: entityMapper(entityPage),
      entityType,
      currentSpec: specPages.length ? pageToSpecification(specPages[0]) : null,
      recentPrices: pricePages.slice(0, 3).map(pageToPricingRecord),
      lastInspection: inspPages.length ? pageToInspectionRecord(inspPages[0]) : null,
    })
  }

  // GET /api/inspection?entityType=&entityId=
  const filters: any[] = []
  if (entityType) filters.push({ property: 'EntityType', select: { equals: entityType } })
  if (entityId) filters.push({ property: 'EntityId', rich_text: { equals: entityId } })

  const filter = filters.length === 0 ? undefined
    : filters.length === 1 ? filters[0]
    : { and: filters }

  const pages = await queryDatabase(env, env.NOTION_DB_INSPECTIONS, filter, [
    { property: 'InspectionDate', direction: 'descending' }
  ])

  return json(pages.map(pageToInspectionRecord))
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
