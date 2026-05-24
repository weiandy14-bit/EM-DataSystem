import { queryDatabase, getPage, pageToInspectionRecord, pageToEquipment, pageToMaterial, pageToSpecification, pageToPricingRecord, type Env } from '../notion'

export async function handleInspection(req: Request, env: Env, subpath: string): Promise<Response> {
  const url = new URL(req.url)
  const entityType = url.searchParams.get('entityType') as 'equipment' | 'material' | null
  const entityId = url.searchParams.get('entityId')

  // GET /api/inspection/lookup?entityType=&entityId=
  if (subpath === '/lookup') {
    if (!entityType || !entityId) return json({ error: 'entityType and entityId required' }, 400)

    const entityMapper = entityType === 'equipment' ? pageToEquipment : pageToMaterial

    const relProp = entityType === 'equipment' ? '設備' : '材料'
    const [entityPage, specPages, pricePages, inspPages] = await Promise.all([
      getPage(env, entityId),
      queryDatabase(env, env.NOTION_DB_SPECIFICATIONS, {
        and: [
          { property: relProp, relation: { contains: entityId } },
          { property: '失效日期', date: { is_empty: true } },
        ]
      }),
      queryDatabase(env, env.NOTION_DB_PRICING, {
        property: relProp, relation: { contains: entityId }
      }, [{ property: '詢價日期', direction: 'descending' }]),
      queryDatabase(env, env.NOTION_DB_INSPECTIONS, {
        property: relProp, relation: { contains: entityId }
      }, [{ property: '驗收日期', direction: 'descending' }]),
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
  let filter: unknown = undefined
  if (entityType && entityId) {
    const relProp = entityType === 'equipment' ? '設備' : '材料'
    filter = { property: relProp, relation: { contains: entityId } }
  } else if (entityType) {
    const relProp = entityType === 'equipment' ? '設備' : '材料'
    filter = { property: relProp, relation: { is_not_empty: true } }
  }

  const pages = await queryDatabase(env, env.NOTION_DB_INSPECTIONS, filter, [
    { property: '驗收日期', direction: 'descending' }
  ])

  return json(pages.map(pageToInspectionRecord))
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
