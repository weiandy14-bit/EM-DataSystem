import { queryDatabase, pageToSpecification, type Env } from '../notion'

export async function handleSpecs(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url)
  const entityType = url.searchParams.get('entityType')
  const entityId = url.searchParams.get('entityId')
  const currentOnly = url.pathname.endsWith('/current')

  if (!entityType || !entityId) return json({ error: 'entityType and entityId required' }, 400)

  const relProp = entityType === 'equipment' ? '設備' : '材料'
  const filter: any = {
    and: [
      { property: relProp, relation: { contains: entityId } },
    ]
  }

  if (currentOnly) {
    filter.and.push({ property: '失效日期', date: { is_empty: true } })
  }

  const pages = await queryDatabase(env, env.NOTION_DB_SPECIFICATIONS, filter, [
    { property: '生效日期', direction: 'descending' }
  ])

  const specs = pages.map(pageToSpecification)

  if (currentOnly) return json(specs[0] ?? null)
  return json(specs)
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
